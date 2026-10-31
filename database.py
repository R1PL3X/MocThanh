"""
Local SQLite Fallback Database & Schema Manager for MORIOO
Provides local offline fallback schema matching MORIOO natural oak furniture,
categories (including 'tu-ke'), orders, quotes, chat sessions, and 5 service requests.
"""

import sqlite3
import os
import json
import tempfile

is_vercel = os.environ.get('VERCEL') == '1' or 'VERCEL' in os.environ
if is_vercel:
    DB_FILE = os.path.join(tempfile.gettempdir(), 'morioo_store.db')
else:
    DB_FILE = os.path.join(os.path.dirname(__file__), 'morioo_store.db')

def get_db_connection():
    try:
        os.makedirs(os.path.dirname(os.path.abspath(DB_FILE)), exist_ok=True)
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception:
        try:
            conn = sqlite3.connect('file:mem_morioo_db?mode=memory&cache=shared', uri=True)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception:
            conn = sqlite3.connect(':memory:')
            conn.row_factory = sqlite3.Row
            return conn

_db_initialized = False

def init_db(force=False):
    global _db_initialized
    if _db_initialized and not force:
        return
    try:
        _init_db_internal()
        _db_initialized = True
    except Exception as e:
        print(f"[DB INIT WARNING] {e}")

def _init_db_internal():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Products table (supports both legacy and MORIOO column names)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE,
            name TEXT NOT NULL,
            title TEXT,
            category_slug TEXT NOT NULL,
            category TEXT,
            wood_type TEXT,
            material TEXT,
            price INTEGER NOT NULL,
            original_price INTEGER NOT NULL,
            discount_percent INTEGER DEFAULT 0,
            rating REAL DEFAULT 5.0,
            review_count INTEGER DEFAULT 0,
            reviews_count INTEGER DEFAULT 0,
            sold_count INTEGER DEFAULT 0,
            image_url TEXT NOT NULL,
            image TEXT,
            dimensions TEXT,
            short_desc TEXT,
            description TEXT,
            in_stock INTEGER DEFAULT 1,
            stock_quantity INTEGER DEFAULT 15,
            is_bestseller INTEGER DEFAULT 0,
            is_promo INTEGER DEFAULT 0,
            is_featured INTEGER DEFAULT 0,
            is_new INTEGER DEFAULT 0,
            gallery TEXT,
            colors TEXT,
            highlights TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Categories table (includes 'tu-ke')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL UNIQUE,
            icon TEXT,
            description TEXT,
            display_order INTEGER DEFAULT 0
        )
    ''')

    # 3. Orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            order_code TEXT UNIQUE NOT NULL,
            user_id TEXT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            shipping_address TEXT NOT NULL,
            customer_address TEXT,
            city TEXT,
            payment_method TEXT DEFAULT 'COD',
            shipping_fee INTEGER DEFAULT 0,
            total_amount INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            note TEXT,
            items TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 4. Order Items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_id TEXT,
            product_name TEXT NOT NULL,
            product_price INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            subtotal INTEGER NOT NULL,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 5. Quotes table (Yêu cầu B2B)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            project_type TEXT,
            note TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 6. Service Requests table (5 Customer Services suite)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS service_requests (
            id TEXT PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            service_type TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT,
            address TEXT,
            details TEXT,
            image_url TEXT,
            preferred_date TEXT,
            preferred_time TEXT,
            status TEXT DEFAULT 'pending',
            staff_notes TEXT,
            assigned_staff TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 7. Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 8. Chat Sessions & Messages table (AI Customer Advisor)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            customer_name TEXT DEFAULT 'Khách hàng',
            customer_phone TEXT,
            customer_email TEXT,
            last_message TEXT,
            unread_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id TEXT,
            customer_name TEXT,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chat_msg_session ON chat_messages(session_id)')

    conn.commit()

    # Seed categories if missing
    cursor.execute('SELECT COUNT(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        seed_categories(conn)

    # Seed products if empty
    cursor.execute('SELECT COUNT(*) FROM products')
    if cursor.fetchone()[0] == 0:
        seed_products(conn)

    conn.close()

def seed_categories(conn):
    cats = [
        ('phong-khach', 'Phòng Khách', 'sofa', 'Bàn trà, sofa góc, đôn gỗ sồi Wabi-Sabi', 1),
        ('phong-ngu', 'Phòng Ngủ', 'bed', 'Giường tatami gầm thấp, tab đầu giường gỗ sồi', 2),
        ('phong-an', 'Phòng Ăn & Bếp', 'utensils', 'Bộ bàn ăn nguyên tấm, ghế tựa lưng thoải mái', 3),
        ('lam-viec', 'Góc Làm Việc', 'briefcase', 'Bàn làm việc thông minh, giá sách tối giản', 4),
        ('tu-ke', 'Tủ & Kệ', 'box', 'Tủ quần áo, tủ giày nan thoáng khí, kệ tivi', 5),
        ('decor', 'Phụ Kiện Gỗ & Decor', 'sparkles', 'Gương soi, khay đựng, đèn gỗ phong cách Nhật', 6)
    ]
    cursor = conn.cursor()
    cursor.executemany('''
        INSERT OR IGNORE INTO categories (slug, name, icon, description, display_order)
        VALUES (?, ?, ?, ?, ?)
    ''', cats)
    conn.commit()

def seed_products(conn):
    products = [
        (
            'prod-1', 'giuong-ngu-go-soi-tatami-co-hoc-keo',
            'Giường Ngủ Gỗ Sồi Tự Nhiên Tatami Kèm 4 Hộc Kéo MORIOO',
            'Giường Ngủ Gỗ Sồi Tự Nhiên Tatami Kèm 4 Hộc Kéo MORIOO',
            'phong-ngu', 'phong-ngu', 'Gỗ Sồi Trắng Bắc Mỹ', 'Gỗ Sồi Trắng Bắc Mỹ',
            8990000, 11500000, 22, 4.9, 48, 48, 12,
            'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1000&q=80',
            '180 x 200 x 32 cm',
            'Mẫu giường ngủ gỗ sồi gầm phản thấp giống phòng mẫu trong ảnh, tích hợp 4 ngăn kéo chứa đồ.',
            'Chế tác từ 100% gỗ sồi trắng nhập khẩu Bắc Mỹ loại FAS cao cấp của MORIOO. Bề mặt hoàn thiện lau dầu thực vật Osmo tự nhiên an toàn tuyệt đối cho sức khỏe.',
            1, 15, 1, 0, 1, 0
        ),
        (
            'prod-2', 'ghe-sofa-thu-gian-dieu-chinh-nhat-ban',
            'Ghế Sofa Thư Giãn Điều Chỉnh Đa Nấc MORIOO',
            'Ghế Sofa Thư Giãn Điều Chỉnh Đa Nấc MORIOO',
            'phong-khach', 'phong-khach', 'Gỗ Tần Bì & Vải Linen', 'Gỗ Tần Bì & Vải Linen',
            3450000, 4200000, 18, 4.8, 62, 62, 28,
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
            '72 x 85 x 90 cm',
            'Ghế bành thư giãn bọc nệm vải linen thô tự nhiên, gập ngả 14 nấc lưng và tựa đầu êm ái.',
            'Sản phẩm biểu tượng của phong cách nội thất thư giãn tối giản MORIOO. Khung thép chịu lực bọc đệm bông hữu cơ dày dặn êm ái.',
            1, 25, 1, 0, 1, 1
        ),
        (
            'prod-3', 'ban-tra-go-soi-chan-thap-kieu-nhat',
            'Bàn Trà Gỗ Sồi Bo Tròn Chân Thấp Kiểu Nhật MORIOO',
            'Bàn Trà Gỗ Sồi Bo Tròn Chân Thấp Kiểu Nhật MORIOO',
            'phong-khach', 'phong-khach', 'Gỗ Sồi Trắng Bắc Mỹ', 'Gỗ Sồi Trắng Bắc Mỹ',
            2490000, 3100000, 20, 5.0, 37, 37, 45,
            'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80',
            '110 x 55 x 38 cm',
            'Bàn trà sofa gỗ sồi tự nhiên bo tròn mềm mại an toàn, mặt gỗ bóng mịn kháng nước.',
            'Bàn trà trung tâm của phòng khách MORIOO. Thiết kế các góc cạnh bo tròn tỉ mỉ thân thiện với gia đình có trẻ nhỏ.',
            1, 18, 1, 0, 1, 0
        ),
        (
            'prod-4', 'ke-tivi-go-soi-ngan-keo-toi-gian',
            'Kệ Tivi Gỗ Sồi Tự Nhiên 3 Ngăn Kéo MORIOO',
            'Kệ Tivi Gỗ Sồi Tự Nhiên 3 Ngăn Kéo MORIOO',
            'tu-ke', 'tu-ke', 'Gỗ Sồi Trắng Bắc Mỹ', 'Gỗ Sồi Trắng Bắc Mỹ',
            5200000, 6500000, 20, 4.8, 29, 29, 19,
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
            '160 x 40 x 42 cm',
            'Kệ tivi dáng thấp đặt sát sàn gỗ, tay nắm âm tinh tế, cánh trượt mượt mà.',
            'Kệ TV gỗ sồi tối giản. Kết hợp giữa ngăn kéo kín và ngăn hở để đầu máy, loa thanh.',
            1, 12, 0, 0, 1, 0
        ),
        (
            'prod-5', 'tu-giay-go-soi-3-canh-nan-thong-thoang-khi',
            'Tủ Giày Gỗ Sồi 3 Cánh Nan Thông Thoáng Khí MORIOO',
            'Tủ Giày Gỗ Sồi 3 Cánh Nan Thông Thoáng Khí MORIOO',
            'tu-ke', 'tu-ke', 'Gỗ Sồi Trắng Bắc Mỹ', 'Gỗ Sồi Trắng Bắc Mỹ',
            4650000, 5800000, 20, 4.9, 35, 35, 14,
            'https://images.unsplash.com/photo-1595514535415-dae89835e5a6?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1595514535415-dae89835e5a6?auto=format&fit=crop&w=1000&q=80',
            '105 x 35 x 98 cm',
            'Tủ giày cửa nan thoáng khí chống ẩm mốc mùi hôi, chứa 18-24 đôi giày, ngăn kéo tiện lợi.',
            'Chế tác từ gỗ sồi trắng tự nhiên nguyên khối kết hợp cánh nan gỗ truyền thống phong cách Nhật.',
            1, 14, 1, 0, 1, 1
        ),
        (
            'prod-6', 'bo-ban-an-go-soi-4-ghe-minimalist',
            'Bộ Bàn Ăn Gỗ Sồi Tự Nhiên Kèm 4 Ghế Tiện Tròn MORIOO',
            'Bộ Bàn Ăn Gỗ Sồi Tự Nhiên Kèm 4 Ghế Tiện Tròn MORIOO',
            'phong-an', 'phong-an', 'Gỗ Sồi Nga Nguyên Tấm', 'Gỗ Sồi Nga Nguyên Tấm',
            9800000, 12800000, 23, 4.9, 53, 53, 31,
            'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=80',
            'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1000&q=80',
            '140 x 80 x 75 cm',
            'Bộ bàn ghế ăn gia đình 4 chỗ ngồi chuẩn form Nhật, lưng ghế uốn cong nâng đỡ cột sống.',
            'Mặt bàn ghép vân tuyển chọn dày dặn, các góc cạnh vát nghiêng nhẹ nhàng tạo cảm giác thanh thoát.',
            1, 10, 0, 0, 0, 1
        )
    ]
    cursor = conn.cursor()
    cursor.executemany('''
        INSERT OR IGNORE INTO products (
            id, slug, name, title, category_slug, category, wood_type, material,
            price, original_price, discount_percent, rating, review_count, reviews_count, sold_count,
            image_url, image, dimensions, short_desc, description, in_stock, stock_quantity,
            is_bestseller, is_promo, is_featured, is_new
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', products)
    conn.commit()

if __name__ == '__main__':
    init_db(force=True)
    print("Local database schema initialized successfully.")
