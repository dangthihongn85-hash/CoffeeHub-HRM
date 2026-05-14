# Hướng dẫn khởi chạy dự án HRM (Cafe Salary Management & Facial Recognition)

Dự án bao gồm 3 thành phần chính: Database (MySQL qua Docker), Backend (Spring Boot), và Frontend (Angular).
Dưới đây là các lệnh cần thiết để khởi chạy từng thành phần.

## 1. Khởi động Database (MySQL)
Yêu cầu đã cài đặt Docker và Docker Compose.
- **Thư mục:** `c:\Work\BMAD` (thư mục gốc chứa file `docker-compose.yml`)
- **Lệnh:**
  ```bash
  docker-compose up -d
  ```
- **Port hoạt động:** `3307`

## 2. Khởi động Backend (Spring Boot)
- **Thư mục:** `c:\Work\BMAD\hrm-backend`
- **Lệnh:**
  ```bash
  .\mvnw spring-boot:run
  ```
- **Port hoạt động:** `8080` (API Server: http://localhost:8080)

## 3. Khởi động Frontend (Angular)
Yêu cầu đã cài đặt Node.js và NPM.
- **Thư mục:** `c:\Work\BMAD\hrm-frontend`
- **Lệnh:**
  ```bash
  npm start
  ```
- **Port hoạt động:** `4200` (Giao diện người dùng: http://localhost:4200)

---
**Ghi chú:** 
Hãy chạy theo thứ tự trên. Đảm bảo Database đã lên trước để Backend có thể kết nối, và Backend đã sẵn sàng trước khi tương tác trên Frontend.
