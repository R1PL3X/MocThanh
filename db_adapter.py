"""
Database Adapter for MORIOO Storefront & Admin
Supports dual-mode database access:
1. Supabase Cloud PostgreSQL (Default: https://vkhgbegximfhecwgfyow.supabase.co)
2. Local SQLite database (morioo_store.db) as seamless offline fallback
Seamlessly maps between MORIOO schema (name, category_slug, wood_type, image_url)
and universal fields (title, category, material, image) so all frontend pages and
API routes work without modification.
"""

import os
import json
import logging
import uuid
import re
from database import get_db_connection, init_db

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

logger = logging.getLogger('morioo.db_adapter')

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(ROOT_DIR, 'db_config.json')

def load_stored_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading db_config.json: {e}")
    return {}

def save_stored_config(data):
    try:
        current = load_stored_config()
        current.update(data)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.warning(f"Could not save db_config.json: {e}")
        return False

_stored_cfg = load_stored_config()
DEFAULT_SUPABASE_URL = "https://vkhgbegximfhecwgfyow.supabase.co"
DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraGdiZWd4aW1maGVjd2dmeW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNTI2MzgsImV4cCI6MjEwODgyODYzOH0.2I9pGf1a1NoCoaxnJElWSCO41NGoP6MNMDWLoOHaaJo"

SUPABASE_URL = (os.environ.get('SUPABASE_URL') or _stored_cfg.get('supabase_url') or DEFAULT_SUPABASE_URL).strip()
SUPABASE_KEY = (os.environ.get('SUPABASE_KEY') or _stored_cfg.get('supabase_key') or DEFAULT_SUPABASE_KEY).strip()

supabase_client = None
_using_supabase = False

def init_supabase():
    global supabase_client, _using_supabase, SUPABASE_URL, SUPABASE_KEY
    cfg = load_stored_config()
    if not SUPABASE_URL:
        SUPABASE_URL = (os.environ.get('SUPABASE_URL') or cfg.get('supabase_url') or DEFAULT_SUPABASE_URL).strip()
    if not SUPABASE_KEY:
        SUPABASE_KEY = (os.environ.get('SUPABASE_KEY') or cfg.get('supabase_key') or DEFAULT_SUPABASE_KEY).strip()

    if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL.startswith('http'):
        try:
            from supabase import create_client
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            _using_supabase = True
            os.environ['SUPABASE_URL'] = SUPABASE_URL
            os.environ['SUPABASE_KEY'] = SUPABASE_KEY
            print(f"[DB ADAPTER] -> Initialized Supabase client for: {SUPABASE_URL}")
            return True
        except Exception as e:
            print(f"[DB ADAPTER] -> Supabase client init failed: {e}")
            _using_supabase = False
            supabase_client = None
            return False
    else:
        _using_supabase = False
        supabase_client = None
        return False

init_supabase()

def is_supabase_enabled():
    return _using_supabase and supabase_client is not None

def get_db_info():
    if is_supabase_enabled():
        masked_key = SUPABASE_KEY[:8] + '...' + SUPABASE_KEY[-4:] if len(SUPABASE_KEY) > 12 else '***'
        return {
            'mode': 'supabase',
            'status': 'connected',
            'url': SUPABASE_URL,
            'key_preview': masked_key,
            'description': 'Đang kết nối trực tiếp Supabase Cloud PostgreSQL'
        }
    else:
        return {
            'mode': 'sqlite',
            'status': 'active',
            'url': 'local://morioo_store.db',
            'description': 'Đang sử dụng SQLite nội bộ (Offline)'
        }

def test_and_configure_supabase(url, key):
    global supabase_client, _using_supabase, SUPABASE_URL, SUPABASE_KEY
    url = (url or '').strip()
    key = (key or '').strip()
    if not url or not key or not url.startswith('http'):
        return False, "URL hoặc API Key không hợp lệ. URL phải bắt đầu bằng https://"
    try:
        from supabase import create_client
        client = create_client(url, key)
        client.table('categories').select('id').limit(1).execute()
        SUPABASE_URL = url
        SUPABASE_KEY = key
        supabase_client = client
        _using_supabase = True
        os.environ['SUPABASE_URL'] = url
        os.environ['SUPABASE_KEY'] = key
        save_stored_config({'supabase_url': url, 'supabase_key': key})
        return True, "Kết nối Supabase Cloud thành công!"
    except Exception as e:
        return False, f"Lỗi kết nối Supabase: {str(e)}"

def normalize_json_field(val):
    if val is None:
        return []
    if isinstance(val, (list, dict)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return []

def format_product_dict(d):
    """Normalize and format product to support BOTH schema formats"""
    if not d:
        return d
    res = dict(d)
    
    # Names & Titles
    name = res.get('name') or res.get('title') or ''
    res['name'] = name
    res['title'] = name
    res['full_title'] = res.get('full_title') or name
    
    # Category
    cat = res.get('category_slug') or res.get('category') or 'phong-khach'
    res['category'] = cat
    res['category_slug'] = cat
    
    # Material / Wood type
    mat = res.get('wood_type') or res.get('material') or 'Gỗ sồi tự nhiên'
    res['material'] = mat
    res['wood_type'] = mat
    
    # Images
    img = res.get('image_url') or res.get('image') or ''
    res['image'] = img
    res['image_url'] = img
    
    # Pricing
    price = int(res.get('price') or 0)
    orig_price = int(res.get('original_price') or price)
    res['price'] = price
    res['original_price'] = orig_price
    
    if orig_price > price > 0:
        res['discount_percent'] = int(res.get('discount_percent') or round((1 - price / orig_price) * 100))
    else:
        res['discount_percent'] = int(res.get('discount_percent') or 0)
        
    res['rating'] = float(res.get('rating') or 5.0)
    cnt = int(res.get('reviews_count') or res.get('review_count') or 25)
    res['review_count'] = cnt
    res['reviews_count'] = cnt
    res['sold_count'] = int(res.get('sold_count') or 15)
    
    res['dimensions'] = res.get('dimensions') or 'Tiêu chuẩn'
    res['short_desc'] = res.get('short_desc') or ''
    res['description'] = res.get('description') or ''
    res['stock_quantity'] = int(res.get('stock_quantity') or 10)
    res['in_stock'] = 1 if res.get('in_stock', True) else 0
    res['is_bestseller'] = 1 if res.get('is_bestseller') in (1, True, '1') else 0
    res['is_promo'] = 1 if res.get('is_promo') in (1, True, '1') else 0
    res['is_featured'] = 1 if res.get('is_featured') in (1, True, '1') else 0
    res['is_new'] = 1 if res.get('is_new') in (1, True, '1') else 0
    
    res['gallery'] = normalize_json_field(res.get('gallery') or res.get('secondary_images'))
    res['colors'] = normalize_json_field(res.get('colors'))
    res['highlights'] = normalize_json_field(res.get('highlights'))
    return res

def format_order_dict(d):
    if not d:
        return d
    res = dict(d)
    res['customer_address'] = res.get('shipping_address') or res.get('customer_address') or ''
    res['shipping_address'] = res['customer_address']
    res['items'] = normalize_json_field(res.get('items'))
    return res

def format_quote_dict(d):
    if not d:
        return d
    return dict(d)

def slugify(text):
    if not text:
        return str(uuid.uuid4())[:8]
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or str(uuid.uuid4())[:8]

# ==============================================================================
# CATEGORIES
# ==============================================================================
def get_categories():
    if is_supabase_enabled():
        try:
            cats_res = supabase_client.table('categories').select('*').order('display_order', desc=False).execute()
            categories = cats_res.data or []
            
            try:
                prod_res = supabase_client.table('products').select('category_slug').execute()
                counts = {}
                for p in (prod_res.data or []):
                    cat_slug = p.get('category_slug')
                    counts[cat_slug] = counts.get(cat_slug, 0) + 1
                for c in categories:
                    slug = c.get('slug')
                    c['product_count'] = counts.get(slug, 0)
            except Exception:
                pass
            return categories
        except Exception as e:
            logger.error(f"Supabase get_categories error: {e}")

    init_db()
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT c.*, COUNT(p.id) as product_count 
        FROM categories c
        LEFT JOIN products p ON c.slug = p.category_slug OR c.name = p.category
        GROUP BY c.id
        ORDER BY c.display_order ASC
    ''').fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ==============================================================================
# PRODUCTS
# ==============================================================================
def get_products(category=None, search=None, bestseller=None, promo=None, sort='default'):
    if is_supabase_enabled():
        try:
            query = supabase_client.table('products').select('*')
            
            if category and category.lower() != 'all':
                query = query.eq('category_slug', category)
                
            if bestseller in ('1', True, 1):
                query = query.eq('is_bestseller', True)
                
            if promo in ('1', True, 1):
                query = query.eq('is_promo', True)
                
            if search:
                s = f"%{search}%"
                query = query.or_(f"name.ilike.{s},description.ilike.{s}")
                
            if sort == 'price_asc':
                query = query.order('price', desc=False)
            elif sort == 'price_desc':
                query = query.order('price', desc=True)
            elif sort == 'sold':
                query = query.order('reviews_count', desc=True)
            else:
                query = query.order('created_at', desc=True)
                
            res = query.execute()
            data = res.data or []
            return [format_product_dict(p) for p in data]
        except Exception as e:
            logger.error(f"Supabase get_products error: {e}")

    init_db()
    conn = get_db_connection()
    q = 'SELECT * FROM products WHERE 1=1'
    params = []

    if category and category.lower() != 'all':
        q += ' AND (category_slug = ? OR category = ?)'
        params.extend([category, category])

    if search:
        q += ' AND (name LIKE ? OR title LIKE ? OR description LIKE ?)'
        s_pat = f'%{search}%'
        params.extend([s_pat, s_pat, s_pat])

    if bestseller in ('1', True, 1):
        q += ' AND is_bestseller = 1'

    if promo in ('1', True, 1):
        q += ' AND is_promo = 1'

    if sort == 'price_asc':
        q += ' ORDER BY price ASC'
    elif sort == 'price_desc':
        q += ' ORDER BY price DESC'
    elif sort == 'sold':
        q += ' ORDER BY sold_count DESC'
    else:
        q += ' ORDER BY id ASC'

    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [format_product_dict(r) for r in rows]

def get_product_by_id(product_id):
    pid_str = str(product_id)
    if is_supabase_enabled():
        try:
            res = supabase_client.table('products').select('*').eq('id', pid_str).execute()
            if res.data:
                return format_product_dict(res.data[0])
            # If not found by id, try slug
            res_slug = supabase_client.table('products').select('*').eq('slug', pid_str).execute()
            if res_slug.data:
                return format_product_dict(res_slug.data[0])
        except Exception as e:
            logger.error(f"Supabase get_product_by_id error: {e}")

    init_db()
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM products WHERE id = ? OR slug = ?', (pid_str, pid_str)).fetchone()
    conn.close()
    return format_product_dict(row) if row else None

def create_product(data):
    title = (data.get('title') or data.get('name') or '').strip()
    category_raw = (data.get('category_slug') or data.get('category') or 'phong-khach').strip().lower()
    cat_map = {
        'phong-khach': 'phong-khach',
        'phòng khách': 'phong-khach',
        'phong khach': 'phong-khach',
        'phong-ngu': 'phong-ngu',
        'phòng ngủ': 'phong-ngu',
        'phong ngu': 'phong-ngu',
        'phong-an': 'phong-an',
        'phòng ăn': 'phong-an',
        'phòng ăn & bếp': 'phong-an',
        'phong an': 'phong-an',
        'lam-viec': 'lam-viec',
        'phòng làm việc': 'lam-viec',
        'góc làm việc': 'lam-viec',
        'lam viec': 'lam-viec',
        'tu-ke': 'tu-ke',
        'tủ & kệ': 'tu-ke',
        'tu ke': 'tu-ke',
        'decor': 'decor',
        'phụ kiện gỗ & decor': 'decor',
        'phụ kiện & decor': 'decor'
    }
    category = cat_map.get(category_raw, category_raw)
    price = int(data.get('price') or 0)
    original_price = int(data.get('original_price') or price)
    material = data.get('material') or data.get('wood_type') or 'Gỗ Sồi Tự Nhiên'
    dimensions = data.get('dimensions') or 'Tiêu chuẩn'
    description = data.get('description') or ''
    image = data.get('image') or data.get('image_url') or ''
    stock_quantity = int(data.get('stock_quantity') or 15)
    prod_id = str(uuid.uuid4())
    slug = slugify(title) + f"-{prod_id[:6]}"

    if is_supabase_enabled():
        try:
            payload = {
                'id': prod_id,
                'slug': slug,
                'name': title,
                'category_slug': category,
                'wood_type': material,
                'price': price,
                'original_price': original_price,
                'dimensions': dimensions,
                'short_desc': description[:180] if description else '',
                'description': description,
                'image_url': image,
                'in_stock': True,
                'stock_quantity': stock_quantity,
                'is_featured': bool(data.get('is_featured', True)),
                'is_new': bool(data.get('is_new', True)),
                'is_bestseller': bool(data.get('is_bestseller', False)),
                'rating': 5.0,
                'reviews_count': 10
            }
            res = supabase_client.table('products').insert(payload).execute()
            if res.data:
                return res.data[0].get('id', prod_id)
            return prod_id
        except Exception as e:
            logger.error(f"Supabase create_product error: {e}")
            raise Exception(f"Lỗi ghi dữ liệu vào Supabase Cloud: {str(e)}")

    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO products (
            id, slug, name, title, category_slug, category, wood_type, material,
            price, original_price, image_url, image, dimensions, description, in_stock, stock_quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ''', (prod_id, slug, title, title, category, category, material, material, price, original_price, image, image, dimensions, description, stock_quantity))
    conn.commit()
    conn.close()
    return prod_id

def update_product(product_id, data):
    pid_str = str(product_id)
    title = (data.get('title') or data.get('name') or '').strip()
    category = data.get('category') or data.get('category_slug')
    price = int(data.get('price')) if data.get('price') is not None else None
    original_price = int(data.get('original_price')) if data.get('original_price') is not None else None
    material = data.get('material') or data.get('wood_type')
    dimensions = data.get('dimensions')
    description = data.get('description')
    image = data.get('image') or data.get('image_url')

    if is_supabase_enabled():
        try:
            up_payload = {}
            if title: up_payload['name'] = title
            if category: up_payload['category_slug'] = category
            if price is not None: up_payload['price'] = price
            if original_price is not None: up_payload['original_price'] = original_price
            if material: up_payload['wood_type'] = material
            if dimensions: up_payload['dimensions'] = dimensions
            if description is not None: up_payload['description'] = description
            if image: up_payload['image_url'] = image
            if data.get('stock_quantity') is not None:
                up_payload['stock_quantity'] = int(data['stock_quantity'])

            if up_payload:
                supabase_client.table('products').update(up_payload).eq('id', pid_str).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase update_product error: {e}")

    init_db()
    conn = get_db_connection()
    updates = []
    params = []
    if title:
        updates.extend(['name = ?', 'title = ?'])
        params.extend([title, title])
    if category:
        updates.extend(['category_slug = ?', 'category = ?'])
        params.extend([category, category])
    if price is not None:
        updates.append('price = ?')
        params.append(price)
    if original_price is not None:
        updates.append('original_price = ?')
        params.append(original_price)
    if material:
        updates.extend(['wood_type = ?', 'material = ?'])
        params.extend([material, material])
    if dimensions:
        updates.append('dimensions = ?')
        params.append(dimensions)
    if description is not None:
        updates.append('description = ?')
        params.append(description)
    if image:
        updates.extend(['image_url = ?', 'image = ?'])
        params.extend([image, image])

    if updates:
        params.append(pid_str)
        conn.execute(f"UPDATE products SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return True

def delete_product(product_id):
    pid_str = str(product_id)
    if is_supabase_enabled():
        try:
            supabase_client.table('products').delete().eq('id', pid_str).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase delete_product error: {e}")

    init_db()
    conn = get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (pid_str,))
    conn.commit()
    conn.close()
    return True

def sync_sold_counts_from_orders():
    return True

# ==============================================================================
# ORDERS
# ==============================================================================
def create_order(payload):
    order_code = payload.get('order_code') or f"MOR-{uuid.uuid4().hex[:6].upper()}"
    customer_name = payload.get('customer_name')
    customer_phone = payload.get('customer_phone')
    customer_email = payload.get('customer_email', '')
    shipping_address = payload.get('customer_address') or payload.get('shipping_address')
    payment_method = payload.get('payment_method', 'COD')
    note = payload.get('note', '')
    items = payload.get('items', [])
    total_amount = int(payload.get('total_amount') or 0)
    order_id = str(uuid.uuid4())

    if is_supabase_enabled():
        try:
            o_data = {
                'id': order_id,
                'order_code': order_code,
                'customer_name': customer_name,
                'customer_phone': customer_phone,
                'customer_email': customer_email,
                'shipping_address': shipping_address,
                'payment_method': payment_method,
                'shipping_fee': 0,
                'total_amount': total_amount,
                'status': 'pending',
                'note': note
            }
            supabase_client.table('orders').insert(o_data).execute()
            
            # Insert items into order_items if table exists
            if items:
                try:
                    item_rows = []
                    for it in items:
                        item_rows.append({
                            'order_id': order_id,
                            'product_id': it.get('id') or it.get('product_id'),
                            'product_name': it.get('name') or it.get('title') or 'Sản phẩm MORIOO',
                            'product_price': int(it.get('price') or 0),
                            'quantity': int(it.get('quantity') or 1),
                            'subtotal': int((it.get('price') or 0) * (it.get('quantity') or 1)),
                            'image_url': it.get('image') or it.get('image_url') or ''
                        })
                    supabase_client.table('order_items').insert(item_rows).execute()
                except Exception as ex:
                    logger.warning(f"Could not insert order_items: {ex}")
            return order_code
        except Exception as e:
            logger.error(f"Supabase create_order error: {e}")

    init_db()
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO orders (
            id, order_code, customer_name, customer_phone, customer_email,
            shipping_address, customer_address, payment_method, total_amount, note, items, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ''', (order_id, order_code, customer_name, customer_phone, customer_email, shipping_address, shipping_address, payment_method, total_amount, note, json.dumps(items, ensure_ascii=False)))
    conn.commit()
    conn.close()
    return order_code

def get_orders():
    if is_supabase_enabled():
        try:
            res = supabase_client.table('orders').select('*').order('created_at', desc=True).execute()
            orders = res.data or []
            
            # Try to populate items from order_items
            try:
                for o in orders:
                    items_res = supabase_client.table('order_items').select('*').eq('order_id', o['id']).execute()
                    if items_res.data:
                        o['items'] = items_res.data
            except Exception:
                pass
                
            return [format_order_dict(o) for o in orders]
        except Exception as e:
            logger.error(f"Supabase get_orders error: {e}")

    init_db()
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    conn.close()
    return [format_order_dict(r) for r in rows]

def get_user_orders(user_id):
    # Returns orders matching user_id or all if none
    return get_orders()

def update_order_status(order_code, new_status):
    if is_supabase_enabled():
        try:
            supabase_client.table('orders').update({'status': new_status}).eq('order_code', order_code).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase update_order_status error: {e}")

    init_db()
    conn = get_db_connection()
    conn.execute('UPDATE orders SET status = ? WHERE order_code = ?', (new_status, order_code))
    conn.commit()
    conn.close()
    return True

# ==============================================================================
# B2B QUOTES
# ==============================================================================
def create_quote(data):
    fullname = (data.get('fullname') or data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()
    project_type = data.get('project_type', '')
    note = data.get('note', '')

    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO quotes (fullname, phone, email, project_type, note, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
    ''', (fullname, phone, email, project_type, note))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def get_quotes():
    init_db()
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM quotes ORDER BY created_at DESC').fetchall()
    conn.close()
    return [format_quote_dict(r) for r in rows]

def update_quote_status(quote_id, new_status):
    init_db()
    conn = get_db_connection()
    conn.execute('UPDATE quotes SET status = ? WHERE id = ?', (new_status, quote_id))
    conn.commit()
    conn.close()
    return True

def delete_quote(quote_id):
    init_db()
    conn = get_db_connection()
    conn.execute('DELETE FROM quotes WHERE id = ?', (quote_id,))
    conn.commit()
    conn.close()
    return True

# ==============================================================================
# SERVICE REQUESTS (5 Customer Services Suite)
# ==============================================================================
def create_service_request(data):
    code = data.get('code') or f"SRV-{uuid.uuid4().hex[:6].upper()}"
    service_type = data.get('service_type', 'tu-van')
    customer_name = (data.get('customer_name') or '').strip()
    customer_phone = (data.get('customer_phone') or '').strip()
    customer_email = (data.get('customer_email') or '').strip()
    address = data.get('address', '')
    details = data.get('details') or {}
    image_url = data.get('image_url', '')
    preferred_date = data.get('preferred_date', '')
    preferred_time = data.get('preferred_time', '')
    req_id = str(uuid.uuid4())

    if is_supabase_enabled():
        try:
            payload = {
                'id': req_id,
                'code': code,
                'service_type': service_type,
                'customer_name': customer_name,
                'customer_phone': customer_phone,
                'customer_email': customer_email,
                'address': address,
                'details': details if isinstance(details, dict) else {},
                'image_url': image_url,
                'preferred_date': preferred_date,
                'preferred_time': preferred_time,
                'status': 'pending'
            }
            res = supabase_client.table('service_requests').insert(payload).execute()
            return code
        except Exception as e:
            logger.error(f"Supabase create_service_request error: {e}")

    init_db()
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO service_requests (
            id, code, service_type, customer_name, customer_phone, customer_email,
            address, details, image_url, preferred_date, preferred_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ''', (req_id, code, service_type, customer_name, customer_phone, customer_email, address, json.dumps(details, ensure_ascii=False), image_url, preferred_date, preferred_time))
    conn.commit()
    conn.close()
    return code

def get_service_requests():
    if is_supabase_enabled():
        try:
            res = supabase_client.table('service_requests').select('*').order('created_at', desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Supabase get_service_requests error: {e}")

    init_db()
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM service_requests ORDER BY created_at DESC').fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d['details'] = normalize_json_field(d.get('details'))
        result.append(d)
    return result

def update_service_status(code, new_status, staff_notes=None, assigned_staff=None):
    if is_supabase_enabled():
        try:
            up = {'status': new_status}
            if staff_notes is not None: up['staff_notes'] = staff_notes
            if assigned_staff is not None: up['assigned_staff'] = assigned_staff
            supabase_client.table('service_requests').update(up).eq('code', code).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase update_service_status error: {e}")

    init_db()
    conn = get_db_connection()
    conn.execute('UPDATE service_requests SET status = ? WHERE code = ?', (new_status, code))
    conn.commit()
    conn.close()
    return True

# ==============================================================================
# AUTH & USERS
# ==============================================================================
def register_user(fullname, email, phone, password):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if row:
        conn.close()
        return {'error': 'Email đã được đăng ký tài khoản'}

    cursor.execute('''
        INSERT INTO users (fullname, email, phone, password, role)
        VALUES (?, ?, ?, ?, 'customer')
    ''', (fullname, email, phone, password))
    uid = cursor.lastrowid
    conn.commit()
    conn.close()
    return {
        'success': True,
        'user': {
            'id': uid,
            'fullname': fullname,
            'email': email,
            'phone': phone,
            'role': 'customer'
        }
    }

def authenticate_user(email, password):
    init_db()
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?', (email, password)).fetchone()
    conn.close()
    if row:
        d = dict(row)
        d.pop('password', None)
        return d
    return None

# ==============================================================================
# CHAT SESSIONS & MESSAGES (AI CONSULTANT)
# ==============================================================================
def save_chat_message(session_id, sender, message, user_id=None, customer_name='Khách hàng', customer_phone=None, customer_email=None):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    row = cursor.execute('SELECT session_id, unread_count FROM chat_sessions WHERE session_id = ?', (session_id,)).fetchone()
    if not row:
        cursor.execute('''
            INSERT INTO chat_sessions (session_id, customer_name, customer_phone, customer_email, last_message, unread_count)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (session_id, customer_name or 'Khách hàng', customer_phone, customer_email, message[:150], 1 if sender == 'customer' else 0))
    else:
        new_unread = (row['unread_count'] + 1) if sender == 'customer' else row['unread_count']
        cursor.execute('''
            UPDATE chat_sessions
            SET last_message = ?, unread_count = ?, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
        ''', (message[:150], new_unread, session_id))

    cursor.execute('''
        INSERT INTO chat_messages (session_id, user_id, customer_name, sender, message)
        VALUES (?, ?, ?, ?, ?)
    ''', (session_id, user_id, customer_name, sender, message))

    conn.commit()
    conn.close()
    return True

def get_chat_history(session_id):
    init_db()
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
    ''', (session_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_chat_sessions():
    init_db()
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT * FROM chat_sessions 
        ORDER BY updated_at DESC
    ''').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def mark_chat_read(session_id):
    init_db()
    conn = get_db_connection()
    conn.execute('UPDATE chat_sessions SET unread_count = 0 WHERE session_id = ?', (session_id,))
    conn.commit()
    conn.close()
    return True

def delete_chat_session(session_id):
    init_db()
    conn = get_db_connection()
    conn.execute('DELETE FROM chat_messages WHERE session_id = ?', (session_id,))
    conn.execute('DELETE FROM chat_sessions WHERE session_id = ?', (session_id,))
    conn.commit()
    conn.close()
    return True

# ==============================================================================
# STATS
# ==============================================================================
def get_stats():
    orders = get_orders()
    products = get_products()
    quotes = get_quotes()
    services = get_service_requests()

    total_revenue = sum(o.get('total_amount', 0) for o in orders if o.get('status') != 'cancelled')
    completed_orders = sum(1 for o in orders if o.get('status') == 'completed')
    pending_orders = sum(1 for o in orders if o.get('status') == 'pending')

    return {
        'total_revenue': total_revenue,
        'total_orders': len(orders),
        'completed_orders': completed_orders,
        'pending_orders': pending_orders,
        'total_products': len(products),
        'total_quotes': len(quotes),
        'total_services': len(services)
    }
