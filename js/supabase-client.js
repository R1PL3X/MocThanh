/**
 * CLIENT QUẢN LÝ DỮ LIỆU SUPABASE CHO NỘI THẤT GỖ MORIOO
 * Kết nối Database trực tuyến trên Cloud Supabase (Ai cũng xem được)
 * Luôn luôn ưu tiên kết nối Online thời gian thực qua REST API & Supabase JS
 */

import { SupabaseConfig } from "./supabase-config.js";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "./mock-data.js";

class SupabaseDataService {
    constructor() {
        this.client = null;
        this.isOnline = true; // Mặc định hướng tới Online Supabase
        this.lastError = null;
        this.localProducts = this.loadLocalProducts();
        this.localOrders = this.loadLocalOrders();
        this.initClient();
    }

    initClient() {
        try {
            const url = SupabaseConfig.getUrl();
            const anonKey = SupabaseConfig.getAnonKey();

            if (SupabaseConfig.isConfigured() && window.supabase) {
                this.client = window.supabase.createClient(url, anonKey, {
                    auth: { persistSession: false }
                });
                console.log("[Supabase] Đã khởi tạo Supabase Client với URL:", url);
            } else {
                this.client = null;
            }
        } catch (e) {
            console.error("[Supabase] Lỗi khởi tạo client:", e);
            this.client = null;
            this.lastError = e.message;
        }
    }

    /**
     * Gửi yêu cầu REST API trực tiếp tới Supabase (Không phụ thuộc thư viện bên ngoài)
     */
    async restFetch(endpoint, options = {}) {
        const url = `${SupabaseConfig.getUrl()}/rest/v1/${endpoint}`;
        const key = SupabaseConfig.getAnonKey();

        const headers = {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "Prefer": options.prefer || "return=representation",
            ...(options.headers || {})
        };

        const res = await fetch(url, {
            ...options,
            headers
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await res.json();
        }
        return null;
    }

    /**
     * Kiểm tra trạng thái kết nối tới Supabase Cloud
     */
    async testConnection(customUrl = null, customKey = null) {
        const testUrl = customUrl || SupabaseConfig.getUrl();
        const testKey = customKey || SupabaseConfig.getAnonKey();

        if (!testUrl || testUrl.includes("your-project-id") || !testKey) {
            return {
                success: false,
                message: "Chưa cấu hình Supabase URL hoặc Anon Key hợp lệ."
            };
        }

        try {
            // Thử kết nối REST API trực tiếp
            const endpoint = `${testUrl}/rest/v1/products?select=id,name&limit=1`;
            const resp = await fetch(endpoint, {
                headers: {
                    "apikey": testKey,
                    "Authorization": `Bearer ${testKey}`
                }
            });

            if (resp.ok) {
                this.isOnline = true;
                this.lastError = null;
                // Nếu window.supabase có sẵn nhưng chưa tạo client thì tạo ngay
                if (window.supabase && !this.client) {
                    this.initClient();
                }
                return {
                    success: true,
                    message: "Kết nối Supabase Cloud THÀNH CÔNG! Trực tuyến toàn cầu."
                };
            } else {
                const errText = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${errText}`);
            }
        } catch (err) {
            console.warn("[Supabase] Lỗi testConnection:", err);
            this.isOnline = false;
            this.lastError = err.message;
            return {
                success: false,
                message: "Không thể kết nối Supabase Cloud: " + (err.message || "Lỗi mạng hoặc CORS")
            };
        }
    }

    /**
     * Lấy danh sách sản phẩm từ Supabase Cloud
     */
    async getProducts(filters = {}) {
        // 1. Thử lấy qua Client hoặc REST
        try {
            let products = null;

            if (this.client) {
                const { data, error } = await this.client
                    .from("products")
                    .select("*")
                    .order("created_at", { ascending: false });
                if (!error && data && data.length > 0) {
                    products = data;
                }
            }

            if (!products) {
                // Thử REST API trực tiếp
                products = await this.restFetch("products?select=*&order=created_at.desc");
            }

            if (products && products.length > 0) {
                this.isOnline = true;
                this.localProducts = products;
                this.saveLocalProducts();

                // Lọc sản phẩm nếu có yêu cầu
                let list = [...products];
                if (filters.category && filters.category !== "all") {
                    list = list.filter(p => p.category_slug === filters.category);
                }
                if (filters.woodType && filters.woodType !== "all") {
                    list = list.filter(p => p.wood_type && p.wood_type.toLowerCase().includes(filters.woodType.toLowerCase()));
                }
                if (filters.search) {
                    const q = filters.search.toLowerCase().trim();
                    list = list.filter(p =>
                        (p.name && p.name.toLowerCase().includes(q)) ||
                        (p.wood_type && p.wood_type.toLowerCase().includes(q)) ||
                        (p.short_desc && p.short_desc.toLowerCase().includes(q))
                    );
                }
                return list;
            }
        } catch (err) {
            console.warn("[Supabase] Lỗi getProducts online, dùng bộ nhớ đệm:", err);
        }

        // Fallback bộ nhớ nếu đứt mạng hoặc dùng LocalStorage
        this.localProducts = this.loadLocalProducts();
        let list = [...this.localProducts];
        if (filters.category && filters.category !== "all") {
            list = list.filter(p => p.category_slug === filters.category || p.category === filters.category);
        }
        if (filters.woodType && filters.woodType !== "all") {
            list = list.filter(p => p.wood_type && p.wood_type.toLowerCase().includes(filters.woodType.toLowerCase()));
        }
        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(p =>
                ((p.name || p.title) && (p.name || p.title).toLowerCase().includes(q)) ||
                (p.wood_type && p.wood_type.toLowerCase().includes(q)) ||
                (p.short_desc && p.short_desc.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q))
            );
        }
        return list;
    }

    /**
     * Lấy chi tiết 1 sản phẩm
     */
    async getProduct(idOrSlug) {
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(idOrSlug);
            const queryField = isUuid ? "id" : "slug";
            const data = await this.restFetch(`products?${queryField}=eq.${encodeURIComponent(idOrSlug)}&limit=1`);
            if (data && data.length > 0) return data[0];
        } catch (e) {
            console.warn("[Supabase] Lỗi getProduct online:", e);
        }
        this.localProducts = this.loadLocalProducts();
        return this.localProducts.find(p => p.id == idOrSlug || p.slug === idOrSlug) || null;
    }

    /**
     * Lấy danh sách danh mục
     */
    async getCategories() {
        try {
            const data = await this.restFetch("categories?select=*&order=order_index.asc");
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn("[Supabase] Lỗi getCategories:", e);
        }
        return INITIAL_CATEGORIES;
    }

    /**
     * Tạo đơn hàng mới (Từ khách hàng hoặc nhân viên bán hàng)
     */
    async createOrder(orderPayload) {
        const orderCode = "MR-" + Math.floor(100000 + Math.random() * 900000);
        const orderData = {
            order_code: orderCode,
            customer_name: orderPayload.customerName,
            customer_email: orderPayload.customerEmail || "",
            customer_phone: orderPayload.customerPhone,
            shipping_address: orderPayload.shippingAddress,
            payment_method: orderPayload.paymentMethod || "cod",
            subtotal_amount: Number(orderPayload.subtotal || 0),
            shipping_fee: Number(orderPayload.shippingFee || 0),
            discount_amount: Number(orderPayload.discount || 0),
            total_amount: Number(orderPayload.total || 0),
            note: orderPayload.note || "",
            status: "pending"
        };

        let savedToCloud = false;

        // Lưu đơn hàng vào Supabase Cloud
        try {
            const inserted = await this.restFetch("orders", {
                method: "POST",
                body: JSON.stringify(orderData),
                prefer: "return=representation"
            });

            if (inserted && inserted.length > 0) {
                savedToCloud = true;
                const newOrder = inserted[0];

                // Lưu các mặt hàng kèm theo (nếu có)
                if (orderPayload.items && orderPayload.items.length > 0) {
                    const itemsPayload = orderPayload.items.map(item => ({
                        order_id: newOrder.id,
                        product_id: item.productId || null,
                        product_name: item.name,
                        product_image: item.image,
                        wood_type: item.woodType || "Gỗ Tự Nhiên",
                        price: item.price,
                        quantity: item.quantity,
                        subtotal: item.price * item.quantity
                    }));

                    try {
                        await this.restFetch("order_items", {
                            method: "POST",
                            body: JSON.stringify(itemsPayload)
                        });
                    } catch (e) {
                        console.warn("[Supabase] Ghi order_items:", e);
                    }
                }
                console.log("[Supabase] Đã ghi nhận đơn hàng Online:", orderCode);
            }
        } catch (err) {
            console.warn("[Supabase] Lỗi ghi đơn hàng online:", err);
        }

        const localRecord = {
            ...orderData,
            id: "ord-" + Date.now(),
            items: orderPayload.items || [],
            savedToCloud,
            created_at: new Date().toISOString()
        };
        this.localOrders.unshift(localRecord);
        this.saveLocalOrders();

        return {
            success: true,
            orderCode,
            savedToCloud,
            order: localRecord
        };
    }

    /**
     * Lấy danh sách đơn hàng cho Admin & Nhân viên
     */
    async getOrders() {
        try {
            const data = await this.restFetch("orders?select=*,order_items(*)&order=created_at.desc");
            if (data && Array.isArray(data)) {
                this.isOnline = true;
                this.localOrders = data;
                this.saveLocalOrders();
                return data;
            }
        } catch (e) {
            console.warn("[Supabase] Lỗi getOrders online, dùng local:", e);
        }
        return this.localOrders;
    }

    /**
     * Cập nhật trạng thái đơn hàng (Dành cho Quản trị viên & Nhân viên)
     */
    async updateOrderStatus(orderIdOrCode, newStatus, processedBy = null) {
        let updated = false;

        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(orderIdOrCode);
            const queryField = isUuid ? "id" : "order_code";
            
            const payload = { 
                status: newStatus
            };

            await this.restFetch(`orders?${queryField}=eq.${encodeURIComponent(orderIdOrCode)}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
            updated = true;
            this.isOnline = true;
        } catch (e) {
            console.warn("[Supabase] Lỗi updateOrderStatus online:", e);
        }

        const local = this.localOrders.find(o => o.id === orderIdOrCode || o.order_code === orderIdOrCode);
        if (local) {
            local.status = newStatus;
            this.saveLocalOrders();
            updated = true;
        }

        return { success: updated, status: newStatus };
    }

    /**
     * Cập nhật số lượng tồn kho sản phẩm (Dành cho Admin & Nhân viên)
     */
    async updateProductStock(productIdOrSlug, newQuantity) {
        let updated = false;
        const qty = Math.max(0, Number(newQuantity) || 0);

        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(productIdOrSlug);
            const queryField = isUuid ? "id" : "slug";

            await this.restFetch(`products?${queryField}=eq.${encodeURIComponent(productIdOrSlug)}`, {
                method: "PATCH",
                body: JSON.stringify({
                    stock_quantity: qty,
                    in_stock: qty > 0
                })
            });
            updated = true;
            this.isOnline = true;
        } catch (e) {
            console.warn("[Supabase] Lỗi updateProductStock online:", e);
        }

        const local = this.localProducts.find(p => p.id === productIdOrSlug || p.slug === productIdOrSlug);
        if (local) {
            local.stock_quantity = qty;
            local.in_stock = qty > 0;
            this.saveLocalProducts();
            updated = true;
        }

        return { success: updated, newQuantity: qty };
    }

    /**
     * Xóa sản phẩm khỏi Supabase
     */
    async deleteProduct(productId) {
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(productId);
            const queryField = isUuid ? "id" : "slug";
            await this.restFetch(`products?${queryField}=eq.${encodeURIComponent(productId)}`, {
                method: "DELETE"
            });
        } catch (e) {
            console.warn("[Supabase] Lỗi deleteProduct online:", e);
        }
        this.localProducts = this.localProducts.filter(p => p.id !== productId && p.slug !== productId);
        this.saveLocalProducts();
        return { success: true };
    }

    /**
     * Thêm sản phẩm mới (Nhân viên thêm sản phẩm, hỗ trợ ảnh Base64 từ máy)
     */
    async addProduct(product) {
        const slug = (product.name || "san-pham")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") + "-" + Math.floor(Math.random() * 10000);

        const newProd = {
            slug,
            name: product.name,
            category_slug: product.category_slug || "phong-khach",
            wood_type: product.wood_type || "Gỗ Sồi Trắng",
            price: Number(product.price) || 0,
            original_price: Number(product.original_price) || 0,
            rating: 5.0,
            reviews_count: 1,
            dimensions: product.dimensions || "Tiêu chuẩn",
            short_desc: product.short_desc || "",
            description: product.description || "",
            in_stock: true,
            stock_quantity: Number(product.stock_quantity) || 10,
            is_featured: !!product.is_featured,
            is_new: true,
            is_bestseller: false,
            image_url: product.image_url || "assets/images/hero-room-banner.png"
        };

        let savedToCloud = false;

        try {
            const inserted = await this.restFetch("products", {
                method: "POST",
                body: JSON.stringify(newProd),
                prefer: "return=representation"
            });

            if (inserted && inserted.length > 0) {
                savedToCloud = true;
                this.isOnline = true;
                console.log("[Supabase] Đã thêm sản phẩm thành công lên Cloud:", newProd.name);
            }
        } catch (err) {
            console.warn("[Supabase] Lỗi addProduct online:", err);
        }

        const localRecord = {
            ...newProd,
            id: "prod-" + Date.now(),
            savedToCloud
        };
        this.localProducts.unshift(localRecord);
        this.saveLocalProducts();

        return {
            success: true,
            cloud: savedToCloud,
            product: localRecord
        };
    }

    loadLocalProducts() {
        const s = localStorage.getItem("morioo_products");
        if (s) {
            try { return JSON.parse(s); } catch(e){}
        }
        return [...INITIAL_PRODUCTS];
    }

    saveLocalProducts() {
        try {
            localStorage.setItem("morioo_products", JSON.stringify(this.localProducts));
        } catch(e) {}
    }

    loadLocalOrders() {
        const s = localStorage.getItem("morioo_orders");
        if (s) {
            try { return JSON.parse(s); } catch(e){}
        }
        return [];
    }

    saveLocalOrders() {
        try {
            localStorage.setItem("morioo_orders", JSON.stringify(this.localOrders));
        } catch(e) {}
    }
}

export const db = new SupabaseDataService();
