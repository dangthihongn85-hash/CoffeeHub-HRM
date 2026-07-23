# Mô Tả Chi Tiết Dự Án CoffeeHub-HRM

## 1. Tổng quan & Mục đích
**CoffeeHub-HRM** là một phần mềm Quản lý Nhân sự (Human Resource Management) toàn diện được thiết kế đặc biệt. Hệ thống giúp số hóa toàn bộ quy trình quản lý nhân sự từ việc lưu trữ hồ sơ, sắp xếp ca làm việc, chấm công tự động, cho đến việc tự động tính toán lương thưởng.

## 2. Công nghệ sử dụng
- **Frontend (Giao diện người dùng):** Angular (HTML/CSS/TypeScript).
- **Backend (API & Logic xử lý):** Java với Framework Spring Boot.
- **Database (Cơ sở dữ liệu):** MySQL.
- **Triển khai (Deployment):** Docker và Docker Compose (có Nginx làm proxy điều hướng request cho Frontend).

## 3. Các Phân hệ / Chức năng chính

### 3.1. Phân hệ Quản lý Hồ sơ Nhân sự (Employee & Department)
- **Quản lý Phòng ban & Vị trí:** Tạo, sửa, xóa các phòng ban (`Department`) và chức vụ (`Position`).
- **Hồ sơ Nhân viên (`Employee`):** Quản lý thông tin chi tiết của nhân viên (tên, liên hệ, loại nhân viên full-time/part-time, phòng ban trực thuộc).

### 3.2. Phân hệ Quản lý Ca làm việc (Shift Management)
- **Danh mục Ca làm (`Shift`):** Tạo các ca làm việc trong ngày (ví dụ: Ca Sáng, Ca Chiều, Ca Tối) với khung giờ cố định.
- **Phân ca (`ShiftAssignment`):** Xếp lịch làm việc cho từng nhân viên theo ngày hoặc theo tuần.

### 3.3. Phân hệ Chấm công (Attendance) - Tích hợp AI
- **Chấm công thông thường:** Ghi nhận giờ vào (check-in) và giờ ra (check-out), tự động tính toán trạng thái (Đi muộn, Về sớm, Đúng giờ).
- **Chấm công bằng Khuôn mặt (Face Attendance):** Tích hợp công nghệ nhận diện khuôn mặt để nhân viên chấm công tự động, tăng tính minh bạch và chống gian lận.
- **Quản lý ngày nghỉ (`Holiday`):** Thiết lập các ngày lễ, Tết để không tính là ngày vắng mặt.

### 3.4. Phân hệ Quản lý Lương & Cấu hình (Salary Management)
- **Cấu hình lương (`SalaryConfig`):** Thiết lập các tham số tính lương linh hoạt như: Lương cơ bản, phụ cấp, mức phạt đi muộn/về sớm, hệ số làm thêm giờ.
- **Bảng lương tháng (`Salary`):** Tự động tổng hợp dữ liệu từ hệ thống chấm công và cấu hình lương để kết xuất ra bảng lương thực nhận cho từng nhân viên trong tháng.
- **Doanh thu (`MonthlyRevenue`):** Tính toán dựa trên mức doanh thu của hệ thống (nếu có áp dụng chia thưởng).

### 3.5. Trợ lý AI Đánh giá (AI Integration)
- **Đánh giá tự động (`AiController`):** Hệ thống có tích hợp AI để phân tích dữ liệu làm việc của nhân viên (số ngày đi muộn, hiệu suất làm việc...) và tự động sinh ra các đoạn đánh giá, nhận xét nhân sự cuối tháng.

### 3.6. Bảo mật và Phân quyền (Auth & Security)
- Hệ thống có phân quyền rõ ràng qua Role (Ví dụ: Quản trị viên / Nhân viên).
- Đăng nhập bảo mật thông qua JWT (JSON Web Token). 
- **Quản trị viên** có toàn quyền cấu hình.
- **Nhân viên** chỉ xem được lịch làm việc, bảng lương và thực hiện chấm công của chính mình.

---
*Tóm lại, CoffeeHub-HRM là một hệ thống quản lý thực tế có độ phức tạp khá cao với điểm nhấn là số hóa tự động quy trình chấm công - tính lương, kèm theo tính năng Chấm công bằng khuôn mặt và Đánh giá nhân viên bằng AI.*
