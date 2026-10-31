# 🪑 MORIOO - NỘI THẤT GỖ TỰ NHIÊN PHONG CÁCH TỐI GIẢN

Hệ thống Website Bán Hàng & Quản Trị Nội Thất Gỗ Tự Nhiên MORIOO phong cách Nhật Bản (**Zen / Wabi-Sabi**), tích hợp toàn bộ kiến trúc mã nguồn Backend Flask từ `moccnha` (API, AI Chat Advisor, Subpages, Vercel Serverless, Test Suite) kết hợp giao diện cao cấp từ MORIOO và kết nối trực tiếp với **Cơ sở dữ liệu Supabase Cloud PostgreSQL**.

---

## 🌟 Điểm Nổi Bật Của Hệ Thống

1. **Giao Diện MORIOO Zen Aesthetic (Lấy từ bài này)**:
   - **Hero Banner Room Showcase**: Ảnh phòng mẫu góc rộng với các điểm ghim tương tác trực tiếp (+) dẫn vào Giường tatami, Ghế thư giãn, Bàn trà chân thấp, Kệ tivi gỗ sồi, Đôn gối lười hạt xốp.
   - **Danh Mục Tủ & Kệ (`tu-ke`)**: Tủ quần áo cánh lùa, tủ giày nan thoáng khí, kệ tivi và kệ sách gỗ sồi tự nhiên.
   - **5 Gói Dịch Vụ Khách Hàng Chuyên Nghiệp**:
     - 🛋️ Tư vấn nội thất theo diện tích & phong cách.
     - 📐 Thiết kế & đặt đóng theo kích thước yêu cầu.
     - 🚚 Vận chuyển & lắp đặt tại nhà (kèm tra cứu tiến độ Live 5 bước).
     - 🛠️ Bảo trì & sửa chữa đồ gỗ 36 tháng (tải ảnh sự cố trực tiếp).
     - 🏠 Thiết kế không gian 3D & dự toán chi phí (tải bản vẽ).
   - **Admin Portal & Staff Portal**:
     - Quản lý doanh thu, đơn hàng, kho sản phẩm (tải ảnh từ máy lên Supabase Cloud).
     - Quản lý yêu cầu dịch vụ khách hàng và báo giá dự án B2B.
     - Quản lý tài khoản, phân quyền và chấm điểm KPI nhân viên khi xử lý đơn/dịch vụ.

2. **Toàn Bộ Mã Nguồn Backend & Tính Năng Từ `moccnha` (Codebase)**:
   - **Flask Application (`app.py`)**: Đầy đủ routing đa trang (`/`, `/about`, `/stores`, `/news`, `/b2b`, `/policy`, `/admin`, `/staff`).
   - **AI Interior Advisor (`chat_advisor.py`)**: Tích hợp Google Gemini AI và bộ tư vấn phản hồi tức thì về sản phẩm, showroom, chính sách và tra cứu đơn hàng theo thời gian thực.
   - **Database Adapter (`db_adapter.py`)**: Kết nối trực tiếp Supabase Cloud PostgreSQL, tự động chuẩn hóa trường dữ liệu hai chiều (`name` <-> `title`, `category_slug` <-> `category`, `wood_type` <-> `material`, `image_url` <-> `image`).
   - **Serverless Vercel Deployment (`api/index.py`)**: WSGI Middleware phục vụ triển khai Cloud Serverless.
   - **Hệ thống Kiểm thử tự động (`test_app.py`)**: Bộ 9 bài test unit tests kiểm tra API, database, giao diện và dịch vụ.

3. **Cơ Sở Dữ Liệu Supabase Cloud Toàn Cầu**:
   - URL: `https://vkhgbegximfhecwgfyow.supabase.co`
   - Bảng: `products`, `categories`, `orders`, `order_items`, `service_requests`.

---

## 🚀 Hướng Dẫn Chạy Hệ Thống

### Cách 1: Khởi động máy chủ Flask Backend (Khuyên dùng)
Mở terminal tại thư mục dự án và chạy:
```powershell
python app.py
# Hoặc nhấp đúp file start.bat
```
Truy cập:
- **Trang chủ Cửa hàng**: `http://localhost:5000/`
- **Cổng Quản Trị Admin**: `http://localhost:5000/admin`
- **Cổng Tác Nghiệp Nhân Viên**: `http://localhost:5000/staff`
- **Giới Thiệu Thương Hiệu**: `http://localhost:5000/about`
- **Hệ Thống Showroom**: `http://localhost:5000/stores`
- **Tin Tức & Xu Hướng**: `http://localhost:5000/news`
- **Nội Thất Dự Án B2B**: `http://localhost:5000/b2b`
- **Chính Sách & Bảo Hành**: `http://localhost:5000/policy`

### Cách 2: Chạy bộ kiểm thử tự động (Unit Test Suite)
```powershell
python test_app.py
```

### Cách 3: Chạy máy chủ tĩnh
```powershell
python server.py
```
Truy cập: `http://localhost:8080/`

---

## 🛠️ Cấu Trúc Thư Mục

```
miji/
├── app.py                     # Flask Web Server & API Backend
├── db_adapter.py              # Supabase Cloud Database Adapter
├── database.py                # Schema SQLite Fallback & Models
├── chat_advisor.py            # AI Customer Advisor Engine (Gemini)
├── test_app.py                # Automated Unit Test Suite (9 Tests)
├── start.bat                  # Script khởi động nhanh trên Windows
├── Procfile                   # Cấu hình triển khai PaaS (Heroku/Render)
├── requirements.txt           # Danh sách thư viện Python
├── .env                       # Biến môi trường Supabase & Gemini
├── .env.example               # Mẫu cấu hình biến môi trường
├── index.html                 # Giao diện chính MORIOO
├── admin.html                 # Giao diện Quản trị viên Admin
├── staff.html                 # Giao diện Cổng nhân viên
├── templates/                 # Jinja2 Templates (Subpages + Portals)
│   ├── index.html
│   ├── admin.html
│   ├── staff.html
│   ├── about.html
│   ├── stores.html
│   ├── news.html
│   ├── b2b.html
│   └── policy.html
├── api/                       # Vercel Serverless Function entry
│   └── index.py
├── css/                       # Bảng mã CSS (style.css, components.css, portal.css)
├── js/                        # Mã nguồn Javascript phía Client
│   ├── app.js
│   ├── chat.js                # Floating AI Chat Widget
│   ├── services.js            # 5 Customer Services Logic
│   ├── admin-page.js
│   ├── staff-page.js
│   ├── supabase-client.js
│   └── mock-data.js
└── assets/                    # Hình ảnh, logo vector, icons
```
