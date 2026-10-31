import sys, os, urllib.request, json
sys.stdout.reconfigure(encoding='utf-8')

def main():
    service_key = None
    if len(sys.argv) > 1:
        service_key = sys.argv[1].strip()
    else:
        print("Nhập Supabase service_role key (khóa bí mật trong Project Settings > API) để tự động nạp:")
        service_key = input("Service Role Key: ").strip()

    if not service_key:
        print("Chưa nhập key!")
        return

    url = "https://vkhgbegximfhecwgfyow.supabase.co/rest/v1"

    # 1. Thêm danh mục tu-ke
    cat_payload = {
        "slug": "tu-ke",
        "name": "Tủ & Kệ",
        "icon": "box",
        "description": "Tủ quần áo, tủ giày, kệ tivi và kệ sách gỗ sồi tự nhiên phong cách Nhật",
        "display_order": 5
    }
    
    req = urllib.request.Request(
        f"{url}/categories",
        data=json.dumps(cat_payload).encode('utf-8'),
        headers={
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as res:
            print(" [THÀNH CÔNG] Đã thêm danh mục 'tu-ke' vào database Supabase!")
    except urllib.error.HTTPError as e:
        print("Lỗi thêm category:", e.code, e.read().decode('utf-8'))

    # 2. Cập nhật category_slug cho các sản phẩm
    for slug in ['ke-tivi-go-soi-ngan-keo-toi-gian', 'ke-sach-go-tu-nhien-4-tang-modul', 'tu-quan-ao-go-soi-cua-lua-wabi-sabi', 'tab-dau-giuong-go-soi-1-ngan-keo']:
        req_p = urllib.request.Request(
            f"{url}/products?slug=eq.{slug}",
            data=json.dumps({"category_slug": "tu-ke"}).encode('utf-8'),
            headers={
                'apikey': service_key,
                'Authorization': f'Bearer {service_key}',
                'Content-Type': 'application/json'
            },
            method='PATCH'
        )
        try:
            with urllib.request.urlopen(req_p) as res:
                print(f" [THÀNH CÔNG] Đã cập nhật sản phẩm {slug} -> 'tu-ke'")
        except urllib.error.HTTPError as e:
            print(f"Lỗi cập nhật sản phẩm {slug}:", e.code)

if __name__ == "__main__":
    main()
