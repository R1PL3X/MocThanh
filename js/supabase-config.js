/**
 * CẤU HÌNH KẾT NỐI SUPABASE CLOUD (MỘC THỊNH FURNITURE)
 * -------------------------------------------------------------
 * Bạn có thể dán trực tiếp SUPABASE_URL và SUPABASE_ANON_KEY vào đây,
 * hoặc chỉnh sửa trực tiếp từ nút "Cài đặt Supabase" trên giao diện web!
 */

const DEFAULT_CONFIG = {
    // Thay thế bằng Project URL của bạn từ https://supabase.com
    url: "https://your-project-id.supabase.co",

    // Khóa công khai anon (public key) - An toàn khi dùng ở client
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here"
};

const STORAGE_KEY_URL = "mocthinh_supabase_url";
const STORAGE_KEY_ANON = "mocthinh_supabase_anon_key";

export const SupabaseConfig = {
    getUrl() {
        return localStorage.getItem(STORAGE_KEY_URL) || localStorage.getItem("muji_supabase_url") || DEFAULT_CONFIG.url;
    },

    getAnonKey() {
        return localStorage.getItem(STORAGE_KEY_ANON) || localStorage.getItem("muji_supabase_anon_key") || DEFAULT_CONFIG.anonKey;
    },

    setCredentials(url, anonKey) {
        if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
        if (anonKey) localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    },

    clearCredentials() {
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_ANON);
    },

    isConfigured() {
        const u = this.getUrl();
        const k = this.getAnonKey();
        return u && !u.includes("your-project-id") && k && !k.includes("your-anon-key");
    }
};
