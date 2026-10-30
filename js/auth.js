/**
 * DỊCH VỤ XÁC THỰC & PHÂN QUYỀN MORIOO (AUTH SERVICE)
 * ---------------------------------------------------------------------
 * 1. Admin Tối Cao duy nhất: Toàn quyền quản trị hệ thống, sản phẩm & nhân viên
 * 2. Nhân viên (Staff): Xử lý đơn hàng, đổi trạng thái, tra cứu tồn kho (do Admin tạo)
 * 3. Khách hàng (Customer): Đăng ký tự do, mua hàng, xem đơn hàng của tôi
 */

import { db } from "./supabase-client.js";

const CURRENT_USER_KEY = "morioo_current_user";
const LOCAL_ACCOUNTS_KEY = "morioo_accounts";

// Duy nhất 1 tài khoản Admin tối cao và các tài khoản mẫu ban đầu
const INITIAL_ACCOUNTS = [
    {
        id: "acc-admin-supreme",
        email: "admin@morioo.vn",
        password: "Admin123!",
        full_name: "Admin MORIOO Tối Cao",
        phone: "0901234567",
        role: "admin",
        department: "Ban Quản Trị Tối Cao",
        created_at: new Date().toISOString()
    },
    {
        id: "acc-staff-1",
        email: "nhanvien@morioo.vn",
        password: "Staff123!",
        full_name: "Lê Văn Nhân Viên",
        phone: "0912345678",
        role: "staff",
        department: "Xử lý đơn hàng & Kho",
        created_at: new Date().toISOString()
    },
    {
        id: "acc-customer-1",
        email: "khachhang@gmail.com",
        password: "Khach123!",
        full_name: "Trần Khách Hàng",
        phone: "0987654321",
        role: "customer",
        department: "Khách hàng thân thiết",
        created_at: new Date().toISOString()
    }
];

class AuthService {
    constructor() {
        this.currentUser = this.loadCurrentUser();
        this.localAccounts = this.loadLocalAccounts();
    }

    loadCurrentUser() {
        try {
            const raw = localStorage.getItem(CURRENT_USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    loadLocalAccounts() {
        try {
            const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
            if (raw) {
                const list = JSON.parse(raw);
                // Đảm bảo luôn có tài khoản Admin tối cao duy nhất
                if (!list.some(a => a.role === "admin" && a.email === "admin@morioo.vn")) {
                    list.unshift(INITIAL_ACCOUNTS[0]);
                }
                return list;
            }
        } catch (e) {}
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(INITIAL_ACCOUNTS));
        return [...INITIAL_ACCOUNTS];
    }

    saveLocalAccounts() {
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(this.localAccounts));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === "admin";
    }

    isStaff() {
        return this.currentUser && this.currentUser.role === "staff";
    }

    isCustomer() {
        return this.currentUser && this.currentUser.role === "customer";
    }

    canManageOrders() {
        return this.isAdmin() || this.isStaff();
    }

    canManageProducts() {
        return this.isAdmin();
    }

    canManageStaff() {
        return this.isAdmin();
    }

    /**
     * ĐĂNG NHẬP GỘP LÀM 1 (Hệ thống tự động nhận diện Admin / Nhân viên / Khách hàng)
     */
    async login({ email, password }) {
        const cleanEmail = (email || "").trim().toLowerCase();

        // 1. Thử xác thực với bảng accounts trong Supabase nếu có
        if (db.client) {
            try {
                const { data, error } = await db.client
                    .from("accounts")
                    .select("*")
                    .eq("email", cleanEmail)
                    .single();

                if (!error && data && data.password_hash === password) {
                    this.setCurrentUser(data);
                    return {
                        success: true,
                        user: data,
                        message: `Đăng nhập thành công! Xin chào ${data.full_name}.`
                    };
                }
            } catch (e) {}
        }

        // 2. Xác thực với bộ tài khoản hệ thống
        const account = this.localAccounts.find(acc => acc.email === cleanEmail && acc.password === password);

        if (!account) {
            return {
                success: false,
                message: "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
            };
        }

        this.setCurrentUser(account);

        let roleLabel = "Khách Hàng";
        if (account.role === "admin") roleLabel = "👑 Quản Trị Viên";
        else if (account.role === "staff") roleLabel = "💼 Nhân Viên";

        return {
            success: true,
            user: account,
            message: `Đăng nhập thành công với vai trò ${roleLabel}!`
        };
    }

    /**
     * ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG (Tự do dành cho khách mua sắm)
     */
    async registerCustomer({ fullName, email, phone, password }) {
        const cleanEmail = (email || "").trim().toLowerCase();

        if (cleanEmail === "admin@morioo.vn") {
            return { success: false, message: "Email này là tài khoản Quản trị viên tối cao, không thể đăng ký!" };
        }

        const exists = this.localAccounts.some(acc => acc.email === cleanEmail);
        if (exists) {
            return { success: false, message: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác!" };
        }

        const newUser = {
            id: "user-" + Date.now(),
            email: cleanEmail,
            password: password,
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "customer",
            created_at: new Date().toISOString()
        };

        if (db.client) {
            try {
                await db.client.from("accounts").insert([{
                    email: newUser.email,
                    password_hash: newUser.password,
                    full_name: newUser.full_name,
                    phone: newUser.phone,
                    role: "customer"
                }]);
            } catch (e) {}
        }

        this.localAccounts.push(newUser);
        this.saveLocalAccounts();
        this.setCurrentUser(newUser);

        return {
            success: true,
            user: newUser,
            message: `Chúc mừng ${newUser.full_name}, tài khoản khách hàng của bạn đã được tạo thành công!`
        };
    }

    /**
     * TẠO TÀI KHOẢN NHÂN VIÊN MỚI (CHỈ ADMIN MỚI CÓ QUYỀN TẠO)
     */
    async createStaffAccount({ fullName, email, phone, password, department }) {
        if (!this.isAdmin()) {
            return { success: false, message: "Chỉ Quản Trị Viên tối cao mới có quyền tạo tài khoản nhân viên!" };
        }

        const cleanEmail = (email || "").trim().toLowerCase();
        const exists = this.localAccounts.some(acc => acc.email === cleanEmail);
        if (exists) {
            return { success: false, message: "Email nhân viên này đã tồn tại trong hệ thống!" };
        }

        const newStaff = {
            id: "staff-" + Date.now(),
            email: cleanEmail,
            password: password || "Staff123!",
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : "",
            role: "staff",
            department: department || "Xử lý đơn hàng & Kho",
            created_at: new Date().toISOString()
        };

        if (db.client) {
            try {
                await db.client.from("accounts").insert([{
                    email: newStaff.email,
                    password_hash: newStaff.password,
                    full_name: newStaff.full_name,
                    phone: newStaff.phone,
                    role: "staff",
                    department: newStaff.department
                }]);
            } catch (e) {}
        }

        this.localAccounts.push(newStaff);
        this.saveLocalAccounts();

        return {
            success: true,
            staff: newStaff,
            message: `Đã cấp tài khoản nhân viên thành công cho ${newStaff.full_name}!`
        };
    }

    /**
     * LẤY DANH SÁCH NHÂN VIÊN (Dành cho Admin)
     */
    getStaffAccounts() {
        return this.localAccounts.filter(a => a.role === "staff");
    }

    /**
     * XÓA TÀI KHOẢN NHÂN VIÊN (Dành cho Admin)
     */
    deleteStaffAccount(staffId) {
        if (!this.isAdmin()) return { success: false, message: "Từ chối quyền truy cập." };

        this.localAccounts = this.localAccounts.filter(a => a.id !== staffId && a.role === "staff");
        this.saveLocalAccounts();
        return { success: true, message: "Đã xóa tài khoản nhân viên thành công." };
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: { user } }));
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(CURRENT_USER_KEY);
        if (db.client) {
            try { db.client.auth.signOut(); } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: { user: null } }));
    }
}

export const auth = new AuthService();
