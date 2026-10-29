/**
 * STAFF PAGE CONTROLLER (staff.html)
 * Quản lý toàn bộ chức năng Cổng Tác Nghiệp Nhân Viên MORIOO
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

document.addEventListener("DOMContentLoaded", () => {
    initStaffPage();
});

let allOrders = [];
let allProducts = [];
let activeStatusFilter = "all";

export async function initStaffPage() {
    const user = auth.getCurrentUser();

    // 1. Kiểm tra quyền Nhân Viên (hoặc Admin có thể vào xem)
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
        <div class="auth-gate-wrapper">
            <div class="auth-gate-card">
                <div class="auth-gate-icon">💼</div>
                <h1 class="auth-gate-title">Cổng Tác Nghiệp Nhân Viên MORIOO</h1>
                <p class="auth-gate-desc">Dành riêng cho nhân viên xử lý đơn hàng, gọi xác nhận khách và tra cứu tồn kho nội thất.</p>

                <div id="authGateStaffMsg" class="status-pill status-cancelled" style="display:none; width:100%; justify-content:center; margin-bottom:14px;"></div>

                <form id="formStaffLogin">
                    <div class="form-group" style="text-align:left;">
                        <label>Email Nhân Viên *</label>
                        <input type="email" id="gateStaffEmail" class="form-control" required value="nhanvien@morioo.vn">
                    </div>
                    <div class="form-group" style="text-align:left;">
                        <label>Mật Khẩu *</label>
                        <input type="password" id="gateStaffPass" class="form-control" required value="Staff123!">
                    </div>
                    <button type="submit" id="btnGateStaffSubmit" class="btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:15px; margin-top:6px; background:var(--brand-staff);">
                        Đăng Nhập Vào Ca Trực
                    </button>
                </form>

                <div class="auth-tip-card">
                    <strong>💼 Tài khoản nhân viên có sẵn:</strong><br>
                    Email: <code>nhanvien@morioo.vn</code><br>
                    Mật khẩu: <code>Staff123!</code>
                </div>

                <div style="margin-top:20px; font-size:13px;">
                    <a href="index.html" style="color:var(--text-muted); text-decoration:none;">← Quay về Trang Mua Sắm Khách Hàng</a>
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
            window.location.reload();
        } else {
            msgEl.style.display = "flex";
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
    if (staffDeptEl) staffDeptEl.textContent = user.department || "Xử lý đơn hàng & Kho";

    checkDatabaseConnection();
}

async function checkDatabaseConnection() {
    const badge = document.getElementById("topStaffDbBadge");
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

async function loadStaffData() {
    try {
        const [orders, products] = await Promise.all([
            db.getOrders(),
            db.getProducts()
        ]);
        allOrders = orders;
        allProducts = products;

        updateStaffKPIs();
        renderStaffOrders();
        renderStaffInventory();
    } catch (err) {
        console.error("Error loading staff data:", err);
    }
}

function updateStaffKPIs() {
    const pending = allOrders.filter(o => o.status === "pending").length;
    const shipping = allOrders.filter(o => o.status === "shipping").length;
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
        container.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); background: #ffffff; border-radius: 8px; border: 1px dashed var(--border-color);">Không có đơn hàng nào trong mục này.</div>`;
        return;
    }

    container.innerHTML = filtered.map(o => `
        <div class="staff-order-box ${o.status === 'pending' ? 'highlight-pending' : ''}">
            <div class="staff-order-header">
                <div>
                    <span class="staff-order-code">${o.order_code || "MR-ORDER"}</span>
                    <div class="staff-order-time">🕒 ${new Date(o.created_at).toLocaleString("vi-VN")}</div>
                </div>
                <span class="status-pill status-${o.status || 'pending'}">
                    ${formatStatusLabel(o.status)}
                </span>
            </div>

            <div class="staff-customer-info">
                <div>
                    <strong>👤 ${o.customer_name}</strong>
                    <a href="tel:${o.customer_phone}" class="phone-link" title="Bấm để gọi ngay">📞 ${o.customer_phone}</a>
                </div>
                <div class="staff-customer-address">📍 ${o.shipping_address}</div>
                ${o.note ? `<div class="staff-customer-note">💬 <strong>Ghi chú:</strong> "${o.note}"</div>` : ""}
            </div>

            <div class="staff-order-total">
                <span style="font-size:12.5px; color:var(--text-muted);">
                    Hình thức: <strong>${o.payment_method === 'banking' ? '💳 VietQR Chuyển khoản' : '💵 Thu tiền COD'}</strong>
                </span>
                <span style="color:var(--brand-red); font-size:16px;">${cart.formatCurrency(o.total_amount)}</span>
            </div>

            <div class="staff-order-actions-bar">
                <button class="btn-quick-act btn-quick-confirm" title="Xác nhận đã liên hệ khách chốt đơn" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'confirmed')">
                    📞 Đã gọi khách
                </button>
                <button class="btn-quick-act btn-quick-ship" title="Chuyển đơn cho đơn vị vận chuyển" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'shipping')">
                    🚚 Giao bưu tá
                </button>
                <button class="btn-quick-act btn-quick-done" title="Xác nhận khách đã nhận và thanh toán" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'completed')">
                    ✅ Đã giao xong
                </button>
                <button class="btn-quick-act btn-quick-cancel" title="Hủy đơn theo yêu cầu" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'cancelled')">
                    ❌ Hủy đơn
                </button>
            </div>
        </div>
    `).join("");
}

function renderStaffInventory() {
    const container = document.getElementById("staffInventoryTableContainer");
    if (!container) return;

    const query = document.getElementById("staffInventorySearch")?.value.toLowerCase().trim() || "";

    const filtered = allProducts.filter(p => {
        return !query || 
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.wood_type && p.wood_type.toLowerCase().includes(query)) ||
            (p.dimensions && p.dimensions.toLowerCase().includes(query));
    });

    container.innerHTML = `
        <div class="table-responsive">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Ảnh</th>
                        <th>Tên sản phẩm gỗ</th>
                        <th>Loại gỗ tự nhiên</th>
                        <th>Quy cách / Kích thước</th>
                        <th>Giá bán lẻ</th>
                        <th>Tồn kho sẵn</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => `
                        <tr>
                            <td>
                                <img src="${p.image_url}" alt="${p.name}" style="width:44px; height:44px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);">
                            </td>
                            <td>
                                <strong style="font-size:14px;">${p.name}</strong><br>
                                <small style="color:var(--text-muted);">${p.short_desc || ""}</small>
                            </td>
                            <td><span class="status-pill" style="background:#f1f5f9; color:var(--text-main);">🌲 ${p.wood_type}</span></td>
                            <td><strong>${p.dimensions || "Tiêu chuẩn"}</strong></td>
                            <td><strong style="color:var(--brand-red); font-size:14.5px;">${cart.formatCurrency(p.price)}</strong></td>
                            <td>
                                <span class="status-pill ${p.stock_quantity > 0 ? 'status-completed' : 'status-cancelled'}">
                                    ${p.stock_quantity > 0 ? `Còn ${p.stock_quantity} cái` : 'Hết hàng'}
                                </span>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function setupStaffEventListeners() {
    // 1. Chuyển tab chính (Xử lý đơn hàng vs Tra cứu kho)
    const tabBtns = document.querySelectorAll(".staff-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const targetId = btn.dataset.target;
            document.querySelectorAll(".portal-tab-pane").forEach(p => p.classList.remove("active"));
            document.getElementById(targetId)?.classList.add("active");
        });
    });

    // 2. Lọc trạng thái đơn hàng (Pills)
    const filterPills = document.querySelectorAll(".staff-filter-pill");
    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeStatusFilter = pill.dataset.status;
            renderStaffOrders();
        });
    });

    // 3. Tìm kiếm đơn hàng
    document.getElementById("staffOrderSearchInput")?.addEventListener("input", () => {
        renderStaffOrders();
    });

    // 4. Tìm kiếm kho
    document.getElementById("staffInventorySearch")?.addEventListener("input", () => {
        renderStaffInventory();
    });

    // 5. Nút đăng xuất
    document.querySelectorAll(".btn-staff-logout").forEach(b => {
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
        case "completed": return "✅ Hoàn tất";
        case "cancelled": return "❌ Đã hủy";
        default: return st;
    }
}

// Global functions for inline HTML calls
window.staffChangeOrderState = async function(orderId, status) {
    await db.updateOrderStatus(orderId, status);
    await loadStaffData();
};
