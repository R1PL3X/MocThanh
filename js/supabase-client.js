/**
 * CLIENT QUẢN LÝ DỮ LIỆU SUPABASE CHO NỘI THẤT GỖ MORIOO
 * Kết nối Database trực tuyến trên Cloud Supabase (Ai cũng xem được)
 */

import { SupabaseConfig } from "./supabase-config.js";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "./mock-data.js";

class SupabaseDataService {
    constructor() {
        this.client = null;
        this.isOnline = false;
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
                console.log("[Supabase] Đã khởi tạo Supabase Client cho MORIOO với URL:", url);
            } else {
                this.client = null;
                console.log("[Supabase] Chưa cấu hình URL/Key. Sử dụng dữ liệu mộc mạc tích hợp.");
            }
        } catch (e) {
            console.error("[Supabase] Lỗi khởi tạo client:", e);
            this.client = null;
            this.lastError = e.message;
        }
    }

    /**
     * Kiểm tra trạng thái kết nối tới Supabase Cloud
     */
    async testConnection(customUrl = null, customKey = null) {
        try {
            const testUrl = customUrl || SupabaseConfig.getUrl();
            const testKey = customKey || SupabaseConfig.getAnonKey();

            if (!testUrl || testUrl.includes("your-project-id")) {
                return {
                    success: false,
                    message: "Chưa nhập Supabase Project URL hợp lệ."
                };
            }

            if (!window.supabase) {
                return {
                    success: false,
                    message: "Thư viện Supabase JS chưa được tải."
                };
            }

            const tempClient = window.supabase.createClient(testUrl, testKey, {
                auth: { persistSession: false }
            });

            const { data, error } = await tempClient
                .from("products")
                .select("id, name")
                .limit(1);

            if (error) {
                if (error.code === "42P01" || error.message?.includes("does not exist")) {
                    return {
                        success: false,
                        tableMissing: true,
                        message: "Kết nối thành công tới Supabase, nhưng chưa có bảng 'products'! Vui lòng chạy file 'supabase-schema.sql' trong mục SQL Editor của Supabase."
                    };
                }
                throw error;
            }

            this.isOnline = true;
            this.lastError = null;
            return {
                success: true,
                message: "Kết nối Supabase Cloud THÀNH CÔNG! Bất kỳ ai trên internet đều có thể xem sản phẩm MORIOO và đặt hàng.",
                data
            };
        } catch (err) {
            this.isOnline = false;
            this.lastError = err.message;
            return {
                success: false,
                message: "Không thể kết nối Supabase: " + (err.message || "Lỗi cấu hình URL hoặc Anon Key.")
            };
        }
    }

    /**
     * Lấy danh sách sản phẩm (từ Supabase Cloud hoặc Fallback)
     */
    async getProducts(filters = {}) {
        if (this.client) {
            try {
                let query = this.client.from("products").select("*");

                if (filters.category && filters.category !== "all") {
                    query = query.eq("category_slug", filters.category);
                }

                if (filters.woodType && filters.woodType !== "all") {
                    query = query.ilike("wood_type", `%${filters.woodType}%`);
                }

                if (filters.sort) {
                    if (filters.sort === "price-asc") query = query.order("price", { ascending: true });
                    else if (filters.sort === "price-desc") query = query.order("price", { ascending: false });
                    else if (filters.sort === "rating") query = query.order("rating", { ascending: false });
                    else query = query.order("created_at", { ascending: false });
                }

                const { data, error } = await query;

                if (!error && data && data.length > 0) {
                    this.isOnline = true;
                    return data;
                } else if (error) {
                    console.warn("[Supabase] Lỗi khi truy vấn products MORIOO, chuyển sang dữ liệu dự phòng:", error.message);
                }
            } catch (err) {
                console.warn("[Supabase] Exception khi đọc dữ liệu:", err);
            }
        }

        // Chế độ dữ liệu mẫu / Fallback (Hoạt động mượt mà 100%)
        let list = [...this.localProducts];

        if (filters.category && filters.category !== "all") {
            list = list.filter(p => p.category_slug === filters.category);
        }

        if (filters.woodType && filters.woodType !== "all") {
            list = list.filter(p => p.wood_type.toLowerCase().includes(filters.woodType.toLowerCase()));
        }

        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.wood_type.toLowerCase().includes(q) ||
                (p.short_desc && p.short_desc.toLowerCase().includes(q))
            );
        }

        if (filters.sort) {
            if (filters.sort === "price-asc") list.sort((a, b) => a.price - b.price);
            else if (filters.sort === "price-desc") list.sort((a, b) => b.price - a.price);
            else if (filters.sort === "rating") list.sort((a, b) => b.rating - a.rating);
            else if (filters.sort === "bestseller") list.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
        }

        return list;
    }

    /**
     * Lấy chi tiết 1 sản phẩm theo ID hoặc Slug
     */
    async getProduct(idOrSlug) {
        if (this.client) {
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(idOrSlug);
                const query = this.client.from("products").select("*");
                const { data, error } = isUuid
                    ? await query.eq("id", idOrSlug).single()
                    : await query.eq("slug", idOrSlug).single();

                if (!error && data) return data;
            } catch (e) {
                console.warn("[Supabase] Lỗi getProduct:", e);
            }
        }

        return this.localProducts.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
    }

    /**
     * Tạo đơn hàng mới MORIOO (Lưu trực tiếp vào Supabase Cloud hoặc Local Storage)
     */
    async createOrder(orderPayload) {
        const orderCode = "MR-" + Math.floor(100000 + Math.random() * 900000);
        const orderData = {
            order_code: orderCode,
            customer_name: orderPayload.name,
            customer_phone: orderPayload.phone,
            customer_email: orderPayload.email || "",
            shipping_address: orderPayload.address,
            city: orderPayload.city || "Việt Nam",
            payment_method: orderPayload.paymentMethod || "cod",
            shipping_fee: orderPayload.shippingFee || 0,
            total_amount: orderPayload.totalAmount,
            note: orderPayload.note || "",
            status: "pending",
            created_at: new Date().toISOString()
        };

        let savedToCloud = false;

        if (this.client) {
            try {
                const { data: newOrder, error: orderErr } = await this.client
                    .from("orders")
                    .insert([orderData])
                    .select()
                    .single();

                if (!orderErr && newOrder) {
                    savedToCloud = true;
                    if (orderPayload.items && orderPayload.items.length > 0) {
                        const itemsData = orderPayload.items.map(it => ({
                            order_id: newOrder.id,
                            product_id: /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(it.id) ? it.id : null,
                            product_name: it.name,
                            product_price: it.price,
                            quantity: it.quantity,
                            subtotal: it.price * it.quantity,
                            image_url: it.image_url
                        }));

                        await this.client.from("order_items").insert(itemsData);
                    }
                    console.log("[Supabase] Đã lưu đơn hàng MORIOO thành công vào Supabase Cloud:", newOrder.order_code);
                } else {
                    console.warn("[Supabase] Không thể ghi order vào cloud:", orderErr?.message);
                }
            } catch (err) {
                console.warn("[Supabase] Exception khi tạo đơn hàng cloud:", err);
            }
        }

        const localRecord = {
            ...orderData,
            id: "ord-" + Date.now(),
            items: orderPayload.items,
            savedToCloud
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
     * Lấy danh sách đơn hàng cho mục quản trị
     */
    async getOrders() {
        if (this.client) {
            try {
                const { data, error } = await this.client
                    .from("orders")
                    .select("*, order_items(*)")
                    .order("created_at", { ascending: false });

                if (!error && data) {
                    return data;
                }
            } catch (e) {
                console.warn("[Supabase] Lỗi getOrders:", e);
            }
        }
        return this.localOrders;
    }

    /**
     * Thêm sản phẩm mới MORIOO
     */
    async addProduct(product) {
        const slug = (product.name || "san-pham")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") + "-" + Math.floor(Math.random() * 1000);

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
            image_url: product.image_url || "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=80"
        };

        if (this.client) {
            try {
                const { data, error } = await this.client
                    .from("products")
                    .insert([newProd])
                    .select()
                    .single();

                if (!error && data) {
                    this.localProducts.unshift(data);
                    this.saveLocalProducts();
                    return { success: true, product: data, cloud: true };
                }
            } catch (e) {
                console.warn("[Supabase] Lỗi addProduct cloud:", e);
            }
        }

        newProd.id = "prod-" + Date.now();
        this.localProducts.unshift(newProd);
        this.saveLocalProducts();
        return { success: true, product: newProd, cloud: false };
    }

    loadLocalProducts() {
        const saved = localStorage.getItem("morioo_products") || localStorage.getItem("muji_products");
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [...INITIAL_PRODUCTS];
    }

    saveLocalProducts() {
        localStorage.setItem("morioo_products", JSON.stringify(this.localProducts));
    }

    loadLocalOrders() {
        const saved = localStorage.getItem("morioo_orders") || localStorage.getItem("muji_orders");
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    }

    saveLocalOrders() {
        localStorage.setItem("morioo_orders", JSON.stringify(this.localOrders));
    }

    resetDefaultData() {
        this.localProducts = [...INITIAL_PRODUCTS];
        this.saveLocalProducts();
    }
}

export const db = new SupabaseDataService();
