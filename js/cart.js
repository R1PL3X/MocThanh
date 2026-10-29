/**
 * QUẢN LÝ GIỎ HÀNG (SHOPPING CART) MORIOO
 * Tự động tính miễn phí vận chuyển từ 499.000đ như trên thanh thông báo
 */

const CART_STORAGE_KEY = "morioo_furniture_cart";
const FREE_SHIPPING_THRESHOLD = 499000; // Miễn phí vận chuyển từ 499.000 VNĐ
const STANDARD_SHIPPING_FEE = 45000;

class CartService {
    constructor() {
        this.items = this.loadCart();
        this.appliedCoupon = null;
    }

    loadCart() {
        try {
            const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem("muji_furniture_cart");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    saveCart() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
        this.notifyChange();
    }

    addItem(product, quantity = 1) {
        const existingIndex = this.items.findIndex(it => it.id === product.id);
        if (existingIndex > -1) {
            this.items[existingIndex].quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                original_price: Number(product.original_price || product.price),
                wood_type: product.wood_type,
                image_url: product.image_url,
                dimensions: product.dimensions,
                quantity: quantity
            });
        }
        this.saveCart();
    }

    updateQuantity(productId, delta) {
        const item = this.items.find(it => it.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeItem(productId);
                return;
            }
            this.saveCart();
        }
    }

    removeItem(productId) {
        this.items = this.items.filter(it => it.id !== productId);
        this.saveCart();
    }

    clearCart() {
        this.items = [];
        this.appliedCoupon = null;
        this.saveCart();
    }

    getItemCount() {
        return this.items.reduce((sum, it) => sum + it.quantity, 0);
    }

    getSubtotal() {
        return this.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    }

    getShippingFee() {
        const subtotal = this.getSubtotal();
        if (subtotal === 0) return 0;
        return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    }

    getFreeShippingProgress() {
        const subtotal = this.getSubtotal();
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            return {
                qualified: true,
                percent: 100,
                remaining: 0,
                message: "Bạn đã được MIỄN PHÍ VẬN CHUYỂN toàn quốc! 🎉"
            };
        }
        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
        const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
        return {
            qualified: false,
            percent,
            remaining,
            message: `Mua thêm ${this.formatCurrency(remaining)} để được Miễn phí vận chuyển!`
        };
    }

    applyCoupon(code) {
        const clean = (code || "").trim().toUpperCase();
        if (clean === "MORIOO10" || clean === "MUJI10") {
            this.appliedCoupon = { code: "MORIOO10", discountPercent: 10 };
            return { success: true, message: "Áp dụng thành công mã MORIOO10 (Giảm 10%)" };
        } else if (clean === "GOXANH") {
            this.appliedCoupon = { code: "GOXANH", discountAmount: 100000 };
            return { success: true, message: "Áp dụng thành công mã GOXANH (Giảm 100.000đ)" };
        }
        return { success: false, message: "Mã giảm giá không hợp lệ hoặc đã hết hạn" };
    }

    getDiscount() {
        if (!this.appliedCoupon) return 0;
        const subtotal = this.getSubtotal();
        if (this.appliedCoupon.discountPercent) {
            return Math.round((subtotal * this.appliedCoupon.discountPercent) / 100);
        }
        if (this.appliedCoupon.discountAmount) {
            return Math.min(subtotal, this.appliedCoupon.discountAmount);
        }
        return 0;
    }

    getTotal() {
        const subtotal = this.getSubtotal();
        if (subtotal === 0) return 0;
        const shipping = this.getShippingFee();
        const discount = this.getDiscount();
        return Math.max(0, subtotal + shipping - discount);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND"
        }).format(amount).replace("₫", "VNĐ");
    }

    notifyChange() {
        window.dispatchEvent(new CustomEvent("cart-updated", {
            detail: {
                count: this.getItemCount(),
                subtotal: this.getSubtotal(),
                total: this.getTotal()
            }
        }));
    }
}

export const cart = new CartService();
