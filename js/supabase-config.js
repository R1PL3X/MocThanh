/**
 * CẤU HÌNH KẾT NỐI SUPABASE CLOUD (MỘC THỊNH FURNITURE)
 * -------------------------------------------------------------
 * ĐÃ KẾT NỐI THÀNH CÔNG VỚI DỰ ÁN SUPABASE TRỰC TUYẾN
 */

const DEFAULT_CONFIG = {
    // Project URL chính thức
    url: "https://vkhgbegximfhecwgfyow.supabase.co",

    // Khóa công khai anon (public key)
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraGdiZWd4aW1maGVjd2dmeW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNTI2MzgsImV4cCI6MjEwODgyODYzOH0.2I9pGf1a1NoCoaxnJElWSCO41NGoP6MNMDWLoOHaaJo"
};

const STORAGE_KEY_URL = "mocthinh_supabase_url";
const STORAGE_KEY_ANON = "mocthinh_supabase_anon_key";

export const SupabaseConfig = {
    getUrl() {
        return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_CONFIG.url;
    },

    getAnonKey() {
        return localStorage.getItem(STORAGE_KEY_ANON) || DEFAULT_CONFIG.anonKey;
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
