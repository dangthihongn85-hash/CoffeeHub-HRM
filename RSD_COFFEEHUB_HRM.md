# Tài Liệu Đặc Tả Yêu Cầu Hệ Thống (RSD/SRS) - CoffeeHub HRM

## 1. GIỚI THIỆU (INTRODUCTION)

### 1.1. Mục đích
Tài liệu Đặc tả Yêu cầu Hệ thống (Requirements Specification Document - RSD / Software Requirements Specification - SRS) này mô tả các yêu cầu kỹ thuật và kiến trúc hệ thống chi tiết cho phần mềm **CoffeeHub-HRM**. Tài liệu này dành cho đội ngũ phát triển (Developers), người kiểm thử (Testers) và người quản lý dự án (PM).

### 1.2. Công nghệ cốt lõi
- **Frontend:** Angular, TypeScript, HTML5, CSS3.
- **Backend:** Java 17+, Spring Boot 3.x, Spring Data JPA, Spring Security (JWT).
- **Cơ sở dữ liệu:** MySQL 8.0+.
- **Triển khai:** Docker, Docker Compose, Nginx (Reverse Proxy).

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Client-Server** với kiến trúc **Monolithic** cho Backend (Spring Boot), giao tiếp qua **RESTful API**.
1. **Presentation Layer (Frontend):** Ứng dụng SPA (Single Page Application) sử dụng Angular.
2. **Business Logic Layer (Backend):** Xử lý logic nghiệp vụ, bảo mật, và xác thực.
3. **Data Access Layer:** Sử dụng Hibernate (JPA) để map các đối tượng (Entity) xuống các bảng quan hệ trong CSDL MySQL.

---

## 3. ĐẶC TẢ DỮ LIỆU / CƠ SỞ DỮ LIỆU (DATA MODEL)

Hệ thống xoay quanh các thực thể (Entities) cốt lõi sau:

### 3.1. Quản lý Tổ chức & Nhân sự
- **Department (Phòng ban):** Lưu thông tin các phòng ban (ID, Tên phòng ban, Mô tả).
- **Position (Chức vụ):** Lưu chức vụ (ID, Tên chức vụ).
- **Employee (Nhân viên):** Bảng trung tâm lưu hồ sơ nhân sự (ID, Tên, Mã nhân viên, Liên hệ, `Department_ID`, `Position_ID`, Loại nhân viên: Full-time/Part-time).
- **Account & Role:** Liên kết với Employee để phục vụ đăng nhập. Bảng Role quản lý quyền (Admin, Employee).

### 3.2. Quản lý Ca làm việc (Shift)
- **Shift (Ca làm):** Định nghĩa các ca (ID, Tên ca, Giờ bắt đầu, Giờ kết thúc).
- **ShiftAssignment (Phân ca):** Bảng trung gian (N-N) gán nhân viên vào ca làm trong một ngày cụ thể (ID, `Employee_ID`, `Shift_ID`, Ngày làm việc).

### 3.3. Chấm công (Attendance)
- **Attendance (Bản ghi chấm công):** Lưu lại giờ check-in, check-out thực tế của nhân viên. Cột trạng thái (Đúng giờ, Muộn, Sớm). (ID, `Employee_ID`, `Shift_ID`, Ngày, Giờ Check-in, Giờ Check-out, Trạng thái, Ảnh khuôn mặt xác thực).
- **Holiday (Ngày nghỉ):** Các ngày lễ Tết.

### 3.4. Quản lý Lương (Salary)
- **SalaryConfig (Cấu hình lương):** Các tham số tính lương (Lương cơ bản, Hệ số nhân, Tiền phạt đi muộn).
- **Salary (Bảng lương tháng):** Lưu dữ liệu lương đã tính toán cho từng nhân viên mỗi tháng (ID, `Employee_ID`, Tháng/Năm, Tổng giờ làm, Số lần đi muộn, Tiền phạt, Phụ cấp, Thực lĩnh).

---

## 4. YÊU CẦU CHỨC NĂNG CHI TIẾT (DETAILED FUNCTIONAL REQUIREMENTS)

### 4.1. Module Xác Thực (Authentication) - `AuthController`
- **FR-01.1 (Login API):** `POST /api/auth/login`
  - Input: Username, Password.
  - Output: JWT Token (Access Token), Roles.
  - Logic: Giải mã password bằng BCrypt, so sánh trong DB. Sinh token nếu hợp lệ.

### 4.2. Module Chấm Công (Attendance) - `AttendanceController` & `FaceAttendanceController`
- **FR-02.1 (Check-in/out bằng Khuôn mặt):** `POST /api/attendance/face-check`
  - Input: Ảnh/Video stream khuôn mặt từ Frontend.
  - Output: Thông báo trạng thái điểm danh.
  - Logic: Gọi dịch vụ AI/Computer Vision để trích xuất embedding khuôn mặt, so khớp với DB. Nếu confidence > threshold, ghi nhận bản ghi `Attendance` và đối chiếu `Shift` hiện tại để gán trạng thái (Muộn/Đúng giờ).

### 4.3. Module Tính Lương Tự Động (Salary) - `SalaryController`
- **FR-03.1 (Tính lương tháng):** `POST /api/salary/calculate/{month}/{year}`
  - Logic nghiệp vụ (Service Layer): 
    1. Lấy danh sách `Employee`.
    2. Đếm số bản ghi `Attendance` hợp lệ trong tháng của nhân viên.
    3. Đếm số lần đi muộn.
    4. Kéo cấu hình từ `SalaryConfig`.
    5. Áp dụng công thức: `Tổng lương = (Giờ làm * Lương cơ bản) + Phụ cấp - (Số lần muộn * Phạt)`.
    6. Lưu xuống bảng `Salary`.

### 4.4. Module AI Đánh Giá (AI Review) - `AiController`
- **FR-04.1 (Sinh đánh giá nhân sự):** `POST /api/ai/review/{employeeId}`
  - Logic: Thu thập dữ liệu của nhân viên (Số ca vắng, đi muộn, số giờ làm) gửi dạng prompt tới mô hình AI (qua HTTP Request tới API AI bên thứ 3 hoặc local).
  - Trả về `AiReviewDto` chứa đoạn text đánh giá tự động.

---

## 5. YÊU CẦU GIAO DIỆN API (INTERFACE REQUIREMENTS)
- **Định dạng dữ liệu:** Toàn bộ API trả về `application/json`.
- **Cấu trúc Response chuẩn:**
  ```json
  {
    "status": 200,
    "message": "Thao tác thành công",
    "data": { ... }
  }
  ```
- **Error Handling:** 
  - 401 Unauthorized (Thiếu/sai Token).
  - 403 Forbidden (Không đủ quyền Admin).
  - 400 Bad Request (Dữ liệu đầu vào không hợp lệ).
  - 404 Not Found (Không tìm thấy bản ghi trong DB).

---

## 6. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

### 6.1. Bảo mật (Security Constraints)
- Mật khẩu phải mã hóa (BCryptPasswordEncoder).
- API cần được bảo vệ qua bộ lọc `JwtAuthenticationFilter`.
- CORS (Cross-Origin Resource Sharing) phải được cấu hình tại Backend để chỉ cho phép Frontend (Vd: `http://localhost:4200`) truy cập.

### 6.2. Môi trường hệ thống (System Environment)
- Các file Dockerfile phải tối ưu hóa dung lượng (Sử dụng Multi-stage build cho Angular và Maven).
- CSDL MySQL phải có Volume persistent (`mysql_data`) trong Docker Compose để tránh mất dữ liệu khi container bị tắt.

### 6.3. Tiêu chuẩn mã hóa (Coding Standards)
- Backend áp dụng **Lombok** để giảm boilerplate code (Getter, Setter).
- Sử dụng **DTO Pattern** (Data Transfer Object) để gửi/nhận dữ liệu, không expose Entity gốc trực tiếp ra các Endpoint Controller.
