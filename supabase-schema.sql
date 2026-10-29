-- ==============================================================================
-- MORIOO WOODEN FURNITURE - DATABASE SCHEMA FOR SUPABASE
-- Cấu hình để AI CŨNG XEM ĐƯỢC TRÊN TOÀN CẦU (Public Access via Row Level Security)
-- ==============================================================================

-- 1. BẬT TIỆN ÍCH MỞ RỘNG (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TẠO BẢNG DANH MỤC (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TẠO BẢNG SẢN PHẨM (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_slug VARCHAR(100) REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE SET NULL,
    wood_type VARCHAR(100) NOT NULL, -- 'Gỗ Sồi Trắng', 'Gỗ Óc Chó', 'Gỗ Thông', 'Gỗ Tần Bì'
    price NUMERIC(12, 0) NOT NULL,
    original_price NUMERIC(12, 0),
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INT DEFAULT 12,
    dimensions VARCHAR(150),
    description TEXT,
    short_desc VARCHAR(500),
    in_stock BOOLEAN DEFAULT TRUE,
    stock_quantity INT DEFAULT 20,
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    image_url TEXT NOT NULL,
    secondary_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TẠO BẢNG ĐƠN HÀNG (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Toàn quốc',
    payment_method VARCHAR(50) DEFAULT 'cod', -- 'cod', 'bank_transfer', 'qr_pay'
    shipping_fee NUMERIC(12, 0) DEFAULT 0,
    total_amount NUMERIC(12, 0) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TẠO BẢNG CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price NUMERIC(12, 0) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(12, 0) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TẠO BẢNG ĐÁNH GIÁ (REVIEWS)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TẠO BẢNG TÀI KHOẢN (ACCOUNTS: KHÁCH HÀNG & QUẢN TRỊ VIÊN RIÊNG BIỆT)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'customer' (Khách) hoặc 'admin' (Quản trị viên)
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- CẤU HÌNH ROW LEVEL SECURITY (RLS) - ĐẢM BẢO BẤT KỲ AI TRÊN MẠNG CŨNG XEM ĐƯỢC
-- ==============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true);
CREATE POLICY "Public Read Reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public Read Accounts" ON accounts FOR SELECT USING (true);

CREATE POLICY "Public Insert Orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public Insert Order Items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Order Items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Public Insert Reviews" ON reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Insert Products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public Delete Products" ON products FOR DELETE USING (true);

CREATE POLICY "Public Insert Accounts" ON accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Accounts" ON accounts FOR UPDATE USING (true);

-- Tài khoản mẫu sẵn trong database
INSERT INTO accounts (email, password_hash, full_name, phone, role) VALUES
('admin@morioo.vn', 'Admin123!', 'Nguyễn Quản Trị MORIOO', '0901234567', 'admin'),
('khachhang@gmail.com', 'Khach123!', 'Trần Văn Khách', '0987654321', 'customer')
ON CONFLICT (email) DO NOTHING;

-- ==============================================================================
-- DỮ LIỆU MẪU NỘI THẤT GỖ MORIOO CHUẨN THIẾT KẾ THEO ẢNH ĐÍNH KÈM
-- ==============================================================================

INSERT INTO categories (slug, name, icon, description, display_order) VALUES
('phong-ngu', 'Phòng Ngủ', 'bed', 'Giường gỗ sồi, tab đầu giường, tủ quần áo mộc mạc tối giản', 1),
('phong-khach', 'Phòng Khách', 'sofa', 'Sofa thư giãn, bàn trà tatami, kệ TV gỗ tự nhiên', 2),
('phong-an', 'Phòng Ăn & Bếp', 'utensils', 'Bàn ghế ăn gỗ sồi nguyên khối chuẩn phong cách Nhật', 3),
('lam-viec', 'Góc Làm Việc', 'desk', 'Bàn làm việc, kệ sách thanh lịch cho không gian tập trung', 4),
('decor', 'Phụ Kiện Gỗ & Decor', 'sparkles', 'Đệm ngồi hạt xốp, khay gỗ, đèn bàn phong cách Wabi-Sabi', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, category_slug, wood_type, price, original_price, rating, reviews_count, dimensions, short_desc, description, in_stock, stock_quantity, is_featured, is_new, is_bestseller, image_url) VALUES
(
    'giuong-ngu-go-soi-tatami-co-hoc-keo',
    'Giường Ngủ Gỗ Sồi Tự Nhiên Tatami Kèm 4 Hộc Kéo MORIOO',
    'phong-ngu',
    'Gỗ Sồi Trắng Bắc Mỹ',
    8990000,
    11500000,
    4.9,
    48,
    '180 x 200 x 32 cm',
    'Mẫu giường gỗ sồi gầm phản thấp phong cách Zen tối giản giống ảnh phòng mẫu, tích hợp 4 ngăn kéo chứa chăn ga đệm gọn gàng.',
    'Chế tác từ 100% gỗ sồi trắng nhập khẩu Bắc Mỹ tuyển chọn loại FAS cao cấp của MORIOO. Bề mặt hoàn thiện lau dầu thực vật Osmo tự nhiên an toàn tuyệt đối cho sức khỏe, giữ nguyên đường vân gỗ tự nhiên ấm áp. Kết cấu mộng gỗ truyền thống vững chãi, chống cong vênh mối mọt.',
    true,
    15,
    true,
    false,
    true,
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=80'
),
(
    'ghe-sofa-thu-gian-dieu-chinh-nhat-ban',
    'Ghế Sofa Thư Giãn Điều Chỉnh Đa Nấc Kiểu Nhật MORIOO',
    'phong-khach',
    'Gỗ Tần Bì & Vải Linen Thô',
    3450000,
    4200000,
    4.8,
    62,
    '72 x 85 x 90 cm',
    'Ghế bành thư giãn bọc nệm vải linen thô tự nhiên, gập ngả 14 nấc lưng và tựa đầu êm ái như ảnh phòng mẫu.',
    'Sản phẩm biểu tượng của phong cách nội thất thư giãn tối giản MORIOO. Khung thép chịu lực bọc đệm bông hữu cơ dày dặn êm ái, bọc ngoài lớp vải linen dệt thô thoáng mát mùa hè, ấm mùa đông. Chân ghế gỗ sồi tự nhiên chắc chắn.',
    true,
    25,
    true,
    true,
    true,
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80'
),
(
    'don-goi-luoi-hat-xop-moc-thinh-style',
    'Đôn Gối Lười Hạt Xốp Đa Năng MORIOO Style',
    'phong-khach',
    'Hạt Micro-bead & Vải Cotton Thô',
    1250000,
    1590000,
    4.9,
    115,
    '65 x 65 x 43 cm',
    'Gối lười hạt xốp ôm trọn đường cong cơ thể, vải bọc tháo giặt dễ dàng, tone xám be hài hòa với sàn gỗ.',
    'Sử dụng hạt xốp siêu mịn micro-bead 0.5mm êm ái, biến hình linh hoạt thành ghế tựa hoặc đôn gác chân tiện lợi bên cạnh bàn trà MORIOO.',
    true,
    40,
    true,
    false,
    true,
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80'
),
(
    'ban-tra-go-soi-chan-thap-kieu-nhat',
    'Bàn Trà Gỗ Sồi Bo Tròn Chân Thấp Kiểu Nhật MORIOO',
    'phong-khach',
    'Gỗ Sồi Trắng Bắc Mỹ',
    2490000,
    3100000,
    5.0,
    37,
    '110 x 55 x 38 cm',
    'Bàn trà sofa gỗ sồi tự nhiên bo tròn mềm mại an toàn, mặt gỗ bóng mịn kháng nước, chân gỗ tiện tròn.',
    'Bàn trà trung tâm của căn phòng trong ảnh mẫu. Thiết kế các góc cạnh bo tròn tỉ mỉ thân thiện với gia đình có trẻ nhỏ. Mặt bàn chịu lực tốt, sơn lót mờ giữ trọn màu gỗ sồi tự nhiên mộc mạc.',
    true,
    18,
    true,
    false,
    true,
    'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80'
),
(
    'ke-tivi-go-soi-ngan-keo-toi-gian',
    'Kệ Tivi Gỗ Sồi Tự Nhiên 3 Ngăn Kéo MORIOO',
    'phong-khach',
    'Gỗ Sồi Trắng Bắc Mỹ',
    5200000,
    6500000,
    4.8,
    29,
    '160 x 40 x 42 cm',
    'Kệ tivi dáng thấp đặt sát sàn gỗ, tay nắm âm tinh tế, cánh trượt mượt mà tối ưu lưu trữ thiết bị điện tử.',
    'Kệ TV gỗ sồi góc phải phòng trong ảnh. Kết hợp giữa ngăn kéo kín và ngăn hở để đầu máy, loa thanh. Lỗ luồn dây điện thông minh phía sau giúp giấu dây cáp gọn gàng.',
    true,
    12,
    true,
    false,
    false,
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
),
(
    'bo-ban-an-go-soi-4-ghe-minimalist',
    'Bộ Bàn Ăn Gỗ Sồi Tự Nhiên Kèm 4 Ghế MORIOO',
    'phong-an',
    'Gỗ Sồi Nga Nguyên Tấm',
    9800000,
    12800000,
    4.9,
    53,
    '140 x 80 x 75 cm',
    'Bộ bàn ghế ăn gia đình 4 chỗ ngồi chuẩn form Nhật, lưng ghế uốn cong nâng đỡ cột sống thoải mái khi ngồi ăn.',
    'Mặt bàn ghép vân tuyển chọn dày dặn, các góc cạnh vát nghiêng nhẹ nhàng tạo cảm giác thanh thoát. Bộ ghế đồng màu tạo nên không gian phòng ăn ấm cúng, đậm chất thiền.',
    true,
    10,
    false,
    true,
    true,
    'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=80'
),
(
    'ban-lam-viec-go-soi-co-ngan-keo',
    'Bàn Làm Việc Gỗ Sồi Nhỏ Gọn Có Ngăn Kéo MORIOO',
    'lam-viec',
    'Gỗ Sồi Trắng Bắc Mỹ',
    4150000,
    4900000,
    4.7,
    31,
    '120 x 60 x 75 cm',
    'Bàn làm việc tại nhà thanh lịch, chân thuôn gọn gàng, 2 ngăn kéo để tài liệu, sổ tay, bút thước ngăn nắp.',
    'Được tính toán công thái học tiêu chuẩn, chiều cao lý tưởng cho người Á Đông. Bề mặt gỗ sồi mịn màng mang lại cảm hứng sáng tạo và tập trung cao độ.',
    true,
    20,
    false,
    false,
    false,
    'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80'
),
(
    'ke-sach-go-tu-nhien-4-tang-modul',
    'Kệ Sách Gỗ Tự Nhiên 4 Tầng Ghép Khối Modul MORIOO',
    'lam-viec',
    'Gỗ Tần Bì Ash',
    3200000,
    3900000,
    4.9,
    44,
    '80 x 30 x 145 cm',
    'Kệ sách thiết kế thoáng lưng, dễ dàng xếp đặt sách, bình hoa gốm, cây xanh decor trang nhã.',
    'Thiết kế dạng modul thông minh có thể ghép nhiều kệ cạnh nhau tạo thành vách ngăn phòng tự nhiên giữa phòng ngủ và phòng khách như trong hình.',
    true,
    16,
    false,
    false,
    true,
    'https://images.unsplash.com/photo-1594671581654-27d5303d3d45?auto=format&fit=crop&w=1000&q=80'
),
(
    'tu-quan-ao-go-soi-cua-lua-wabi-sabi',
    'Tủ Quần Áo Gỗ Sồi Cửa Lùa Phong Cách Wabi-Sabi MORIOO',
    'phong-ngu',
    'Gỗ Sồi Trắng & Nan Gỗ Thông',
    14500000,
    17900000,
    5.0,
    19,
    '180 x 60 x 205 cm',
    'Tủ áo cánh lùa tiết kiệm diện tích tối đa cho căn hộ chung cư, nan gỗ thông thoáng khí chống ẩm mốc.',
    'Bên trong chia khoang khoa học: thanh treo áo dài, ngăn gấp đồ ngủ, ngăn chứa vali du lịch. Cánh lùa ray trượt êm ái của Hafele không phát ra tiếng động.',
    true,
    8,
    false,
    true,
    false,
    'https://images.unsplash.com/photo-1558997519-83ea9252def8?auto=format&fit=crop&w=1000&q=80'
),
(
    'bo-am-tra-gom-su-men-trang-nhat-ban',
    'Bộ Ấm Chén Trà Gốm Sứ Men Mộc Trắng Kèm Khay Gỗ',
    'decor',
    'Gốm Men Mát & Khay Gỗ Sồi',
    6800000,
    850000,
    5.0,
    78,
    'Ấm 550ml + 4 Chén 80ml',
    'Bộ ấm trà trang nhã đặt trên bàn trà như trong hình mẫu, chất gốm giữ nhiệt tốt, tay cầm chống nóng.',
    'Lấy cảm hứng từ nghệ thuật trà đạo Nhật Bản. Bề mặt men mộc mạc màu ngà sữa kết hợp cùng khay gỗ sồi có rãnh thoát nước tiện lợi.',
    true,
    50,
    true,
    false,
    true,
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1000&q=80'
),
(
    'tab-dau-giuong-go-soi-1-ngan-keo',
    'Tủ Kệ Đầu Giường Gỗ Sồi 1 Ngăn Kéo Nhỏ Gọn MORIOO',
    'phong-ngu',
    'Gỗ Sồi Trắng Bắc Mỹ',
    1650000,
    2100000,
    4.8,
    42,
    '45 x 38 x 45 cm',
    'Tab đầu giường đồng bộ với giường ngủ gỗ sồi, mặt trên để đèn ngủ và đồng hồ báo thức.',
    'Gỗ tự nhiên chống trầy, hoàn thiện tinh xảo từng góc cạnh. Ngăn kéo ray giảm chấn đóng mở êm nhẹ.',
    true,
    30,
    false,
    false,
    false,
    'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=1000&q=80'
),
(
    'den-cay-go-soi-chieu-sang-phong-khach',
    'Đèn Đứng Gỗ Sồi Chao Vải Linen Tự Nhiên MORIOO',
    'decor',
    'Gỗ Sồi & Vải Linen',
    1890000,
    2350000,
    4.9,
    26,
    'Chân 150cm - Chao 40cm',
    'Đèn sàn góc phòng mang lại ánh sáng vàng ấm 3000K dịu mắt, tôn lên vẻ đẹp mộc mạc của đồ gỗ.',
    'Chân ba chạc gỗ sồi tiện tinh tế, dây điện bọc dù vintage có công tắc giẫm chân tiện lợi.',
    true,
    22,
    false,
    false,
    false,
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=80'
)
ON CONFLICT (slug) DO NOTHING;

-- Đánh giá mẫu
INSERT INTO reviews (product_id, author_name, rating, comment)
SELECT id, 'Nguyễn Minh Anh', 5, 'Giường MORIOO đẹp y chang ảnh showroom! Gỗ sồi thơm nhẹ mùi mộc, hộc kéo kéo ra vào cực êm. Rất hài lòng!'
FROM products WHERE slug = 'giuong-ngu-go-soi-tatami-co-hoc-keo'
LIMIT 1;

INSERT INTO reviews (product_id, author_name, rating, comment)
SELECT id, 'Trần Đức Toàn', 5, 'Ghế thư giãn ngồi ngả lưng xem phim cực đã. Vải thô dày dặn chuẩn xịn phong cách MORIOO.'
FROM products WHERE slug = 'ghe-sofa-thu-gian-dieu-chinh-nhat-ban'
LIMIT 1;

INSERT INTO reviews (product_id, author_name, rating, comment)
SELECT id, 'Lê Hoàng Yến', 5, 'Bàn trà nhỏ gọn, bo tròn 4 góc an toàn cho bé nhà mình chạy nhảy. Cảm ơn shop MORIOO đóng gói cẩn thận.'
FROM products WHERE slug = 'ban-tra-go-soi-chan-thap-kieu-nhat'
LIMIT 1;
