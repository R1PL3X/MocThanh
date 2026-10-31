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
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            ...(options.headers || {})
        };

        const res = await fetch(url, {
            cache: 'no-store',
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
        // 1. Lấy trực tiếp từ Supabase Cloud qua REST (no-store)
        try {
            let products = await this.restFetch("products?select=*&order=created_at.desc");

            if (!products && this.client) {
                const { data, error } = await this.client
                    .from("products")
                    .select("*")
                    .order("created_at", { ascending: false });
                if (!error && data && data.length > 0) {
                    products = data;
                }
            }

            if (products && products.length > 0) {
                this.isOnline = true;
                this.localProducts = products;
                this.saveLocalProducts();

                // Lọc sản phẩm nếu có yêu cầu
                let list = [...products];
                if (filters.category && filters.category !== "all") {
                    if (filters.category === "tu-ke") {
                        list = list.filter(p => p.category_slug === "tu-ke" || p.category === "Tủ & Kệ" || (p.name && (p.name.toLowerCase().includes("tủ") || p.name.toLowerCase().includes("kệ"))) || (p.slug && (p.slug.includes("tu-") || p.slug.includes("ke-") || p.slug.includes("tab-"))));
                    } else {
                        list = list.filter(p => p.category_slug === filters.category);
                    }
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
                if (filters.sort) {
                    if (filters.sort === 'bestseller') {
                        list.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
                    } else if (filters.sort === 'price-asc') {
                        list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
                    } else if (filters.sort === 'price-desc') {
                        list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
                    } else if (filters.sort === 'rating') {
                        list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
                    }
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
            if (filters.category === "tu-ke") {
                list = list.filter(p => p.category_slug === "tu-ke" || p.category === "Tủ & Kệ" || (p.name && (p.name.toLowerCase().includes("tủ") || p.name.toLowerCase().includes("kệ"))) || (p.slug && (p.slug.includes("tu-") || p.slug.includes("ke-") || p.slug.includes("tab-"))));
            } else {
                list = list.filter(p => p.category_slug === filters.category || p.category === filters.category);
            }
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
        if (filters.sort) {
            if (filters.sort === 'bestseller') {
                list.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
            } else if (filters.sort === 'price-asc') {
                list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
            } else if (filters.sort === 'price-desc') {
                list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            } else if (filters.sort === 'rating') {
                list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
            }
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
            let data = await this.restFetch("categories?select=*&order=display_order.asc");
            if (!data || data.length === 0) {
                data = await this.restFetch("categories?select=*");
            }
            if (data && data.length > 0) {
                if (!data.some(c => c.slug === 'tu-ke')) {
                    data.push({
                        id: 'cat-tu-ke',
                        slug: 'tu-ke',
                        name: 'Tủ & Kệ',
                        icon: 'box',
                        description: 'Tủ quần áo, tủ giày, kệ tivi và kệ sách gỗ sồi tự nhiên tinh tế',
                        display_order: 6
                    });
                }
                return data;
            }
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

        const custName = (orderPayload.customerName || orderPayload.name || orderPayload.customer_name || "Khách hàng MORIOO").trim();
        const custPhone = (orderPayload.customerPhone || orderPayload.phone || orderPayload.customer_phone || "0901234567").trim();
        const custEmail = (orderPayload.customerEmail || orderPayload.email || orderPayload.customer_email || "").trim();
        const shipAddr = (orderPayload.shippingAddress || orderPayload.address || orderPayload.shipping_address || "Tại cửa hàng").trim();
        const city = (orderPayload.city || "Toàn quốc").trim();
        const payMethod = (orderPayload.paymentMethod || orderPayload.payment_method || "cod").toLowerCase();
        const shipFee = Number(orderPayload.shippingFee || orderPayload.shipping_fee || 0);
        const total = Number(orderPayload.totalAmount || orderPayload.total || orderPayload.total_amount || 0);
        const note = (orderPayload.note || "").trim();

        // Exact schema columns of Supabase 'orders' table
        const orderData = {
            order_code: orderCode,
            customer_name: custName,
            customer_phone: custPhone,
            customer_email: custEmail,
            shipping_address: shipAddr,
            city: city,
            payment_method: payMethod,
            shipping_fee: shipFee,
            total_amount: total,
            note: note,
            status: "pending"
        };

        let savedToCloud = false;
        let createdCloudOrder = null;

        // 1. Lưu trực tiếp vào Supabase Cloud REST API ngay lập tức
        try {
            const inserted = await this.restFetch("orders", {
                method: "POST",
                body: JSON.stringify(orderData),
                prefer: "return=representation"
            });

            if (inserted && inserted.length > 0) {
                savedToCloud = true;
                createdCloudOrder = inserted[0];

                // Lưu các mặt hàng kèm theo vào bảng order_items nếu có
                if (orderPayload.items && orderPayload.items.length > 0) {
                    const itemsPayload = orderPayload.items.map(item => ({
                        order_id: createdCloudOrder.id,
                        product_id: item.productId || item.id || null,
                        product_name: item.name || item.title || "Sản phẩm nội thất",
                        product_price: Number(item.price || 0),
                        quantity: Number(item.quantity || 1),
                        subtotal: Number(item.price || 0) * Number(item.quantity || 1),
                        image_url: item.image || item.image_url || ""
                    }));

                    try {
                        await this.restFetch("order_items", {
                            method: "POST",
                            body: JSON.stringify(itemsPayload)
                        });
                    } catch (itemErr) {
                        console.warn("[Supabase] Lưu order_items:", itemErr);
                    }
                }
                console.log("[Supabase] Đã ghi nhận đơn hàng thành công lên Cloud:", orderCode);
            }
        } catch (err) {
            console.warn("[Supabase] Lỗi ghi đơn hàng online:", err);
        }

        // 2. Lưu vào Local Cache ngay lập tức
        const localRecord = {
            id: (createdCloudOrder && createdCloudOrder.id) ? createdCloudOrder.id : ("ord-" + Date.now()),
            order_code: orderCode,
            customer_name: custName,
            customer_phone: custPhone,
            customer_email: custEmail,
            shipping_address: shipAddr,
            city: city,
            payment_method: payMethod,
            shipping_fee: shipFee,
            total_amount: total,
            note: note,
            status: "pending",
            items: orderPayload.items || [],
            savedToCloud: savedToCloud,
            created_at: (createdCloudOrder && createdCloudOrder.created_at) ? createdCloudOrder.created_at : new Date().toISOString()
        };

        let currentOrders = [];
        try {
            const raw = localStorage.getItem("morioo_orders");
            if (raw) currentOrders = JSON.parse(raw);
        } catch(e) {}
        currentOrders.unshift(localRecord);
        localStorage.setItem("morioo_orders", JSON.stringify(currentOrders));
        localStorage.setItem("morioo_last_order_sync", Date.now().toString());

        // 3. Phát tín hiệu thời gian thực (0ms) cho TẤT CẢ các tab qua BroadcastChannel & Storage Event
        try {
            const channel = new BroadcastChannel("morioo_sync_channel");
            channel.postMessage({
                type: "NEW_ORDER",
                order: localRecord,
                timestamp: Date.now()
            });
            setTimeout(() => channel.close(), 1000);
        } catch (e) {}

        window.dispatchEvent(new CustomEvent("order-list-changed", { detail: localRecord }));

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
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(productId);
        const queryField = isUuid ? "id" : "slug";
        await this.restFetch(`products?${queryField}=eq.${encodeURIComponent(productId)}`, {
            method: "DELETE"
        });

        this.localProducts = this.localProducts.filter(p => p.id !== productId && p.slug !== productId);
        this.saveLocalProducts();

        if (typeof BroadcastChannel !== "undefined") {
            try {
                const ch = new BroadcastChannel("morioo_sync_channel");
                ch.postMessage({ type: "PRODUCT_DELETED", productId });
                setTimeout(() => ch.close(), 1000);
            } catch(e) {}
        }

        return { success: true };
    }

    /**
     * Thêm sản phẩm mới trực tiếp lên Supabase Cloud (Không lưu trữ nội bộ trái phép)
     */
    async addProduct(product) {
        const slug = (product.name || "san-pham")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);

        const newProd = {
            slug,
            name: product.name,
            category_slug: product.category_slug || "phong-khach",
            wood_type: product.wood_type || "Gỗ Sồi Trắng",
            price: Number(product.price) || 0,
            original_price: Number(product.original_price) || Number(product.price) || 0,
            rating: 5.0,
            reviews_count: 1,
            dimensions: product.dimensions || "Tiêu chuẩn",
            short_desc: product.short_desc || product.name || "",
            description: product.description || product.name || "",
            in_stock: true,
            stock_quantity: Number(product.stock_quantity) || 10,
            is_featured: !!product.is_featured,
            is_new: true,
            is_bestseller: false,
            image_url: product.image_url || "assets/images/hero-room-banner.png"
        };

        const inserted = await this.restFetch("products", {
            method: "POST",
            body: JSON.stringify(newProd),
            prefer: "return=representation"
        });

        if (!inserted || !inserted[0]) {
            throw new Error("Không thể ghi dữ liệu sản phẩm vào Supabase Cloud.");
        }

        const savedCloudProduct = inserted[0];
        this.isOnline = true;
        this.localProducts.unshift(savedCloudProduct);
        this.saveLocalProducts();

        // Broadcast to other tabs
        if (typeof BroadcastChannel !== "undefined") {
            try {
                const ch = new BroadcastChannel("morioo_sync_channel");
                ch.postMessage({ type: "PRODUCT_ADDED", product: savedCloudProduct });
                setTimeout(() => ch.close(), 1000);
            } catch(e) {}
        }

        return {
            success: true,
            cloud: true,
            product: savedCloudProduct
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

    // =========================================================================
    // 5 DỊCH VỤ NỘI THẤT MORIOO: TƯ VẤN, ĐẶT ĐÓNG, VẬN CHUYỂN, BẢO TRÌ, THIẾT KẾ
    // =========================================================================

    /**
     * Lấy danh sách toàn bộ yêu cầu dịch vụ
     */
    async getServiceRequests() {
        let cloudList = [];
        try {
            const res = await this.restFetch("service_requests?select=*&order=created_at.desc");
            if (res && res.length > 0) {
                cloudList = res;
            }
        } catch (e) {
            // Service requests table not created yet in cloud
        }

        const localList = this.loadLocalServiceRequests();
        const map = new Map();
        localList.forEach(item => map.set(item.code || item.id, item));
        cloudList.forEach(item => {
            const code = item.code || item.id;
            if (!map.has(code)) {
                map.set(code, item);
            }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    loadLocalServiceRequests() {
        const s = localStorage.getItem("morioo_service_requests");
        if (s) {
            try { return JSON.parse(s); } catch (e) {}
        }
        return [];
    }

    saveLocalServiceRequests(list) {
        try {
            localStorage.setItem("morioo_service_requests", JSON.stringify(list));
        } catch (e) {}
    }

    /**
     * Tạo yêu cầu dịch vụ khách hàng mới (Đồng bộ Realtime BroadcastChannel & Cloud)
     */
    async createServiceRequest(payload) {
        const prefixMap = {
            'tu-van': 'DV-TV',
            'dat-dong': 'DV-DD',
            'van-chuyen': 'DV-VC',
            'bao-tri': 'DV-BT',
            'thiet-ke-khong-gian': 'DV-KG'
        };
        const prefix = prefixMap[payload.service_type] || 'DV-KH';
        const code = prefix + '-' + Math.floor(100000 + Math.random() * 900000);

        const newReq = {
            id: 'req-' + Date.now(),
            code: payload.code || code,
            service_type: payload.service_type || 'tu-van',
            customer_name: (payload.customer_name || payload.name || 'Khách hàng MORIOO').trim(),
            customer_phone: (payload.customer_phone || payload.phone || '').trim(),
            customer_email: (payload.customer_email || payload.email || '').trim(),
            address: (payload.address || '').trim(),
            details: payload.details || {},
            image_url: payload.image_url || '',
            preferred_date: payload.preferred_date || '',
            preferred_time: payload.preferred_time || '',
            status: 'pending',
            staff_notes: '',
            assigned_staff: '',
            created_at: new Date().toISOString()
        };

        // 1. Lưu LocalStorage
        const currentList = this.loadLocalServiceRequests();
        currentList.unshift(newReq);
        this.saveLocalServiceRequests(currentList);

        // 2. BroadcastChannel tức thì cho Admin & Nhân viên
        try {
            const bc = new BroadcastChannel('morioo_sync_channel');
            bc.postMessage({ type: 'NEW_SERVICE_REQUEST', request: newReq, timestamp: Date.now() });
            bc.close();
        } catch (e) {}

        // 3. Thử lưu lên Supabase Cloud
        let cloudSaved = false;
        try {
            const res = await this.restFetch("service_requests", {
                method: "POST",
                body: JSON.stringify(newReq)
            });
            if (res && res.length > 0) cloudSaved = true;
        } catch (e) {}

        return {
            success: true,
            code: newReq.code,
            cloud: cloudSaved,
            request: newReq
        };
    }

    /**
     * Cập nhật trạng thái yêu cầu dịch vụ
     */
    async updateServiceRequestStatus(idOrCode, status, staffName = '', notes = '') {
        const list = this.loadLocalServiceRequests();
        const item = list.find(r => r.id === idOrCode || r.code === idOrCode);
        if (item) {
            item.status = status;
            if (staffName) item.assigned_staff = staffName;
            if (notes) item.staff_notes = notes;
            item.updated_at = new Date().toISOString();
            this.saveLocalServiceRequests(list);

            try {
                const bc = new BroadcastChannel('morioo_sync_channel');
                bc.postMessage({ type: 'SERVICE_REQUEST_STATUS_CHANGED', code: item.code, status, assigned_staff: staffName, notes });
                bc.close();
            } catch (e) {}
        }

        try {
            await this.restFetch(`service_requests?code=eq.${encodeURIComponent(idOrCode)}`, {
                method: "PATCH",
                body: JSON.stringify({ status, assigned_staff: staffName, staff_notes: notes, updated_at: new Date().toISOString() })
            });
        } catch (e) {}

        return true;
    }

    /**
     * Tra cứu thông tin đơn hàng hoặc dịch vụ (Theo Mã hoặc Số Điện Thoại)
     */
    async trackOrderOrService(query) {
        if (!query) return null;
        const q = query.trim().toUpperCase();
        const qPhone = query.trim().replace(/[^0-9]/g, '');

        // 1. Tìm trong Orders (Cloud & Local)
        let orders = await this.getOrders();
        let matchedOrder = orders.find(o => 
            (o.order_code && o.order_code.toUpperCase() === q) ||
            (qPhone.length >= 9 && o.customer_phone && o.customer_phone.replace(/[^0-9]/g, '').includes(qPhone))
        );

        if (matchedOrder) {
            return {
                type: 'order',
                data: matchedOrder
            };
        }

        // 2. Tìm trong Service Requests
        let services = await this.getServiceRequests();
        let matchedService = services.find(s => 
            (s.code && s.code.toUpperCase() === q) ||
            (qPhone.length >= 9 && s.customer_phone && s.customer_phone.replace(/[^0-9]/g, '').includes(qPhone))
        );

        if (matchedService) {
            return {
                type: 'service',
                data: matchedService
            };
        }

        return null;
    }

}

export const db = new SupabaseDataService();
