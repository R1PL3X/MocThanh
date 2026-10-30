/**
 * STAFF PAGE CONTROLLER (staff.html)
 * Giao diện Cổng Tác Nghiệp Nhân Viên theo phong cách moccnha:
 * 1. Sale, Tư Vấn & Tạo Đơn Bán Hàng Nhanh (Hotline / Tại quầy)
 * 2. Xác Nhận Trạng Thái Đơn Hàng (1 chạm, gọi điện tức thì, đổi trạng thái)
 * 3. Quản Lý Kho & Kiểm Kê Hàng Gỗ Sẵn Sàng
 * 4. Thêm Sản Phẩm Mới & Tải Ảnh Trực Tiếp Từ Máy Tính (Base64 / Cloud)
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

let allOrders = [];
let allProducts = [];
let activeStatusFilter = "all";
let uploadedImageDataUrl = ""; // Chuỗi Base64 ảnh tải từ máy tính

let STAFF_THEME = localStorage.getItem("morioo_theme") || localStorage.getItem("moho_theme") || "light";

document.addEventListener("DOMContentLoaded", () => {
    initStaffTheme();
    initStaffPage();
});

// ==============================================================================
// THEME MANAGEMENT (Light / Dark Mode matching moccnha)
// ==============================================================================
export function initStaffTheme() {
    if (STAFF_THEME === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
    } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
    }
    updateStaffThemeIcons();
}

window.toggleStaffTheme = function() {
    if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        STAFF_THEME = "light";
    } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        STAFF_THEME = "dark";
    }
    localStorage.setItem("morioo_theme", STAFF_THEME);
    localStorage.setItem("moho_theme", STAFF_THEME);
    updateStaffThemeIcons();
    showToast(STAFF_THEME === "dark" ? "🌙 Đã chuyển sang chế độ Dark Mode" : "☀️ Đã chuyển sang chế độ Sáng", "info");
};

function updateStaffThemeIcons() {
    const sunIcon = document.querySelector(".sun-icon");
    const moonIcon = document.querySelector(".moon-icon");
    if (STAFF_THEME === "dark") {
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
export async function initStaffPage() {
    const user = auth.getCurrentUser();

    // 1. Kiểm tra quyền Nhân viên hoặc Admin
    if (!user || (user.role !== "staff" && user.role !== "admin")) {
        renderStaffAuthGate();
        return;
    }

    // 2. Hiển thị thông tin Nhân viên
    renderStaffLayout(user);

    // 3. Tải dữ liệu ban đầu
    await loadStaffData();

    // 4. Đăng ký sự kiện
    setupStaffEventListeners();
}

function renderStaffAuthGate() {
    const mainEl = document.getElementById("staffMainContent");
    const navEl = document.getElementById("staffNavBar");
    if (navEl) navEl.style.display = "none";

    if (!mainEl) return;
    mainEl.innerHTML = `
        <div class="min-h-[70vh] flex items-center justify-center py-12 px-4">
            <div class="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl text-center">
                <div class="w-16 h-16 bg-sky-100 dark:bg-zinc-800 text-sky-700 dark:text-sky-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-sky-200 dark:border-zinc-700 shadow-2xs">
                    💼
                </div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">Cổng Tác Nghiệp Nhân Viên</h1>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">Dành riêng cho nhân viên tư vấn bán hàng, chốt đơn hotline và kiểm soát kho nội thất.</p>

                <div id="authGateStaffMsg" class="hidden p-3 rounded-lg text-xs mb-4 text-left font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40"></div>

                <form id="formStaffLogin" class="space-y-4 text-left text-xs">
                    <div>
                        <label class="block font-semibold text-gray-700 dark:text-zinc-300 mb-1">Email Nhân Viên *</label>
                        <input type="email" id="gateStaffEmail" required value="nhanvien@morioo.vn" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-sky-600">
                    </div>
                    <div>
                        <label class="block font-semibold text-gray-700 dark:text-zinc-300 mb-1">Mật Khẩu *</label>
                        <input type="password" id="gateStaffPass" required value="Staff123!" class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-sky-600">
                    </div>
                    <button type="submit" id="btnGateStaffSubmit" class="w-full py-3 rounded-lg bg-sky-700 hover:bg-sky-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
                        <span>Đăng Nhập Vào Ca Trực</span>
                    </button>
                </form>

                <div class="mt-6 p-4 rounded-xl bg-sky-50/70 dark:bg-zinc-800/60 border border-sky-200/70 dark:border-zinc-700 text-left text-xs space-y-1">
                    <div class="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                        <span>💼</span>
                        <span>Tài khoản nhân viên có sẵn:</span>
                    </div>
                    <div class="text-gray-700 dark:text-zinc-300">Email: <code class="font-mono bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded text-sky-900 dark:text-sky-300">nhanvien@morioo.vn</code></div>
                    <div class="text-gray-700 dark:text-zinc-300">Mật khẩu: <code class="font-mono bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded text-sky-900 dark:text-sky-300">Staff123!</code></div>
                </div>

                <div class="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs">
                    <a href="index.html" class="text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 transition">&larr; Quay về Trang Mua Sắm Khách Hàng</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById("formStaffLogin")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("gateStaffEmail").value.trim();
        const pass = document.getElementById("gateStaffPass").value.trim();
        const msgEl = document.getElementById("authGateStaffMsg");
        const btn = document.getElementById("btnGateStaffSubmit");

        btn.disabled = true;
        btn.textContent = "Đang xác thực...";

        const res = await auth.login({ email, password: pass });
        btn.disabled = false;
        btn.textContent = "Đăng Nhập Vào Ca Trực";

        if (res.success) {
            showToast("Đăng nhập ca trực thành công!", "success");
            setTimeout(() => window.location.reload(), 400);
        } else {
            msgEl.classList.remove("hidden");
            msgEl.textContent = res.message || "Email hoặc mật khẩu không chính xác!";
        }
    });
}

function renderStaffLayout(user) {
    const navEl = document.getElementById("staffNavBar");
    if (navEl) navEl.style.display = "block";

    const staffNameEl = document.getElementById("topStaffName");
    const staffDeptEl = document.getElementById("topStaffDept");

    if (staffNameEl) staffNameEl.textContent = user.full_name || user.email;
    if (staffDeptEl) staffDeptEl.textContent = user.department || "Tư Vấn & Bán Hàng";

    checkDatabaseConnection();
}

async function checkDatabaseConnection() {
    const badge = document.getElementById("topStaffDbBadge");
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
// LOAD DATA & KPIS
// ==============================================================================
export async function loadStaffData() {
    try {
        const [orders, products] = await Promise.all([
            db.getOrders(),
            db.getProducts()
        ]);
        allOrders = orders || [];
        allProducts = products || [];

        updateStaffKPIs();
        populatePosProductSelect();
        renderConsultTable(allProducts);
        renderStaffOrders();
        renderStaffInventory(allProducts);
    } catch (err) {
        console.error("[Staff] Lỗi load dữ liệu:", err);
        showToast("Lỗi đồng bộ dữ liệu: " + err.message, "error");
    }
}

function updateStaffKPIs() {
    const pending = allOrders.filter(o => o.status === "pending").length;
    const shipping = allOrders.filter(o => o.status === "shipping" || o.status === "confirmed").length;
    const completed = allOrders.filter(o => o.status === "completed").length;
    const cancelled = allOrders.filter(o => o.status === "cancelled").length;

    const elPending = document.getElementById("staffKpiPending");
    const elShipping = document.getElementById("staffKpiShipping");
    const elCompleted = document.getElementById("staffKpiCompleted");
    const elCancelled = document.getElementById("staffKpiCancelled");

    if (elPending) elPending.textContent = pending;
    if (elShipping) elShipping.textContent = shipping;
    if (elCompleted) elCompleted.textContent = completed;
    if (elCancelled) elCancelled.textContent = cancelled;
}

// ==============================================================================
// 1. SALE, TƯ VẤN & TẠO ĐƠN BÁN HÀNG (POS)
// ==============================================================================
function populatePosProductSelect() {
    const select = document.getElementById("posSelectProduct");
    if (!select) return;

    select.innerHTML = `<option value="">-- Chọn mẫu gỗ trong kho --</option>` +
        allProducts.map(p => {
            const stock = Number(p.stock_quantity) || 0;
            return `<option value="${p.id || p.slug}" data-price="${p.price}" data-name="${p.name}" data-img="${p.image_url}" data-stock="${stock}">
                ${p.name} - ${cart.formatCurrency(p.price)} (Còn: ${stock} cái)
            </option>`;
        }).join("");

    updatePosTotal();
}

function updatePosTotal() {
    const select = document.getElementById("posSelectProduct");
    const qtyInput = document.getElementById("posQuantity");
    const totalEl = document.getElementById("posTotalPriceVal");
    if (!select || !qtyInput || !totalEl) return;

    const selectedOpt = select.options[select.selectedIndex];
    const price = Number(selectedOpt?.dataset.price || 0);
    const qty = Number(qtyInput.value || 1);
    const total = price * qty;

    totalEl.textContent = cart.formatCurrency(total);
}

function renderConsultTable(productsToRender) {
    const container = document.getElementById("staffConsultTableContainer");
    if (!container) return;

    if (productsToRender.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-400 text-xs">Không tìm thấy sản phẩm nào phù hợp.</div>`;
        return;
    }

    container.innerHTML = `
        <table class="w-full text-left text-xs text-gray-700 dark:text-zinc-300">
            <thead class="bg-gray-50/80 dark:bg-zinc-800/60 uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-700">
                <tr>
                    <th class="p-3 w-14">Ảnh</th>
                    <th class="p-3">Tên sản phẩm</th>
                    <th class="p-3">Loại gỗ</th>
                    <th class="p-3">Kích thước</th>
                    <th class="p-3">Giá bán</th>
                    <th class="p-3 text-right">Kho</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-zinc-800">
                ${productsToRender.map(p => {
                    const stock = Number(p.stock_quantity) || 0;
                    return `
                        <tr class="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                            <td class="p-3">
                                <img src="${p.image_url}" alt="${p.name}" class="w-10 h-10 object-cover rounded-md border border-gray-200 dark:border-zinc-700 shadow-2xs">
                            </td>
                            <td class="p-3 max-w-[200px]">
                                <strong class="text-gray-900 dark:text-white block line-clamp-1">${p.name}</strong>
                                <div class="text-[11px] text-gray-400 truncate mt-0.5">${p.short_desc || ""}</div>
                            </td>
                            <td class="p-3">
                                <span class="status-pill" style="background:#f1f5f9; color:#0f172a;">🌲 ${p.wood_type}</span>
                            </td>
                            <td class="p-3 font-mono font-semibold text-gray-800 dark:text-zinc-200">
                                ${p.dimensions || "Tiêu chuẩn"}
                            </td>
                            <td class="p-3 font-mono font-bold text-red-600 dark:text-red-400">
                                ${cart.formatCurrency(p.price)}
                            </td>
                            <td class="p-3 text-right">
                                <span class="status-pill ${stock > 0 ? 'status-completed' : 'status-cancelled'}">
                                    ${stock > 0 ? `Còn ${stock}` : 'Hết hàng'}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

// ==============================================================================
// 2. XÁC NHẬN TRẠNG THÁI ĐƠN HÀNG (Staff Orders Grid)
// ==============================================================================
function renderStaffOrders() {
    const container = document.getElementById("staffOrdersCardsList");
    if (!container) return;

    const searchVal = document.getElementById("staffOrderSearchInput")?.value.toLowerCase().trim() || "";

    const filtered = allOrders.filter(o => {
        const matchStatus = activeStatusFilter === "all" || o.status === activeStatusFilter;
        const matchSearch = !searchVal ||
            (o.order_code && o.order_code.toLowerCase().includes(searchVal)) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(searchVal)) ||
            (o.customer_phone && o.customer_phone.includes(searchVal));
        return matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-12 text-center text-gray-400 text-xs bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                <div class="text-3xl mb-2">📦</div>
                <div class="font-bold text-gray-700 dark:text-zinc-200">Không có đơn hàng nào trong danh mục này</div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(o => {
        const isPending = o.status === "pending";

        return `
            <div class="bg-white dark:bg-zinc-900 rounded-xl border ${isPending ? 'border-amber-400 dark:border-amber-500 shadow-sm ring-1 ring-amber-400/30' : 'border-gray-200 dark:border-zinc-800 shadow-xs'} p-4 flex flex-col justify-between transition hover:shadow-md">
                
                <div>
                    <!-- Order Top Row -->
                    <div class="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-zinc-800">
                        <div>
                            <span class="font-mono font-bold text-amber-800 dark:text-amber-400 text-sm">${o.order_code || "MR-ORDER"}</span>
                            <div class="text-[11px] text-gray-400 mt-0.5">🕒 ${new Date(o.created_at).toLocaleString("vi-VN")}</div>
                        </div>
                        <span class="status-pill status-${o.status || 'pending'}">
                            ${formatStatusLabel(o.status)}
                        </span>
                    </div>

                    <!-- Customer Info -->
                    <div class="py-3 space-y-1.5 text-xs">
                        <div class="flex items-center justify-between">
                            <strong class="text-gray-900 dark:text-white text-sm">👤 ${o.customer_name}</strong>
                            <a href="tel:${o.customer_phone}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-zinc-800 text-amber-800 dark:text-amber-300 font-mono font-bold transition shadow-2xs" title="Bấm để gọi ngay">
                                <span>📞</span> <span>${o.customer_phone}</span>
                            </a>
                        </div>
                        <div class="text-gray-600 dark:text-zinc-400 leading-relaxed text-xs">
                            📍 ${o.shipping_address}
                        </div>
                        ${o.note ? `<div class="p-2 rounded-lg bg-amber-50/60 dark:bg-zinc-800/40 text-[11px] text-amber-900 dark:text-amber-300 italic border border-amber-100 dark:border-zinc-700/50">💬 "${o.note}"</div>` : ""}
                    </div>
                </div>

                <div>
                    <!-- Price & Payment -->
                    <div class="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-zinc-800 text-xs">
                        <span class="status-pill ${o.payment_method === 'banking' ? 'status-confirmed' : 'status-pending'}">
                            ${o.payment_method === 'banking' ? '💳 VietQR' : '💵 COD'}
                        </span>
                        <span class="font-mono font-black text-red-600 dark:text-red-400 text-base">${cart.formatCurrency(o.total_amount)}</span>
                    </div>

                    <!-- 4 Quick-Action 1-touch Buttons -->
                    <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100 dark:border-zinc-800 text-[11px] font-bold">
                        <button onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'confirmed')" class="py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-zinc-700 transition flex items-center justify-center gap-1" title="Xác nhận đã gọi điện chốt đơn cho khách">
                            <span>📞 Đã gọi</span>
                        </button>
                        <button onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'shipping')" class="py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-zinc-700 transition flex items-center justify-center gap-1" title="Đã chuyển đơn cho bưu tá vận chuyển">
                            <span>🚚 Giao bưu tá</span>
                        </button>
                        <button onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'completed')" class="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-zinc-700 transition flex items-center justify-center gap-1" title="Khách đã nhận hàng và hoàn tất thanh toán">
                            <span>✅ Giao xong</span>
                        </button>
                        <button onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'cancelled')" class="py-1.5 px-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-red-700 dark:text-red-400 border border-red-200 dark:border-zinc-700 transition flex items-center justify-center gap-1" title="Hủy đơn hàng">
                            <span>❌ Hủy đơn</span>
                        </button>
                    </div>

                    <div class="mt-2 text-center">
                        <button onclick="window.viewStaffOrderDetail('${o.order_code}')" class="text-[11px] text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 font-semibold underline">
                            Xem chi tiết các món hàng & In phiếu &rarr;
                        </button>
                    </div>
                </div>

            </div>
        `;
    }).join("");
}

// ==============================================================================
// 3. QUẢN LÝ KHO & KIỂM KÊ (Staff Inventory Table)
// ==============================================================================
function renderStaffInventory(productsToRender) {
    const container = document.getElementById("staffInventoryTableContainer");
    if (!container) return;

    if (productsToRender.length === 0) {
        container.innerHTML = `
            <div class="p-10 text-center text-gray-400 text-xs">
                <div class="text-3xl mb-2">🪑</div>
                <div class="font-bold text-gray-700 dark:text-zinc-200">Không tìm thấy sản phẩm gỗ nào trong kho</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
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
                        <th class="p-3.5 text-right">Tình trạng</th>
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
                                <td class="p-3.5 font-mono font-semibold text-gray-800 dark:text-zinc-200">
                                    ${p.dimensions || "Tiêu chuẩn"}
                                </td>
                                <td class="p-3.5 font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                                    ${cart.formatCurrency(p.price)}
                                </td>
                                <td class="p-3.5">
                                    <div class="stock-stepper">
                                        <button class="btn-stock-step" onclick="window.staffStepStock('${p.id || p.slug}', -1)">-</button>
                                        <input type="number" class="input-stock-val font-mono" value="${stock}" min="0" onchange="window.staffSaveStock('${p.id || p.slug}', this.value)">
                                        <button class="btn-stock-step" onclick="window.staffStepStock('${p.id || p.slug}', 1)">+</button>
                                    </div>
                                </td>
                                <td class="p-3.5 text-right">
                                    <span class="status-pill ${isOut ? 'status-cancelled' : isLow ? 'status-pending' : 'status-completed'}">
                                        ${isOut ? '🔴 Hết hàng' : isLow ? `⚠️ Sắp hết (${stock})` : `🟢 Còn hàng (${stock})`}
                                    </span>
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
// 4. EVENT LISTENERS & FORM SUBMISSIONS
// ==============================================================================
function setupStaffEventListeners() {
    // A. Chuyển Tab
    const tabBtns = document.querySelectorAll(".staff-tab-btn, .staff-tab, .portal-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (targetId) window.switchStaffTab(targetId);
        });
    });

    // B. Lọc Tra Cứu Sản Phẩm POS
    document.getElementById("posConsultSearch")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.wood_type && p.wood_type.toLowerCase().includes(q)));
        renderConsultTable(filtered);
    });

    // C. Tìm Kiếm Kho Hàng
    document.getElementById("staffInventorySearch")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.wood_type && p.wood_type.toLowerCase().includes(q)));
        renderStaffInventory(filtered);
    });

    // D. Tìm Kiếm Đơn Hàng Staff
    document.getElementById("staffOrderSearchInput")?.addEventListener("input", renderStaffOrders);

    // E. POS: Tính Tiền
    document.getElementById("posSelectProduct")?.addEventListener("change", updatePosTotal);
    document.getElementById("posQuantity")?.addEventListener("input", updatePosTotal);

    // F. POS: Xử Lý Tạo Đơn Hàng Mới
    const formPos = document.getElementById("formStaffPosOrder");
    formPos?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.getCurrentUser();
        const select = document.getElementById("posSelectProduct");
        const selectedOpt = select.options[select.selectedIndex];
        if (!selectedOpt || !selectedOpt.value) {
            showToast("Vui lòng chọn 1 sản phẩm gỗ từ danh sách!", "error");
            return;
        }

        const btn = document.getElementById("btnSubmitPosOrder");
        btn.disabled = true;
        btn.textContent = "Đang lưu đơn hàng vào Supabase Cloud...";

        const prodId = selectedOpt.value;
        const prodName = selectedOpt.dataset.name;
        const prodPrice = Number(selectedOpt.dataset.price);
        const prodImg = selectedOpt.dataset.img;
        const qty = Number(document.getElementById("posQuantity").value) || 1;
        const total = prodPrice * qty;

        const orderPayload = {
            customerName: document.getElementById("posCustName").value.trim(),
            customerPhone: document.getElementById("posCustPhone").value.trim(),
            customerEmail: document.getElementById("posCustEmail").value.trim() || "",
            shippingAddress: document.getElementById("posCustAddress").value.trim(),
            paymentMethod: document.getElementById("posPayment").value,
            subtotal: total,
            shippingFee: 0,
            discount: 0,
            total: total,
            note: `[Nhân viên ${user ? user.full_name : 'Staff'} bán]: ${document.getElementById("posOrderNote").value.trim()}`,
            items: [{
                productId: prodId,
                name: prodName,
                price: prodPrice,
                quantity: qty,
                image: prodImg
            }]
        };

        const res = await db.createOrder(orderPayload);
        btn.disabled = false;
        btn.textContent = "🚀 Tạo Đơn Hàng & Đưa Lên Hệ Thống";

        if (res.success) {
            showToast(`🎉 Tạo đơn thành công! Mã đơn: ${res.orderCode}`, "success");
            formPos.reset();
            
            // Trừ kho tương ứng
            const currentStock = Number(selectedOpt.dataset.stock) || 0;
            const newStock = Math.max(0, currentStock - qty);
            await db.updateProductStock(prodId, newStock);

            await loadStaffData();
            window.switchStaffTab("tabStaffOrders");
        } else {
            showToast("Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối mạng!", "error");
        }
    });

    // ==============================================================================
    // G. TẢI ẢNH TỪ MÁY TÍNH (DRAG & DROP IMAGE FILE UPLOAD)
    // ==============================================================================
    const fileInput = document.getElementById("staffProductFileInput");
    const previewContainer = document.getElementById("staffImagePreviewContainer");
    const previewImg = document.getElementById("staffImagePreview");
    const dropzone = document.getElementById("staffDropzone");
    const btnRemoveImg = document.getElementById("btnRemoveStaffImage");

    fileInput?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageFile(file);
    });

    dropzone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dropzone-active");
    });

    dropzone?.addEventListener("dragleave", () => {
        dropzone.classList.remove("dropzone-active");
    });

    dropzone?.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dropzone-active");
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            handleImageFile(file);
        }
    });

    btnRemoveImg?.addEventListener("click", () => {
        uploadedImageDataUrl = "";
        if (fileInput) fileInput.value = "";
        if (previewContainer) previewContainer.classList.add("hidden");
        if (dropzone) dropzone.classList.remove("hidden");
    });

    function handleImageFile(file) {
        if (!file.type.startsWith("image/")) {
            showToast("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP)!", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImageDataUrl = event.target.result;
            if (previewImg) previewImg.src = uploadedImageDataUrl;
            if (previewContainer) previewContainer.classList.remove("hidden");
            if (dropzone) dropzone.classList.add("hidden");
            showToast("Đã tải ảnh từ máy tính thành công!", "success");
        };
        reader.readAsDataURL(file);
    }

    // H. Form Thêm Sản Phẩm Mới (Nhân viên)
    const formAddProd = document.getElementById("formStaffAddProduct");
    formAddProd?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const urlInput = document.getElementById("staffImageUrlInput")?.value.trim();
        const finalImage = uploadedImageDataUrl || urlInput;

        if (!finalImage) {
            showToast("Vui lòng tải ảnh từ máy tính lên hoặc dán link URL ảnh sản phẩm!", "error");
            return;
        }

        const btn = document.getElementById("btnSubmitStaffAddProduct");
        btn.disabled = true;
        btn.textContent = "Đang đưa sản phẩm lên Supabase Cloud...";

        const prod = {
            name: document.getElementById("staffNewProdName").value.trim(),
            category_slug: document.getElementById("staffNewProdCategory").value,
            wood_type: document.getElementById("staffNewProdWood").value.trim(),
            price: Number(document.getElementById("staffNewProdPrice").value),
            original_price: Number(document.getElementById("staffNewProdOriginalPrice").value || 0),
            dimensions: document.getElementById("staffNewProdDimensions").value.trim(),
            image_url: finalImage,
            short_desc: document.getElementById("staffNewProdShortDesc").value.trim(),
            description: document.getElementById("staffNewProdDesc").value.trim(),
            stock_quantity: Number(document.getElementById("staffNewProdStock").value || 10)
        };

        const res = await db.addProduct(prod);
        btn.disabled = false;
        btn.textContent = "🚀 Lưu Sản Phẩm Lên Website Khách Hàng (Supabase)";

        if (res.success) {
            showToast(`🎉 Đã thêm mẫu đồ gỗ "${prod.name}" thành công!`, "success");
            formAddProd.reset();
            btnRemoveImg?.click();
            await loadStaffData();

            // Chuyển sang Tab Kho để xem sản phẩm vừa thêm
            window.switchStaffTab("tabStaffInventory");
        } else {
            showToast("Có lỗi xảy ra khi lưu sản phẩm!", "error");
        }
    });

    // I. Đăng Xuất
    document.querySelectorAll(".btn-staff-logout").forEach(b => {
        b.addEventListener("click", () => {
            auth.logout();
            showToast("Đã đăng xuất khỏi ca trực", "info");
            setTimeout(() => window.location.href = "index.html", 500);
        });
    });
}

// ==============================================================================
// GLOBAL FUNCTIONS (Window Scope)
// ==============================================================================
window.switchStaffTab = function(targetId) {
    document.querySelectorAll(".staff-tab, .staff-tab-btn, .portal-tab-btn").forEach(btn => {
        const isTarget = btn.getAttribute("data-target") === targetId;
        btn.classList.toggle("active", isTarget);
        if (isTarget) {
            btn.classList.add("border-b-2", "border-sky-600", "text-sky-700", "dark:text-sky-400", "font-bold");
            btn.classList.remove("text-gray-500");
        } else {
            btn.classList.remove("border-b-2", "border-sky-600", "text-sky-700", "dark:text-sky-400", "font-bold");
            btn.classList.add("text-gray-500");
        }
    });

    document.querySelectorAll(".portal-tab-pane").forEach(pane => {
        pane.classList.toggle("active", pane.id === targetId);
    });
};

window.setStaffOrderFilter = function(status) {
    activeStatusFilter = status;
    document.querySelectorAll(".staff-filter-pill").forEach(pill => {
        const match = pill.getAttribute("data-status") === status;
        pill.classList.toggle("active", match);
    });
    renderStaffOrders();
};

window.reloadStaffOrders = async function() {
    showToast("Đang làm mới danh sách đơn từ Supabase Cloud...", "info");
    await loadStaffData();
    showToast("Đã đồng bộ đơn hàng mới nhất!", "success");
};

window.staffChangeOrderState = async function(orderId, status) {
    const user = auth.getCurrentUser();
    await db.updateOrderStatus(orderId, status, user ? user.full_name : "Nhân viên");
    showToast(`✅ Đã cập nhật trạng thái đơn: ${formatStatusLabel(status)}`, "success");
    await loadStaffData();
};

window.staffStepStock = async function(productId, delta) {
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (!prod) return;
    const current = Number(prod.stock_quantity) || 0;
    const nextVal = Math.max(0, current + delta);
    prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    showToast(`Cập nhật tồn kho "${prod.name}": ${nextVal} cái`, "success");
    renderStaffInventory(allProducts);
};

window.staffSaveStock = async function(productId, val) {
    const nextVal = Math.max(0, Number(val) || 0);
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (prod) prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    showToast(`Đã lưu tồn kho: ${nextVal} cái`, "success");
    renderStaffInventory(allProducts);
};

// ==============================================================================
// 5. MODAL XEM CHI TIẾT ĐƠN HÀNG DÀNH CHO NHÂN VIÊN
// ==============================================================================
window.viewStaffOrderDetail = function(code) {
    const ord = allOrders.find(o => o.order_code === code);
    if (!ord) return;

    const modal = document.getElementById("staffOrderDetailModal");
    if (!modal) return;

    document.getElementById("staffModalOrderCode").textContent = ord.order_code;

    document.getElementById("staffModalCustomerCard").innerHTML = `
        <div class="flex items-center justify-between">
            <strong class="text-sm text-gray-900 dark:text-white">👤 ${ord.customer_name}</strong>
            <a href="tel:${ord.customer_phone}" class="text-sky-700 dark:text-sky-400 font-bold font-mono">📞 ${ord.customer_phone}</a>
        </div>
        <div class="text-gray-600 dark:text-zinc-400">📍 ${ord.shipping_address}</div>
        ${ord.note ? `<div class="text-amber-800 dark:text-amber-300 font-medium italic mt-1">💬 "${ord.note}"</div>` : ""}
    `;

    const items = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : [
        { name: "Sản phẩm nội thất MORIOO", price: ord.total_amount, quantity: 1, image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=400&q=80" }
    ];

    document.getElementById("staffModalItemsList").innerHTML = items.map(item => `
        <div class="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
            <div class="flex items-center gap-3">
                <img src="${item.image || 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=200&q=80'}" alt="${item.name}" class="w-10 h-10 object-cover rounded border border-gray-200 dark:border-zinc-700">
                <div>
                    <strong class="text-gray-900 dark:text-white">${item.name}</strong>
                    <div class="text-[11px] text-gray-400">x${item.quantity} • ${cart.formatCurrency(item.price)}</div>
                </div>
            </div>
            <div class="font-mono font-bold text-gray-900 dark:text-white">
                ${cart.formatCurrency(item.price * item.quantity)}
            </div>
        </div>
    `).join("");

    document.getElementById("staffModalOrderTotal").textContent = cart.formatCurrency(ord.total_amount);

    modal.classList.remove("hidden");
};

window.closeStaffOrderDetailModal = function() {
    const modal = document.getElementById("staffOrderDetailModal");
    if (modal) modal.classList.add("hidden");
};

function formatStatusLabel(st) {
    switch (st) {
        case "pending": return "⏳ Chờ xử lý";
        case "confirmed": return "📞 Đã xác nhận";
        case "shipping": return "🚚 Đang giao";
        case "completed": return "✅ Hoàn tất";
        case "cancelled": return "❌ Đã hủy";
        default: return st;
    }
}
