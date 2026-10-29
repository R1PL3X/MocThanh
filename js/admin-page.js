/**
 * ADMIN PAGE CONTROLLER (admin.html)
 * Quản lý toàn bộ chức năng trang Quản Trị Viên Tối Cao MORIOO
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

document.addEventListener("DOMContentLoaded", () => {
    initAdminPage();
});

let allOrders = [];
let allProducts = [];

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
    await loadAllData();

    // 4. Đăng ký các sự kiện tương tác
    setupEventListeners();
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
                <p class="auth-gate-desc">Trang này dành riêng cho Quản Trị Viên Tối Cao để quản lý đơn hàng, kho đồ gỗ và nhân sự.</p>

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
                        Đăng Nhập Vào Trang Quản Trị
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
        btn.textContent = "Đăng Nhập Vào Trang Quản Trị";

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
        badge.innerHTML = `🟢 Supabase: Online`;
    } else {
        badge.className = "status-pill status-pending";
        badge.innerHTML = `🟡 Supabase: Offline Mẫu`;
    }
}

async function loadAllData() {
    showLoadingSpinner();
    try {
        const [orders, products] = await Promise.all([
            db.getOrders(),
            db.getProducts()
        ]);
        allOrders = orders;
        allProducts = products;

        renderOverviewTab();
        renderOrdersTab(allOrders);
        renderProductsTab(allProducts);
        renderStaffTab();
    } catch (err) {
        console.error("Error loading admin data:", err);
    }
}

function showLoadingSpinner() {
    const el = document.getElementById("adminOverviewContent");
    if (el) el.innerHTML = `<div style="text-align:center; padding:50px;"><div style="font-size:24px;">⏳</div><p style="color:var(--text-muted); margin-top:8px;">Đang tải dữ liệu từ Supabase Cloud...</p></div>`;
}

function renderOverviewTab() {
    const el = document.getElementById("adminOverviewContent");
    if (!el) return;

    const totalRev = allOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const staffList = auth.getStaffAccounts();

    const pendingOrders = allOrders.filter(o => o.status === "pending").length;
    const confirmedOrders = allOrders.filter(o => o.status === "confirmed").length;
    const shippingOrders = allOrders.filter(o => o.status === "shipping").length;
    const completedOrders = allOrders.filter(o => o.status === "completed").length;
    const cancelledOrders = allOrders.filter(o => o.status === "cancelled").length;

    el.innerHTML = `
        <div class="stat-cards-grid">
            <div class="stat-card stat-accent-red">
                <span class="stat-card-label">💰 Tổng Doanh Thu Cửa Hàng <span>Toàn thời gian</span></span>
                <span class="stat-card-val">${cart.formatCurrency(totalRev)}</span>
                <span class="stat-card-sub">Dựa trên ${allOrders.length} đơn hàng ghi nhận</span>
            </div>
            <div class="stat-card stat-accent-blue">
                <span class="stat-card-label">📦 Tổng Số Đơn Hàng <span>Supabase</span></span>
                <span class="stat-card-val">${allOrders.length} đơn</span>
                <span class="stat-card-sub">${pendingOrders} đơn đang chờ xác nhận</span>
            </div>
            <div class="stat-card stat-accent-green">
                <span class="stat-card-label">🪑 Sản Phẩm Gỗ Đang Bán <span>Kho Online</span></span>
                <span class="stat-card-val">${allProducts.length} mẫu</span>
                <span class="stat-card-sub">Sồi Nga, Gỗ Teak, Óc Chó, Tần Bì</span>
            </div>
            <div class="stat-card stat-accent-purple">
                <span class="stat-card-label">👥 Đội Ngũ Nhân Sự <span>Phân quyền</span></span>
                <span class="stat-card-val">${staffList.length} nhân viên</span>
                <span class="stat-card-sub">1 Quản trị viên tối cao</span>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:24px;">
            <div class="portal-card" style="margin-bottom:0;">
                <div class="portal-card-header">
                    <div>
                        <h2 class="portal-card-title">📦 Đơn Hàng Mới Nhất</h2>
                        <p class="portal-card-subtitle">5 đơn hàng vừa được khách đặt qua website</p>
                    </div>
                    <button class="btn-secondary" onclick="switchAdminTab('tabOrders')">Xem tất cả</button>
                </div>
                <div class="table-responsive">
                    <table class="portal-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày đặt</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allOrders.slice(0, 5).map(o => `
                                <tr>
                                    <td><strong style="color:var(--brand-red);">${o.order_code || "MR-ORDER"}</strong></td>
                                    <td>
                                        <strong>${o.customer_name}</strong><br>
                                        <small style="color:var(--text-muted);">${o.customer_phone}</small>
                                    </td>
                                    <td><strong>${cart.formatCurrency(o.total_amount)}</strong></td>
                                    <td>
                                        <span class="status-pill status-${o.status || 'pending'}">
                                            ${formatStatusLabel(o.status)}
                                        </span>
                                    </td>
                                    <td><small style="color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString("vi-VN")}</small></td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="portal-card" style="margin-bottom:0;">
                <div class="portal-card-header">
                    <h2 class="portal-card-title">📊 Tiến Trình Đơn Hàng</h2>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="status-pill status-pending">⏳ Chờ xử lý:</span>
                        <strong>${pendingOrders} đơn</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="status-pill status-confirmed">📞 Đã xác nhận:</span>
                        <strong>${confirmedOrders} đơn</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="status-pill status-shipping">🚚 Đang giao hàng:</span>
                        <strong>${shippingOrders} đơn</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="status-pill status-completed">✅ Đã hoàn tất:</span>
                        <strong>${completedOrders} đơn</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="status-pill status-cancelled">❌ Đã hủy:</span>
                        <strong>${cancelledOrders} đơn</strong>
                    </div>
                </div>

                <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border-color);">
                    <a href="staff.html" class="btn-primary" style="width:100%; justify-content:center; text-decoration:none; background:var(--brand-staff);">
                        💼 Mở Cổng Tác Nghiệp Nhân Viên
                    </a>
                </div>
            </div>
        </div>
    `;
}

function renderOrdersTab(ordersToRender) {
    const el = document.getElementById("adminOrdersTableContainer");
    if (!el) return;

    if (ordersToRender.length === 0) {
        el.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</div>`;
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
                        <th>Thao tác</th>
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
                                📞 <a href="tel:${o.customer_phone}" style="color:var(--brand-red); font-weight:700; text-decoration:none;">${o.customer_phone}</a><br>
                                <small style="color:var(--text-muted);">${o.customer_email || ""}</small>
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

function renderProductsTab(productsToRender) {
    const el = document.getElementById("adminProductsTableContainer");
    if (!el) return;

    el.innerHTML = `
        <div class="table-responsive">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Ảnh</th>
                        <th>Tên sản phẩm</th>
                        <th>Chất liệu gỗ</th>
                        <th>Kích thước</th>
                        <th>Giá niêm yết</th>
                        <th>Tồn kho</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsToRender.map(p => `
                        <tr>
                            <td>
                                <img src="${p.image_url}" alt="${p.name}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid var(--border-color);">
                            </td>
                            <td>
                                <strong style="font-size:14px;">${p.name}</strong><br>
                                <small style="color:var(--text-muted);">${p.short_desc || ""}</small>
                            </td>
                            <td><span class="status-pill" style="background:#f1f5f9; color:var(--text-main);">🌲 ${p.wood_type}</span></td>
                            <td><small>${p.dimensions || "Tiêu chuẩn"}</small></td>
                            <td><strong style="color:var(--brand-red); font-size:14px;">${cart.formatCurrency(p.price)}</strong></td>
                            <td>
                                <span class="status-pill ${p.stock_quantity > 0 ? 'status-completed' : 'status-cancelled'}">
                                    ${p.stock_quantity || 10} cái
                                </span>
                            </td>
                            <td>
                                <button class="btn-secondary" style="color:#b91c1c; border-color:#fecaca; background:#fef2f2; padding:6px 12px; font-size:12px;" onclick="window.deleteProductAdmin('${p.id || p.slug}')">
                                    🗑️ Xóa
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderStaffTab() {
    const el = document.getElementById("adminStaffTableContainer");
    if (!el) return;

    const staffList = auth.getStaffAccounts();
    const countBadge = document.getElementById("badgeStaffCount");
    if (countBadge) countBadge.textContent = staffList.length;

    el.innerHTML = `
        <div class="table-responsive">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Họ và tên</th>
                        <th>Email đăng nhập</th>
                        <th>Số điện thoại</th>
                        <th>Bộ phận phân công</th>
                        <th>Vai trò</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${staffList.map(s => `
                        <tr>
                            <td><strong>💼 ${s.full_name}</strong></td>
                            <td><code>${s.email}</code></td>
                            <td>${s.phone || "---"}</td>
                            <td>
                                <span class="status-pill status-confirmed">
                                    ${s.department || "Xử lý đơn & Kho"}
                                </span>
                            </td>
                            <td><span class="portal-badge-role badge-role-staff">Nhân Viên</span></td>
                            <td>
                                <button class="btn-secondary" style="color:#b91c1c; border-color:#fecaca; background:#fef2f2; padding:6px 12px; font-size:12px;" onclick="window.removeStaffMemberAdmin('${s.id}')">
                                    Xóa quyền
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function setupEventListeners() {
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

    // 2. Tìm kiếm & Lọc đơn hàng
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

    // 3. Thêm sản phẩm mới form
    const formAddProduct = document.getElementById("formAdminAddProduct");
    formAddProduct?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = formAddProduct.querySelector("button[type=submit]");
        btn.disabled = true;
        btn.textContent = "Đang lưu vào Supabase Cloud...";

        const prod = {
            name: document.getElementById("newProdName").value.trim(),
            category_slug: document.getElementById("newProdCategory").value,
            wood_type: document.getElementById("newProdWood").value.trim(),
            price: Number(document.getElementById("newProdPrice").value),
            original_price: Number(document.getElementById("newProdOriginalPrice").value || 0),
            dimensions: document.getElementById("newProdDimensions").value.trim(),
            image_url: document.getElementById("newProdImage").value.trim(),
            short_desc: document.getElementById("newProdShortDesc").value.trim(),
            description: document.getElementById("newProdDesc").value.trim(),
            stock_quantity: Number(document.getElementById("newProdStock").value || 10)
        };

        const res = await db.addProduct(prod);
        btn.disabled = false;
        btn.textContent = "Lưu Sản Phẩm Vào Database";

        if (res.success) {
            alert("Thành công! Sản phẩm đã được đưa lên hệ thống.");
            formAddProduct.reset();
            await loadAllData();
            window.switchAdminTab("tabProducts");
        } else {
            alert("Có lỗi khi thêm sản phẩm: " + res.message);
        }
    });

    // 4. Thêm nhân viên mới form
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
            renderStaffTab();
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
window.switchAdminTab = function(tabPaneId) {
    document.querySelectorAll(".admin-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.target === tabPaneId);
    });
    document.querySelectorAll(".portal-tab-pane").forEach(p => {
        p.classList.toggle("active", p.id === tabPaneId);
    });
};

window.updateOrderStatusAdmin = async function(orderId, status) {
    const res = await db.updateOrderStatus(orderId, status);
    alert(`Đã cập nhật trạng thái đơn hàng sang: ${formatStatusLabel(status)}`);
    await loadAllData();
};

window.deleteProductAdmin = async function(productId) {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi cơ sở dữ liệu Supabase không?")) {
        await db.deleteProduct(productId);
        alert("Đã xóa sản phẩm thành công!");
        await loadAllData();
    }
};

window.removeStaffMemberAdmin = function(staffId) {
    if (confirm("Bạn có chắc chắn muốn xóa quyền tài khoản nhân viên này không?")) {
        auth.deleteStaffAccount(staffId);
        alert("Đã xóa nhân viên!");
        renderStaffTab();
    }
};

window.viewOrderDetail = function(code) {
    const ord = allOrders.find(o => o.order_code === code);
    if (!ord) return;
    alert(`CHI TIẾT ĐƠN HÀNG: ${ord.order_code}\nKhách hàng: ${ord.customer_name}\nSĐT: ${ord.customer_phone}\nĐịa chỉ: ${ord.shipping_address}\nTổng tiền: ${cart.formatCurrency(ord.total_amount)}\nGhi chú: ${ord.note || "Không có"}`);
};
