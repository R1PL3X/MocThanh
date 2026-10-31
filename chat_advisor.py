"""
AI Interior Advisor & Customer Consultation Engine for MORIOO
Powered by Google Gemini AI with intelligent fallbacks.
Provides human-like, friendly, professional consultation grounded in
real-time store products, combo pricing, materials, shipping, warranty,
showroom addresses, and real-time order tracking.
"""

import os
import re
import json
import logging
import urllib.request
import db_adapter

logger = logging.getLogger('morioo.chat_advisor')

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

GEMINI_API_KEY = (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY') or '').strip()

def get_gemini_api_key():
    global GEMINI_API_KEY
    if not GEMINI_API_KEY:
        try:
            cfg = db_adapter.load_stored_config()
            GEMINI_API_KEY = (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY') or cfg.get('gemini_api_key') or '').strip()
        except Exception:
            GEMINI_API_KEY = (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY') or '').strip()
    return GEMINI_API_KEY

def configure_gemini(api_key):
    global GEMINI_API_KEY
    GEMINI_API_KEY = (api_key or '').strip()
    os.environ['GEMINI_API_KEY'] = GEMINI_API_KEY
    return bool(GEMINI_API_KEY)

def is_gemini_active():
    return bool(get_gemini_api_key())

def get_ai_info():
    key = get_gemini_api_key()
    has_key = bool(key)
    masked = key[:6] + '...' + key[-4:] if len(key) > 10 else '***'
    return {
        'enabled': has_key,
        'provider': 'Google Gemini AI',
        'model': 'gemini-2.5-flash / gemini-3.8-flash',
        'status': 'connected' if has_key else 'rule_fallback',
        'key_preview': masked if has_key else None,
        'description': 'Google Gemini AI đang hoạt động (Tư vấn viên thông minh MORIOO)' if has_key else 'Đang dùng bộ tư vấn quy tắc chuẩn MORIOO (chưa cấu hình GEMINI_API_KEY)'
    }

def format_vnd(amount):
    try:
        return f"{int(amount):,}₫".replace(",", ".")
    except Exception:
        return f"{amount}₫"

def build_catalog_context():
    """Build a clean text summary of store products for Gemini grounding"""
    try:
        products = db_adapter.get_products()
        if not products:
            return "Hiện tại cửa hàng đang cập nhật thêm sản phẩm mới."
        lines = []
        for p in products:
            title = p.get('title', '')
            cat = p.get('category', '')
            price = format_vnd(p.get('price', 0))
            orig_price = format_vnd(p.get('original_price', 0))
            disc = p.get('discount_percent', 0)
            mat = p.get('material', 'Gỗ sồi tự nhiên Bắc Mỹ')
            dim = p.get('dimensions', 'Tiêu chuẩn')
            sold = p.get('sold_count', 0)
            lines.append(f"- [{cat}] {title}: Giá bán {price} (Gốc {orig_price}, giảm {disc}%, đã bán {sold}). Chất liệu: {mat}. Kích thước: {dim}.")
        return "\n".join(lines)
    except Exception as e:
        logger.warning(f"Could not build catalog context: {e}")
        return ""

def test_gemini_key(api_key):
    key = (api_key or '').strip()
    if not key:
        return False, "API Key không được để trống"
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
        payload = {
            "contents": [{"parts": [{"text": "Xin chào"}]}],
            "generationConfig": {"maxOutputTokens": 10}
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'candidates' in data:
                return True, "Kết nối Google Gemini AI thành công!"
            return False, "Phản hồi từ Gemini không hợp lệ"
    except Exception as e:
        return False, f"Lỗi xác thực Gemini API: {str(e)}"

def generate_advisor_reply(message, session_id=None):
    api_key = get_gemini_api_key()
    if api_key:
        ai_reply = call_gemini_advisor(message, api_key, session_id)
        if ai_reply:
            return ai_reply
    return get_rule_based_reply(message, session_id)

def call_gemini_advisor(message, api_key, session_id=None):
    catalog_context = build_catalog_context()
    past_convo = ""
    if session_id:
        try:
            history = db_adapter.get_chat_history(session_id)
            if history:
                recent = history[-6:]
                formatted = []
                for m in recent:
                    sender = "Khách hàng" if m.get('sender') == 'customer' else "Tư vấn viên MORIOO"
                    formatted.append(f"{sender}: {m.get('message', '')}")
                past_convo = "\n".join(formatted)
        except Exception:
            pass

    system_prompt = f"""Bạn là Chuyên Viên Tư Vấn Nội Thất & Trợ Lý Bán Hàng thông minh của thương hiệu nội thất gỗ tự nhiên "MORIOO" (phong cách Nhật Bản tối giản, Zen & Wabi-Sabi, gỗ sồi trắng Bắc Mỹ tuyển chọn).

THÔNG TIN SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG:
{catalog_context}

CHÍNH SÁCH BÁN HÀNG & 5 GÓI DỊCH VỤ CỦA MORIOO:
1. Giao hàng & Lắp đặt: MIỄN PHÍ 100% tận nhà và lắp ráp hoàn chỉnh cho đơn hàng từ 499.000₫. Thời gian giao nhanh 1-2 ngày.
2. Bảo hành & Bảo trì: Bảo hành kết cấu gỗ 36 tháng (3 năm), bảo trì trọn đời, đổi trả miễn phí trong 30 ngày.
3. Chất liệu & An toàn: 100% gỗ sồi tự nhiên Bắc Mỹ, sấy công nghệ cao chống cong vênh mối mọt, sơn phủ gốc nước hữu cơ an toàn.
4. Hệ thống Showroom:
   - Showroom 1: Vincom Center Đồng Khởi, Q.1, TP.HCM
   - Showroom 2: Crescent Mall, Q.7, TP.HCM
   - Showroom 3: Vincom Center Metropolis, Liễu Giai, Ba Đình, Hà Nội
   - Showroom 4: Aeon Mall Hà Đông, Hà Nội
   - Hotline: 1900 255 579 (8:30 - 21:30)
5. 5 Gói Dịch Vụ Khách Hàng Chuyên Nghiệp:
   - Dịch vụ tư vấn nội thất theo phong thủy và diện tích
   - Dịch vụ thiết kế và đặt đóng theo kích thước yêu cầu
   - Dịch vụ vận chuyển và lắp đặt tại nhà
   - Dịch vụ bảo trì và sửa chữa đồ gỗ
   - Dịch vụ thiết kế không gian và dự toán chi phí

QUY TẮC TRẢ LỜI CỦA BẠN:
- Xưng hô lịch sự, lễ phép, ấm áp: xưng "em", gọi khách là "Quý khách" (hoặc "anh/chị").
- Trả lời bằng tiếng Việt tự nhiên, ngắt dòng rõ ràng, dùng bullet points ngắn gọn.
- Luôn in đậm **Tên sản phẩm** và **Giá bán**.
- Khi khách hỏi bàn ghế, giường tủ, dịch vụ, hãy điểm danh các sản phẩm tương ứng trong danh mục với mức giá ưu đãi và tính năng nổi bật.
- Chỉ tư vấn các sản phẩm có trong danh mục sản phẩm của MORIOO.
"""

    prompt_content = f"Lịch sử hội thoại trước đó:\n{past_convo}\n\nTin nhắn mới từ Khách hàng: {message}"

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)

        for model_name in ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt_content,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.7,
                        max_output_tokens=850
                    )
                )
                if response and response.text:
                    return response.text.strip()
            except Exception:
                continue
    except Exception:
        pass

    try:
        for model_name in ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt_content}]}],
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "generationConfig": {"temperature": 0.7, "maxOutputTokens": 850}
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    candidates = data.get('candidates', [])
                    if candidates:
                        parts = candidates[0].get('content', {}).get('parts', [])
                        if parts and 'text' in parts[0]:
                            return parts[0]['text'].strip()
            except Exception:
                continue
    except Exception:
        pass

    return None

def get_rule_based_reply(message, session_id=None):
    text = (message or '').strip()
    lower = text.lower()

    if not lower:
        return "Dạ MORIOO xin chào Quý khách! Bạn cần tư vấn mẫu nội thất gỗ hay 5 gói dịch vụ nào ạ?"

    # 1. Order tracking
    if any(k in lower for k in ['tra cứu đơn', 'kiểm tra đơn', 'tình trạng đơn', 'mã đơn', 'đơn hàng của tôi', 'đơn đã đặt']):
        # Check if an order code is provided
        match = re.search(r'(?:MOR|MOC)-[A-Z0-9]{4,8}', text, re.IGNORECASE)
        if match:
            code = match.group(0).upper()
            try:
                orders = db_adapter.get_orders()
                matched = next((o for o in orders if o.get('order_code', '').upper() == code), None)
                if matched:
                    st = matched.get('status', 'pending')
                    st_map = {
                        'pending': 'Đang chờ xác nhận',
                        'confirmed': 'Đã xác nhận & Đang chuẩn bị hàng',
                        'shipping': 'Đang giao hàng',
                        'completed': 'Đã giao thành công'
                    }
                    st_text = st_map.get(st, st)
                    return (
                        f"Dạ MORIOO đã tìm thấy đơn hàng **#{code}** của Quý khách:\n\n"
                        f"• Người nhận: **{matched.get('customer_name')}**\n"
                        f"• Trạng thái: **{st_text}**\n"
                        f"• Tổng giá trị: **{format_vnd(matched.get('total_amount', 0))}**\n"
                        f"• Địa chỉ: {matched.get('shipping_address') or matched.get('customer_address')}\n\n"
                        f"Nhân viên giao nhận MORIOO sẽ chủ động liên hệ trước 30 phút khi giao hàng ạ!"
                    )
            except Exception:
                pass
        return (
            "Dạ để kiểm tra tiến độ đơn hàng, Quý khách vui lòng gửi giúp em **Mã đơn hàng** (dạng `MOR-xxxxx` hoặc `MOC-xxxxx`) "
            "hoặc **Số điện thoại** lúc đặt hàng, em sẽ kiểm tra trạng thái ngay ạ!"
        )

    # 2. Cabinets & Shelves (Tủ & Kệ)
    if any(k in lower for k in ['tủ', 'kệ', 'tu ke', 'tủ giày', 'kệ tivi', 'kệ sách', 'tủ quần áo', 'tủ đầu giường', 'tab đầu giường']):
        try:
            prods = db_adapter.get_products(category='tu-ke')
            if prods:
                lines = []
                for p in prods:
                    lines.append(f"• **{p.get('title')}**: **{format_vnd(p.get('price', 0))}** - {p.get('material')}")
                return (
                    "Dạ MORIOO có bộ sưu tập **Tủ & Kệ** gỗ sồi tự nhiên tinh tế phong cách Nhật Bản:\n\n"
                    + "\n".join(lines) +
                    "\n\nTất cả tủ kệ đều sử dụng mộng gỗ truyền thống và bản lề giảm chấn chống ồn cao cấp. Quý khách đang quan tâm mẫu nào ạ?"
                )
        except Exception:
            pass

    # 3. Tables & Chairs
    if any(k in lower for k in ['bàn ghế', 'bàn', 'ghế', 'sofa', 'bàn ăn', 'ghế ăn', 'bàn trà', 'bàn làm việc']):
        try:
            prods = db_adapter.get_products()
            items = [p for p in prods if any(w in p.get('title', '').lower() for w in ['bàn', 'ghế', 'sofa'])]
            if items:
                lines = []
                for p in items[:5]:
                    lines.append(f"• **{p.get('title')}**: **{format_vnd(p.get('price', 0))}**")
                return (
                    "Dạ MORIOO có sẵn các mẫu **Bàn & Ghế** gỗ sồi tự nhiên cao cấp:\n\n"
                    + "\n".join(lines) +
                    "\n\nQuý khách muốn tìm mẫu cho phòng khách, phòng ăn hay góc làm việc ạ?"
                )
        except Exception:
            pass

    # 4. 5 Customer Services
    if any(k in lower for k in ['dịch vụ', 'tư vấn nội thất', 'đặt đóng', 'vận chuyển', 'lắp đặt', 'bảo trì', 'sửa chữa', 'thiết kế không gian']):
        return (
            "Dạ MORIOO cung cấp trọn gói **5 Dịch Vụ Khách Hàng Cao Cấp**:\n\n"
            "1. 🛋️ **Tư vấn nội thất**: Tư vấn phong cách Wabi-Sabi, diện tích và phong thủy.\n"
            "2. 📐 **Đặt đóng theo yêu cầu**: May đo kích thước, loại gỗ, màu sắc theo căn hộ.\n"
            "3. 🚚 **Vận chuyển & Lắp đặt**: Miễn phí tận nhà, có tra cứu tiến độ Live 5 bước.\n"
            "4. 🛠️ **Bảo trì & Sửa chữa**: Hỗ trợ 36 tháng, xử lý sự cố đồ gỗ tận nhà.\n"
            "5. 🏠 **Thiết kế không gian**: Lên layout 3D mặt bằng và bảng dự toán chi phí.\n\n"
            "Quý khách có thể bấm mục **🛎️ Dịch Vụ** trên menu trang chủ để đăng ký nhanh ạ!"
        )

    # 5. Shipping & Warranty
    if any(k in lower for k in ['giao hàng', 'vận chuyển', 'ship', 'phí ship', 'lắp đặt']):
        return (
            "Dạ chính sách giao hàng của MORIOO:\n\n"
            "• **Miễn phí 100% vận chuyển & lắp đặt** cho đơn hàng từ 499.000₫ tại TP.HCM và Hà Nội.\n"
            "• Giao hàng nhanh trong 1 - 2 ngày làm việc.\n"
            "• Kỹ thuật viên MORIOO sẽ mang hàng tận phòng, lắp ráp hoàn chỉnh và vệ sinh sạch sẽ trước khi bàn giao ạ!"
        )

    if any(k in lower for k in ['bảo hành', 'đổi trả', 'chính sách']):
        return (
            "Dạ chính sách bảo hành của MORIOO:\n\n"
            "• **Bảo hành kết cấu 36 tháng (3 năm)** chống cong vênh mối mọt.\n"
            "• **Bảo trì trọn đời** sản phẩm gỗ.\n"
            "• **Đổi mới 1-đổi-1 trong 30 ngày** nếu phát sinh lỗi từ nhà sản xuất."
        )

    # 6. Showroom
    if any(k in lower for k in ['showroom', 'cửa hàng', 'địa chỉ', 'ở đâu', 'xem hàng']):
        return (
            "Dạ kính mời Quý khách ghé trải nghiệm trực tiếp tại Hệ thống Showroom MORIOO:\n\n"
            "📍 **Showroom TP.HCM**:\n"
            "• Vincom Center Đồng Khởi, Quận 1\n"
            "• Crescent Mall, Quận 7\n\n"
            "📍 **Showroom Hà Nội**:\n"
            "• Vincom Center Metropolis, Liễu Giai, Ba Đình\n"
            "• Aeon Mall Hà Đông\n\n"
            "📞 Hotline: **1900 255 579** (Mở cửa 8:30 - 21:30 cả tuần)."
        )

    # 7. Greetings
    if any(k in lower for k in ['chào', 'hello', 'hi', 'alo', 'ad', 'shop ơi']):
        return (
            "Dạ MORIOO xin chào Quý khách! Rất vui được đón tiếp bạn ghé thăm cửa hàng nội thất gỗ tự nhiên MORIOO.\n\n"
            "Em có thể giúp bạn tìm sản phẩm nội thất nào (giường ngủ, bàn ghế, tủ kệ) hay hỗ trợ thông tin gì ạ?"
        )

    # Default fallback
    return (
        "Dạ cảm ơn Quý khách đã nhắn tin cho MORIOO! Để nhận tư vấn chi tiết hoặc xem ảnh thực tế sản phẩm, "
        "Quý khách có thể để lại **Số điện thoại** hoặc câu hỏi cụ thể, chuyên viên tư vấn MORIOO sẽ hỗ trợ bạn ngay trong ít phút ạ!\n\n"
        "Hotline hỗ trợ nhanh: **1900 255 579**."
    )
