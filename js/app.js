/**
 * ỨNG DỤNG WEB NỘI THẤT GỖ MỘC THỊNH & SUPABASE
 */

import { db } from "./supabase-client.js";
import { cart } from "./cart.js";
import { initAdminControls } from "./admin.js";
import { initAuthUI } from "./auth-ui.js";

// Trạng thái ứng dụng
const state = {
    products: [],
    currentCategory: "all",
    currentWoodType: "all",
    currentSort: "default",
    searchQuery: "",
    selectedProduct: null
};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Khởi tạo thanh quản trị, Supabase & Xác thực người dùng
    initAdminControls();
    initAuthUI();

    // 2. Tải sản phẩm từ Supabase / Local
    await loadProducts();

    // 3. Khởi tạo các sự kiện giao diện
    initNavigation();
    initFilters();
    initSearch();
    initCartDrawer();
    initProductModal();
    initCheckout();
    initHeroHotspots();
    initFloatingWidgets();
    updateCartUI();

    // Lắng nghe sự kiện giỏ hàng
    window.addEventListener("cart-updated", updateCartUI);
    window.addEventListener("product-list-changed", loadProducts);
});

/**
 * Tải danh sách sản phẩm từ Supabase / Mock
 */
async function loadProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loader-circle"></div>
            <p>Đang tải bộ sưu tập nội thất gỗ Mộc Thịnh...</p>
        </div>
    `;

    state.products = await db.getProducts({
        category: state.currentCategory,
        woodType: state.currentWoodType,
        sort: state.currentSort,
        search: state.searchQuery
    });

    renderProductGrid();
}

/**
 * Hiển thị lưới sản phẩm
 */
function renderProductGrid() {
    const grid = document.getElementById("productGrid");
    const countEl = document.getElementById("productCount");
    if (!grid) return;

    if (countEl) {
        countEl.textContent = `${state.products.length} sản phẩm`;
    }

    if (state.products.length === 0) {
        grid.innerHTML = `
            <div class="empty-products">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>Không tìm thấy sản phẩm nào</h3>
                <p>Vui lòng thử chọn danh mục hoặc từ khóa tìm kiếm khác.</p>
                <button class="btn-brand-outline" id="btnResetFilters">Xem tất cả sản phẩm Mộc Thịnh</button>
            </div>
        `;
        document.getElementById("btnResetFilters")?.addEventListener("click", () => {
            state.currentCategory = "all";
            state.currentWoodType = "all";
            state.searchQuery = "";
            document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
            document.querySelector(".cat-tab[data-category='all']")?.classList.add("active");
            loadProducts();
        });
        return;
    }

    grid.innerHTML = state.products.map(prod => `
        <article class="product-card" data-id="${prod.id}">
            <div class="product-media" onclick="window.viewProductDetail('${prod.id}')">
                <img src="${prod.image_url}" alt="${prod.name}" loading="lazy">
                ${prod.original_price > prod.price ? `<span class="badge-discount">-${Math.round((1 - prod.price / prod.original_price) * 100)}%</span>` : ""}
                ${prod.is_bestseller ? `<span class="badge-bestseller">Bán Chạy</span>` : ""}
                ${prod.is_new ? `<span class="badge-new">Mới</span>` : ""}
                <button class="btn-quick-view" onclick="event.stopPropagation(); window.viewProductDetail('${prod.id}')">
                    <span>Xem nhanh</span>
                </button>
            </div>
            <div class="product-info">
                <div class="product-meta">
                    <span class="wood-tag">${prod.wood_type}</span>
                    <div class="product-rating">
                        <span class="star">★</span>
                        <span>${prod.rating || 5.0}</span>
                        <span class="reviews-num">(${prod.reviews_count || 12})</span>
                    </div>
                </div>
                <h3 class="product-title" onclick="window.viewProductDetail('${prod.id}')" title="${prod.name}">
                    ${prod.name}
                </h3>
                ${prod.dimensions ? `<p class="product-dimensions"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> ${prod.dimensions}</p>` : ""}
                <div class="product-bottom">
                    <div class="product-pricing">
                        <span class="current-price">${cart.formatCurrency(prod.price)}</span>
                        ${prod.original_price > prod.price ? `<span class="original-price">${cart.formatCurrency(prod.original_price)}</span>` : ""}
                    </div>
                    <button class="btn-add-cart" onclick="window.addToCartById('${prod.id}')" title="Thêm vào giỏ">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        <span>Thêm</span>
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}

/**
 * Điều hướng & Danh mục
 */
function initNavigation() {
    const navLinks = document.querySelectorAll(".nav-menu a, .cat-tab");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const cat = link.dataset.category;
            if (cat) {
                e.preventDefault();
                state.currentCategory = cat;

                document.querySelectorAll(".cat-tab").forEach(t => t.classList.toggle("active", t.dataset.category === cat));
                document.querySelectorAll(".nav-menu a").forEach(t => t.classList.toggle("active", t.dataset.category === cat));

                const section = document.getElementById("catalogSection");
                if (section) {
                    section.scrollIntoView({ behavior: "smooth" });
                }

                loadProducts();
            }
        });
    });
}

/**
 * Bộ lọc chất liệu & Sắp xếp giá
 */
function initFilters() {
    const woodFilter = document.getElementById("woodTypeFilter");
    const sortSelect = document.getElementById("sortSelect");

    if (woodFilter) {
        woodFilter.addEventListener("change", (e) => {
            state.currentWoodType = e.target.value;
            loadProducts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            state.currentSort = e.target.value;
            loadProducts();
        });
    }
}

/**
 * Tìm kiếm tức thời
 */
function initSearch() {
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClear");

    if (!input) return;

    let debounceTimer;
    input.addEventListener("input", (e) => {
        const val = e.target.value;
        if (clearBtn) clearBtn.style.display = val ? "block" : "none";

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.searchQuery = val;
            loadProducts();
        }, 250);
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            clearBtn.style.display = "none";
            state.searchQuery = "";
            loadProducts();
        });
    }
}

/**
 * Ngăn kéo giỏ hàng (Cart Slide-over Drawer)
 */
function initCartDrawer() {
    const cartToggleBtns = document.querySelectorAll(".btn-cart-toggle");
    const cartDrawer = document.getElementById("cartDrawer");
    const cartOverlay = document.getElementById("cartOverlay");
    const closeCartBtn = document.getElementById("closeCartBtn");
    const couponForm = document.getElementById("couponForm");

    const toggleCart = (open) => {
        if (!cartDrawer) return;
        if (open) {
            cartDrawer.classList.add("active");
            cartOverlay?.classList.add("active");
            document.body.style.overflow = "hidden";
            renderCartDrawerItems();
        } else {
            cartDrawer.classList.remove("active");
            cartOverlay?.classList.remove("active");
            document.body.style.overflow = "";
        }
    };

    cartToggleBtns.forEach(b => b.addEventListener("click", () => toggleCart(true)));
    closeCartBtn?.addEventListener("click", () => toggleCart(false));
    cartOverlay?.addEventListener("click", () => toggleCart(false));

    if (couponForm) {
        couponForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("couponInput");
            const resultMsg = document.getElementById("couponMessage");
            if (input && resultMsg) {
                const res = cart.applyCoupon(input.value);
                resultMsg.textContent = res.message;
                resultMsg.className = res.success ? "coupon-msg success" : "coupon-msg error";
                renderCartDrawerItems();
            }
        });
    }
}

function updateCartUI() {
    const badges = document.querySelectorAll(".cart-count-badge");
    const count = cart.getItemCount();
    badges.forEach(b => {
        b.textContent = count;
        b.style.display = count > 0 ? "inline-flex" : "none";
    });

    renderCartDrawerItems();
}

function renderCartDrawerItems() {
    const container = document.getElementById("cartDrawerItems");
    const subtotalEl = document.getElementById("cartDrawerSubtotal");
    const discountEl = document.getElementById("cartDrawerDiscount");
    const shippingEl = document.getElementById("cartDrawerShipping");
    const totalEl = document.getElementById("cartDrawerTotal");
    const shippingBar = document.getElementById("shippingProgressBar");
    const shippingMsg = document.getElementById("shippingProgressMsg");
    const checkoutBtn = document.getElementById("btnProceedCheckout");

    if (!container) return;

    const items = cart.items;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <h4>Giỏ hàng Mộc Thịnh đang trống</h4>
                <p>Hãy khám phá những món nội thất gỗ sồi mộc mạc và thêm vào giỏ.</p>
            </div>
        `;
        if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
        if (checkoutBtn) checkoutBtn.disabled = false;
        container.innerHTML = items.map(item => `
            <div class="cart-item">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <span class="cart-item-wood">${item.wood_type}</span>
                    <div class="cart-item-price">${cart.formatCurrency(item.price)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="window.updateCartQty('${item.id}', -1)">-</button>
                        <span class="qty-num">${item.quantity}</span>
                        <button class="qty-btn" onclick="window.updateCartQty('${item.id}', 1)">+</button>
                        <button class="btn-remove-item" onclick="window.removeCartItem('${item.id}')" title="Xóa">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join("");
    }

    if (subtotalEl) subtotalEl.textContent = cart.formatCurrency(cart.getSubtotal());
    if (discountEl) discountEl.textContent = "-" + cart.formatCurrency(cart.getDiscount());
    if (shippingEl) shippingEl.textContent = cart.getShippingFee() === 0 ? "Miễn phí" : cart.formatCurrency(cart.getShippingFee());
    if (totalEl) totalEl.textContent = cart.formatCurrency(cart.getTotal());

    const shipProg = cart.getFreeShippingProgress();
    if (shippingBar) shippingBar.style.width = `${shipProg.percent}%`;
    if (shippingMsg) shippingMsg.textContent = shipProg.message;
}

/**
 * Modal Xem Chi Tiết Sản Phẩm
 */
function initProductModal() {
    const modal = document.getElementById("productDetailModal");
    const closeBtn = document.getElementById("closeProductModal");

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => modal.classList.remove("active"));
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove("active");
        });
    }
}

window.viewProductDetail = async function (productId) {
    const modal = document.getElementById("productDetailModal");
    const body = document.getElementById("productModalContent");
    if (!modal || !body) return;

    modal.classList.add("active");
    body.innerHTML = `<div class="loading-state"><div class="loader-circle"></div><p>Đang tải chi tiết sản phẩm Mộc Thịnh...</p></div>`;

    const product = await db.getProduct(productId);
    if (!product) {
        body.innerHTML = `<p>Không tìm thấy thông tin sản phẩm.</p>`;
        return;
    }

    state.selectedProduct = product;

    body.innerHTML = `
        <div class="modal-detail-grid">
            <div class="modal-media-col">
                <div class="main-image-wrap">
                    <img id="detailMainImg" src="${product.image_url}" alt="${product.name}">
                </div>
                ${product.secondary_images && product.secondary_images.length > 0 ? `
                    <div class="thumbnail-strip">
                        <img src="${product.image_url}" class="thumb active" onclick="document.getElementById('detailMainImg').src='${product.image_url}'">
                        ${product.secondary_images.map(img => `
                            <img src="${img}" class="thumb" onclick="document.getElementById('detailMainImg').src='${img}'">
                        `).join("")}
                    </div>
                ` : ""}
            </div>
            <div class="modal-info-col">
                <div class="modal-cat-tag">${product.wood_type}</div>
                <h2 class="modal-title">${product.name}</h2>
                <div class="modal-rating">
                    <span class="stars">★★★★★</span>
                    <span>${product.rating || 5.0}</span>
                    <span class="sep">•</span>
                    <span>${product.reviews_count || 12} đánh giá của khách hàng</span>
                </div>
                <div class="modal-price-wrap">
                    <span class="modal-price">${cart.formatCurrency(product.price)}</span>
                    ${product.original_price > product.price ? `<span class="modal-original-price">${cart.formatCurrency(product.original_price)}</span>` : ""}
                    ${product.original_price > product.price ? `<span class="modal-save-badge">Tiết kiệm ${Math.round((1 - product.price / product.original_price) * 100)}%</span>` : ""}
                </div>

                <div class="modal-desc">
                    <p>${product.description || product.short_desc}</p>
                </div>

                <div class="spec-table">
                    <div class="spec-row">
                        <span class="spec-label">Chất liệu:</span>
                        <span class="spec-val">${product.wood_type}</span>
                    </div>
                    <div class="spec-row">
                        <span class="spec-label">Kích thước:</span>
                        <span class="spec-val">${product.dimensions || "Tiêu chuẩn"}</span>
                    </div>
                    <div class="spec-row">
                        <span class="spec-label">Bảo hành:</span>
                        <span class="spec-val">36 tháng kết cấu gỗ chính hãng Mộc Thịnh</span>
                    </div>
                    <div class="spec-row">
                        <span class="spec-label">Tình trạng:</span>
                        <span class="spec-val text-green">${product.in_stock ? "✓ Còn hàng sẵn tại kho xưởng" : "Tạm hết hàng"}</span>
                    </div>
                </div>

                <div class="modal-action-row">
                    <div class="qty-selector">
                        <button onclick="window.changeDetailQty(-1)">-</button>
                        <input type="number" id="detailQtyInput" value="1" min="1" max="99">
                        <button onclick="window.changeDetailQty(1)">+</button>
                    </div>
                    <button class="btn-brand-primary btn-large" onclick="window.addCurrentToCart()">
                        Thêm vào giỏ hàng
                    </button>
                </div>

                <div class="product-guarantees">
                    <div class="guarantee-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                        <span>Giao hàng miễn phí toàn quốc cho đơn từ 499.000đ</span>
                    </div>
                    <div class="guarantee-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <span>100% gỗ tự nhiên Mộc Thịnh, hoàn thiện dầu thực vật Osmo an toàn</span>
                    </div>
                </div>
            </div>
        </div>
    `;
};

window.changeDetailQty = function (delta) {
    const input = document.getElementById("detailQtyInput");
    if (input) {
        let v = parseInt(input.value) || 1;
        v = Math.max(1, v + delta);
        input.value = v;
    }
};

window.addCurrentToCart = function () {
    if (!state.selectedProduct) return;
    const input = document.getElementById("detailQtyInput");
    const qty = parseInt(input?.value) || 1;
    cart.addItem(state.selectedProduct, qty);
    showToast(`Đã thêm ${qty} x "${state.selectedProduct.name}" vào giỏ hàng!`);
    document.getElementById("productDetailModal")?.classList.remove("active");
};

window.addToCartById = async function (id) {
    const product = await db.getProduct(id);
    if (product) {
        cart.addItem(product, 1);
        showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
    }
};

window.updateCartQty = function (id, delta) {
    cart.updateQuantity(id, delta);
};

window.removeCartItem = function (id) {
    cart.removeItem(id);
    showToast("Đã xóa sản phẩm khỏi giỏ.");
};

/**
 * Thanh toán & Đặt hàng
 */
function initCheckout() {
    const checkoutModal = document.getElementById("checkoutModal");
    const btnProceed = document.getElementById("btnProceedCheckout");
    const closeBtn = document.getElementById("closeCheckoutModal");
    const form = document.getElementById("checkoutForm");

    btnProceed?.addEventListener("click", () => {
        document.getElementById("cartDrawer")?.classList.remove("active");
        document.getElementById("cartOverlay")?.classList.remove("active");
        if (checkoutModal) {
            checkoutModal.classList.add("active");
            renderCheckoutSummary();
        }
    });

    closeBtn?.addEventListener("click", () => {
        checkoutModal?.classList.remove("active");
    });

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById("btnSubmitOrder");
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner"></span> Đang xử lý lưu đơn hàng...`;

            const orderPayload = {
                name: document.getElementById("customerName").value,
                phone: document.getElementById("customerPhone").value,
                email: document.getElementById("customerEmail").value,
                address: document.getElementById("customerAddress").value,
                city: document.getElementById("customerCity").value,
                paymentMethod: document.querySelector("input[name='paymentMethod']:checked")?.value || "cod",
                note: document.getElementById("orderNote").value,
                items: [...cart.items],
                totalAmount: cart.getTotal(),
                shippingFee: cart.getShippingFee()
            };

            const result = await db.createOrder(orderPayload);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Hoàn tất đặt hàng`;

            if (result.success) {
                cart.clearCart();
                checkoutModal.classList.remove("active");
                showOrderSuccessModal(result.orderCode, result.savedToCloud, orderPayload);
            } else {
                alert("Có lỗi khi tạo đơn hàng. Vui lòng thử lại!");
            }
        });
    }

    const payInputs = document.querySelectorAll("input[name='paymentMethod']");
    payInputs.forEach(input => {
        input.addEventListener("change", () => {
            const qrBox = document.getElementById("vietQrSection");
            if (qrBox) {
                qrBox.style.display = input.value === "bank_transfer" ? "block" : "none";
            }
        });
    });
}

function renderCheckoutSummary() {
    const itemsEl = document.getElementById("checkoutItemsSummary");
    const totalEl = document.getElementById("checkoutTotalSummary");
    if (!itemsEl) return;

    itemsEl.innerHTML = cart.items.map(it => `
        <div class="checkout-sum-row">
            <span>${it.name} <small>x${it.quantity}</small></span>
            <strong>${cart.formatCurrency(it.price * it.quantity)}</strong>
        </div>
    `).join("");

    if (totalEl) totalEl.textContent = cart.formatCurrency(cart.getTotal());

    const qrImg = document.getElementById("vietQrImage");
    if (qrImg) {
        const total = cart.getTotal();
        qrImg.src = `https://api.vietqr.io/image/970422-0988888888-q8U3XvD.jpg?amount=${total}&addInfo=MOCTHINH%20NOI%20THAT`;
    }
}

function showOrderSuccessModal(code, isCloud, payload) {
    const successModal = document.getElementById("orderSuccessModal");
    if (!successModal) return;

    document.getElementById("successOrderCode").textContent = code;
    document.getElementById("successCustomerName").textContent = payload.name;
    document.getElementById("successTotalAmount").textContent = cart.formatCurrency(payload.totalAmount);
    
    const cloudNote = document.getElementById("successCloudNote");
    if (cloudNote) {
        cloudNote.innerHTML = isCloud
            ? `<span class="badge-cloud-ok">✓ Đã đồng bộ lên cơ sở dữ liệu Supabase Cloud của Mộc Thịnh</span>`
            : `<span class="badge-cloud-local">✓ Đã lưu đơn hàng cục bộ (Kết nối Supabase Cloud để lưu online)</span>`;
    }

    successModal.classList.add("active");
    document.getElementById("closeSuccessModal")?.addEventListener("click", () => {
        successModal.classList.remove("active");
    });
}

/**
 * Các điểm ghim tương tác trên ảnh phòng mẫu (Hero Shoppable Hotspots)
 */
function initHeroHotspots() {
    const container = document.getElementById("heroHotspotContainer");
    if (!container) return;

    const hotspots = [
        { id: "giuong-ngu-go-soi-tatami-co-hoc-keo", x: 18, y: 48, title: "Giường ngủ gầm thấp hộc kéo Mộc Thịnh", price: "8.990.000 VNĐ" },
        { id: "ghe-sofa-thu-gian-dieu-chinh-nhat-ban", x: 38, y: 48, title: "Ghế sofa thư giãn kiểu Nhật", price: "3.450.000 VNĐ" },
        { id: "don-goi-luoi-hat-xop-moc-thinh-style", x: 44, y: 78, title: "Đôn gối lười hạt xốp", price: "1.250.000 VNĐ" },
        { id: "ban-tra-go-soi-chan-thap-kieu-nhat", x: 67, y: 66, title: "Bàn trà gỗ sồi bo tròn Mộc Thịnh", price: "2.490.000 VNĐ" },
        { id: "ke-tivi-go-soi-ngan-keo-toi-gian", x: 88, y: 62, title: "Kệ Tivi gỗ sồi tối giản", price: "5.200.000 VNĐ" }
    ];

    container.innerHTML = hotspots.map(h => `
        <div class="hotspot-pin" style="left: ${h.x}%; top: ${h.y}%;" onclick="window.viewProductDetail('${h.id}')">
            <div class="hotspot-pulse"></div>
            <div class="hotspot-dot">+</div>
            <div class="hotspot-tooltip">
                <strong>${h.title}</strong>
                <span>${h.price}</span>
                <span class="hotspot-link">Bấm xem chi tiết →</span>
            </div>
        </div>
    `).join("");
}

/**
 * Các widget nổi (Live & Hỗ trợ Chat Mộc Thịnh)
 */
function initFloatingWidgets() {
    const liveBtn = document.getElementById("floatingLiveBtn");
    const chatBtn = document.getElementById("floatingChatBtn");
    const chatBox = document.getElementById("supportChatBox");
    const closeChat = document.getElementById("closeSupportChat");

    liveBtn?.addEventListener("click", () => {
        alert("🔴 Phiên phát sóng trực tiếp (LIVE) giới thiệu xưởng chế tác nội thất gỗ sồi tự nhiên Mộc Thịnh đang diễn ra. Chào mừng bạn ghé thăm!");
    });

    chatBtn?.addEventListener("click", () => {
        chatBox?.classList.toggle("active");
    });

    closeChat?.addEventListener("click", () => {
        chatBox?.classList.remove("active");
    });

    const sendMsgBtn = document.getElementById("btnSendChat");
    const chatInput = document.getElementById("chatInput");
    const chatLog = document.getElementById("chatLog");

    const sendMsg = () => {
        const text = chatInput.value.trim();
        if (!text || !chatLog) return;

        chatLog.innerHTML += `
            <div class="chat-msg user">
                <div class="msg-bubble">${text}</div>
            </div>
        `;
        chatInput.value = "";
        chatLog.scrollTop = chatLog.scrollHeight;

        setTimeout(() => {
            chatLog.innerHTML += `
                <div class="chat-msg bot">
                    <div class="msg-bubble">Chào bạn! Chuyên viên tư vấn nội thất gỗ sồi tự nhiên của <strong>Mộc Thịnh</strong> đã nhận được câu hỏi. Chúng tôi sẽ phản hồi bạn trong giây lát hoặc bạn có thể gọi hotline <strong>1900 255 579</strong> để được giao hàng ngay hôm nay!</div>
                </div>
            `;
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 600);
    };

    sendMsgBtn?.addEventListener("click", sendMsg);
    chatInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMsg();
    });
}

function showToast(message) {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
