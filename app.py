from flask import Flask, render_template, request, jsonify, session, send_from_directory
import random
import string
import os
import logging

logger = logging.getLogger('morioo.app')

# Load .env file automatically
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

import db_adapter
import chat_advisor
from database import init_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = BASE_DIR
templates_dir = os.path.join(BASE_DIR, 'templates') if os.path.exists(os.path.join(BASE_DIR, 'templates')) else BASE_DIR

from urllib.parse import parse_qs, urlencode, unquote

app = Flask(
    __name__,
    template_folder=templates_dir,
    static_folder=BASE_DIR
)
app.secret_key = os.environ.get('SECRET_KEY', 'morioo-vietnam-natural-wood-secret-key-2026')

@app.before_request
def handle_options_preflight():
    if request.method == 'OPTIONS':
        resp = app.make_default_options_response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, apikey'
        return resp

@app.after_request
def add_header(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, apikey'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

class VercelPathFixMiddleware:
    """
    WSGI Middleware to accurately restore the original request path when deployed on Vercel
    """
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        query_string = environ.get('QUERY_STRING', '')
        custom_path = None

        if '__path' in query_string:
            try:
                qs = parse_qs(query_string, keep_blank_values=True)
                val = qs.pop('__path', [None])[0]
                if val:
                    custom_path = '/' + val.lstrip('/')
                    new_qs = []
                    for k, vals in qs.items():
                        for v in vals:
                            new_qs.append((k, v))
                    environ['QUERY_STRING'] = urlencode(new_qs)
            except Exception:
                pass

        if not custom_path:
            for hdr in ('HTTP_X_MATCHED_PATH', 'HTTP_X_VERCEL_MATCHED_PATH', 'REQUEST_URI', 'HTTP_X_FORWARDED_URI'):
                val = environ.get(hdr)
                if val and not val.startswith('/api/index'):
                    custom_path = val.split('?')[0]
                    break

        if custom_path:
            environ['PATH_INFO'] = custom_path
        else:
            path = environ.get('PATH_INFO', '')
            if path in ('/api/index', '/api/index.py'):
                environ['PATH_INFO'] = '/'

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathFixMiddleware(app.wsgi_app)

# Ensure local fallback database schema is initialized safely
try:
    init_db()
except Exception:
    pass

# --- STATIC FILE SERVING ROUTES ---
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'assets'), filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'js'), filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    # Check if file exists in static dir
    static_path = os.path.join(BASE_DIR, 'static', filename)
    if os.path.exists(static_path):
        return send_from_directory(os.path.join(BASE_DIR, 'static'), filename)
    # Fallback to css, js, or assets
    if filename.startswith('css/'):
        return send_from_directory(os.path.join(BASE_DIR, 'css'), filename[4:])
    if filename.startswith('js/'):
        return send_from_directory(os.path.join(BASE_DIR, 'js'), filename[3:])
    if filename.startswith('assets/'):
        return send_from_directory(os.path.join(BASE_DIR, 'assets'), filename[7:])
    return send_from_directory(BASE_DIR, filename)

# --- FRONTEND PAGES ---
@app.route('/')
def home():
    if os.path.exists(os.path.join(templates_dir, 'index.html')):
        return render_template('index.html')
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/index.html')
def index_html_page():
    return home()

@app.route('/admin')
@app.route('/admin.html')
@app.route('/admin/revenue')
@app.route('/admin/orders')
@app.route('/admin/products')
@app.route('/admin/quotes')
def admin_page():
    if os.path.exists(os.path.join(templates_dir, 'admin.html')):
        return render_template('admin.html')
    return send_from_directory(BASE_DIR, 'admin.html')

@app.route('/staff')
@app.route('/staff.html')
@app.route('/nhan-vien')
def staff_page():
    if os.path.exists(os.path.join(templates_dir, 'staff.html')):
        return render_template('staff.html')
    return send_from_directory(BASE_DIR, 'staff.html')

@app.route('/about')
@app.route('/ve-moccnha')
@app.route('/gioi-thieu')
def about_page():
    return render_template('about.html')

@app.route('/stores')
@app.route('/cua-hang')
@app.route('/showroom')
def stores_page():
    return render_template('stores.html')

@app.route('/news')
@app.route('/tin-tuc')
def news_page():
    return render_template('news.html')

@app.route('/b2b')
@app.route('/noi-that-gia-si')
@app.route('/du-an')
def b2b_page():
    return render_template('b2b.html')

@app.route('/policy')
@app.route('/chinh-sach')
def policy_page():
    return render_template('policy.html')

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': '404 Không tìm thấy trang yêu cầu'}), 404

# --- DATABASE STATUS & CONFIG ENDPOINTS ---
@app.route('/api/db-status', methods=['GET'])
def get_db_status():
    """Returns whether the system is connected to Supabase Cloud or Local SQLite"""
    return jsonify(db_adapter.get_db_info())

@app.route('/api/admin/db-config', methods=['POST'])
def save_db_config():
    """Configure and switch to Supabase Cloud Database dynamically"""
    data = request.get_json() or {}
    url = (data.get('supabase_url') or '').strip()
    key = (data.get('supabase_key') or '').strip()

    if not url or not key:
        return jsonify({'success': False, 'error': 'Vui lòng điền cả SUPABASE_URL và SUPABASE_KEY!'}), 400

    ok, msg = db_adapter.test_and_configure_supabase(url, key)
    if not ok:
        return jsonify({'success': False, 'error': msg}), 400

    env_path = os.path.join(ROOT_DIR, '.env')
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

        url_found = False
        key_found = False
        new_lines = []
        for line in lines:
            if line.startswith('SUPABASE_URL='):
                new_lines.append(f'SUPABASE_URL={url}\n')
                url_found = True
            elif line.startswith('SUPABASE_KEY='):
                new_lines.append(f'SUPABASE_KEY={key}\n')
                key_found = True
            else:
                new_lines.append(line)
        if not url_found:
            new_lines.append(f'SUPABASE_URL={url}\n')
        if not key_found:
            new_lines.append(f'SUPABASE_KEY={key}\n')

        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    except Exception as e:
        logger.warning(f"Could not write .env file: {e}")

    os.environ['SUPABASE_URL'] = url
    os.environ['SUPABASE_KEY'] = key

    return jsonify({
        'success': True,
        'message': 'Đã kết nối Supabase Cloud Database thành công!',
        'db_info': db_adapter.get_db_info()
    })

@app.route('/api/admin/db-sync', methods=['POST'])
def trigger_db_sync():
    """Manual sync placeholder (data is stored live on Supabase)"""
    return jsonify({
        'success': True,
        'message': 'Hệ thống đang kết nối trực tiếp với Supabase Cloud Database!',
        'stats': db_adapter.get_stats()
    })

# --- GEMINI AI CONFIG & STATUS ENDPOINTS ---
@app.route('/api/admin/ai-status', methods=['GET'])
def get_ai_status():
    """Returns current Gemini AI status and model info"""
    return jsonify(chat_advisor.get_ai_info())

@app.route('/api/admin/gemini-config', methods=['GET', 'POST'])
def save_gemini_config():
    """Get status or validate and configure Google Gemini AI API key"""
    if request.method == 'GET':
        info = chat_advisor.get_ai_info()
        return jsonify({
            'success': True,
            'is_configured': info.get('gemini_configured', False),
            'model': info.get('model', 'gemini-3.8-flash'),
            'api_key_preview': info.get('api_key_preview', '')
        })

    data = request.get_json() or {}
    key = (data.get('gemini_api_key') or '').strip()

    if not key:
        return jsonify({'success': False, 'error': 'Vui lòng nhập Gemini API Key!'}), 400

    chat_advisor.configure_gemini(key)

    env_path = os.path.join(ROOT_DIR, '.env')
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

        key_found = False
        new_lines = []
        for line in lines:
            if line.startswith('GEMINI_API_KEY='):
                new_lines.append(f'GEMINI_API_KEY={key}\n')
                key_found = True
            else:
                new_lines.append(line)
        if not key_found:
            new_lines.append(f'GEMINI_API_KEY={key}\n')

        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

        # Lưu đồng thời vào db_config.json
        cfg_path = os.path.join(ROOT_DIR, 'db_config.json')
        cfg = {}
        if os.path.exists(cfg_path):
            try:
                import json
                with open(cfg_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
            except Exception:
                cfg = {}
        cfg['gemini_api_key'] = key
        with open(cfg_path, 'w', encoding='utf-8') as f:
            import json
            json.dump(cfg, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not write .env or db_config file: {e}")

    return jsonify({
        'success': True,
        'message': 'Đã kết nối Google Gemini AI thành công! Trợ lý ảo tư vấn đã sẵn sàng (Mô hình: gemini-3.8-flash).',
        'ai_info': chat_advisor.get_ai_info()
    })

@app.route('/api/admin/gemini-config/test', methods=['POST'])
def test_gemini_config():
    data = request.get_json() or {}
    key = (data.get('gemini_api_key') or '').strip()
    if not key:
        key = os.environ.get('GEMINI_API_KEY', '')

    if not key:
        return jsonify({'success': False, 'error': 'Chưa cung cấp Gemini API Key để kiểm tra'}), 400

    ok, msg = chat_advisor.test_gemini_key(key)
    if not ok:
        return jsonify({'success': False, 'error': msg}), 400

    return jsonify({
        'success': True,
        'message': f'Kết nối Google Gemini thành công: {msg}',
        'reply_sample': 'MORIOO AI sẵn sàng tư vấn nội thất gỗ sồi cao cấp!'
    })

# --- API ENDPOINTS ---

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = db_adapter.get_categories()
    return jsonify(categories)

@app.route('/api/products', methods=['GET'])
def get_products():
    category = request.args.get('category')
    search = request.args.get('search')
    bestseller = request.args.get('bestseller')
    promo = request.args.get('promo')
    sort = request.args.get('sort', 'default')

    products = db_adapter.get_products(
        category=category,
        search=search,
        bestseller=bestseller,
        promo=promo,
        sort=sort
    )
    return jsonify(products)

@app.route('/api/products/<string:product_id>', methods=['GET'])
def get_product(product_id):
    product = db_adapter.get_product_by_id(product_id)
    if product is None:
        return jsonify({'error': 'Không tìm thấy sản phẩm'}), 404
    return jsonify(product)

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json() or {}
    title = data.get('title') or data.get('name')
    category = data.get('category') or data.get('category_slug')
    price = data.get('price')

    if not title or not category or price is None:
        return jsonify({'error': 'Vui lòng điền đủ tên, danh mục và giá sản phẩm'}), 400

    # Nếu có ảnh Base64 tải từ máy, lưu trực tiếp thành file trong assets/images/products/
    image_val = data.get('image') or data.get('image_url')
    if image_val and 'base64,' in image_val:
        try:
            import base64
            import uuid
            header, b64_str = image_val.split('base64,')
            ext = 'png' if 'png' in header else 'jpg'
            clean_name = f"prod-{uuid.uuid4().hex[:8]}.{ext}"
            save_path = os.path.join(BASE_DIR, 'assets', 'images', 'products', clean_name)
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'wb') as f:
                f.write(base64.b64decode(b64_str))
            data['image'] = f'assets/images/products/{clean_name}'
            data['image_url'] = f'assets/images/products/{clean_name}'
        except Exception as ex:
            logger.warning(f"Failed to save base64 product image to disk: {ex}")

    try:
        new_id = db_adapter.create_product(data)
        return jsonify({'success': True, 'id': new_id, 'message': 'Thêm sản phẩm thành công', 'image_url': data.get('image_url')}), 201
    except Exception as e:
        return jsonify({'error': f'Lỗi khi thêm sản phẩm: {str(e)}'}), 500

@app.route('/api/products/<string:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        db_adapter.delete_product(product_id)
        return jsonify({'success': True, 'message': 'Đã xóa sản phẩm thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi khi xóa sản phẩm: {str(e)}'}), 500

@app.route('/api/products/<string:product_id>', methods=['PUT', 'PATCH'])
def update_product(product_id):
    data = request.get_json() or {}
    image_val = data.get('image') or data.get('image_url')
    if image_val and 'base64,' in image_val:
        try:
            import base64
            import uuid
            header, b64_str = image_val.split('base64,')
            ext = 'png' if 'png' in header else 'jpg'
            clean_name = f"prod-{uuid.uuid4().hex[:8]}.{ext}"
            save_path = os.path.join(BASE_DIR, 'assets', 'images', 'products', clean_name)
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'wb') as f:
                f.write(base64.b64decode(b64_str))
            data['image'] = f'assets/images/products/{clean_name}'
            data['image_url'] = f'assets/images/products/{clean_name}'
        except Exception as ex:
            logger.warning(f"Failed to save base64 product image to disk: {ex}")

    try:
        db_adapter.update_product(product_id, data)
        return jsonify({'success': True, 'message': 'Cập nhật sản phẩm thành công', 'image_url': data.get('image_url')})
    except Exception as e:
        return jsonify({'error': f'Lỗi khi cập nhật sản phẩm: {str(e)}'}), 500

@app.route('/api/upload-image', methods=['POST'])
def upload_image():
    try:
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                import werkzeug.utils
                clean_name = werkzeug.utils.secure_filename(file.filename)
                save_path = os.path.join(BASE_DIR, 'assets', 'images', 'products', clean_name)
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                file.save(save_path)
                return jsonify({'success': True, 'url': f'assets/images/products/{clean_name}'})

        data = request.get_json() or {}
        image_data = data.get('image') or data.get('image_url') or ''
        if image_data and 'base64,' in image_data:
            import base64
            import uuid
            header, b64_str = image_data.split('base64,')
            ext = 'png' if 'png' in header else 'jpg'
            clean_name = f"upload-{uuid.uuid4().hex[:8]}.{ext}"
            save_path = os.path.join(BASE_DIR, 'assets', 'images', 'products', clean_name)
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'wb') as f:
                f.write(base64.b64decode(b64_str))
            return jsonify({'success': True, 'url': f'assets/images/products/{clean_name}'})

        return jsonify({'error': 'Không có dữ liệu ảnh hợp lệ'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/sync-sold', methods=['POST'])
def sync_sold_endpoint():
    try:
        db_adapter.sync_sold_counts_from_orders()
        return jsonify({'success': True, 'message': 'Đã đồng bộ số lượng đã bán từ đơn hàng thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi khi đồng bộ: {str(e)}'}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json() or {}
    customer_name = data.get('name') or data.get('customer_name')
    customer_phone = data.get('phone') or data.get('customer_phone')
    customer_email = data.get('email') or data.get('customer_email', '')
    customer_address = data.get('address') or data.get('customer_address') or data.get('shipping_address')
    payment_method = data.get('payment_method', 'COD')
    note = data.get('note', '')
    items = data.get('items', [])
    total_amount = data.get('total_amount', 0)

    if not customer_name or not customer_phone or not customer_address or not items:
        return jsonify({'error': 'Vui lòng cung cấp đầy đủ thông tin giao hàng và giỏ hàng'}), 400

    code_suffix = ''.join(random.choices(string.digits, k=5))
    order_code = f"MOR-{code_suffix}"

    order_payload = {
        'order_code': order_code,
        'customer_name': customer_name,
        'customer_phone': customer_phone,
        'customer_email': customer_email,
        'customer_address': customer_address,
        'payment_method': payment_method,
        'note': note,
        'items': items,
        'total_amount': total_amount
    }

    try:
        db_adapter.create_order(order_payload)
        return jsonify({
            'success': True,
            'order_code': order_code,
            'message': 'Đặt hàng thành công! Đội ngũ MORIOO sẽ liên hệ xác nhận đơn hàng trong 15 phút.'
        }), 201
    except Exception as e:
        return jsonify({'error': f'Lỗi đặt hàng: {str(e)}'}), 500

@app.route('/api/user/<string:user_id>/orders', methods=['GET'])
def get_user_orders(user_id):
    orders = db_adapter.get_user_orders(user_id)
    return jsonify(orders)

@app.route('/api/orders', methods=['GET'])
def get_orders():
    orders = db_adapter.get_orders()
    return jsonify(orders)

@app.route('/api/orders/<string:order_code>/status', methods=['PATCH'])
def update_order_status(order_code):
    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': 'Thiếu trạng thái mới'}), 400

    try:
        db_adapter.update_order_status(order_code, new_status)
        return jsonify({'success': True, 'message': 'Cập nhật trạng thái thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi cập nhật trạng thái: {str(e)}'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    stats = db_adapter.get_stats()
    return jsonify(stats)

# --- B2B QUOTES ENDPOINTS ---
@app.route('/api/quotes', methods=['POST'])
def create_quote():
    data = request.get_json() or {}
    fullname = (data.get('fullname') or data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip()

    if not fullname or not phone:
        return jsonify({'error': 'Vui lòng cung cấp họ tên và số điện thoại liên hệ'}), 400

    try:
        new_id = db_adapter.create_quote(data)
        return jsonify({
            'success': True,
            'id': new_id,
            'message': 'Gửi yêu cầu báo giá thành công! Đội ngũ chuyên viên dự án MORIOO sẽ liên hệ lại trong vòng 30 phút.'
        }), 201
    except Exception as e:
        return jsonify({'error': f'Lỗi khi gửi yêu cầu báo giá: {str(e)}'}), 500

@app.route('/api/quotes', methods=['GET'])
def get_quotes():
    quotes = db_adapter.get_quotes()
    return jsonify(quotes or [])

@app.route('/api/quotes/<int:quote_id>/status', methods=['PATCH'])
def update_quote_status(quote_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': 'Thiếu trạng thái mới'}), 400

    try:
        db_adapter.update_quote_status(quote_id, new_status)
        return jsonify({'success': True, 'message': 'Cập nhật trạng thái báo giá thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi cập nhật trạng thái: {str(e)}'}), 500

@app.route('/api/quotes/<int:quote_id>', methods=['DELETE'])
def delete_quote(quote_id):
    try:
        db_adapter.delete_quote(quote_id)
        return jsonify({'success': True, 'message': 'Đã xóa yêu cầu báo giá thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi khi xóa yêu cầu: {str(e)}'}), 500

# --- 5 CUSTOMER SERVICES ENDPOINTS ---
@app.route('/api/services', methods=['GET'])
def get_services():
    services = db_adapter.get_service_requests()
    return jsonify(services or [])

@app.route('/api/services', methods=['POST'])
def create_service():
    data = request.get_json() or {}
    customer_name = (data.get('customer_name') or '').strip()
    customer_phone = (data.get('customer_phone') or '').strip()

    if not customer_name or not customer_phone:
        return jsonify({'error': 'Vui lòng cung cấp họ tên và số điện thoại liên hệ'}), 400

    try:
        code = db_adapter.create_service_request(data)
        return jsonify({
            'success': True,
            'code': code,
            'message': 'Gửi yêu cầu dịch vụ thành công! Chuyên viên MORIOO sẽ liên hệ hỗ trợ bạn trong ít phút.'
        }), 201
    except Exception as e:
        return jsonify({'error': f'Lỗi gửi yêu cầu dịch vụ: {str(e)}'}), 500

@app.route('/api/services/<string:code>/status', methods=['PATCH'])
def update_service_status(code):
    data = request.get_json() or {}
    new_status = data.get('status')
    staff_notes = data.get('staff_notes')
    assigned_staff = data.get('assigned_staff')
    details = data.get('details')

    if not new_status:
        return jsonify({'error': 'Thiếu trạng thái mới'}), 400

    try:
        db_adapter.update_service_status(code, new_status, staff_notes, assigned_staff, details)
        return jsonify({'success': True, 'message': 'Cập nhật trạng thái dịch vụ thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi cập nhật dịch vụ: {str(e)}'}), 500

@app.route('/api/services/<string:code>', methods=['DELETE'])
def delete_service(code):
    try:
        db_adapter.delete_service_request(code)
        return jsonify({'success': True, 'message': 'Đã xóa yêu cầu dịch vụ thành công'})
    except Exception as e:
        return jsonify({'error': f'Lỗi xóa dịch vụ: {str(e)}'}), 500

# --- AUTH ENDPOINTS ---
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    fullname = data.get('fullname')
    email = data.get('email')
    phone = data.get('phone', '')
    password = data.get('password')

    if not fullname or not email or not password:
        return jsonify({'error': 'Vui lòng điền đầy đủ họ tên, email và mật khẩu'}), 400

    result = db_adapter.register_user(fullname, email, phone, password)
    if 'error' in result:
        return jsonify(result), 400

    return jsonify({
        'success': True,
        'user': result['user'],
        'message': 'Đăng ký tài khoản thành công!'
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Vui lòng nhập email và mật khẩu'}), 400

    user = db_adapter.authenticate_user(email, password)
    if user:
        return jsonify({
            'success': True,
            'user': user,
            'message': f'Xin chào, {user["fullname"]}!'
        })
    else:
        return jsonify({'error': 'Email hoặc mật khẩu không chính xác'}), 401

# ==============================================================================
# CHAT CONSULTATION & ADVISOR ENDPOINTS
# ==============================================================================

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({'error': 'Thiếu session_id'}), 400
    messages = db_adapter.get_chat_history(session_id)
    return jsonify({
        'session_id': session_id,
        'messages': messages
    })

@app.route('/api/chat/send', methods=['POST'])
def send_chat_message():
    data = request.get_json() or {}
    session_id = data.get('session_id')
    message = (data.get('message') or '').strip()
    customer_name = data.get('customer_name')
    customer_phone = data.get('customer_phone')
    customer_email = data.get('customer_email')
    user_id = data.get('user_id')

    if not session_id or not message:
        return jsonify({'error': 'Thiếu session_id hoặc nội dung tin nhắn'}), 400

    # 1. Save customer message to DB
    db_adapter.save_chat_message(
        session_id=session_id,
        sender='customer',
        message=message,
        user_id=user_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email
    )

    # 2. Generate automated advisor response
    try:
        reply = chat_advisor.generate_advisor_reply(message, session_id)
    except Exception as e:
        reply = "Dạ MORIOO đã nhận được tin nhắn của Quý khách! Chuyên viên tư vấn sẽ liên hệ hỗ trợ bạn ngay trong ít phút ạ!"

    # 3. Save advisor response to DB
    db_adapter.save_chat_message(
        session_id=session_id,
        sender='advisor',
        message=reply,
        user_id=None,
        customer_name='Tư vấn viên MORIOO'
    )

    # 4. Fetch updated history
    messages = db_adapter.get_chat_history(session_id)

    return jsonify({
        'success': True,
        'reply': reply,
        'messages': messages
    })

# --- CHAT MANAGEMENT & DATABASE QUESTIONS ENDPOINTS ---
@app.route('/api/chat/questions', methods=['GET'])
@app.route('/api/admin/chat/questions', methods=['GET'])
def get_chat_questions():
    """Lấy danh sách tất cả câu hỏi của khách hàng đã hỏi Chatbot từ Database"""
    limit = request.args.get('limit', 100, type=int)
    questions = db_adapter.get_all_customer_questions(limit=limit)
    return jsonify({
        'success': True,
        'count': len(questions),
        'questions': questions
    })

@app.route('/api/chat/sessions', methods=['GET'])
@app.route('/api/admin/chat/sessions', methods=['GET'])
def admin_get_chat_sessions():
    sessions = db_adapter.get_chat_sessions()
    return jsonify(sessions)

@app.route('/api/chat/sessions/<string:session_id>', methods=['GET'])
@app.route('/api/admin/chat/sessions/<string:session_id>', methods=['GET'])
def admin_get_chat_history(session_id):
    db_adapter.mark_chat_read(session_id)
    messages = db_adapter.get_chat_history(session_id)
    return jsonify({
        'session_id': session_id,
        'messages': messages
    })

@app.route('/api/chat/reply', methods=['POST'])
@app.route('/api/admin/chat/reply', methods=['POST'])
def admin_chat_reply():
    data = request.get_json() or {}
    session_id = data.get('session_id')
    message = (data.get('message') or '').strip()
    responder = (data.get('responder_name') or 'Tư vấn viên MORIOO').strip()

    if not session_id or not message:
        return jsonify({'error': 'Thiếu session_id hoặc tin nhắn'}), 400

    db_adapter.save_chat_message(
        session_id=session_id,
        sender='advisor',
        message=message,
        customer_name=responder
    )
    db_adapter.mark_chat_read(session_id)

    messages = db_adapter.get_chat_history(session_id)
    return jsonify({
        'success': True,
        'message': 'Đã gửi phản hồi thành công',
        'messages': messages
    })

@app.route('/api/chat/sessions/<string:session_id>', methods=['DELETE'])
@app.route('/api/admin/chat/sessions/<string:session_id>', methods=['DELETE'])
def admin_delete_chat_session(session_id):
    db_adapter.delete_chat_session(session_id)
    return jsonify({'success': True, 'message': 'Đã xóa đoạn hội thoại'})

@app.route('/api/admin/reset-demo-data', methods=['POST'])
def reset_demo_data():
    try:
        from database import init_db
        init_db(force=True)
        return jsonify({'success': True, 'message': 'Đã nạp lại cấu trúc dữ liệu thành công!', 'stats': db_adapter.get_stats()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    print("=" * 60)
    print("  MORIOO WOODEN FURNITURE - FLASK BACKEND SERVER RUNNING")
    print(f"  Store: http://localhost:{port}/")
    print(f"  Admin Portal: http://localhost:{port}/admin")
    print(f"  Staff Portal: http://localhost:{port}/staff")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=debug)
