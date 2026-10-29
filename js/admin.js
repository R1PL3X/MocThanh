/**
 * MODULE QUẢN TRỊ ADMIN & CỔNG TÁC NGHIỆP NHÂN VIÊN MORIOO
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

export function initAdminControls() {
    // Modal Cấu hình Supabase
    const setupBtns = document.querySelectorAll(".btn-open-supabase-setup");
    const setupModal = document.getElementById("supabaseSetupModal");
    const closeSetupModal = document.getElementById("closeSupabaseModal");
    const formSetup = document.getElementById("supabaseSetupForm");
    const btnTest = document.getElementById("btnTestSupabase");
    const testResult = document.getElementById("supabaseTestResult");

    // Modal Admin Tối Cao
    const adminModal = document.getElementById("adminModal");
    const closeAdminBtn = document.getElementById("closeAdminModal");
    const openAdminBtns = document.querySelectorAll(".btn-open-admin");

    // Modal Cổng Nhân Viên
    const staffModal = document.getElementById("staffModal");
    const closeStaffBtn = document.getElementById("closeStaffModal");
    const openStaffBtns = document.querySelectorAll(".btn-open-staff");

    // Cấu hình Supabase Form
    if (formSetup) {
        const inputUrl = document.getElementById("inputSupabaseUrl");
        const inputKey = document.getElementById("inputSupabaseKey");

        if (inputUrl) inputUrl.value = SupabaseConfig.getUrl();
        if (inputKey) inputKey.value = SupabaseConfig.getAnonKey();

        setupBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                if (setupModal) setupModal.classList.add("active");
            });
        });

        if (closeSetupModal) {
            closeSetupModal.addEventListener("click", () => {
                setupModal.classList.remove("active");
            });
        }

        if (btnTest) {
            btnTest.addEventListener("click", async () => {
                btnTest.disabled = true;
                btnTest.innerHTML = `<span class="spinner"></span> Đang kết nối...`;
                testResult.className = "test-result loading";
                testResult.textContent = "Đang gửi truy vấn tới Supabase Cloud...";

                const urlVal = inputUrl.value.trim();
                const keyVal = inputKey.value.trim();

                const res = await db.testConnection(urlVal, keyVal);
                btnTest.disabled = false;
                btnTest.innerHTML = `Kiểm tra kết nối ngay`;

                if (res.success) {
                    testResult.className = "test-result success";
                    testResult.innerHTML = `<strong>Thành công!</strong> ${res.message}`;
                    updateConnectionStatusBadge(true);
                } else {
                    testResult.className = "test-result error";
                    testResult.innerHTML = `<strong>Chưa kết nối được:</strong> ${res.message}`;
                    updateConnectionStatusBadge(false);
                }
            });
        }

        formSetup.addEventListener("submit", (e) => {
            e.preventDefault();
            const u = inputUrl.value.trim();
            const k = inputKey.value.trim();
            SupabaseConfig.setCredentials(u, k);
            db.initClient();
            alert("Đã lưu cấu hình Supabase! Trang sẽ tự động tải lại dữ liệu mới nhất.");
            setupModal.classList.remove("active");
            window.location.reload();
        });
    }

    // Modal Admin
    openAdminBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            if (!auth.isAdmin()) {
                document.getElementById("btnOpenAuthModal")?.click();
                alert("Vui lòng đăng nhập bằng tài khoản Quản Trị Viên (admin@morioo.vn)!");
                return;
            }
            if (adminModal) {
                adminModal.classList.add("active");
                loadAdminDashboard();
            }
        });
    });

    closeAdminBtn?.addEventListener("click", () => {
        adminModal?.classList.remove("active");
    });

    // Modal Nhân Viên
    openStaffBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            if (!auth.isStaff() && !auth.isAdmin()) {
                document.getElementById("btnOpenAuthModal")?.click();
                alert("Vui lòng đăng nhập tài khoản Nhân Viên (nhanvien@morioo.vn)!");
                return;
            }
            if (staffModal) {
                staffModal.classList.add("active");
                loadStaffDashboard();
            }
        });
    });

    closeStaffBtn?.addEventListener("click", () => {
        staffModal?.classList.remove("active");
    });

    // Xử lý Thêm Sản Phẩm Mới (Chỉ Admin)
    const addProductForm = document.getElementById("formAddProduct");
    if (addProductForm) {
        addProductForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = addProductForm.querySelector("button[type=submit]");
            submitBtn.disabled = true;
            submitBtn.textContent = "Đang lưu vào Supabase...";

            const prod = {
                name: document.getElementById("adminProdName").value,
                category_slug: document.getElementById("adminProdCategory").value,
                wood_type: document.getElementById("adminProdWood").value,
                price: Number(document.getElementById("adminProdPrice").value),
                original_price: Number(document.getElementById("adminProdOriginalPrice").value || 0),
                dimensions: document.getElementById("adminProdDimensions").value,
                image_url: document.getElementById("adminProdImage").value,
                short_desc: document.getElementById("adminProdShortDesc").value,
                description: document.getElementById("adminProdDesc").value,
                stock_quantity: Number(document.getElementById("adminProdStock").value || 10)
            };

            const result = await db.addProduct(prod);
            submitBtn.disabled = false;
            submitBtn.textContent = "Lưu Sản Phẩm Vào Database";

            if (result.success) {
                alert(`Đã thêm sản phẩm thành công ${result.cloud ? "(Lưu vào Supabase Cloud)" : "(Lưu Offline)"}!`);
                addProductForm.reset();
                window.dispatchEvent(new CustomEvent("product-list-changed"));
                loadAdminDashboard();
            }
        });
    }

    // Xử lý Tạo Tài Khoản Nhân Viên Mới (Chỉ Admin)
    const formAddStaff = document.getElementById("formAddStaff");
    formAddStaff?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("staffNewName").value;
        const email = document.getElementById("staffNewEmail").value;
        const phone = document.getElementById("staffNewPhone").value;
        const pass = document.getElementById("staffNewPass").value;
        const dept = document.getElementById("staffNewDept").value;

        const res = await auth.createStaffAccount({
            fullName: name,
            email,
            phone,
            password: pass,
            department: dept
        });

        alert(res.message);
        if (res.success) {
            formAddStaff.reset();
            renderStaffListAdmin();
        }
    });

    // Tab chuyển đổi trong Admin
    const adminTabs = document.querySelectorAll(".admin-tab-btn");
    adminTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            adminTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const target = tab.dataset.tab;
            document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.remove("active"));
            document.getElementById(target)?.classList.add("active");
        });
    });

    // Tab chuyển đổi trong Staff Workspace
    const staffTabs = document.querySelectorAll(".staff-tab-btn");
    staffTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            staffTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const target = tab.dataset.tab;
            document.querySelectorAll(".staff-tab-pane").forEach(p => p.classList.remove("active"));
            document.getElementById(target)?.classList.add("active");
        });
    });

    checkInitialConnection();
}

async function checkInitialConnection() {
    if (SupabaseConfig.isConfigured()) {
        const res = await db.testConnection();
        updateConnectionStatusBadge(res.success);
    } else {
        updateConnectionStatusBadge(false);
    }
}

export function updateConnectionStatusBadge(isOnline) {
    const badges = document.querySelectorAll(".supabase-status-badge");
    badges.forEach(badge => {
        if (isOnline) {
            badge.className = "supabase-status-badge online";
            badge.innerHTML = `<span class="dot"></span> <span>Supabase: Online</span>`;
        } else {
            badge.className = "supabase-status-badge offline";
            badge.innerHTML = `<span class="dot"></span> <span>Supabase: Demo Mẫu</span>`;
        }
    });
}

/**
 * Tải Bảng Điều Khiển Quản Trị Viên (Admin Dashboard)
 */
export async function loadAdminDashboard() {
    const ordersContainer = document.getElementById("adminOrdersList");
    const statsRevenue = document.getElementById("adminStatRevenue");
    const statsOrders = document.getElementById("adminStatOrders");
    const statsProducts = document.getElementById("adminStatProducts");
    const statsStaff = document.getElementById("adminStatStaff");

    if (!ordersContainer) return;

    ordersContainer.innerHTML = `<div class="loading-state"><div class="loader-circle"></div><p>Đang tải dữ liệu từ Supabase Cloud...</p></div>`;

    const [orders, products] = await Promise.all([
        db.getOrders(),
        db.getProducts()
    ]);

    // Tính toán số liệu thống kê
    const totalRev = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const staffList = auth.getStaffAccounts();

    if (statsRevenue) statsRevenue.textContent = cart.formatCurrency(totalRev);
    if (statsOrders) statsOrders.textContent = `${orders.length} đơn hàng`;
    if (statsProducts) statsProducts.textContent = `${products.length} sản phẩm`;
    if (statsStaff) statsStaff.textContent = `${staffList.length} nhân viên`;

    // Hiển thị danh sách đơn hàng
    if (orders.length === 0) {
        ordersContainer.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center;">Chưa có đơn hàng nào trên Supabase.</div>`;
    } else {
        ordersContainer.innerHTML = `
            <div class="orders-table-wrapper">
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Khách hàng</th>
                            <th>SĐT / Địa chỉ</th>
                            <th>Tổng tiền</th>
                            <th>Thanh toán</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(o => `
                            <tr>
                                <td><strong>${o.order_code || "MR-ORDER"}</strong><br><small style="color:#888;">${new Date(o.created_at).toLocaleDateString("vi-VN")}</small></td>
                                <td><strong>${o.customer_name}</strong><br><small style="color:#666;">${o.customer_email || "Không có email"}</small></td>
                                <td>${o.customer_phone}<br><small class="col-address">${o.shipping_address}</small></td>
                                <td><strong style="color:var(--brand-red);">${cart.formatCurrency(o.total_amount)}</strong></td>
                                <td><span class="badge-pay">${o.payment_method === "cod" ? "COD" : "Chuyển khoản"}</span></td>
                                <td>
                                    <select class="status-select" onchange="window.changeOrderStatus('${o.id || o.order_code}', this.value)">
                                        <option value="pending" ${o.status === "pending" ? "selected" : ""}>⏳ Chờ xử lý</option>
                                        <option value="confirmed" ${o.status === "confirmed" ? "selected" : ""}>📞 Đã xác nhận</option>
                                        <option value="shipping" ${o.status === "shipping" ? "selected" : ""}>🚚 Đang giao hàng</option>
                                        <option value="completed" ${o.status === "completed" ? "selected" : ""}>✅ Hoàn thành</option>
                                        <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>❌ Đã hủy</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn-sm-action" onclick="alert('Đơn hàng: ${o.order_code}\\nGhi chú: ${o.note || "Không có"}')">Xem ghi chú</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderStaffListAdmin();
    renderProductsListAdmin(products);
}

/**
 * Hiển thị danh sách nhân viên trong tab Quản lý nhân viên của Admin
 */
function renderStaffListAdmin() {
    const container = document.getElementById("adminStaffList");
    if (!container) return;

    const staffList = auth.getStaffAccounts();
    if (staffList.length === 0) {
        container.innerHTML = `<p style="padding:20px; color:#888;">Chưa có nhân viên nào. Hãy tạo tài khoản nhân viên ở bên phải.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="orders-table-wrapper">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Họ và tên</th>
                        <th>Email đăng nhập</th>
                        <th>Số điện thoại</th>
                        <th>Bộ phận</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${staffList.map(s => `
                        <tr>
                            <td><strong>💼 ${s.full_name}</strong></td>
                            <td><code>${s.email}</code></td>
                            <td>${s.phone || "---"}</td>
                            <td><span class="badge-pay" style="background:#e0f2fe; color:#0369a1;">${s.department || "Bán hàng & Kho"}</span></td>
                            <td>
                                <button class="btn-sm-action text-red" onclick="window.removeStaffMember('${s.id}')">Xóa quyền</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Hiển thị danh sách sản phẩm trong tab Quản lý sản phẩm của Admin
 */
function renderProductsListAdmin(products) {
    const container = document.getElementById("adminProductsList");
    if (!container) return;

    container.innerHTML = `
        <div class="orders-table-wrapper" style="max-height:350px; overflow-y:auto;">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Hình ảnh</th>
                        <th>Tên sản phẩm</th>
                        <th>Chất liệu</th>
                        <th>Giá bán</th>
                        <th>Kho</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td><img src="${p.image_url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                            <td><strong>${p.name}</strong></td>
                            <td><span class="wood-tag">${p.wood_type}</span></td>
                            <td><strong>${cart.formatCurrency(p.price)}</strong></td>
                            <td>${p.stock_quantity || 10} cái</td>
                            <td>
                                <button class="btn-sm-action text-red" onclick="window.removeProductById('${p.id || p.slug}')">Xóa</button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Tải Cổng Tác Nghiệp Nhân Viên (Staff Workspace)
 */
export async function loadStaffDashboard() {
    const container = document.getElementById("staffOrdersList");
    const user = auth.getCurrentUser();
    const staffNameEl = document.getElementById("staffLoggedName");
    const staffDeptEl = document.getElementById("staffLoggedDept");

    if (staffNameEl && user) staffNameEl.textContent = user.full_name;
    if (staffDeptEl && user) staffDeptEl.textContent = user.department || "Xử lý đơn hàng & Kho";

    if (!container) return;
    container.innerHTML = `<div class="loading-state"><div class="loader-circle"></div><p>Đang tải đơn hàng cần xử lý...</p></div>`;

    const [orders, products] = await Promise.all([
        db.getOrders(),
        db.getProducts()
    ]);

    // Thống kê nhanh của ca trực
    const pendingCount = orders.filter(o => o.status === "pending").length;
    const shippingCount = orders.filter(o => o.status === "shipping").length;
    const completedCount = orders.filter(o => o.status === "completed").length;

    document.getElementById("staffCountPending").textContent = pendingCount;
    document.getElementById("staffCountShipping").textContent = shippingCount;
    document.getElementById("staffCountCompleted").textContent = completedCount;

    if (orders.length === 0) {
        container.innerHTML = `<div style="padding:30px; text-align:center; color:#777;">Hiện không có đơn hàng nào cần xử lý.</div>`;
    } else {
        container.innerHTML = `
            <div class="staff-orders-cards">
                ${orders.map(o => `
                    <div class="staff-order-card ${o.status === "pending" ? "highlight-pending" : ""}">
                        <div class="staff-card-header">
                            <div>
                                <strong style="font-size:14px; color:var(--brand-red);">${o.order_code}</strong>
                                <span style="font-size:11px; color:#888; margin-left:8px;">${new Date(o.created_at).toLocaleString("vi-VN")}</span>
                            </div>
                            <span class="badge-status-pill status-${o.status || 'pending'}">
                                ${o.status === 'completed' ? 'Hoàn thành' : o.status === 'shipping' ? 'Đang giao' : o.status === 'confirmed' ? 'Đã xác nhận' : o.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý'}
                            </span>
                        </div>

                        <div class="staff-card-body">
                            <div class="cust-info">
                                <strong>👤 ${o.customer_name}</strong> - 📞 <a href="tel:${o.customer_phone}" style="color:var(--brand-red); font-weight:700;">${o.customer_phone}</a>
                                <div style="color:#555; font-size:12px; margin-top:3px;">📍 ${o.shipping_address}</div>
                                ${o.note ? `<div style="color:#b45309; font-size:11.5px; margin-top:2px;">💬 Ghi chú khách: <em>${o.note}</em></div>` : ""}
                            </div>
                            <div class="cust-total">
                                <span>Tổng tiền:</span>
                                <strong>${cart.formatCurrency(o.total_amount)}</strong>
                            </div>
                        </div>

                        <div class="staff-card-actions">
                            <span style="font-size:11px; font-weight:600; color:#555;">Chuyển nhanh trạng thái:</span>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button class="btn-staff-act act-confirm" onclick="window.staffUpdateOrder('${o.id || o.order_code}', 'confirmed')">📞 Đã gọi khách</button>
                                <button class="btn-staff-act act-ship" onclick="window.staffUpdateOrder('${o.id || o.order_code}', 'shipping')">🚚 Giao bưu tá</button>
                                <button class="btn-staff-act act-done" onclick="window.staffUpdateOrder('${o.id || o.order_code}', 'completed')">✅ Đã giao xong</button>
                                <button class="btn-staff-act act-cancel" onclick="window.staffUpdateOrder('${o.id || o.order_code}', 'cancelled')">❌ Hủy đơn</button>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    renderStaffInventory(products);
}

function renderStaffInventory(products) {
    const container = document.getElementById("staffInventoryList");
    if (!container) return;

    container.innerHTML = `
        <div class="orders-table-wrapper" style="max-height:400px; overflow-y:auto;">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Ảnh</th>
                        <th>Sản phẩm gỗ</th>
                        <th>Chất liệu</th>
                        <th>Quy cách / Kích thước</th>
                        <th>Giá bán lẻ</th>
                        <th>Tồn kho</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td><img src="${p.image_url}" style="width:36px; height:36px; object-fit:cover; border-radius:3px;"></td>
                            <td><strong>${p.name}</strong></td>
                            <td><span class="wood-tag">${p.wood_type}</span></td>
                            <td>${p.dimensions || "Tiêu chuẩn"}</td>
                            <td><strong style="color:var(--brand-red);">${cart.formatCurrency(p.price)}</strong></td>
                            <td><span class="badge-pay" style="background:${p.stock_quantity > 0 ? '#dcfce7; color:#15803d' : '#fee2e2; color:#b91c1c'}">${p.stock_quantity || 10} cái</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// Window global handlers
window.changeOrderStatus = async function(orderId, status) {
    await db.updateOrderStatus(orderId, status);
    alert(`Đã cập nhật trạng thái đơn hàng sang: ${status}`);
    loadAdminDashboard();
};

window.staffUpdateOrder = async function(orderId, status) {
    await db.updateOrderStatus(orderId, status);
    loadStaffDashboard();
};

window.removeStaffMember = function(staffId) {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản nhân viên này không?")) {
        auth.deleteStaffAccount(staffId);
        renderStaffListAdmin();
    }
};

window.removeProductById = async function(prodId) {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi cơ sở dữ liệu không?")) {
        await db.deleteProduct(prodId);
        loadAdminDashboard();
        window.dispatchEvent(new CustomEvent("product-list-changed"));
    }
};
