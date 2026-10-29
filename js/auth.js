/**
 * DỊCH VỤ XÁC THỰC & PHÂN QUYỀN (AUTH SERVICE)
 * Tách biệt hoàn toàn luồng Khách Hàng (Customer) và Quản Trị Viên (Admin)
 */

import { db } from "./supabase-client.js";

const CURRENT_USER_KEY = "mocthinh_current_user";
const LOCAL_ACCOUNTS_KEY = "mocthinh_accounts";

// Mã bảo mật bắt buộc khi đăng ký quyền Quản Trị Viên (Admin)
export const ADMIN_SECRET_KEY = "MOCTHINH@ADMIN2026";

// Tài khoản mẫu tạo sẵn để thử nghiệm ngay lập tức
const SEED_ACCOUNTS = [
    {
        id: "acc-admin-1",
        email: "admin@mocthinh.vn",
        password: "Admin123!",
        full_name: "Nguyễn Quản Trị",
        phone: "0901234567",
        role: "admin",
        created_at: new Date().toISOString()
    },
    {
        id: "acc-customer-1",
        email: "khachhang@gmail.com",
        password: "Khach123!",
        full_name: "Trần Khách Hàng",
        phone: "0987654321",
        role: "customer",
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
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(SEED_ACCOUNTS));
        return [...SEED_ACCOUNTS];
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

    isCustomer() {
        return this.currentUser && this.currentUser.role === "customer";
    }

    /**
     * Đăng ký tài khoản KHÁCH HÀNG
     */
    async registerCustomer({ fullName, email, phone, password }) {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Kiểm tra trùng email
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

        // Thử đồng bộ lên Supabase nếu có bảng accounts hoặc auth
        if (db.client) {
            try {
                // Thử lưu vào bảng accounts trong Supabase nếu có
                await db.client.from("accounts").insert([{
                    email: newUser.email,
                    password_hash: newUser.password,
                    full_name: newUser.full_name,
                    phone: newUser.phone,
                    role: "customer"
                }]);

                // Thử đăng ký Supabase Auth
                await db.client.auth.signUp({
                    email: cleanEmail,
                    password: password,
                    options: { data: { full_name: newUser.full_name, phone: newUser.phone, role: "customer" } }
                });
            } catch (e) {
                console.log("[Auth] Supabase sync info:", e.message);
            }
        }

        this.localAccounts.push(newUser);
        this.saveLocalAccounts();

        // Tự động đăng nhập
        this.setCurrentUser(newUser);

        return {
            success: true,
            user: newUser,
            message: `Chúc mừng ${newUser.full_name}, tài khoản khách hàng của bạn đã được tạo thành công!`
        };
    }

    /**
     * Đăng ký tài khoản QUẢN TRỊ VIÊN (Cần mã bảo mật Admin)
     */
    async registerAdmin({ fullName, email, phone, password, adminKey }) {
        const cleanEmail = email.trim().toLowerCase();

        // Xác thực mã bảo mật quản trị
        if (!adminKey || adminKey.trim() !== ADMIN_SECRET_KEY) {
            return {
                success: false,
                message: "Mã bí mật xác thực quản trị (Admin Secret Key) không chính xác! Bạn không có quyền tạo tài khoản Admin."
            };
        }

        const exists = this.localAccounts.some(acc => acc.email === cleanEmail);
        if (exists) {
            return { success: false, message: "Email này đã được đăng ký trong hệ thống!" };
        }

        const newAdmin = {
            id: "admin-" + Date.now(),
            email: cleanEmail,
            password: password,
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : "",
            role: "admin",
            created_at: new Date().toISOString()
        };

        if (db.client) {
            try {
                await db.client.from("accounts").insert([{
                    email: newAdmin.email,
                    password_hash: newAdmin.password,
                    full_name: newAdmin.full_name,
                    phone: newAdmin.phone,
                    role: "admin"
                }]);

                await db.client.auth.signUp({
                    email: cleanEmail,
                    password: password,
                    options: { data: { full_name: newAdmin.full_name, role: "admin" } }
                });
            } catch (e) {
                console.log("[Auth] Supabase admin sync info:", e.message);
            }
        }

        this.localAccounts.push(newAdmin);
        this.saveLocalAccounts();

        this.setCurrentUser(newAdmin);

        return {
            success: true,
            user: newAdmin,
            message: `Xác thực thành công! Quyền Quản trị viên (Admin) đã được cấp cho ${newAdmin.full_name}.`
        };
    }

    /**
     * Đăng nhập (Kiểm tra đúng vai trò mong đợi)
     */
    async login({ email, password, requiredRole = null }) {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Thử tìm trong bảng accounts Supabase nếu có
        if (db.client) {
            try {
                const { data, error } = await db.client
                    .from("accounts")
                    .select("*")
                    .eq("email", cleanEmail)
                    .single();

                if (!error && data && data.password_hash === password) {
                    if (requiredRole && data.role !== requiredRole) {
                        return {
                            success: false,
                            message: requiredRole === "admin"
                                ? "Tài khoản này là tài khoản Khách Hàng, không có quyền truy cập Quản trị viên!"
                                : "Tài khoản này là Quản Trị Viên, vui lòng đăng nhập ở tab Quản Trị!"
                        };
                    }
                    this.setCurrentUser(data);
                    return { success: true, user: data, message: "Đăng nhập thành công!" };
                }
            } catch (e) {}
        }

        // 2. Tìm trong danh sách tài khoản
        const account = this.localAccounts.find(acc => acc.email === cleanEmail && acc.password === password);

        if (!account) {
            return {
                success: false,
                message: "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
            };
        }

        // Kiểm tra đúng vai trò
        if (requiredRole && account.role !== requiredRole) {
            return {
                success: false,
                message: requiredRole === "admin"
                    ? "Tài khoản này là Khách Hàng, không có quyền đăng nhập vào mục Quản trị!"
                    : "Đây là tài khoản Quản trị, vui lòng đăng nhập tại tab Quản Trị Viên!"
            };
        }

        this.setCurrentUser(account);

        return {
            success: true,
            user: account,
            message: `Chào mừng ${account.full_name} (${account.role === "admin" ? "Quản trị viên" : "Khách hàng"}) trở lại!`
        };
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
