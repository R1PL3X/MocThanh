/**
 * GIAO DIỆN XÁC THỰC GỘP LÀM 1 (UNIFIED AUTH UI)
 * Tự động nhận diện quyền Admin, Nhân Viên, Khách Hàng
 */

import { auth } from "./auth.js";
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

    // Mở Auth Modal
    openAuthBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode || "login";
            openAuthModal(mode);
        });
    });

    closeAuthBtn?.addEventListener("click", () => {
        authModal?.classList.remove("active");
    });

    closeCustOrdersBtn?.addEventListener("click", () => {
        customerOrdersModal?.classList.remove("active");
    });

    // Chuyển tab giữa Đăng Nhập & Đăng Ký (Gộp làm 1)
    const modeTabs = document.querySelectorAll(".unified-auth-tab");
    modeTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            modeTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const mode = tab.dataset.mode; // 'login' | 'register'

            document.getElementById("paneAuthLogin").style.display = mode === "login" ? "block" : "none";
            document.getElementById("paneAuthRegister").style.display = mode === "register" ? "block" : "none";
            clearAuthMessages();
        });
    });

    // 1. Form Đăng Nhập Chung (Gộp làm 1 - Hệ thống tự nhận diện Admin / Nhân viên / Khách)
    const formLogin = document.getElementById("formUnifiedLogin");
    formLogin?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("unifiedLoginEmail").value;
        const pass = document.getElementById("unifiedLoginPass").value;
        const msgEl = document.getElementById("msgUnifiedLogin");

        setButtonLoading("btnSubmitUnifiedLogin", true);
        const res = await auth.login({ email, password: pass });
        setButtonLoading("btnSubmitUnifiedLogin", false);

        showAuthMessage(msgEl, res.success, res.message);

        if (res.success) {
            setTimeout(() => {
                authModal?.classList.remove("active");
                formLogin.reset();

                // Tự động chuyển tới trang riêng theo đúng vai trò
                if (res.user.role === "admin") {
                    window.location.href = "admin.html";
                } else if (res.user.role === "staff") {
                    window.location.href = "staff.html";
                }
            }, 600);
        }
    });

    // 2. Form Đăng Ký Khách Hàng Mới
    const formRegister = document.getElementById("formUnifiedRegister");
    formRegister?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regCustName").value;
        const phone = document.getElementById("regCustPhone").value;
        const email = document.getElementById("regCustEmail").value;
        const pass = document.getElementById("regCustPass").value;
        const confirm = document.getElementById("regCustPassConfirm").value;
        const msgEl = document.getElementById("msgUnifiedRegister");

        if (pass !== confirm) {
            showAuthMessage(msgEl, false, "Mật khẩu xác nhận không khớp!");
            return;
        }

        setButtonLoading("btnSubmitUnifiedRegister", true);
        const res = await auth.registerCustomer({ fullName: name, email, phone, password: pass });
        setButtonLoading("btnSubmitUnifiedRegister", false);

        showAuthMessage(msgEl, res.success, res.message);
        if (res.success) {
            setTimeout(() => {
                authModal?.classList.remove("active");
                formRegister.reset();
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

    // Nút Xem đơn hàng của khách
    btnOpenCustOrders?.addEventListener("click", (e) => {
        e.preventDefault();
        userDropdownMenu?.classList.remove("active");
        renderCustomerOrders();
        customerOrdersModal?.classList.add("active");
    });

    // Lắng nghe thay đổi trạng thái đăng nhập
    window.addEventListener("auth-state-changed", () => {
        updateTopBarUserUI();
        autofillCheckoutUser();
    });

    updateTopBarUserUI();
    autofillCheckoutUser();
}

export function openAuthModal(mode = "login", customMessage = null) {
    const authModal = document.getElementById("authModal");
    if (!authModal) return;

    document.querySelectorAll(".unified-auth-tab").forEach(t => {
        t.classList.toggle("active", t.dataset.mode === mode);
    });

    document.getElementById("paneAuthLogin").style.display = mode === "login" ? "block" : "none";
    document.getElementById("paneAuthRegister").style.display = mode === "register" ? "block" : "none";

    clearAuthMessages();

    if (customMessage) {
        const msgEl = document.getElementById("msgUnifiedLogin");
        if (msgEl) showAuthMessage(msgEl, false, customMessage);
    }

    authModal.classList.add("active");
}

function updateTopBarUserUI() {
    const notLoggedInBtn = document.getElementById("btnOpenAuthModal");
    const userDropdown = document.getElementById("userDropdown");
    const nameEl = document.getElementById("userDisplayName");
    const badgeEl = document.getElementById("userRoleBadge");
    const iconEl = document.getElementById("userRoleIcon");
    const customerLinks = document.getElementById("customerMenuLinks");
    const adminLinks = document.getElementById("adminMenuLinks");
    const staffLinks = document.getElementById("staffMenuLinks");

    const user = auth.getCurrentUser();

    if (user) {
        if (notLoggedInBtn) notLoggedInBtn.style.display = "none";
        if (userDropdown) userDropdown.style.display = "inline-block";

        if (nameEl) nameEl.textContent = user.full_name || user.email;

        if (user.role === "admin") {
            if (badgeEl) {
                badgeEl.textContent = "Admin";
                badgeEl.className = "user-badge badge-admin";
            }
            if (iconEl) iconEl.textContent = "👑";
            if (customerLinks) customerLinks.style.display = "none";
            if (adminLinks) adminLinks.style.display = "block";
            if (staffLinks) staffLinks.style.display = "none";
        } else if (user.role === "staff") {
            if (badgeEl) {
                badgeEl.textContent = "Nhân Viên";
                badgeEl.className = "user-badge badge-staff";
            }
            if (iconEl) iconEl.textContent = "💼";
            if (customerLinks) customerLinks.style.display = "none";
            if (adminLinks) adminLinks.style.display = "none";
            if (staffLinks) staffLinks.style.display = "block";
        } else {
            if (badgeEl) {
                badgeEl.textContent = "Khách Hàng";
                badgeEl.className = "user-badge";
            }
            if (iconEl) iconEl.textContent = "👤";
            if (customerLinks) customerLinks.style.display = "block";
            if (adminLinks) adminLinks.style.display = "none";
            if (staffLinks) staffLinks.style.display = "none";
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
                            ${o.status === "completed" ? "Đã giao thành công" : o.status === "shipping" ? "Đang giao hàng" : o.status === "confirmed" ? "Đã xác nhận" : o.status === "cancelled" ? "Đã hủy" : "Đang xử lý"}
                        </span>
                    </div>
                    <div style="font-size:13px; margin-bottom:6px;">
                        <span>Địa chỉ: <strong>${o.shipping_address}</strong></span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #eee; padding-top:8px; margin-top:8px;">
                        <span style="font-size:12px; color:#666;">Thanh toán: ${o.payment_method === "cod" ? "COD nhận hàng" : "Chuyển khoản VietQR"}</span>
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
        btn.innerHTML = `<span class="spinner"></span> Đang xác thực...`;
    } else {
        btn.innerHTML = btn.dataset.origText || "Hoàn tất";
    }
}
