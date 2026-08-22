<div align="center">
  <img src="logo.jpg" alt="MinouiDev Logo" width="120" />
  <h1>MinouiDev XPath Inspector</h1>
  <p><strong>Công cụ mạnh mẽ và hiện đại để phân tích cấu trúc giao diện (UI) và trích xuất XPath tự động cho các thiết bị Android.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Version-2.0-blue.svg" alt="Version">
    <img src="https://img.shields.io/badge/Platform-Web-success.svg" alt="Platform">
    <img src="https://img.shields.io/badge/Theme-Dark%2FLight-orange.svg" alt="Theme">
  </p>
</div>

---

## 🌟 Tính năng nổi bật

* **Giao diện hiện đại (Modern UI):** Thiết kế Glassmorphism tuyệt đẹp, hoạt ảnh mượt mà, hỗ trợ hai chế độ **Sáng (Light Mode)** và **Tối (Dark Mode)**, đồng bộ hóa tự động qua `localStorage`.
* **Phân tích Cấu trúc (Hierarchy Viewer):** Đọc và vẽ lại sơ đồ cấu trúc của màn hình thiết bị Android (dạng cây).
* **Tương tác trực quan:** 
  * Hover chuột lên các thành phần trên cây thư mục sẽ làm sáng tương ứng khung (Bounding Box) trên màn hình thiết bị.
  * Hiển thị Tooltip tự động cập nhật Class Name, Resource ID, Content-Desc...
* **Tính toán XPath thông minh:** Cung cấp nhiều chiến lược tạo XPath: Tự động, Ngắn gọn, Dựa trên Thuộc tính (ID, Text, Content-desc), và Tuyệt đối.
* **Offline Inspect (Kiểm tra ngoại tuyến):** Cho phép tải lên file cấu trúc (`.xml` hoặc `.json`) và ảnh chụp màn hình (`.png`) để phân tích khi không cắm thiết bị.
* **Hỗ trợ HAtxLib:** Tích hợp trực tiếp thư viện HAtxLib (C#) qua tab Demo, giúp bạn dễ dàng ánh xạ UI thành code Auto.
* **Trình đơn ngữ cảnh thông minh (Context Menu):** Copy XPath, Copy XPath ngắn, hoặc trực tiếp **Tap** (chạm thử) vào thiết bị ngay trên giao diện web.

## 🚀 Trải nghiệm (Screenshots)

*(Thêm hình ảnh screenshot của màn hình Dark Mode và Light Mode tại đây)*

## 🛠️ Cài đặt & Sử dụng

1. **Khởi động Server:** Tool yêu cầu một backend server kết nối với ADB để hoạt động. (Đảm bảo backend của bạn đang chạy ở cổng mặc định).
2. **Khởi chạy ứng dụng:** Mở thư mục `MinoUiDev` trên web server của bạn (ví dụ: `XAMPP`).
3. Truy cập địa chỉ trên trình duyệt: `http://localhost/minoui/`
4. Trên giao diện Dashboard, các thiết bị Android đang kết nối ADB sẽ được hiển thị. Nhấp vào tên thiết bị để chuyển đến **Inspector**.

## 📖 Hướng dẫn nhanh

* **Xoay thiết bị / Refresh:** Sử dụng các phím điều hướng trên Header để tải lại cấu trúc UI.
* **Tìm kiếm:** Nhập từ khóa (Class, ID, Text...) vào thanh tìm kiếm để nhanh chóng lọc ra nút tương ứng.
* **Xóa Ping:** Nhấn phím `Esc` để xóa bỏ những điểm đánh dấu ping thừa.
* **Chuyển Theme:** Nhấn vào biểu tượng Mặt trời/Mặt trăng góc phải màn hình Dashboard để chuyển đổi chế độ giao diện.

## 🔗 Liên hệ & Ủng hộ

Nếu công cụ này giúp ích và tiết kiệm thời gian cho bạn, hãy ủng hộ tác giả một ly cà phê nhé! ❤️
* **Ngân hàng:** MB Bank (Quân Đội)
* **Số tài khoản:** `5966866868`
* **Chủ tài khoản:** LE PHAM MINH NHAT

---
<div align="center">
  <i>Được phát triển với niềm đam mê bởi <a href="https://github.com/minhnhatgithub">MinouiDev</a></i>
</div>
