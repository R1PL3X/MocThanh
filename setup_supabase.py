import json
import os
import sys

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "js", "supabase-config.js")

def update_config(url, anon_key):
    url = url.strip().rstrip('/')
    anon_key = anon_key.strip()
    
    content = f"""/**
 * CẤU HÌNH KẾT NỐI SUPABASE CLOUD (MỘC THỊNH FURNITURE)
 * -------------------------------------------------------------
 * Đã được cập nhật tự động qua setup_supabase.py
 */

const DEFAULT_CONFIG = {{
    url: "{url}",
    anonKey: "{anon_key}"
}};

const STORAGE_KEY_URL = "mocthinh_supabase_url";
const STORAGE_KEY_ANON = "mocthinh_supabase_anon_key";

export const SupabaseConfig = {{
    getUrl() {{
        return localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_CONFIG.url;
    }},

    getAnonKey() {{
        return localStorage.getItem(STORAGE_KEY_ANON) || DEFAULT_CONFIG.anonKey;
    }},

    setCredentials(url, anonKey) {{
        if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
        if (anonKey) localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    }},

    clearCredentials() {{
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_ANON);
    }},

    isConfigured() {{
        const u = this.getUrl();
        const k = this.getAnonKey();
        return u && !u.includes("your-project-id") && k && !k.includes("your-anon-key");
    }}
}};
"""
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print("=" * 60)
    print(" [THÀNH CÔNG] Đã lưu cấu hình Supabase vào js/supabase-config.js!")
    print(f" URL: {url}")
    print("=" * 60)

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        update_config(sys.argv[1], sys.argv[2])
    else:
        print("=" * 60)
        print("  CÀI ĐẶT NHANH KẾT NỐI SUPABASE CHO MỘC THỊNH")
        print("=" * 60)
        url_input = input("Nhập Supabase Project URL (VD: https://xxxx.supabase.co): ").strip()
        key_input = input("Nhập Supabase Anon Key (khóa public): ").strip()
        if url_input and key_input:
            update_config(url_input, key_input)
        else:
            print("Chưa nhập đủ URL và Key!")
