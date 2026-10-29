# 🪑 MORIOO - WEBSITE BÁN NỘI THẤT GỖ TỰ NHIÊN

Website bán nội thất gỗ tự nhiên phong cách tối giản Nhật Bản (**MORIOO / Wabi-Sabi**), được thiết kế chính xác theo hình ảnh phòng mẫu với tông màu gỗ sồi ấm áp, thanh điều hướng đỏ mận thương hiệu, các điểm ghim tương tác trực tiếp trên ảnh và kết nối trực tuyến với **Cơ sở dữ liệu Supabase Cloud toàn cầu (ai trên internet cũng xem được)**.

---

## 🌟 Điểm Nổi Bật Của Website MORIOO

1. **Thiết kế chuẩn xác theo ảnh gốc**:
   - Thanh thông báo trên cùng: *Miễn phí vận chuyển từ 499.000 VNĐ - Hotline 1900 255 579*.
   - Thanh điều hướng màu đỏ thương hiệu MORIOO (`#7F0019`) với logo thương hiệu, danh mục (Hàng Mới, Bán Chạy, Phòng Khách, Phòng Ngủ, Phòng Ăn...), ô tìm kiếm tức thời và giỏ hàng.
   - **Hero Banner tương tác (Shoppable Hotspots)**: Sử dụng chính xác bức ảnh phòng khách & phòng ngủ kiểu Nhật từ ảnh gốc, gắn các điểm ghim tương tác (+) trên:
     - Giường ngủ gầm thấp có 4 hộc kéo MORIOO
     - Ghế sofa bành thư giãn điều chỉnh 14 nấc
     - Bàn trà gỗ sồi bo tròn chân thấp kiểu Nhật
     - Kệ tivi gỗ sồi tối giản 3 ngăn kéo
     - Đôn gối lười hạt xốp
     - Bộ ấm chén trà gốm sứ mộc mạc
   - Dòng breadcrumb: `Trang chủ > Nhà Cửa Đời Sống > Đồ Nội Thất MORIOO`.
   - Widget nổi bên phải: Nút **LIVE** đỏ tròn phát sóng xưởng MORIOO và nút **Tai nghe hỗ trợ** khách hàng trực tuyến kèm hộp chat.

2. **Cơ sở dữ liệu Supabase Cloud (Ai cũng xem được)**:
   - Dữ liệu được lưu trữ trên nền tảng đám mây Supabase PostgreSQL.
   - Bật **Row Level Security (RLS)** với chính sách công khai (`FOR SELECT USING (true)`): Bất kỳ ai trên internet đều có thể truy cập xem sản phẩm, đánh giá và gửi đơn đặt hàng mà không bị chặn quyền hay giới hạn mạng nội bộ.
   - Tích hợp giao diện **Cài đặt Supabase** trực tiếp trên web: Dán `URL` và `Anon Key` vào là kết nối tức thì, có nút kiểm tra kết nối chẩn đoán lỗi tự động.
   - Có cơ chế **Fallback mượt mà**: Ngay cả khi chưa nhập key Supabase, trang web vẫn hiển thị trọn vẹn 12+ sản phẩm mẫu gỗ sồi MORIOO chất lượng cao, không bao giờ bị lỗi màn hình trắng.

3. **Tính năng thương mại điện tử hoàn chỉnh**:
   - Bộ lọc theo phòng, theo chất liệu gỗ (Gỗ Sồi Trắng, Gỗ Tần Bì, Gỗ Thông...) và sắp xếp giá/đánh giá.
   - Modal xem chi tiết sản phẩm: Thư viện ảnh, thông số kích thước (Dài x Rộng x Cao), lớp sơn dầu lau Osmo an toàn, bảo hành 36 tháng.
   - Ngăn kéo giỏ hàng (Slide-over Cart Drawer) tự động tính toán tiến độ Freeship từ 499k, áp dụng mã giảm giá (`MORIOO10`, `GOXANH`).
   - Modal đặt hàng & thanh toán: Hỗ trợ COD hoặc **Chuyển khoản VietQR tự động sinh mã QR** (Chủ TK: NỘI THẤT MORIOO), lưu trực tiếp đơn hàng vào bảng `orders` của Supabase.
   - Bảng điều khiển Quản trị (Admin): Xem danh sách đơn hàng khách vừa đặt và form thêm sản phẩm mới vào database.

---

## 🚀 Hướng Dẫn Chạy Thử Trên Máy

### Cách 1: Sử dụng máy chủ Python tích hợp (Khuyên dùng)
Mở PowerShell hoặc Command Prompt tại thư mục dự án và chạy:
```powershell
python server.py
```
Mở trình duyệt truy cập: **`http://localhost:8080`**

### Cách 2: Mở trực tiếp file `index.html`
Bạn cũng có thể nhấp đúp trực tiếp vào file `index.html` trong thư mục để mở trên trình duyệt (Chrome, Edge, Firefox, Cốc Cốc).

---

## ☁️ Hướng Dẫn Kết Nối Supabase Cloud Để Ai Cũng Xem Được

### Bước 1: Tạo dự án Supabase miễn phí
1. Truy cập [https://supabase.com](https://supabase.com) và đăng ký/đăng nhập tài khoản miễn phí.
2. Nhấn **"New project"**, chọn tên dự án (VD: `morioo-furniture`), đặt mật khẩu cơ sở dữ liệu và chọn vùng `Singapore`.
3. Đợi khoảng 1-2 phút để Supabase khởi tạo máy chủ PostgreSQL.

### Bước 2: Chạy Script Database
1. Trong trang quản trị Supabase, chọn mục **SQL Editor** ở thanh menu bên trái.
2. Mở file `supabase-schema.sql` có sẵn trong thư mục dự án, sao chép toàn bộ nội dung và dán vào SQL Editor.
3. Nhấn nút **"Run"** (hoặc Ctrl + Enter).
   - Hệ thống sẽ tự động tạo các bảng `categories`, `products`, `orders`, `order_items`, `reviews`.
   - Tự động cấu hình chính sách bảo mật **Row Level Security (RLS)** mở quyền đọc công khai cho mọi người trên toàn cầu.
   - Nạp sẵn toàn bộ dữ liệu nội thất gỗ sồi cao cấp MORIOO.

### Bước 3: Lấy khóa kết nối (API Keys)
1. Trong Supabase, vào **Project Settings** > chọn mục **API**.
2. Sao chép 2 thông tin:
   - **Project URL**: Có dạng `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **Project API Keys**: Chọn khóa **`anon` / `public`**.

### Bước 4: Kích hoạt trên website
Mở website trên trình duyệt, bấm vào nút **"⚙️ Cấu hình Supabase"** trên thanh thông báo. Dán URL và Anon Key vào rồi nhấn **"Kiểm tra kết nối ngay"** -> **"Lưu và Sử Dụng"**.

---

## 🌐 Hướng Dẫn Đưa Website Lên Mạng Để Mọi Người Cùng Truy Cập (Miễn Phí 100%)

- **Netlify Drop (30 giây):** Kéo toàn bộ thư mục dự án thả vào [https://app.netlify.com/drop](https://app.netlify.com/drop).
- **Vercel:** Đưa lên qua [https://vercel.com](https://vercel.com).
- **GitHub Pages:** Đẩy lên GitHub repository và kích hoạt Pages.
