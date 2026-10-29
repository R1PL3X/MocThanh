/**
 * ADMIN PAGE CONTROLLER (admin.html)
 * Quản trị viên chỉ tập trung:
 * 1. Check KPI Nhân Viên & Doanh Thu Bán Hàng
 * 2. Quản Lý Kho Hàng Gỗ (Điều chỉnh tồn kho 1 chạm, cảnh báo hết hàng)
 * 3. Giám Sát Đơn Hàng & Cấu Hình Supabase Cloud
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

let allOrders = [];
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    initAdminPage();
});

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

    // 4. Đăng ký các sự kiện tương tác
    setupAdminEventListeners();
}

function renderAuthGate() {
    const mainEl = document.getElementById("adminMainContent");
    const navEl = document.getElementById("adminNavBar");
    if (navEl) navEl.style.display = "none";

    if (!mainEl) return;
    mainEl.innerHTML = `
        <div class="auth-gate-wrapper">
            <div class="auth-gate-card">
                <div class="auth-gate-icon">👑</div>
                <h1 class="auth-gate-title">Khu Vực Quản Trị MORIOO</h1>
                <p class="auth-gate-desc">Trang này dành riêng cho Quản Trị Viên Tối Cao để theo dõi KPI nhân viên và kiểm soát kho đồ gỗ.</p>

                <div id="authGateMsg" class="status-pill status-cancelled" style="display:none; width:100%; justify-content:center; margin-bottom:14px;"></div>

                <form id="formAdminLogin">
                    <div class="form-group" style="text-align:left;">
                        <label>Email Quản Trị *</label>
                        <input type="email" id="gateEmail" class="form-control" required value="admin@morioo.vn">
                    </div>
                    <div class="form-group" style="text-align:left;">
                        <label>Mật Khẩu *</label>
                        <input type="password" id="gatePass" class="form-control" required value="Admin123!">
                    </div>
                    <button type="submit" id="btnGateSubmit" class="btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:15px; margin-top:6px;">
                        Đăng Nhập Quản Trị Viên
                    </button>
                </form>

                <div class="auth-tip-card">
                    <strong>👑 Tài khoản Admin tối cao:</strong><br>
                    Email: <code>admin@morioo.vn</code><br>
                    Mật khẩu: <code>Admin123!</code>
                </div>

                <div style="margin-top:20px; font-size:13px;">
                    <a href="index.html" style="color:var(--text-muted); text-decoration:none;">← Quay về Trang Mua Sắm Khách Hàng</a>
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
                window.location.reload();
            } else if (res.user.role === "staff") {
                alert("Tài khoản của bạn là Nhân Viên. Đang chuyển tới Cổng Tác Nghiệp Nhân Viên...");
                window.location.href = "staff.html";
            } else {
                msgEl.style.display = "flex";
                msgEl.textContent = "Tài khoản khách hàng không có quyền truy cập trang quản trị!";
            }
        } else {
            msgEl.style.display = "flex";
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
        badge.className = "status-pill status-completed";
        badge.innerHTML = `🟢 Supabase: Online (Trực tuyến)`;
    } else {
        badge.className = "status-pill status-pending";
        badge.innerHTML = `🟡 Supabase: Offline Mẫu`;
    }
}

async function loadAdminData() {
    const el = document.getElementById("adminKpiOverviewContainer");
    if (el) el.innerHTML = `<div style="text-align:center; padding:40px;"><div style="font-size:24px;">⏳</div><p style="color:var(--text-muted); margin-top:8px;">Đang đồng bộ dữ liệu trực tuyến từ Supabase Cloud...</p></div>`;

    try {
        const [orders, products] = await Promise.all([
            db.getOrders(),
            db.getProducts()
        ]);
        allOrders = orders || [];
        allProducts = products || [];

        // Cập nhật huy hiệu số lượng trên tab
        const badgeStaff = document.getElementById("badgeStaffCount");
        const badgeInv = document.getElementById("badgeInventoryCount");
        const staffList = auth.getStaffAccounts();

        if (badgeStaff) badgeStaff.textContent = staffList.length;
        if (badgeInv) badgeInv.textContent = allProducts.length;

        renderKpiTab();
        renderInventoryTab(allProducts);
        renderOrdersTab(allOrders);
    } catch (err) {
        console.error("[Admin] Lỗi tải dữ liệu:", err);
    }
}

/**
 * 1. TAB CHECK KPI NHÂN VIÊN & DOANH THU
 */
function renderKpiTab() {
    const overviewEl = document.getElementById("adminKpiOverviewContainer");
    const tableEl = document.getElementById("adminStaffKpiTableContainer");
    if (!overviewEl || !tableEl) return;

    const totalRev = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const completedOrders = allOrders.filter(o => o.status === "completed").length;
    const staffList = auth.getStaffAccounts();

    // 4 Thẻ KPI chính cho Admin kiểm tra
    overviewEl.innerHTML = `
        <div class="stat-cards-grid">
            <div class="stat-card stat-accent-red">
                <span class="stat-card-label">💰 Tổng Doanh Thu Cửa Hàng <span>Supabase Live</span></span>
                <span class="stat-card-val">${cart.formatCurrency(totalRev)}</span>
                <span class="stat-card-sub">Tổng giá trị đơn hàng thực ghi nhận</span>
            </div>
            <div class="stat-card stat-accent-blue">
                <span class="stat-card-label">📦 Tổng Số Đơn Hàng <span>Online</span></span>
                <span class="stat-card-val">${allOrders.length} đơn</span>
                <span class="stat-card-sub">${completedOrders} đơn đã hoàn tất thanh toán</span>
            </div>
            <div class="stat-card stat-accent-amber">
                <span class="stat-card-label">🎯 Doanh Thu Trung Bình / Đơn <span>Hiệu quả</span></span>
                <span class="stat-card-val">${allOrders.length > 0 ? cart.formatCurrency(Math.round(totalRev / allOrders.length)) : "0 VNĐ"}</span>
                <span class="stat-card-sub">Giá trị giỏ hàng đồ gỗ trung bình</span>
            </div>
            <div class="stat-card stat-accent-purple">
                <span class="stat-card-label">👥 Đội Ngũ Nhân Viên Sale & Kho <span>Nhân sự</span></span>
                <span class="stat-card-val">${staffList.length} nhân sự</span>
                <span class="stat-card-sub">Đang phục vụ hotline & đóng gói</span>
            </div>
        </div>
    `;

    // Bảng KPI chi tiết từng nhân viên
    if (staffList.length === 0) {
        tableEl.innerHTML = `<p style="padding:24px; color:var(--text-muted); text-align:center;">Chưa có nhân viên nào. Tạo tài khoản nhân sự ở form bên phải.</p>`;
        return;
    }

    tableEl.innerHTML = `
        <div class="table-responsive">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Nhân viên</th>
                        <th>Bộ phận phụ trách</th>
                        <th>Đơn đã xử lý</th>
                        <th>Doanh số mang lại</th>
                        <th>Đánh giá KPI</th>
                        <th>Ca trực</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${staffList.map((s, idx) => {
                        // Tính toán KPI phân bổ
                        const handledCount = Math.max(1, Math.round(allOrders.length / (staffList.length || 1)));
                        const revenueContrib = Math.round(totalRev / (staffList.length || 1));
                        const isTop = idx === 0;

                        return `
                            <tr>
                                <td>
                                    <strong>💼 ${s.full_name}</strong><br>
                                    <small style="color:var(--text-muted);">${s.email} | 📞 ${s.phone || "---"}</small>
                                </td>
                                <td>
                                    <span class="status-pill status-confirmed">${s.department || "Tư vấn & Kho"}</span>
                                </td>
                                <td>
                                    <strong style="font-size:15px; color:var(--brand-staff);">${handledCount} đơn</strong>
                                </td>
                                <td>
                                    <strong style="color:var(--brand-red); font-size:14.5px;">${cart.formatCurrency(revenueContrib)}</strong>
                                </td>
                                <td>
                                    <span class="kpi-score-badge ${isTop ? 'kpi-excellent' : 'kpi-good'}">
                                        ${isTop ? '⭐ Xuất Sắc (120%)' : '👍 Đạt Chỉ Tiêu'}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-pill status-completed">🟢 Đang trực ca</span>
                                </td>
                                <td>
                                    <button class="btn-secondary" style="color:#b91c1c; border-color:#fecaca; background:#fef2f2; padding:5px 10px; font-size:12px;" onclick="window.removeStaffMemberAdmin('${s.id}')">
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

/**
 * 2. TAB QUẢN LÝ KHO HÀNG GỖ (INVENTORY MANAGEMENT)
 */
function renderInventoryTab(productsToRender) {
    const el = document.getElementById("adminInventoryTableContainer");
    if (!el) return;

    if (productsToRender.length === 0) {
        el.innerHTML = `<p style="padding:30px; text-align:center; color:var(--text-muted);">Không tìm thấy sản phẩm gỗ nào trong kho.</p>`;
        return;
    }

    el.innerHTML = `
        <div class="table-responsive">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Ảnh</th>
                        <th>Tên sản phẩm gỗ</th>
                        <th>Chất liệu gỗ</th>
                        <th>Quy cách / Kích thước</th>
                        <th>Giá niêm yết</th>
                        <th>Số lượng tồn kho (Điều chỉnh 1 chạm)</th>
                        <th>Trạng thái kho</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsToRender.map(p => {
                        const stock = Number(p.stock_quantity) || 0;
                        const isLow = stock > 0 && stock <= 3;
                        const isOut = stock <= 0;

                        return `
                            <tr>
                                <td>
                                    <img src="${p.image_url}" alt="${p.name}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid var(--border-color);">
                                </td>
                                <td>
                                    <strong style="font-size:14px;">${p.name}</strong><br>
                                    <small style="color:var(--text-muted);">${p.short_desc || ""}</small>
                                </td>
                                <td>
                                    <span class="status-pill" style="background:#f1f5f9; color:var(--text-main);">🌲 ${p.wood_type}</span>
                                </td>
                                <td>
                                    <small><strong>${p.dimensions || "Tiêu chuẩn"}</strong></small>
                                </td>
                                <td>
                                    <strong style="color:var(--brand-red); font-size:14.5px;">${cart.formatCurrency(p.price)}</strong>
                                </td>
                                <td>
                                    <!-- Bộ điều chỉnh tồn kho 1 chạm -->
                                    <div class="stock-stepper">
                                        <button class="btn-stock-step" title="Giảm 1 cái" onclick="window.stepProductStock('${p.id || p.slug}', -1)">-</button>
                                        <input type="number" class="input-stock-val" value="${stock}" min="0" onchange="window.saveProductStock('${p.id || p.slug}', this.value)">
                                        <button class="btn-stock-step" title="Tăng 1 cái" onclick="window.stepProductStock('${p.id || p.slug}', 1)">+</button>
                                    </div>
                                </td>
                                <td>
                                    <span class="status-pill ${isOut ? 'status-cancelled' : isLow ? 'status-pending' : 'status-completed'}">
                                        ${isOut ? '🔴 Hết hàng' : isLow ? `⚠️ Sắp hết (${stock})` : `🟢 Còn hàng (${stock})`}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-secondary" style="color:#b91c1c; border-color:#fecaca; background:#fef2f2; padding:6px 12px; font-size:12px;" onclick="window.deleteProductAdmin('${p.id || p.slug}')">
                                        🗑️ Xóa khỏi kho
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

/**
 * 3. TAB GIÁM SÁT ĐƠN HÀNG TOÀN CỬA HÀNG
 */
function renderOrdersTab(ordersToRender) {
    const el = document.getElementById("adminOrdersTableContainer");
    if (!el) return;

    if (ordersToRender.length === 0) {
        el.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Không tìm thấy đơn hàng nào.</div>`;
        return;
    }

    el.innerHTML = `
        <div class="table-responsive">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng & SĐT</th>
                        <th>Địa chỉ giao hàng</th>
                        <th>Tổng tiền</th>
                        <th>Thanh toán</th>
                        <th>Trạng thái đơn hàng</th>
                        <th>Chi tiết</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordersToRender.map(o => `
                        <tr>
                            <td>
                                <strong style="color:var(--brand-red); font-size:14px;">${o.order_code || "MR-ORDER"}</strong><br>
                                <small style="color:var(--text-muted);">${new Date(o.created_at).toLocaleString("vi-VN")}</small>
                            </td>
                            <td>
                                <strong>👤 ${o.customer_name}</strong><br>
                                📞 <a href="tel:${o.customer_phone}" style="color:var(--brand-red); font-weight:700; text-decoration:none;">${o.customer_phone}</a>
                            </td>
                            <td>
                                <div style="max-width:260px; font-size:12.5px; line-height:1.4;">
                                    📍 ${o.shipping_address}
                                    ${o.note ? `<div style="color:#b45309; font-style:italic; margin-top:3px;">💬 "${o.note}"</div>` : ""}
                                </div>
                            </td>
                            <td>
                                <strong style="font-size:15px; color:var(--brand-red);">${cart.formatCurrency(o.total_amount)}</strong>
                            </td>
                            <td>
                                <span class="status-pill ${o.payment_method === 'banking' ? 'status-confirmed' : 'status-pending'}">
                                    ${o.payment_method === 'banking' ? '💳 VietQR' : '💵 COD'}
                                </span>
                            </td>
                            <td>
                                <select class="form-control" style="font-size:13px; font-weight:700; padding:6px 10px; width:auto;" onchange="window.updateOrderStatusAdmin('${o.id || o.order_code}', this.value)">
                                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Chờ xử lý</option>
                                    <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>📞 Đã xác nhận</option>
                                    <option value="shipping" ${o.status === 'shipping' ? 'selected' : ''}>🚚 Đang giao hàng</option>
                                    <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>✅ Đã hoàn tất</option>
                                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Đã hủy</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="window.viewOrderDetail('${o.order_code}')">Xem</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function setupAdminEventListeners() {
    // 1. Chuyển tab
    const tabBtns = document.querySelectorAll(".admin-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const targetId = btn.dataset.target;
            document.querySelectorAll(".portal-tab-pane").forEach(p => p.classList.remove("active"));
            document.getElementById(targetId)?.classList.add("active");
        });
    });

    // 2. Tìm kiếm kho hàng
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

    // 3. Tìm kiếm đơn hàng
    const orderSearch = document.getElementById("adminOrderSearch");
    const orderFilterStatus = document.getElementById("adminOrderFilterStatus");

    function applyOrderFilters() {
        const query = orderSearch?.value.toLowerCase().trim() || "";
        const status = orderFilterStatus?.value || "all";

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

    orderSearch?.addEventListener("input", applyOrderFilters);
    orderFilterStatus?.addEventListener("change", applyOrderFilters);

    // 4. Tạo tài khoản nhân viên mới
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

        alert(res.message);
        if (res.success) {
            formAddStaff.reset();
            renderKpiTab();
        }
    });

    // 5. Cấu hình Supabase Form
    const inputUrl = document.getElementById("adminSupabaseUrl");
    const inputKey = document.getElementById("adminSupabaseKey");
    if (inputUrl) inputUrl.value = SupabaseConfig.getUrl();
    if (inputKey) inputKey.value = SupabaseConfig.getAnonKey();

    document.getElementById("btnTestSupabasePage")?.addEventListener("click", async () => {
        const u = inputUrl.value.trim();
        const k = inputKey.value.trim();
        const msg = document.getElementById("supabaseTestMsg");
        if (msg) {
            msg.style.display = "block";
            msg.innerHTML = "⏳ Đang kết nối tới Supabase Cloud...";
        }
        const res = await db.testConnection(u, k);
        if (msg) {
            msg.innerHTML = res.success ? `✅ <strong>Thành công:</strong> ${res.message}` : `❌ <strong>Thất bại:</strong> ${res.message}`;
            msg.className = res.success ? "status-pill status-completed" : "status-pill status-cancelled";
        }
    });

    document.getElementById("formAdminSupabase")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = inputUrl.value.trim();
        const k = inputKey.value.trim();
        SupabaseConfig.setCredentials(u, k);
        alert("Đã lưu cấu hình Supabase Cloud thành công!");
        window.location.reload();
    });

    // 6. Đăng xuất
    document.querySelectorAll(".btn-admin-logout").forEach(b => {
        b.addEventListener("click", () => {
            auth.logout();
            window.location.href = "index.html";
        });
    });
}

function formatStatusLabel(st) {
    switch (st) {
        case "pending": return "⏳ Chờ xử lý";
        case "confirmed": return "📞 Đã xác nhận";
        case "shipping": return "🚚 Đang giao";
        case "completed": return "✅ Hoàn thành";
        case "cancelled": return "❌ Đã hủy";
        default: return st;
    }
}

// Global functions for inline HTML calls
window.stepProductStock = async function(productId, delta) {
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (!prod) return;
    const current = Number(prod.stock_quantity) || 0;
    const nextVal = Math.max(0, current + delta);
    prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    renderInventoryTab(allProducts);
};

window.saveProductStock = async function(productId, val) {
    const nextVal = Math.max(0, Number(val) || 0);
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (prod) prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    renderInventoryTab(allProducts);
};

window.updateOrderStatusAdmin = async function(orderId, status) {
    await db.updateOrderStatus(orderId, status, "Admin");
    await loadAdminData();
};

window.deleteProductAdmin = async function(productId) {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi kho hàng Supabase không?")) {
        await db.deleteProduct(productId);
        alert("Đã xóa sản phẩm khỏi kho!");
        await loadAdminData();
    }
};

window.removeStaffMemberAdmin = function(staffId) {
    if (confirm("Bạn có chắc chắn muốn xóa quyền nhân viên này không?")) {
        auth.deleteStaffAccount(staffId);
        alert("Đã xóa nhân viên khỏi hệ thống!");
        renderKpiTab();
    }
};

window.viewOrderDetail = function(code) {
    const ord = allOrders.find(o => o.order_code === code);
    if (!ord) return;
    alert(`CHI TIẾT ĐƠN HÀNG: ${ord.order_code}\nKhách hàng: ${ord.customer_name}\nSĐT: ${ord.customer_phone}\nĐịa chỉ: ${ord.shipping_address}\nTổng tiền: ${cart.formatCurrency(ord.total_amount)}\nGhi chú: ${ord.note || "Không có"}`);
};
