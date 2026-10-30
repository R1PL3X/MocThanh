/**
 * ADMIN PAGE CONTROLLER (admin.html)
 * Giao diện Quản trị viên tối cao theo phong cách moccnha:
 * 1. Check KPI Nhân Viên & Báo Cáo Doanh Thu Bán Hàng
 * 2. Quản Lý Kho Hàng Gỗ Tự Nhiên (Điều chỉnh tồn kho 1 chạm, cảnh báo hết hàng)
 * 3. Giám Sát Đơn Hàng Cửa Hàng (Lọc trạng thái, xem chi tiết modal, cập nhật 1 chạm)
 * 4. Cấu Hình Supabase Cloud & Dark Mode
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

let allOrders = [];
let allProducts = [];
let currentOrderFilter = "all";
let activeOrderDetail = null;

let ADMIN_THEME = localStorage.getItem("morioo_theme") || localStorage.getItem("moho_theme") || "light";

document.addEventListener("DOMContentLoaded", () => {
    initAdminTheme();
    initAdminPage();
});

// ==============================================================================
// THEME MANAGEMENT (Light / Dark Mode matching moccnha)
// ==============================================================================
export function initAdminTheme() {
    if (ADMIN_THEME === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
    } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
    }
    updateAdminThemeIcons();
}

window.toggleAdminTheme = function() {
    if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        ADMIN_THEME = "light";
    } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        ADMIN_THEME = "dark";
    }
    localStorage.setItem("morioo_theme", ADMIN_THEME);
    localStorage.setItem("moho_theme", ADMIN_THEME);
    updateAdminThemeIcons();
    showToast(ADMIN_THEME === "dark" ? "🌙 Đã chuyển sang chế độ Dark Mode" : "☀️ Đã chuyển sang chế độ Sáng", "info");
};

function updateAdminThemeIcons() {
    const sunIcon = document.querySelector(".sun-icon");
    const moonIcon = document.querySelector(".moon-icon");
    if (ADMIN_THEME === "dark") {
        sunIcon?.classList.remove("hidden");
        moonIcon?.classList.add("hidden");
    } else {
        sunIcon?.classList.add("hidden");
        moonIcon?.classList.remove("hidden");
    }
}

// ==============================================================================
// TOAST NOTIFICATIONS (matching moccnha)
// ==============================================================================
export function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
window.showToast = showToast;

// ==============================================================================
// INITIALIZATION & AUTH GATE
// ==============================================================================
export async function initAdminPage() {
    const user = auth.getCurrentUser();

    // 1. Kiểm tra quyền Admin
    if (!user || user.role !== "admin") {
        renderAuthGate();
        return;
    }

    // 2. Hiển thị thông tin Admin
    renderAdminLayout(user);

    // 3. Tải dữ liệu ban đầu
    await loadAdminData();

    // 4. Đăng ký sự kiện
    setupAdminEventListeners();
}

function renderAuthGate() {
    const mainEl = document.getElementById("adminMainContent");
    const navEl = document.getElementById("adminNavBar");
    if (navEl) navEl.style.display = "none";

    if (!mainEl) return;
    mainEl.innerHTML = `
        <div class="min-h-[70vh] flex items-center justify-center py-12 px-4">
            <div class="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl text-center">
                <div class="w-16 h-16 bg-amber-100 dark:bg-zinc-800 text-amber-800 dark:text-amber-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-200 dark:border-zinc-700 shadow-2xs">
                    👑
                </div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">Khu Vực Quản Trị Tối Cao</h1>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">Trang này dành riêng cho Quản Trị Viên để theo dõi KPI nhân viên, doanh thu và kiểm soát kho đồ gỗ.</p>

                <div id="authGateMsg" class="hidden p-3 rounded-lg text-xs mb-4 text-left font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40"></div>

                <form id="formAdminLogin" class="space-y-4 text-left text-xs">
                    <div>
                        <label class="block font-semibold text-gray-700 dark:text-zinc-300 mb-1">Email Quản Trị *</label>
                        <input type="email" id="gateEmail" required value="admin@morioo.vn" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-amber-600">
                    </div>
                    <div>
                        <label class="block font-semibold text-gray-700 dark:text-zinc-300 mb-1">Mật Khẩu *</label>
                        <input type="password" id="gatePass" required value="Admin123!" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-amber-600">
                    </div>
                    <button type="submit" id="btnGateSubmit" class="w-full py-3 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
                        <span>Đăng Nhập Quản Trị Viên</span>
                    </button>
                </form>

                <div class="mt-6 p-4 rounded-xl bg-amber-50/70 dark:bg-zinc-800/60 border border-amber-200/70 dark:border-zinc-700 text-left text-xs space-y-1">
                    <div class="font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                        <span>👑</span>
                        <span>Tài khoản Admin có sẵn:</span>
                    </div>
                    <div class="text-gray-700 dark:text-zinc-300">Email: <code class="font-mono bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-300">admin@morioo.vn</code></div>
                    <div class="text-gray-700 dark:text-zinc-300">Mật khẩu: <code class="font-mono bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-300">Admin123!</code></div>
                </div>

                <div class="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs">
                    <a href="index.html" class="text-gray-500 hover:text-amber-700 dark:hover:text-amber-400 transition">&larr; Quay về Trang Mua Sắm Khách Hàng</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById("formAdminLogin")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("gateEmail").value.trim();
        const pass = document.getElementById("gatePass").value.trim();
        const msgEl = document.getElementById("authGateMsg");
        const btn = document.getElementById("btnGateSubmit");

        btn.disabled = true;
        btn.textContent = "Đang xác thực...";

        const res = await auth.login({ email, password: pass });
        btn.disabled = false;
        btn.textContent = "Đăng Nhập Quản Trị Viên";

        if (res.success) {
            if (res.user.role === "admin") {
                showToast("Đăng nhập Admin thành công!", "success");
                setTimeout(() => window.location.reload(), 400);
            } else if (res.user.role === "staff") {
                alert("Tài khoản của bạn là Nhân Viên. Đang chuyển tới Cổng Tác Nghiệp Nhân Viên...");
                window.location.href = "staff.html";
            } else {
                msgEl.classList.remove("hidden");
                msgEl.textContent = "Tài khoản khách hàng không có quyền truy cập trang quản trị!";
            }
        } else {
            msgEl.classList.remove("hidden");
            msgEl.textContent = res.message || "Email hoặc mật khẩu không chính xác!";
        }
    });
}

function renderAdminLayout(user) {
    const navEl = document.getElementById("adminNavBar");
    if (navEl) navEl.style.display = "block";

    const adminNameEl = document.getElementById("topAdminName");
    if (adminNameEl) adminNameEl.textContent = user.full_name || user.email;

    checkDatabaseConnection();
}

async function checkDatabaseConnection() {
    const badge = document.getElementById("topDbBadge");
    if (!badge) return;
    const isConn = await db.testConnection();
    if (isConn.success) {
        badge.className = "status-pill status-completed cursor-pointer hover:opacity-90 transition shadow-2xs";
        badge.innerHTML = `<span class="pulsing-dot"></span><span>Supabase: Online</span>`;
    } else {
        badge.className = "status-pill status-pending cursor-pointer hover:opacity-90 transition shadow-2xs";
        badge.innerHTML = `<span>🟡</span><span>Supabase: Offline Mẫu</span>`;
    }
}

// ==============================================================================
// LOAD DATA & STATS
// ==============================================================================
export async function loadAdminData() {
    try {
        const [orders, products] = await Promise.all([
            db.getOrders(),
            db.getProducts()
        ]);
        allOrders = orders || [];
        allProducts = products || [];

        const staffList = auth.getStaffAccounts();

        // 1. Cập nhật 4 Core Metrics
        const totalRev = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const elRev = document.getElementById("statRevenue");
        if (elRev) elRev.textContent = cart.formatCurrency(totalRev);

        const elOrders = document.getElementById("statOrders");
        if (elOrders) elOrders.textContent = allOrders.length;

        const elProducts = document.getElementById("statProducts");
        if (elProducts) elProducts.textContent = allProducts.length;

        const elStaff = document.getElementById("statStaff");
        if (elStaff) elStaff.textContent = staffList.length;

        // 2. Cập nhật Badges trên Tabs
        const badgeStaff = document.getElementById("badgeStaffCount");
        const badgeInv = document.getElementById("badgeInventoryCount");
        const badgeOrders = document.getElementById("badgeOrdersCount");

        if (badgeStaff) badgeStaff.textContent = staffList.length;
        if (badgeInv) badgeInv.textContent = allProducts.length;
        if (badgeOrders) badgeOrders.textContent = allOrders.length;

        // 3. Render các tab
        renderKpiTab();
        renderInventoryTab(allProducts);
        renderOrdersTab(allOrders);
    } catch (err) {
        console.error("[Admin] Lỗi tải dữ liệu:", err);
        showToast("Lỗi đồng bộ dữ liệu: " + err.message, "error");
    }
}

// ==============================================================================
// 1. TAB CHECK KPI NHÂN VIÊN & BÁO CÁO DOANH THU
// ==============================================================================
function renderKpiTab() {
    const overviewEl = document.getElementById("adminKpiOverviewContainer");
    const tableEl = document.getElementById("adminStaffKpiTableContainer");
    if (!overviewEl || !tableEl) return;

    const totalRev = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const completedOrders = allOrders.filter(o => o.status === "completed");
    const completedRev = completedOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    
    const shippingOrders = allOrders.filter(o => o.status === "shipping" || o.status === "confirmed");
    const shippingRev = shippingOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const pendingOrders = allOrders.filter(o => o.status === "pending");
    const pendingRev = pendingOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const staffList = auth.getStaffAccounts();

    // 4 Sub-Metrics Grid
    overviewEl.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs">
                <div class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Đã thực thu (Hoàn tất)</div>
                <div class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">${cart.formatCurrency(completedRev)}</div>
                <div class="text-[11px] text-gray-400 mt-1">${completedOrders.length} đơn đã giao & thanh toán</div>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs">
                <div class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Đang giao & Xác nhận</div>
                <div class="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">${cart.formatCurrency(shippingRev)}</div>
                <div class="text-[11px] text-gray-400 mt-1">${shippingOrders.length} đơn đang trên đường bưu tá</div>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs">
                <div class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chờ nhân viên gọi khách</div>
                <div class="text-xl font-black text-sky-600 dark:text-sky-400 mt-1 font-mono">${cart.formatCurrency(pendingRev)}</div>
                <div class="text-[11px] text-gray-400 mt-1">${pendingOrders.length} đơn mới cần chốt đơn</div>
            </div>

            <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs">
                <div class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Giá trị trung bình / đơn</div>
                <div class="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">${allOrders.length > 0 ? cart.formatCurrency(Math.round(totalRev / allOrders.length)) : "0₫"}</div>
                <div class="text-[11px] text-gray-400 mt-1">Quy mô giỏ hàng đồ gỗ</div>
            </div>

        </div>
    `;

    // Bảng KPI Nhân Viên
    if (staffList.length === 0) {
        tableEl.innerHTML = `<div class="p-8 text-center text-gray-400 text-xs">Chưa có nhân viên nào. Vui lòng tạo tài khoản ở form bên phải.</div>`;
        return;
    }

    tableEl.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-gray-700 dark:text-zinc-300">
                <thead class="bg-gray-50/80 dark:bg-zinc-800/60 uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-700">
                    <tr>
                        <th class="p-3.5">Nhân viên</th>
                        <th class="p-3.5">Bộ phận</th>
                        <th class="p-3.5">Đơn đã xử lý</th>
                        <th class="p-3.5">Doanh số mang lại</th>
                        <th class="p-3.5">Đánh giá KPI</th>
                        <th class="p-3.5">Ca trực</th>
                        <th class="p-3.5 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-zinc-800">
                    ${staffList.map((s, idx) => {
                        const handledCount = Math.max(1, Math.round(allOrders.length / (staffList.length || 1)));
                        const revenueContrib = Math.round(totalRev / (staffList.length || 1));
                        const isTop = idx === 0;

                        return `
                            <tr class="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                                <td class="p-3.5">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-zinc-800 text-amber-800 dark:text-amber-400 font-bold flex items-center justify-center text-xs">
                                            ${s.full_name ? s.full_name.charAt(0) : "N"}
                                        </div>
                                        <div>
                                            <strong class="text-gray-900 dark:text-white">${s.full_name}</strong>
                                            <div class="text-[11px] text-gray-400">${s.email} • 📞 ${s.phone || "---"}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-3.5">
                                    <span class="status-pill status-confirmed">${s.department || "Tư vấn & Kho"}</span>
                                </td>
                                <td class="p-3.5">
                                    <strong class="font-mono text-sky-700 dark:text-sky-400">${handledCount} đơn</strong>
                                </td>
                                <td class="p-3.5 font-mono font-bold text-red-600 dark:text-red-400">
                                    ${cart.formatCurrency(revenueContrib)}
                                </td>
                                <td class="p-3.5">
                                    <span class="kpi-score-badge ${isTop ? 'kpi-excellent' : 'kpi-good'}">
                                        ${isTop ? '⭐ Xuất Sắc (120%)' : '👍 Đạt Chỉ Tiêu'}
                                    </span>
                                </td>
                                <td class="p-3.5">
                                    <span class="status-pill status-completed">
                                        <span class="pulsing-dot"></span> Đang trực ca
                                    </span>
                                </td>
                                <td class="p-3.5 text-right">
                                    <button onclick="window.removeStaffMemberAdmin('${s.id}')" class="px-2.5 py-1 rounded text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-semibold transition" title="Xóa quyền nhân viên">
                                        Xóa quyền
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// ==============================================================================
// 2. TAB QUẢN LÝ KHO HÀNG GỖ (INVENTORY MANAGEMENT)
// ==============================================================================
function renderInventoryTab(productsToRender) {
    const el = document.getElementById("adminInventoryTableContainer");
    if (!el) return;

    if (productsToRender.length === 0) {
        el.innerHTML = `
            <div class="p-10 text-center text-gray-400 text-xs">
                <div class="text-3xl mb-2">🪑</div>
                <div class="font-bold text-gray-700 dark:text-zinc-200">Không tìm thấy sản phẩm gỗ nào trong kho</div>
                <p class="mt-1">Thử đổi từ khóa tìm kiếm hoặc lọc theo điều kiện khác.</p>
            </div>
        `;
        return;
    }

    el.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-gray-700 dark:text-zinc-300">
                <thead class="bg-gray-50/80 dark:bg-zinc-800/60 uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-700">
                    <tr>
                        <th class="p-3.5 w-16">Ảnh</th>
                        <th class="p-3.5">Tên sản phẩm gỗ</th>
                        <th class="p-3.5">Chất liệu</th>
                        <th class="p-3.5">Quy cách (DxRxC)</th>
                        <th class="p-3.5">Giá bán lẻ</th>
                        <th class="p-3.5">Tồn kho (1 chạm)</th>
                        <th class="p-3.5">Tình trạng</th>
                        <th class="p-3.5 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-zinc-800">
                    ${productsToRender.map(p => {
                        const stock = Number(p.stock_quantity) || 0;
                        const isLow = stock > 0 && stock <= 3;
                        const isOut = stock <= 0;

                        return `
                            <tr class="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                                <td class="p-3.5">
                                    <img src="${p.image_url}" alt="${p.name}" class="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-zinc-700 shadow-2xs">
                                </td>
                                <td class="p-3.5 max-w-xs">
                                    <strong class="text-gray-900 dark:text-white text-xs sm:text-sm block line-clamp-1">${p.name}</strong>
                                    <div class="text-[11px] text-gray-400 truncate mt-0.5">${p.short_desc || ""}</div>
                                </td>
                                <td class="p-3.5">
                                    <span class="status-pill" style="background:#f1f5f9; color:#0f172a;">🌲 ${p.wood_type}</span>
                                </td>
                                <td class="p-3.5">
                                    <strong class="text-gray-800 dark:text-zinc-200 font-mono">${p.dimensions || "Tiêu chuẩn"}</strong>
                                </td>
                                <td class="p-3.5 font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                                    ${cart.formatCurrency(p.price)}
                                </td>
                                <td class="p-3.5">
                                    <div class="stock-stepper">
                                        <button class="btn-stock-step" title="Giảm 1 cái" onclick="window.stepProductStock('${p.id || p.slug}', -1)">-</button>
                                        <input type="number" class="input-stock-val font-mono" value="${stock}" min="0" onchange="window.saveProductStock('${p.id || p.slug}', this.value)">
                                        <button class="btn-stock-step" title="Tăng 1 cái" onclick="window.stepProductStock('${p.id || p.slug}', 1)">+</button>
                                    </div>
                                </td>
                                <td class="p-3.5">
                                    <span class="status-pill ${isOut ? 'status-cancelled' : isLow ? 'status-pending' : 'status-completed'}">
                                        ${isOut ? '🔴 Hết hàng' : isLow ? `⚠️ Sắp hết (${stock})` : `🟢 Còn hàng (${stock})`}
                                    </span>
                                </td>
                                <td class="p-3.5 text-right">
                                    <button class="px-2.5 py-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition" onclick="window.deleteProductAdmin('${p.id || p.slug}')" title="Xóa khỏi kho Supabase">
                                        🗑️ Xóa
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// ==============================================================================
// 3. TAB GIÁM SÁT ĐƠN HÀNG CỬA HÀNG
// ==============================================================================
function renderOrdersTab(ordersToRender) {
    const el = document.getElementById("adminOrdersTableContainer");
    if (!el) return;

    if (ordersToRender.length === 0) {
        el.innerHTML = `
            <div class="p-10 text-center text-gray-400 text-xs">
                <div class="text-3xl mb-2">📦</div>
                <div class="font-bold text-gray-700 dark:text-zinc-200">Không có đơn hàng nào khớp với bộ lọc</div>
            </div>
        `;
        return;
    }

    el.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-gray-700 dark:text-zinc-300">
                <thead class="bg-gray-50/80 dark:bg-zinc-800/60 uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-700">
                    <tr>
                        <th class="p-3.5">Mã đơn & Thời gian</th>
                        <th class="p-3.5">Khách hàng & SĐT</th>
                        <th class="p-3.5">Địa chỉ giao hàng</th>
                        <th class="p-3.5">Tổng tiền</th>
                        <th class="p-3.5">Thanh toán</th>
                        <th class="p-3.5">Trạng thái</th>
                        <th class="p-3.5 text-right">Chi tiết</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-zinc-800">
                    ${ordersToRender.map(o => `
                        <tr class="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                            <td class="p-3.5">
                                <strong class="font-mono text-amber-800 dark:text-amber-400 font-bold block">${o.order_code || "MR-ORDER"}</strong>
                                <span class="text-[11px] text-gray-400">${new Date(o.created_at).toLocaleString("vi-VN")}</span>
                            </td>
                            <td class="p-3.5">
                                <strong class="text-gray-900 dark:text-white block">${o.customer_name}</strong>
                                <a href="tel:${o.customer_phone}" class="text-amber-700 dark:text-amber-400 font-mono font-bold hover:underline flex items-center gap-1 mt-0.5">
                                    <span>📞</span> <span>${o.customer_phone}</span>
                                </a>
                            </td>
                            <td class="p-3.5 max-w-xs">
                                <div class="text-xs leading-relaxed truncate">${o.shipping_address}</div>
                                ${o.note ? `<div class="text-[11px] text-amber-700 dark:text-amber-400 italic truncate mt-0.5">💬 "${o.note}"</div>` : ""}
                            </td>
                            <td class="p-3.5 font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                                ${cart.formatCurrency(o.total_amount)}
                            </td>
                            <td class="p-3.5">
                                <span class="status-pill ${o.payment_method === 'banking' ? 'status-confirmed' : 'status-pending'}">
                                    ${o.payment_method === 'banking' ? '💳 VietQR' : '💵 COD'}
                                </span>
                            </td>
                            <td class="p-3.5">
                                <select 
                                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-amber-600 shadow-2xs" 
                                    onchange="window.updateOrderStatusAdmin('${o.id || o.order_code}', this.value)"
                                >
                                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Chờ xử lý</option>
                                    <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>📞 Đã xác nhận</option>
                                    <option value="shipping" ${o.status === 'shipping' ? 'selected' : ''}>🚚 Đang giao hàng</option>
                                    <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>✅ Đã hoàn tất</option>
                                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Đã hủy</option>
                                </select>
                            </td>
                            <td class="p-3.5 text-right">
                                <button 
                                    class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 text-xs font-bold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:border-amber-700 transition" 
                                    onclick="window.viewOrderDetail('${o.order_code}')"
                                    title="Xem chi tiết đơn hàng"
                                >
                                    👁️ Xem
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// ==============================================================================
// 4. EVENT LISTENERS & FILTER ACTIONS
// ==============================================================================
function setupAdminEventListeners() {
    // A. Tìm kiếm Kho Hàng
    const invSearch = document.getElementById("adminInventorySearch");
    const invFilter = document.getElementById("adminInventoryFilterStock");

    function applyInventoryFilters() {
        const q = invSearch?.value.toLowerCase().trim() || "";
        const f = invFilter?.value || "all";

        let filtered = allProducts.filter(p => {
            const matchQ = !q ||
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.wood_type && p.wood_type.toLowerCase().includes(q));

            const stock = Number(p.stock_quantity) || 0;
            let matchF = true;
            if (f === "low") matchF = stock > 0 && stock <= 3;
            else if (f === "in_stock") matchF = stock > 3;
            else if (f === "out") matchF = stock <= 0;

            return matchQ && matchF;
        });

        renderInventoryTab(filtered);
    }

    invSearch?.addEventListener("input", applyInventoryFilters);
    invFilter?.addEventListener("change", applyInventoryFilters);

    // B. Tìm kiếm Đơn Hàng
    const orderSearch = document.getElementById("adminOrderSearch");
    orderSearch?.addEventListener("input", () => applyOrderFilters());

    // C. Tạo Tài Khoản Nhân Viên
    const formAddStaff = document.getElementById("formAdminAddStaff");
    formAddStaff?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("newStaffName").value.trim();
        const email = document.getElementById("newStaffEmail").value.trim();
        const phone = document.getElementById("newStaffPhone").value.trim();
        const password = document.getElementById("newStaffPass").value.trim();
        const department = document.getElementById("newStaffDept").value.trim();

        const res = await auth.createStaffAccount({
            fullName,
            email,
            phone,
            password,
            department
        });

        showToast(res.message, res.success ? "success" : "error");
        if (res.success) {
            formAddStaff.reset();
            const staffList = auth.getStaffAccounts();
            const badgeStaff = document.getElementById("badgeStaffCount");
            const elStaff = document.getElementById("statStaff");
            if (badgeStaff) badgeStaff.textContent = staffList.length;
            if (elStaff) elStaff.textContent = staffList.length;
            renderKpiTab();
        }
    });

    // D. Cấu Hình Supabase Cloud
    const inputUrl = document.getElementById("adminSupabaseUrl");
    const inputKey = document.getElementById("adminSupabaseKey");
    if (inputUrl) inputUrl.value = SupabaseConfig.getUrl();
    if (inputKey) inputKey.value = SupabaseConfig.getAnonKey();

    document.getElementById("btnTestSupabasePage")?.addEventListener("click", async () => {
        const u = inputUrl.value.trim();
        const k = inputKey.value.trim();
        const msg = document.getElementById("supabaseTestMsg");
        if (msg) {
            msg.classList.remove("hidden");
            msg.className = "p-3 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-zinc-800 dark:text-amber-400";
            msg.innerHTML = "⏳ Đang kết nối thử nghiệm tới Supabase Cloud...";
        }
        const res = await db.testConnection(u, k);
        if (msg) {
            msg.innerHTML = res.success ? `✅ <strong>Thành công:</strong> ${res.message}` : `❌ <strong>Thất bại:</strong> ${res.message}`;
            msg.className = res.success 
                ? "p-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200" 
                : "p-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200";
        }
        showToast(res.success ? "Kết nối Supabase thành công!" : "Lỗi kết nối Supabase!", res.success ? "success" : "error");
    });

    document.getElementById("formAdminSupabase")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = inputUrl.value.trim();
        const k = inputKey.value.trim();
        SupabaseConfig.setCredentials(u, k);
        showToast("Đã lưu cấu hình Supabase Cloud thành công!", "success");
        setTimeout(() => window.location.reload(), 1000);
    });

    // E. Đăng Xuất
    document.querySelectorAll(".btn-admin-logout").forEach(b => {
        b.addEventListener("click", () => {
            auth.logout();
            showToast("Đã đăng xuất khỏi tài khoản quản trị", "info");
            setTimeout(() => window.location.href = "index.html", 500);
        });
    });

    // F. Modal Status Changer Sync
    document.getElementById("modalStatusSelect")?.addEventListener("change", async (e) => {
        if (!activeOrderDetail) return;
        const newStatus = e.target.value;
        await window.updateOrderStatusAdmin(activeOrderDetail.id || activeOrderDetail.order_code, newStatus);
        activeOrderDetail.status = newStatus;
    });
}

function applyOrderFilters() {
    const query = document.getElementById("adminOrderSearch")?.value.toLowerCase().trim() || "";
    const status = currentOrderFilter;

    let filtered = allOrders.filter(o => {
        const matchQuery = !query || 
            (o.order_code && o.order_code.toLowerCase().includes(query)) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
            (o.customer_phone && o.customer_phone.includes(query));

        const matchStatus = status === "all" || o.status === status;
        return matchQuery && matchStatus;
    });

    renderOrdersTab(filtered);
}

// ==============================================================================
// GLOBAL FUNCTIONS (Window Scope)
// ==============================================================================
window.switchAdminTab = function(targetId) {
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
        const isTarget = btn.getAttribute("data-target") === targetId;
        btn.classList.toggle("active", isTarget);
        if (isTarget) {
            btn.classList.add("border-b-2", "border-amber-800", "text-amber-800", "dark:text-amber-400", "font-bold");
            btn.classList.remove("text-gray-500");
        } else {
            btn.classList.remove("border-b-2", "border-amber-800", "text-amber-800", "dark:text-amber-400", "font-bold");
            btn.classList.add("text-gray-500");
        }
    });

    document.querySelectorAll(".portal-tab-pane").forEach(pane => {
        pane.classList.toggle("active", pane.id === targetId);
    });
};

window.setAdminOrderFilter = function(status) {
    currentOrderFilter = status;
    document.querySelectorAll(".order-filter-btn").forEach(btn => {
        const match = btn.getAttribute("data-filter") === status;
        btn.className = match
            ? "order-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-800 text-white shadow-2xs transition"
            : "order-filter-btn px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition";
    });
    applyOrderFilters();
};

window.reloadAdminOrders = async function() {
    showToast("Đang đồng bộ đơn hàng từ Supabase Cloud...", "info");
    await loadAdminData();
    showToast("Đã làm mới danh sách đơn hàng!", "success");
};

window.stepProductStock = async function(productId, delta) {
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (!prod) return;
    const current = Number(prod.stock_quantity) || 0;
    const nextVal = Math.max(0, current + delta);
    prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    showToast(`Đã cập nhật tồn kho "${prod.name}": ${nextVal} cái`, "success");
    renderInventoryTab(allProducts);
};

window.saveProductStock = async function(productId, val) {
    const nextVal = Math.max(0, Number(val) || 0);
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (prod) prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    showToast(`Đã lưu tồn kho: ${nextVal} cái`, "success");
    renderInventoryTab(allProducts);
};

window.updateOrderStatusAdmin = async function(orderId, status) {
    await db.updateOrderStatus(orderId, status, "Admin");
    showToast(`Đã đổi trạng thái đơn sang: ${formatStatusLabel(status)}`, "success");
    await loadAdminData();
};

window.deleteProductAdmin = async function(productId) {
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    const name = prod ? prod.name : productId;
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" khỏi kho Supabase không?`)) {
        await db.deleteProduct(productId);
        showToast(`Đã xóa sản phẩm "${name}"`, "info");
        await loadAdminData();
    }
};

window.removeStaffMemberAdmin = function(staffId) {
    if (confirm("Bạn có chắc chắn muốn xóa quyền nhân viên này không?")) {
        auth.deleteStaffAccount(staffId);
        showToast("Đã xóa nhân viên khỏi hệ thống", "info");
        const staffList = auth.getStaffAccounts();
        const badgeStaff = document.getElementById("badgeStaffCount");
        const elStaff = document.getElementById("statStaff");
        if (badgeStaff) badgeStaff.textContent = staffList.length;
        if (elStaff) elStaff.textContent = staffList.length;
        renderKpiTab();
    }
};

// ==============================================================================
// 5. ORDER DETAIL MODAL VIEWER (Thay thế alert)
// ==============================================================================
window.viewOrderDetail = function(code) {
    const ord = allOrders.find(o => o.order_code === code);
    if (!ord) return;
    activeOrderDetail = ord;

    const modal = document.getElementById("orderDetailModal");
    if (!modal) return;

    document.getElementById("modalOrderCode").textContent = ord.order_code;
    document.getElementById("modalOrderDate").textContent = "🕒 Đặt lúc: " + new Date(ord.created_at).toLocaleString("vi-VN");
    document.getElementById("modalCustomerName").textContent = ord.customer_name;
    
    const phoneEl = document.getElementById("modalCustomerPhone");
    phoneEl.textContent = ord.customer_phone;
    phoneEl.href = "tel:" + ord.customer_phone;

    document.getElementById("modalCustomerAddress").textContent = ord.shipping_address;

    const noteBox = document.getElementById("modalOrderNoteBox");
    if (ord.note) {
        noteBox.textContent = `💬 Ghi chú khách: "${ord.note}"`;
        noteBox.style.display = "block";
    } else {
        noteBox.style.display = "none";
    }

    // Render items
    const itemsContainer = document.getElementById("modalOrderItemsList");
    const items = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : [
        { name: "Sản phẩm nội thất MORIOO", price: ord.total_amount, quantity: 1, image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=400&q=80" }
    ];

    itemsContainer.innerHTML = items.map(item => `
        <div class="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
            <div class="flex items-center gap-3">
                <img src="${item.image || 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=200&q=80'}" alt="${item.name}" class="w-10 h-10 object-cover rounded border border-gray-200 dark:border-zinc-700">
                <div>
                    <strong class="text-gray-900 dark:text-white">${item.name}</strong>
                    <div class="text-[11px] text-gray-400">Số lượng: x${item.quantity} • Đơn giá: ${cart.formatCurrency(item.price)}</div>
                </div>
            </div>
            <div class="font-mono font-bold text-gray-900 dark:text-white">
                ${cart.formatCurrency(item.price * item.quantity)}
            </div>
        </div>
    `).join("");

    document.getElementById("modalPaymentMethod").innerHTML = `
        <span class="status-pill ${ord.payment_method === 'banking' ? 'status-confirmed' : 'status-pending'}">
            ${ord.payment_method === 'banking' ? '💳 Chuyển khoản VietQR' : '💵 Thanh toán khi nhận hàng (COD)'}
        </span>
    `;

    document.getElementById("modalOrderTotal").textContent = cart.formatCurrency(ord.total_amount);

    const statusSelect = document.getElementById("modalStatusSelect");
    if (statusSelect) statusSelect.value = ord.status || "pending";

    modal.classList.remove("hidden");
};

window.closeOrderDetailModal = function() {
    const modal = document.getElementById("orderDetailModal");
    if (modal) modal.classList.add("hidden");
    activeOrderDetail = null;
};

function formatStatusLabel(st) {
    switch (st) {
        case "pending": return "⏳ Chờ xử lý";
        case "confirmed": return "📞 Đã xác nhận";
        case "shipping": return "🚚 Đang giao hàng";
        case "completed": return "✅ Hoàn tất";
        case "cancelled": return "❌ Đã hủy";
        default: return st;
    }
}
