# Script khởi chạy toàn bộ dự án HRM (Database, Backend, Frontend)
# Bạn có thể click chuột phải chọn "Run with PowerShell" hoặc chạy file .bat đi kèm.

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   BẮT ĐẦU KHỞI CHẠY HỆ THỐNG HRM" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Khởi động MySQL qua Docker
Write-Host "`n[1/3] Đang khởi động Database (MySQL)..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Lỗi: Không thể chạy docker-compose. Hãy đảm bảo Docker Desktop đã được mở!" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát..."
    exit
}
Write-Host "Database đang hoạt động trên cổng 3307." -ForegroundColor Green

# 2. Khởi động Backend (Spring Boot) trong cửa sổ mới
Write-Host "`n[2/3] Đang mở cửa sổ mới chạy Backend (Spring Boot)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'ĐANG CHẠY BACKEND SPRING BOOT (CỔNG 8080)...' -ForegroundColor Cyan; cd '$PSScriptRoot\hrm-backend'; .\mvnw spring-boot:run"
Write-Host "Backend đang được khởi chạy trong cửa sổ riêng." -ForegroundColor Green

# 3. Khởi động Frontend (Angular) trong cửa sổ mới
Write-Host "`n[3/3] Đang mở cửa sổ mới chạy Frontend (Angular)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'ĐANG CHẠY FRONTEND ANGULAR (CỔNG 4200)...' -ForegroundColor Cyan; cd '$PSScriptRoot\hrm-frontend'; `$env:NG_CLI_ANALYTICS='false'; npm start"
Write-Host "Frontend đang được khởi chạy trong cửa sổ riêng." -ForegroundColor Green

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "   KHỞI CHẠY THÀNH CÔNG!" -ForegroundColor Green
Write-Host " - Giao diện Angular: http://localhost:4200" -ForegroundColor Green
Write-Host " - API Spring Boot:   http://localhost:8080" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Lưu ý: Không tắt các cửa sổ PowerShell vừa được bật lên để tránh ngắt dịch vụ." -ForegroundColor Yellow
Write-Host "Bạn có thể đóng cửa sổ chính này." -ForegroundColor Gray
Start-Sleep -Seconds 5
