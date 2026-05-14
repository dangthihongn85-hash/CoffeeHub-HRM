import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-salary',
  template: `
    <div class="page-header">
      <div>
        <h2 class="page-title">AI Performance Review</h2>
        <p class="page-subtitle">Nhận xét hiệu suất nhân sự bằng Trí Tuệ Nhân Tạo</p>
      </div>
    </div>

    <!-- EXCEL & SALARY EXPORT SECTION -->
    <mat-card class="review-card" style="margin-bottom: 24px;">
      <div class="ai-banner" style="background: linear-gradient(to right, #f0fdf4, #ecfdf5);">
        <div class="ai-icon-bg" style="background: linear-gradient(135deg, #10b981, #059669);">
          <mat-icon>request_quote</mat-icon>
        </div>
        <div class="ai-banner-text">
          <h3>Báo Cáo & Tính Lương (Tháng 5/2026)</h3>
          <p>Thu thập dữ liệu điểm danh, ngày nghỉ và kết xuất Bảng Lương (Gồm Lương cứng, Thưởng chuyên cần và tính Phạt Đi muộn) thành File Excel (.csv).</p>
        </div>
        <button mat-raised-button color="accent" class="generate-btn" style="background: #10b981; color: white;" (click)="exportExcel()">
          <mat-icon>file_download</mat-icon> Xuất Excel (CSV)
        </button>
      </div>
    </mat-card>

    <mat-card class="review-card">
      <div class="ai-banner">
        <div class="ai-icon-bg">
          <mat-icon>auto_awesome</mat-icon>
        </div>
        <div class="ai-banner-text">
          <h3>Trợ lý nhân sự Gen-AI</h3>
          <p>Hệ thống sẽ phân tích lịch sử điểm danh, dữ liệu KPI và các chỉ số biểu hiện để sinh ra bản đánh giá nhân sự khách quan, chuyên nghiệp nhất.</p>
        </div>
        <button mat-raised-button color="primary" class="generate-btn" (click)="getReview()" [disabled]="loading">
          <mat-icon>psychology</mat-icon> Sinh Nhận Xét Khách Quan
        </button>
      </div>

      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <h4>Đang kết nối tới mô hình AI...</h4>
        <p>Quá trình này có thể mất vài giây để phân tích khối lượng dữ liệu lớn.</p>
      </div>

      <div class="result-box" *ngIf="review && !loading">
        <div class="result-header">
          <mat-icon>check_circle</mat-icon> Đánh Giá Hoàn Tất
        </div>
        <div class="result-content">
          {{ review }}
        </div>
      </div>
    </mat-card>
  `,
  styles: [`
    .page-header { margin-bottom: 30px; animation: fadeUp 0.4s ease; }
    .page-title { margin: 0; font-size: 26px; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px; }
    .page-subtitle { margin: 5px 0 0 0; color: var(--text-muted); font-size: 14px; }

    .review-card { border-radius: 20px !important; padding: 24px !important; animation: fadeUp 0.5s ease; }
    .ai-banner { display: flex; align-items: center; background: linear-gradient(to right, #f8fafc, #eef2ff); border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0; }
    .ai-icon-bg { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #6366f1, #c084fc); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3); margin-right: 24px; flex-shrink: 0; }
    .ai-icon-bg mat-icon { color: white; font-size: 32px; width: 32px; height: 32px; }
    .ai-banner-text { flex: 1; }
    .ai-banner-text h3 { margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #1e293b; }
    .ai-banner-text p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.6; max-width: 600px; font-weight: 500; }
    .generate-btn { height: 48px; border-radius: 14px !important; font-size: 15px !important; font-weight: 600 !important; padding: 0 24px !important; box-shadow: 0 8px 15px -3px rgba(99, 102, 241, 0.4) !important; margin-left: 20px; }
    .generate-btn mat-icon { margin-right: 8px; }

    .loading-state { padding: 60px 0; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .loading-state h4 { margin: 24px 0 8px 0; font-size: 18px; font-weight: 800; color: var(--primary); }
    .loading-state p { margin: 0; color: var(--text-muted); font-size: 14px; font-weight: 500; }

    .result-box { margin-top: 30px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; animation: fadeUp 0.5s ease; }
    .result-header { background: #eef2ff; color: #4f46e5; padding: 16px 24px; font-weight: 700; display: flex; align-items: center; gap: 10px; font-size: 15px; border-bottom: 1px solid #e0e7ff; }
    .result-content { padding: 30px; font-size: 15px; line-height: 1.8; color: #334155; white-space: pre-wrap; font-weight: 500; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SalaryComponent {
  review = '';
  loading = false;
  constructor(private http: HttpClient) {}
  
  getReview() {
    this.loading = true;
    this.review = '';
    this.http.get('http://localhost:8080/api/ai/review/1?lateDays=2&kpi=80', {responseType: 'text'}).subscribe({
      next: (res) => {
        setTimeout(() => {
          this.review = res;
          this.loading = false;
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.review = '❌ Lỗi kết nối Backend. Vui lòng kiểm tra xem Spring Boot đã được bật chưa (port 8080).';
      }
    });
  }

  exportExcel() {
    // Generate salary for month first, then export (in real app they might be decoupled or a single step)
    // For demo, we just hit the calculate and export APIs
    this.http.post('http://localhost:8080/api/salaries/calculate/1?month=5&year=2026', {}).subscribe(() => {
        this.http.post('http://localhost:8080/api/salaries/calculate/2?month=5&year=2026', {}).subscribe(() => {
            window.location.href = 'http://localhost:8080/api/salaries/export?month=5&year=2026';
        });
    });
  }
}
