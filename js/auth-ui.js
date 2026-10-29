/**
 * GIAO DIỆN & SỰ KIỆN XÁC THỰC KHÁCH HÀNG / QUẢN TRỊ VIÊN
 */

import { auth, ADMIN_SECRET_KEY } from "./auth.js";
import { db } from "./supabase-client.js";
import { cart } from "./cart.js";

export function initAuthUI() {
    const authModal = document.getElementById("authModal");
    const closeAuthBtn = document.getElementById("closeAuthModal");
    const openAuthBtns = document.querySelectorAll(".btn-open-auth-modal");

    // Modal Đơn hàng của khách
    const customerOrdersModal = document.getElementById("customerOrdersModal");
    const closeCustOrdersBtn = document.getElementById("closeCustomerOrdersModal");
    const btnOpenCustOrders = document.getElementById("btnOpenCustomerOrders");

    // Mở Modal Auth
    openAuthBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const defaultRole = btn.dataset.role || "customer";
            openAuth(defaultRole);
        });
    });

    closeAuthBtn?.addEventListener("click", () => {
        authModal?.classList.remove("active");
    });

    closeCustOrdersBtn?.addEventListener("click", () => {
        customerOrdersModal?.classList.remove("active");
    });

    // Chuyển đổi giữa 2 tab: Khách Hàng vs Quản Trị Viên
    const roleTabs = document.querySelectorAll(".auth-role-tab");
    roleTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            roleTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const role = tab.dataset.role;

            document.getElementById("roleSectionCustomer").style.display = role === "customer" ? "block" : "none";
            document.getElementById("roleSectionAdmin").style.display = role === "admin" ? "block" : "none";
            clearAuthMessages();
        });
    });

    // Chuyển đổi giữa Đăng Nhập & Đăng Ký cho Khách Hàng
    setupModeSwitch("customer");
    // Chuyển đổi giữa Đăng Nhập & Đăng Ký cho Quản Trị Viên
    setupModeSwitch("admin");

    // Xử lý các Form:
    // 1. Đăng nhập Khách Hàng
    const formLoginCustomer = document.getElementById("formLoginCustomer");
    formLoginCustomer?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginCustEmail").value;
        const pass = document.getElementById("loginCustPass").value;
        const msgEl = document.getElementById("msgLoginCustomer");

        setButtonLoading("btnLoginCustomer", true);
        const res = await auth.login({ email, password: pass, requiredRole: "customer" });
        setButtonLoading("btnLoginCustomer", false);

        showAuthMessage(msgEl, res.success, res.message);
        if (res.success) {
            setTimeout(() => {
                authModal?.classList.remove("active");
                formLoginCustomer.reset();
            }, 600);
        }
    });

    // 2. Đăng ký Khách Hàng
    const formRegCustomer = document.getElementById("formRegisterCustomer");
    formRegCustomer?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regCustName").value;
        const phone = document.getElementById("regCustPhone").value;
        const email = document.getElementById("regCustEmail").value;
        const pass = document.getElementById("regCustPass").value;
        const confirm = document.getElementById("regCustPassConfirm").value;
        const msgEl = document.getElementById("msgRegCustomer");

        if (pass !== confirm) {
            showAuthMessage(msgEl, false, "Mật khẩu xác nhận không khớp!");
            return;
        }

        setButtonLoading("btnRegCustomer", true);
        const res = await auth.registerCustomer({ fullName: name, email, phone, password: pass });
        setButtonLoading("btnRegCustomer", false);

        showAuthMessage(msgEl, res.success, res.message);
        if (res.success) {
            setTimeout(() => {
                authModal?.classList.remove("active");
                formRegCustomer.reset();
            }, 800);
        }
    });

    // 3. Đăng nhập Quản Trị Viên
    const formLoginAdmin = document.getElementById("formLoginAdmin");
    formLoginAdmin?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginAdminEmail").value;
        const pass = document.getElementById("loginAdminPass").value;
        const msgEl = document.getElementById("msgLoginAdmin");

        setButtonLoading("btnLoginAdmin", true);
        const res = await auth.login({ email, password: pass, requiredRole: "admin" });
        setButtonLoading("btnLoginAdmin", false);

        showAuthMessage(msgEl, res.success, res.message);
        if (res.success) {
            setTimeout(() => {
                authModal?.classList.remove("active");
                formLoginAdmin.reset();
                // Mở ngay trang Quản trị sau khi đăng nhập thành công
                document.getElementById("adminModal")?.classList.add("active");
            }, 600);
        }
    });

    // 4. Đăng ký Quản Trị Viên
    const formRegAdmin = document.getElementById("formRegisterAdmin");
    formRegAdmin?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regAdminName").value;
        const email = document.getElementById("regAdminEmail").value;
        const phone = document.getElementById("regAdminPhone")?.value || "";
        const pass = document.getElementById("regAdminPass").value;
        const key = document.getElementById("regAdminKey").value;
        const msgEl = document.getElementById("msgRegAdmin");

        setButtonLoading("btnRegAdmin", true);
        const res = await auth.registerAdmin({ fullName: name, email, phone, password: pass, adminKey: key });
        setButtonLoading("btnRegAdmin", false);

        showAuthMessage(msgEl, res.success, res.message);
        if (res.success) {
            setTimeout(() => {
                authModal?.classList.remove("active");
                formRegAdmin.reset();
                document.getElementById("adminModal")?.classList.add("active");
            }, 800);
        }
    });

    // Quản lý đóng mở Dropdown User trên Top bar
    const userDropdownBtn = document.getElementById("userDropdownBtn");
    const userDropdownMenu = document.getElementById("userDropdownMenu");
    userDropdownBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdownMenu?.classList.toggle("active");
    });

    document.addEventListener("click", () => {
        userDropdownMenu?.classList.remove("active");
    });

    // Nút Đăng Xuất
    document.getElementById("btnLogout")?.addEventListener("click", (e) => {
        e.preventDefault();
        auth.logout();
    });

    // Nút Xem đơn hàng của tôi
    btnOpenCustOrders?.addEventListener("click", (e) => {
        e.preventDefault();
        userDropdownMenu?.classList.remove("active");
        renderCustomerOrders();
        customerOrdersModal?.classList.add("active");
    });

    // Bảo vệ quyền Admin: Khi bấm nút Admin ở menu hoặc trang web
    const adminActionBtns = document.querySelectorAll(".btn-open-admin, .btn-open-admin-add");
    adminActionBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (!auth.isAdmin()) {
                e.preventDefault();
                e.stopImmediatePropagation();
                openAuth("admin", "Vui lòng đăng nhập tài khoản Quản Trị Viên để truy cập bảng điều khiển!");
            }
        });
    });

    // Lắng nghe thay đổi trạng thái đăng nhập
    window.addEventListener("auth-state-changed", () => {
        updateTopBarUserUI();
        autofillCheckoutUser();
    });

    // Cập nhật giao diện ban đầu
    updateTopBarUserUI();
    autofillCheckoutUser();
}

function openAuth(role = "customer", customMessage = null) {
    const authModal = document.getElementById("authModal");
    if (!authModal) return;

    // Kích hoạt tab tương ứng
    document.querySelectorAll(".auth-role-tab").forEach(t => {
        t.classList.toggle("active", t.dataset.role === role);
    });

    document.getElementById("roleSectionCustomer").style.display = role === "customer" ? "block" : "none";
    document.getElementById("roleSectionAdmin").style.display = role === "admin" ? "block" : "none";

    clearAuthMessages();

    if (customMessage) {
        const msgEl = role === "admin" ? document.getElementById("msgLoginAdmin") : document.getElementById("msgLoginCustomer");
        if (msgEl) showAuthMessage(msgEl, false, customMessage);
    }

    authModal.classList.add("active");
}

function setupModeSwitch(prefix) {
    const btns = document.querySelectorAll(`.mode-switch-${prefix} .auth-mode-btn`);
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            btns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const mode = btn.dataset.mode; // 'login' | 'register'

            document.getElementById(`pane-${prefix}-login`).style.display = mode === "login" ? "block" : "none";
            document.getElementById(`pane-${prefix}-register`).style.display = mode === "register" ? "block" : "none";
            clearAuthMessages();
        });
    });
}

function updateTopBarUserUI() {
    const notLoggedInBtn = document.getElementById("btnOpenAuthModal");
    const userDropdown = document.getElementById("userDropdown");
    const nameEl = document.getElementById("userDisplayName");
    const badgeEl = document.getElementById("userRoleBadge");
    const iconEl = document.getElementById("userRoleIcon");
    const customerLinks = document.getElementById("customerMenuLinks");
    const adminLinks = document.getElementById("adminMenuLinks");

    const user = auth.getCurrentUser();

    if (user) {
        if (notLoggedInBtn) notLoggedInBtn.style.display = "none";
        if (userDropdown) userDropdown.style.display = "inline-block";

        if (nameEl) nameEl.textContent = user.full_name || user.email;

        if (user.role === "admin") {
            if (badgeEl) {
                badgeEl.textContent = "Quản Trị";
                badgeEl.className = "user-badge badge-admin";
            }
            if (iconEl) iconEl.textContent = "👑";
            if (customerLinks) customerLinks.style.display = "none";
            if (adminLinks) adminLinks.style.display = "block";
        } else {
            if (badgeEl) {
                badgeEl.textContent = "Khách Hàng";
                badgeEl.className = "user-badge";
            }
            if (iconEl) iconEl.textContent = "👤";
            if (customerLinks) customerLinks.style.display = "block";
            if (adminLinks) adminLinks.style.display = "none";
        }
    } else {
        if (notLoggedInBtn) notLoggedInBtn.style.display = "inline-flex";
        if (userDropdown) userDropdown.style.display = "none";
    }
}

function autofillCheckoutUser() {
    const user = auth.getCurrentUser();
    if (!user) return;

    const nameInput = document.getElementById("customerName");
    const phoneInput = document.getElementById("customerPhone");
    const emailInput = document.getElementById("customerEmail");

    if (nameInput && !nameInput.value) nameInput.value = user.full_name || "";
    if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || "";
    if (emailInput && !emailInput.value) emailInput.value = user.email || "";
}

async function renderCustomerOrders() {
    const container = document.getElementById("customerOrdersContainer");
    if (!container) return;

    const user = auth.getCurrentUser();
    if (!user) {
        container.innerHTML = `<p>Vui lòng đăng nhập để xem đơn hàng.</p>`;
        return;
    }

    container.innerHTML = `<div class="loading-state"><div class="loader-circle"></div><p>Đang tải đơn hàng của bạn...</p></div>`;

    const allOrders = await db.getOrders();
    // Lọc theo email hoặc số điện thoại của user
    const userOrders = allOrders.filter(o =>
        (o.customer_email && o.customer_email.toLowerCase() === user.email.toLowerCase()) ||
        (user.phone && o.customer_phone && o.customer_phone.includes(user.phone))
    );

    if (userOrders.length === 0) {
        container.innerHTML = `
            <div class="cart-empty" style="padding:40px 20px;">
                <h4>Bạn chưa có đơn hàng nào</h4>
                <p>Khám phá các sản phẩm nội thất gỗ sồi MORIOO và đặt hàng ngay!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="customer-orders-list">
            ${userOrders.map(o => `
                <div class="customer-order-card">
                    <div class="order-header-row">
                        <div>
                            <strong>Mã: ${o.order_code}</strong>
                            <span style="color:#888; font-size:11px; margin-left:8px;">${new Date(o.created_at).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <span class="badge-pay" style="background:#e8f5e9; color:#2e7d32; font-weight:700;">
                            ${o.status === "completed" ? "Đã giao" : o.status === "shipping" ? "Đang giao hàng" : "Đang xử lý"}
                        </span>
                    </div>
                    <div style="font-size:13px; margin-bottom:6px;">
                        <span>Địa chỉ: <strong>${o.shipping_address}</strong></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #eee; padding-top:8px; margin-top:8px;">
                        <span style="font-size:12px; color:#666;">Phương thức: ${o.payment_method === "cod" ? "COD nhận hàng" : "Chuyển khoản"}</span>
                        <strong style="color:var(--brand-red); font-size:15px;">
                            ${cart.formatCurrency(o.total_amount)}
                        </strong>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function showAuthMessage(el, isSuccess, message) {
    if (!el) return;
    el.textContent = message;
    el.className = isSuccess ? "auth-msg success" : "auth-msg error";
}

function clearAuthMessages() {
    document.querySelectorAll(".auth-msg").forEach(el => {
        el.className = "auth-msg";
        el.textContent = "";
    });
}

function setButtonLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        btn.dataset.origText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span> Đang xử lý...`;
    } else {
        btn.innerHTML = btn.dataset.origText || "Hoàn tất";
    }
}
