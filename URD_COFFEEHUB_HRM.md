# Tài Liệu Yêu Cầu Người Dùng (URD) - CoffeeHub HRM

## 1. GIỚI THIỆU (INTRODUCTION)

### 1.1. Mục đích của tài liệu
Tài liệu này (User Requirements Document - URD) được lập ra nhằm định nghĩa chi tiết các yêu cầu từ phía người dùng đối với hệ thống quản lý nhân sự **CoffeeHub-HRM**. Tài liệu đóng vai trò làm cơ sở để phát triển, kiểm thử và nghiệm thu sản phẩm.

### 1.2. Phạm vi dự án
Hệ thống **CoffeeHub-HRM** là một giải pháp phần mềm toàn diện hỗ trợ doanh nghiệp (như các chuỗi cửa hàng, quán cafe) trong việc tự động hóa các quy trình nhân sự bao gồm:
- Quản lý hồ sơ nhân viên, phòng ban.
- Quản lý ca làm việc và xếp lịch làm việc.
- Chấm công (hỗ trợ cả chấm công bằng nhận diện khuôn mặt).
- Tự động tính toán lương dựa trên cấu hình linh hoạt.
- Tích hợp AI để đánh giá hiệu suất nhân sự.

---

## 2. TỔNG QUAN HỆ THỐNG (OVERALL DESCRIPTION)

### 2.1. Đối tượng người dùng (User Roles)
Hệ thống có hai nhóm đối tượng người dùng chính:
1. **Quản trị viên (Admin/Manager):** Những người có quyền hạn cao nhất, chịu trách nhiệm thiết lập hệ thống, quản lý thông tin nhân viên, xếp ca, cấu hình lương và theo dõi báo cáo.
2. **Nhân viên (Employee):** Người sử dụng hệ thống để theo dõi lịch làm việc của cá nhân, thực hiện chấm công hàng ngày và kiểm tra bảng lương/kết quả đánh giá.

### 2.2. Môi trường vận hành
- Hệ thống hoạt động trên nền tảng Web-based (truy cập qua trình duyệt như Chrome, Safari, Edge).
- Có thể truy cập linh hoạt từ PC, Laptop, hoặc các thiết bị di động (qua Responsive Web Design).
- Thiết bị chấm công tại cửa hàng cần trang bị Camera để hỗ trợ tính năng nhận diện khuôn mặt.

---

## 3. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

### 3.1. Phân hệ Quản lý Tài khoản và Phân quyền
- **UR-01.01 (Đăng nhập):** Người dùng (Admin và Nhân viên) có thể đăng nhập vào hệ thống bằng tài khoản và mật khẩu an toàn (Sử dụng JWT Token).
- **UR-01.02 (Đổi mật khẩu):** Người dùng có quyền thay đổi mật khẩu của cá nhân.
- **UR-01.03 (Phân quyền):** Hệ thống tự động giới hạn các tính năng hiển thị dựa trên vai trò (Role) của người dùng đăng nhập.

### 3.2. Phân hệ Quản lý Hồ sơ Nhân sự (Dành cho Admin)
- **UR-02.01 (Quản lý Phòng ban):** Admin có thể Thêm mới, Sửa, Xóa và xem danh sách các phòng ban.
- **UR-02.02 (Quản lý Vị trí):** Admin có thể thiết lập các chức danh (vị trí) trong công ty.
- **UR-02.03 (Quản lý Nhân viên):** 
  - Tạo mới hồ sơ nhân viên (nhập tên, ngày sinh, số điện thoại, gán phòng ban, loại hợp đồng full-time/part-time).
  - Cập nhật, Khóa (vô hiệu hóa) hoặc Xóa hồ sơ nhân viên khi nghỉ việc.

### 3.3. Phân hệ Quản lý Ca làm việc (Shift Management)
- **UR-03.01 (Định nghĩa ca làm):** Admin tạo các khung giờ làm việc chuẩn (VD: Ca sáng 08:00 - 12:00, Ca chiều 13:00 - 17:00).
- **UR-03.02 (Phân ca/Xếp lịch):** Admin có thể gán lịch làm việc cho từng nhân viên theo ngày hoặc theo một khoảng thời gian.
- **UR-03.03 (Xem lịch làm việc - Nhân viên):** Nhân viên đăng nhập có thể xem lịch làm việc cá nhân của mình trong tuần/tháng.

### 3.4. Phân hệ Chấm công (Attendance)
- **UR-04.01 (Chấm công thủ công):** Nhân viên có thể nhấn nút "Check-in" hoặc "Check-out" trên hệ thống; hệ thống ghi nhận thời gian thực và vị trí (nếu cần).
- **UR-04.02 (Chấm công bằng Khuôn mặt):** 
  - Nhân viên đứng trước camera của thiết bị chấm công để hệ thống AI nhận diện và tự động ghi nhận Check-in/Check-out.
  - Yêu cầu Admin có chức năng "Đăng ký khuôn mặt" ban đầu cho nhân viên.
- **UR-04.03 (Trạng thái điểm danh):** Hệ thống tự động so sánh giờ chấm công với giờ bắt đầu/kết thúc ca để đánh dấu trạng thái: Đúng giờ, Đi muộn, Về sớm.
- **UR-04.04 (Quản lý nghỉ lễ):** Admin cấu hình danh sách các ngày nghỉ lễ để hệ thống không tính lỗi vắng mặt cho nhân viên.

### 3.5. Phân hệ Cấu hình và Tính Lương (Salary Management)
- **UR-05.01 (Cấu hình tham số lương):** Admin thiết lập các tham số: Mức lương cơ bản (theo giờ/tháng), Tiền phụ cấp, Mức phạt đi muộn (trừ tiền), Hệ số nhân khi làm thêm giờ.
- **UR-05.02 (Tự động tính lương):** Cuối chu kỳ (tháng), hệ thống tự động tổng hợp dữ liệu chấm công để xuất ra bảng lương tạm tính cho toàn bộ nhân viên.
- **UR-05.03 (Quản lý Bảng lương):** Admin có thể xem xét, điều chỉnh (nếu cần) và Chốt bảng lương.
- **UR-05.04 (Xem lương cá nhân):** Nhân viên có thể xem chi tiết phiếu lương (payslip) của mình, biết rõ lý do bị trừ tiền hoặc được cộng thưởng.

### 3.6. Trợ lý AI và Đánh giá (AI Review)
- **UR-06.01 (Tạo báo cáo AI):** Dựa vào dữ liệu đi muộn, về sớm, số ca làm, hệ thống (thông qua AIController) sinh ra các đoạn tóm tắt nhận xét/đánh giá thái độ làm việc của nhân viên trong tháng.
- **UR-06.02 (Xem đánh giá):** Nhân viên và Quản lý có thể đọc được các đoạn đánh giá này.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

### 4.1. Hiệu suất (Performance)
- Hệ thống cần phản hồi các thao tác cơ bản (chuyển trang, tải dữ liệu) dưới 2 giây.
- Tính năng chấm công khuôn mặt cần phản hồi nhanh (dưới 3 giây/lần nhận diện) để không gây ách tắc tại cửa hàng.

### 4.2. Bảo mật (Security)
- Mật khẩu phải được mã hóa (hashing) trong cơ sở dữ liệu MySQL (thông qua BCrypt).
- Toàn bộ giao tiếp giữa Frontend và Backend phải thông qua JWT Token có thời hạn (Expiration Time).
- Ngăn chặn triệt để các hành vi giả mạo (vd: Nhân viên A không thể xem bảng lương của Nhân viên B).

### 4.3. Khả năng mở rộng và Triển khai (Scalability & Deployment)
- Hệ thống đóng gói theo chuẩn **Docker** (gồm Backend, Frontend, MySQL) để dễ dàng mang qua các môi trường khác nhau (Local, Server, Cloud) chỉ với 1 lệnh `docker-compose up`.
- Kiến trúc API RESTful giúp dễ dàng phát triển thêm ứng dụng Mobile (nếu cần trong tương lai).

### 4.4. Tính khả dụng (Usability)
- Giao diện (Angular) trực quan, hiện đại, dễ thao tác cho người không chuyên về IT.
- Hỗ trợ tốt hiển thị trên các màn hình kích thước khác nhau (Mobile/Tablet/Desktop).
