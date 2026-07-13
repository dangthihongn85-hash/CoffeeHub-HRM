# Hướng dẫn chạy dự án CoffeeHub-HRM

Hệ thống đã được đóng gói hoàn toàn bằng Docker, bao gồm 3 thành phần chính:
- **MySQL Database**: Chứa toàn bộ dữ liệu.
- **Spring Boot Backend**: Xử lý logic nghiệp vụ và API (Port 8080).
- **Angular Frontend**: Giao diện người dùng được serve bằng Nginx (Port 80).

## Yêu cầu hệ thống
- Máy tính cần cài đặt sẵn **Docker** và **Docker Compose** (hoặc Docker Desktop đối với Windows/Mac).

---

## Các bước khởi chạy dự án

### Bước 1: Mở Terminal / PowerShell
Mở PowerShell (hoặc Command Prompt, Git Bash) và di chuyển vào thư mục gốc của dự án:
```bash
cd C:\Work\BMAD
```

### Bước 2: Build và Khởi chạy (Chỉ cần 1 lệnh duy nhất)
Chạy lệnh sau để Docker tự động tải database, biên dịch mã nguồn Backend (Java) và Frontend (Angular) rồi khởi động toàn bộ:
```bash
docker-compose up -d --build
```
> **Lưu ý**: Lần chạy đầu tiên có thể mất từ 2-5 phút vì Docker cần tải các dependencies và nén mã nguồn Frontend. Cờ `-d` giúp hệ thống chạy ngầm để bạn có thể tiếp tục sử dụng Terminal.

### Bước 3: Kiểm tra trạng thái hệ thống
Để đảm bảo tất cả các container đang chạy bình thường, sử dụng lệnh:
```bash
docker-compose ps
```
Nếu bạn thấy 3 container `hrm-frontend`, `hrm-backend` và `hrm-mysql` ở trạng thái **Up**, hệ thống đã sẵn sàng.

---

## Truy cập ứng dụng
Sau khi hệ thống chạy lên thành công, bạn có thể truy cập qua trình duyệt:

1. **Giao diện Quản lý (Frontend)**: 
   - Truy cập: 👉 `http://localhost:4200` (hoặc `http://<IP-máy-của-bạn>:4200`)
   - Tài khoản đăng nhập (mặc định nếu Database có sẵn admin): Tùy thuộc vào dữ liệu bạn đã seed.

2. **API Backend**: 
   - Truy cập: 👉 `http://localhost:8080/api`
   - Nginx trên Frontend đã được cấu hình tự động proxy các đường dẫn `/api` về cổng 8080 của Backend, do đó ứng dụng web chạy trên điện thoại/máy tính khác vẫn có thể lấy dữ liệu bình thường thông qua IP mạng LAN.

---

## Các lệnh thao tác thường dùng

**1. Xem log lỗi (nếu web không chạy):**
```bash
docker-compose logs -f
```

**2. Dừng dự án (Tắt ứng dụng):**
```bash
docker-compose stop
```

**3. Tắt và xóa hoàn toàn container mạng (khi muốn reset toàn bộ):**
```bash
docker-compose down
```

**4. Dọn dẹp dung lượng Docker (Tùy chọn):**
Trong quá trình build nhiều lần, Docker có thể tốn bộ nhớ. Chạy lệnh sau để xóa các file rác không sử dụng:
```bash
docker system prune -f
```
