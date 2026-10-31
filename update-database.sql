-- ==============================================================================
-- CẬP NHẬT DATABASE SUPABASE CHO MORIOO: MỤC TỦ & KỆ VÀ 5 GÓI DỊCH VỤ
-- Hướng dẫn: Mở Supabase -> Chọn dự án -> Vào mục "SQL Editor" -> Dán toàn bộ mã này -> Bấm "RUN"
-- ==============================================================================

-- 1. BẬT RLS VÀ MỞ QUYỀN ĐẦY ĐỦ CHO BẢNG DANH MỤC (CATEGORIES)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Categories" ON categories;
DROP POLICY IF EXISTS "Public Insert Categories" ON categories;
DROP POLICY IF EXISTS "Public Update Categories" ON categories;
DROP POLICY IF EXISTS "Public Delete Categories" ON categories;

CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Insert Categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public Delete Categories" ON categories FOR DELETE USING (true);

-- 2. THÊM DANH MỤC TỦ & KỆ VÀO BẢNG CATEGORIES TRÊN SUPABASE
INSERT INTO categories (slug, name, icon, description, display_order)
VALUES (
    'tu-ke',
    'Tủ & Kệ',
    'box',
    'Tủ quần áo, tủ giày, kệ tivi và kệ sách gỗ sồi tự nhiên phong cách Nhật',
    5
)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- 3. CẬP NHẬT CÁC SẢN PHẨM TỦ VÀ KỆ TRONG BẢNG PRODUCTS SANG CATEGORY_SLUG = 'tu-ke'
UPDATE products 
SET category_slug = 'tu-ke', updated_at = NOW()
WHERE slug IN (
    'ke-tivi-go-soi-ngan-keo-toi-gian',
    'ke-sach-go-tu-nhien-4-tang-modul',
    'tu-quan-ao-go-soi-cua-lua-wabi-sabi',
    'tab-dau-giuong-go-soi-1-ngan-keo'
);

-- 4. THÊM SẢN PHẨM MỚI "TỦ GIÀY GỖ SỒI 3 CÁNH NAN" VÀO BẢNG PRODUCTS TRÊN SUPABASE
INSERT INTO products (
    slug, name, category_slug, wood_type, price, original_price, 
    rating, reviews_count, dimensions, short_desc, description, 
    in_stock, stock_quantity, is_featured, is_new, is_bestseller, image_url
)
VALUES (
    'tu-giay-go-soi-3-canh-nan-thong-thoang-khi',
    'Tủ Giày Gỗ Sồi 3 Cánh Nan Thông Thoáng Khí MORIOO',
    'tu-ke',
    'Gỗ Sồi Trắng Bắc Mỹ',
    4650000,
    5800000,
    4.9,
    35,
    '105 x 35 x 98 cm',
    'Tủ giày cửa nan thoáng khí chống ẩm mốc mùi hôi, chứa 18-24 đôi giày, ngăn kéo tiện lợi để chìa khóa.',
    'Chế tác từ gỗ sồi trắng tự nhiên nguyên khối kết hợp cánh nan gỗ truyền thống phong cách Nhật. Các khe nan được vát góc tỉ mỉ giúp không khí luôn lưu thông khô ráo tự nhiên. Bản lề giảm chấn chống ồn cao cấp.',
    true,
    14,
    true,
    true,
    true,
    'https://images.unsplash.com/photo-1595514535415-dae89835e5a6?auto=format&fit=crop&w=1000&q=80'
)
ON CONFLICT (slug) DO UPDATE 
SET category_slug = 'tu-ke',
    price = EXCLUDED.price,
    name = EXCLUDED.name;

-- 5. TẠO BẢNG YÊU CẦU DỊCH VỤ KHÁCH HÀNG (SERVICE_REQUESTS) CHO 5 GÓI DỊCH VỤ
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    service_type VARCHAR(50) NOT NULL, -- 'tu-van', 'dat-dong', 'van-chuyen', 'bao-tri', 'thiet-ke-khong-gian'
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    image_url TEXT,
    preferred_date VARCHAR(50),
    preferred_time VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'consulting', 'quoted', 'shipping', 'in_progress', 'completed', 'cancelled'
    staff_notes TEXT,
    assigned_staff VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MỞ QUYỀN RLS CHO BẢNG SERVICE_REQUESTS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Service Requests" ON service_requests;
DROP POLICY IF EXISTS "Public Insert Service Requests" ON service_requests;
DROP POLICY IF EXISTS "Public Update Service Requests" ON service_requests;
DROP POLICY IF EXISTS "Public Delete Service Requests" ON service_requests;

CREATE POLICY "Public Read Service Requests" ON service_requests FOR SELECT USING (true);
CREATE POLICY "Public Insert Service Requests" ON service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Service Requests" ON service_requests FOR UPDATE USING (true);
CREATE POLICY "Public Delete Service Requests" ON service_requests FOR DELETE USING (true);

-- 6. THÊM CÁC YÊU CẦU DỊCH VỤ MẪU ĐỂ TEST HỆ THỐNG
INSERT INTO service_requests (code, service_type, customer_name, customer_phone, customer_email, address, details, status, assigned_staff)
VALUES 
(
    'DV-TV-849102',
    'tu-van',
    'Vũ Hải Yến',
    '0912 888 777',
    'haiyen.vu@gmail.com',
    'Căn 12.04 Tòa Landmark 2, Vinhomes Central Park, Bình Thạnh, TP.HCM',
    '{"room_type": "Phòng khách & Thư giãn", "room_area": "28m²", "style_preference": "Zen Nhật Bản (Tối giản, sàn thấp, mộc mạc)", "budget_range": "Từ 20 - 50 triệu VNĐ"}'::jsonb,
    'pending',
    ''
),
(
    'DV-DD-392817',
    'dat-dong',
    'Trần Quang Khải',
    '0988 123 999',
    'khai.tq@techcorp.vn',
    'Số 48 Phố Hoàng Ngân, Trung Hòa, Cầu Giấy, Hà Nội',
    '{"product_category": "Tủ quần áo (Cánh nan kịch trần)", "dimensions": "240 x 60 x 260 cm", "wood_material": "Gỗ Sồi Trắng Bắc Mỹ FAS", "color_finish": "Màu mộc thô nhạt Wabi-Sabi"}'::jsonb,
    'quoted',
    'Lê Văn Nhân Viên'
),
(
    'DV-VC-551029',
    'van-chuyen',
    'Nguyễn Phương Thảo',
    '0932 456 789',
    'thao.phuong@gmail.com',
    'Chung cư Masteri Thảo Điền, P. Thảo Điền, TP. Thủ Đức, TP.HCM',
    '{"order_code": "MR-2610-7164", "house_type": "Chung cư có thang máy chở hàng", "installation_service": "Giao hàng & Lắp đặt hoàn thiện trọn gói"}'::jsonb,
    'shipping',
    'Lê Văn Nhân Viên'
),
(
    'DV-BT-772910',
    'bao-tri',
    'Đặng Quốc Dũng',
    '0903 666 555',
    'dung.dq@vnn.vn',
    '74 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM',
    '{"product_item": "Tủ Quần Áo Cánh Lùa Gỗ Sồi", "issue_type": "Xệ cánh tủ lùa bên phải và cần lau dầu Osmo bảo dưỡng mặt ngoài"}'::jsonb,
    'in_progress',
    'Lê Văn Nhân Viên'
),
(
    'DV-KG-910482',
    'thiet-ke-khong-gian',
    'Bùi Thu Trang',
    '0979 333 444',
    'trang.bui@design.vn',
    'Tòa S2.05 Vinhomes Grand Park, Q.9, TP. Thủ Đức',
    '{"space_category": "Căn hộ chung cư trọn gói 2 Phòng Ngủ", "room_dimensions": "7.2m x 4.5m phòng khách, 2 PN 14m² và 18m²", "budget_tier": "60 - 120 triệu VNĐ"}'::jsonb,
    'pending',
    ''
)
ON CONFLICT (code) DO NOTHING;
