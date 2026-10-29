/**
 * STAFF PAGE CONTROLLER (staff.html)
 * Phụ trách:
 * 1. Sale, Tư vấn & Tạo đơn bán hàng nhanh (Hotline / Tại quầy)
 * 2. Xác nhận trạng thái đơn hàng (1 chạm)
 * 3. Quản lý kho & kiểm kê
 * 4. Thêm sản phẩm mới và TẢI ẢNH TỪ TRONG MÁY LÊN WEB
 */

import { SupabaseConfig } from "./supabase-config.js";
import { db } from "./supabase-client.js";
import { auth } from "./auth.js";
import { cart } from "./cart.js";

let allOrders = [];
let allProducts = [];
let activeStatusFilter = "all";
let uploadedImageDataUrl = ""; // Lưu chuỗi Base64 ảnh tải từ máy

document.addEventListener("DOMContentLoaded", () => {
    initStaffPage();
});

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
        <div class="auth-gate-wrapper">
            <div class="auth-gate-card">
                <div class="auth-gate-icon">💼</div>
                <h1 class="auth-gate-title">Cổng Tác Nghiệp Nhân Viên MORIOO</h1>
                <p class="auth-gate-desc">Dành riêng cho nhân viên sale bán hàng, tư vấn chốt đơn và quản lý kho nội thất.</p>

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
    if (staffDeptEl) staffDeptEl.textContent = user.department || "Tư Vấn & Bán Hàng";

    checkDatabaseConnection();
}

async function checkDatabaseConnection() {
    const badge = document.getElementById("topStaffDbBadge");
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

async function loadStaffData() {
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

/**
 * 1. SALE, TƯ VẤN & TẠO ĐƠN BÁN HÀNG
 */
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

    container.innerHTML = `
        <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
            <table class="portal-table">
                <thead>
                    <tr>
                        <th>Ảnh</th>
                        <th>Tên sản phẩm</th>
                        <th>Chất liệu gỗ</th>
                        <th>Kích thước quy cách</th>
                        <th>Giá bán lẻ</th>
                        <th>Kho</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsToRender.map(p => `
                        <tr>
                            <td>
                                <img src="${p.image_url}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);">
                            </td>
                            <td>
                                <strong>${p.name}</strong><br>
                                <small style="color:var(--text-muted);">${p.short_desc || ""}</small>
                            </td>
                            <td><span class="status-pill" style="background:#f1f5f9;">🌲 ${p.wood_type}</span></td>
                            <td><small><strong>${p.dimensions || "Tiêu chuẩn"}</strong></small></td>
                            <td><strong style="color:var(--brand-red); font-size:14px;">${cart.formatCurrency(p.price)}</strong></td>
                            <td>
                                <span class="status-pill ${p.stock_quantity > 0 ? 'status-completed' : 'status-cancelled'}">
                                    ${p.stock_quantity > 0 ? `Còn ${p.stock_quantity}` : 'Hết hàng'}
                                </span>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 2. XÁC NHẬN TRẠNG THÁI ĐƠN HÀNG
 */
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
                    <a href="tel:${o.customer_phone}" class="phone-link" title="Bấm để gọi ngay cho khách">📞 ${o.customer_phone}</a>
                </div>
                <div class="staff-customer-address">📍 ${o.shipping_address}</div>
                ${o.note ? `<div class="staff-customer-note">💬 <strong>Ghi chú:</strong> "${o.note}"</div>` : ""}
            </div>

            <div class="staff-order-total">
                <span style="font-size:12.5px; color:var(--text-muted);">
                    Hình thức: <strong>${o.payment_method === 'banking' ? '💳 VietQR' : '💵 COD'}</strong>
                </span>
                <span style="color:var(--brand-red); font-size:16px;">${cart.formatCurrency(o.total_amount)}</span>
            </div>

            <div class="staff-order-actions-bar">
                <button class="btn-quick-act btn-quick-confirm" title="Xác nhận đã gọi điện chốt đơn" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'confirmed')">
                    📞 Đã gọi khách
                </button>
                <button class="btn-quick-act btn-quick-ship" title="Chuyển đơn cho đơn vị vận chuyển" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'shipping')">
                    🚚 Giao bưu tá
                </button>
                <button class="btn-quick-act btn-quick-done" title="Xác nhận khách đã nhận đồ gỗ & thanh toán" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'completed')">
                    ✅ Đã giao xong
                </button>
                <button class="btn-quick-act btn-quick-cancel" title="Hủy đơn theo yêu cầu" onclick="window.staffChangeOrderState('${o.id || o.order_code}', 'cancelled')">
                    ❌ Hủy đơn
                </button>
            </div>
        </div>
    `).join("");
}

/**
 * 3. QUẢN LÝ KHO & KIỂM KÊ
 */
function renderStaffInventory(productsToRender) {
    const container = document.getElementById("staffInventoryTableContainer");
    if (!container) return;

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
                        <th>Tồn kho (Kiểm kê 1 chạm)</th>
                        <th>Tình trạng</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsToRender.map(p => {
                        const stock = Number(p.stock_quantity) || 0;
                        return `
                            <tr>
                                <td>
                                    <img src="${p.image_url}" alt="${p.name}" style="width:44px; height:44px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);">
                                </td>
                                <td>
                                    <strong style="font-size:14px;">${p.name}</strong><br>
                                    <small style="color:var(--text-muted);">${p.short_desc || ""}</small>
                                </td>
                                <td><span class="status-pill" style="background:#f1f5f9;">🌲 ${p.wood_type}</span></td>
                                <td><strong>${p.dimensions || "Tiêu chuẩn"}</strong></td>
                                <td><strong style="color:var(--brand-red); font-size:14.5px;">${cart.formatCurrency(p.price)}</strong></td>
                                <td>
                                    <div class="stock-stepper">
                                        <button class="btn-stock-step" onclick="window.staffStepStock('${p.id || p.slug}', -1)">-</button>
                                        <input type="number" class="input-stock-val" value="${stock}" min="0" onchange="window.staffSaveStock('${p.id || p.slug}', this.value)">
                                        <button class="btn-stock-step" onclick="window.staffStepStock('${p.id || p.slug}', 1)">+</button>
                                    </div>
                                </td>
                                <td>
                                    <span class="status-pill ${stock > 0 ? 'status-completed' : 'status-cancelled'}">
                                        ${stock > 0 ? `Còn ${stock} cái` : 'Hết hàng'}
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

/**
 * 4. ĐĂNG KÝ CÁC SỰ KIỆN TƯƠNG TÁC
 */
function setupStaffEventListeners() {
    // A. Chuyển tab
    const tabBtns = document.querySelectorAll(".staff-tab-btn, .staff-tab, .portal-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (targetId) window.switchStaffTab(targetId);
        });
    });

    // B. Lọc đơn hàng
    const filterPills = document.querySelectorAll(".staff-filter-pill");
    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeStatusFilter = pill.dataset.status;
            renderStaffOrders();
        });
    });

    document.getElementById("staffOrderSearchInput")?.addEventListener("input", renderStaffOrders);

    // C. Tìm kiếm tra cứu tư vấn
    document.getElementById("posConsultSearch")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.wood_type && p.wood_type.toLowerCase().includes(q)));
        renderConsultTable(filtered);
    });

    // D. Tìm kiếm kho
    document.getElementById("staffInventorySearch")?.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => !q || (p.name && p.name.toLowerCase().includes(q)) || (p.wood_type && p.wood_type.toLowerCase().includes(q)));
        renderStaffInventory(filtered);
    });

    // E. POS: Tính tiền khi đổi sản phẩm hoặc số lượng
    document.getElementById("posSelectProduct")?.addEventListener("change", updatePosTotal);
    document.getElementById("posQuantity")?.addEventListener("input", updatePosTotal);

    // F. POS: Xử lý Submit Tạo Đơn Hàng Mới
    const formPos = document.getElementById("formStaffPosOrder");
    formPos?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.getCurrentUser();
        const select = document.getElementById("posSelectProduct");
        const selectedOpt = select.options[select.selectedIndex];
        if (!selectedOpt || !selectedOpt.value) {
            alert("Vui lòng chọn 1 sản phẩm gỗ từ danh sách!");
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
            alert(`🎉 Thành công! Đã tạo đơn hàng ${res.orderCode} lưu trực tuyến vào Supabase Cloud.`);
            formPos.reset();
            // Tự trừ kho 1 lượng tương ứng
            const currentStock = Number(selectedOpt.dataset.stock) || 0;
            const newStock = Math.max(0, currentStock - qty);
            await db.updateProductStock(prodId, newStock);

            await loadStaffData();
        } else {
            alert("Không thể tạo đơn hàng. Vui lòng kiểm tra lại kết nối mạng!");
        }
    });

    // ==============================================================================
    // G. TẢI ẢNH TỪ TRONG MÁY LÊN WEB (IMAGE FILE UPLOAD & PREVIEW)
    // ==============================================================================
    const fileInput = document.getElementById("staffProductFileInput");
    const previewContainer = document.getElementById("staffImagePreviewContainer");
    const previewImg = document.getElementById("staffImagePreview");
    const dropzone = document.getElementById("staffDropzone");
    const btnRemoveImg = document.getElementById("btnRemoveStaffImage");

    // Chọn ảnh từ máy tính
    fileInput?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageFile(file);
        }
    });

    // Kéo thả ảnh vào dropzone
    dropzone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });

    dropzone?.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });

    dropzone?.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            handleImageFile(file);
        }
    });

    btnRemoveImg?.addEventListener("click", () => {
        uploadedImageDataUrl = "";
        if (fileInput) fileInput.value = "";
        if (previewContainer) previewContainer.style.display = "none";
        if (dropzone) dropzone.style.display = "block";
    });

    function handleImageFile(file) {
        if (!file.type.startsWith("image/")) {
            alert("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP)!");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImageDataUrl = event.target.result;
            if (previewImg) previewImg.src = uploadedImageDataUrl;
            if (previewContainer) previewContainer.style.display = "block";
            if (dropzone) dropzone.style.display = "none";
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
            alert("Vui lòng tải ảnh từ máy tính lên hoặc dán link URL ảnh sản phẩm!");
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
            alert(`🎉 Thành công! Mẫu đồ gỗ "${prod.name}" đã được đưa lên website cho khách hàng xem.`);
            formAddProd.reset();
            btnRemoveImg?.click();
            await loadStaffData();

            // Chuyển sang Tab Kho để xem sản phẩm vừa thêm
            document.querySelector('[data-target="tabStaffInventory"]')?.click();
        } else {
            alert("Có lỗi xảy ra khi lưu sản phẩm!");
        }
    });

    // I. Đăng xuất
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
window.switchStaffTab = function(targetId) {
    document.querySelectorAll(".staff-tab, .staff-tab-btn, .portal-tab-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-target") === targetId);
    });
    document.querySelectorAll(".portal-tab-pane").forEach(p => {
        p.classList.toggle("active", p.id === targetId);
    });
};

window.staffChangeOrderState = async function(orderId, status) {
    const user = auth.getCurrentUser();
    await db.updateOrderStatus(orderId, status, user ? user.full_name : "Nhân viên");
    alert(`✅ Đã cập nhật trạng thái đơn hàng sang: ${formatStatusLabel(status)}`);
    await loadStaffData();
};

window.staffStepStock = async function(productId, delta) {
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (!prod) return;
    const current = Number(prod.stock_quantity) || 0;
    const nextVal = Math.max(0, current + delta);
    prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    renderStaffInventory(allProducts);
};

window.staffSaveStock = async function(productId, val) {
    const nextVal = Math.max(0, Number(val) || 0);
    const prod = allProducts.find(p => p.id === productId || p.slug === productId);
    if (prod) prod.stock_quantity = nextVal;
    await db.updateProductStock(productId, nextVal);
    renderStaffInventory(allProducts);
};
