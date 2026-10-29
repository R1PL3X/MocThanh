/**
 * MODULE QUẢN TRỊ & CẤU HÌNH SUPABASE TRỰC QUAN
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";

export function initAdminControls() {
    // Nút mở modal cấu hình Supabase
    const setupBtns = document.querySelectorAll(".btn-open-supabase-setup");
    const setupModal = document.getElementById("supabaseSetupModal");
    const closeSetupModal = document.getElementById("closeSupabaseModal");
    const formSetup = document.getElementById("supabaseSetupForm");
    const btnTest = document.getElementById("btnTestSupabase");
    const testResult = document.getElementById("supabaseTestResult");

    // Nút mở trang Admin quản lý sản phẩm & đơn hàng
    const adminModal = document.getElementById("adminModal");
    const openAdminBtns = document.querySelectorAll(".btn-open-admin");
    const closeAdminBtn = document.getElementById("closeAdminModal");

    // Đổ dữ liệu hiện tại vào form cấu hình Supabase
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

        // Kiểm tra kết nối thử nghiệm
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

        // Lưu cấu hình
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
        btn.addEventListener("click", () => {
            if (adminModal) {
                adminModal.classList.add("active");
                loadAdminData();
            }
        });
    });

    if (closeAdminBtn && adminModal) {
        closeAdminBtn.addEventListener("click", () => {
            adminModal.classList.remove("active");
        });
    }

    // Xử lý thêm sản phẩm mới
    const addProductForm = document.getElementById("formAddProduct");
    if (addProductForm) {
        addProductForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = addProductForm.querySelector("button[type=submit]");
            submitBtn.disabled = true;
            submitBtn.textContent = "Đang lưu...";

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
            submitBtn.textContent = "Thêm Sản Phẩm Mới";

            if (result.success) {
                alert(`Đã thêm sản phẩm thành công ${result.cloud ? "(Đã lưu vào Supabase Cloud)" : "(Lưu chế độ Offline)"}!`);
                addProductForm.reset();
                window.dispatchEvent(new CustomEvent("product-list-changed"));
                loadAdminData();
            }
        });
    }

    // Tab chuyển đổi trong admin (Đơn hàng / Sản phẩm)
    const adminTabs = document.querySelectorAll(".admin-tab-btn");
    adminTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            adminTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const target = tab.dataset.tab;
            document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.remove("active"));
            const targetPane = document.getElementById(target);
            if (targetPane) targetPane.classList.add("active");
        });
    });

    // Cập nhật trạng thái badge ban đầu
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
            badge.innerHTML = `<span class="dot"></span> <span>Supabase: Online (Toàn Cầu)</span>`;
            badge.title = "Dữ liệu đang kết nối trực tiếp với Supabase Cloud. Mọi người đều xem và mua hàng được.";
        } else {
            badge.className = "supabase-status-badge offline";
            badge.innerHTML = `<span class="dot"></span> <span>Supabase: Demo Mẫu</span>`;
            badge.title = "Bấm để nhập Project URL & Anon Key từ Supabase.com của bạn.";
        }
    });
}

async function loadAdminData() {
    const ordersContainer = document.getElementById("adminOrdersList");
    if (!ordersContainer) return;

    ordersContainer.innerHTML = `<div class="loading-spinner">Đang tải dữ liệu từ Supabase...</div>`;
    const orders = await db.getOrders();

    if (!orders || orders.length === 0) {
        ordersContainer.innerHTML = `<div class="empty-state">Chưa có đơn hàng nào. Hãy thử đặt một đơn hàng trên web!</div>`;
        return;
    }

    ordersContainer.innerHTML = `
        <div class="orders-table-wrapper">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        <th>Địa chỉ giao</th>
                        <th>Tổng tiền</th>
                        <th>Thanh toán</th>
                        <th>Thời gian</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                        <tr>
                            <td><strong>${o.order_code || "MJ-ORDER"}</strong></td>
                            <td>${o.customer_name}</td>
                            <td>${o.customer_phone}</td>
                            <td class="col-address">${o.shipping_address}</td>
                            <td><strong>${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(o.total_amount).replace("₫", "VNĐ")}</strong></td>
                            <td><span class="badge-pay">${o.payment_method === "cod" ? "COD" : "Chuyển khoản"}</span></td>
                            <td>${new Date(o.created_at).toLocaleString("vi-VN")}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}
