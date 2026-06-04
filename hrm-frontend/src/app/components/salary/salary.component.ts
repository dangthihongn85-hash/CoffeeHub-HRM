import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-salary',
  template: `
    <div class="page-header">
      <div>
        <h2 class="page-title">Báo Cáo & Trợ Lý Nhân Sự AI</h2>
        <p class="page-subtitle">Nhận xét hiệu suất nhân sự bằng Trí Tuệ Nhân Tạo & Xuất báo cáo lương định kỳ</p>
      </div>
    </div>

    <div class="main-layout">
      <!-- CONTROL SIDEBAR -->
      <div class="control-panel">
        <mat-card class="premium-card">
          <div class="card-header-accent">
            <mat-icon>settings</mat-icon> Cấu hình Báo Cáo & AI
          </div>
          
          <div class="form-group">
            <label class="form-label">Chọn Kỳ Lương (Tháng/Năm)</label>
            <div class="period-selectors">
              <select [(ngModel)]="selectedMonth" class="styled-select" (change)="onParamsChange()">
                <option *ngFor="let m of months" [value]="m">Tháng {{ m }}</option>
              </select>
              <select [(ngModel)]="selectedYear" class="styled-select" (change)="onParamsChange()">
                <option *ngFor="let y of years" [value]="y">Năm {{ y }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label font-bold">Chế độ phân tích AI</label>
            <div class="toggle-container">
              <button 
                type="button" 
                class="toggle-btn" 
                [class.active]="reviewMode === 'individual'" 
                (click)="setReviewMode('individual')">
                <mat-icon>person</mat-icon> Cá nhân
              </button>
              <button 
                type="button" 
                class="toggle-btn" 
                [class.active]="reviewMode === 'team'" 
                (click)="setReviewMode('team')">
                <mat-icon>groups</mat-icon> Toàn thể
              </button>
            </div>
          </div>

          <div class="form-group" *ngIf="reviewMode === 'individual'">
            <label class="form-label">Chọn Nhân Viên Đánh Giá</label>
            <select [(ngModel)]="selectedEmployeeId" class="styled-select" (change)="onParamsChange()">
              <option *ngFor="let emp of employees" [value]="emp.id">
                {{ emp.name }} ({{ emp.department || 'Không có bộ phận' }})
              </option>
            </select>
          </div>

          <hr class="divider">

          <!-- AI ACTION -->
          <div class="action-section">
            <button mat-raised-button class="action-btn ai-btn" (click)="getReview()" [disabled]="loading || (reviewMode === 'individual' && !selectedEmployeeId)">
              <mat-icon>psychology</mat-icon> Sinh Đánh Giá AI
            </button>
          </div>

          <!-- EXCEL ACTION -->
          <div class="action-section">
            <button mat-raised-button class="action-btn excel-btn" (click)="exportExcel()" [disabled]="exporting">
              <mat-icon>file_download</mat-icon> Xuất Bảng Lương (CSV)
            </button>
          </div>
        </mat-card>
      </div>

      <!-- DISPLAY CONTENT -->
      <div class="display-panel">
        <mat-card class="premium-card result-card">
          
          <div class="ai-banner" *ngIf="!loading && !individualReview && !teamReview">
            <div class="ai-icon-bg">
              <mat-icon>auto_awesome</mat-icon>
            </div>
            <div class="ai-banner-text">
              <h3>Trợ Lý Gen-AI & Hệ Thống Báo Cáo</h3>
              <p>Mô hình AI hỗ trợ sinh nhận xét cá nhân hoặc tự động tổng hợp hiệu suất toàn thể nhân viên (KPI trung bình, tỷ lệ đi trễ/về sớm/nghỉ, tổng quỹ lương thực tế) chỉ với 1 cú click chuột.</p>
            </div>
          </div>

          <div class="loading-state" *ngIf="loading">
            <mat-spinner diameter="45"></mat-spinner>
            <h4>Đang kết nối tới trợ lý nhân sự AI...</h4>
            <p>Đang thu thập dữ liệu chấm công và phân tích dữ liệu hiệu suất hoạt động.</p>
          </div>

          <!-- INDIVIDUAL REVIEW DISPLAY -->
          <div class="review-display" *ngIf="reviewMode === 'individual' && individualReview && !loading">
            <div class="review-title-section">
              <div class="user-avatar-bg">
                <mat-icon>person</mat-icon>
              </div>
              <div>
                <h3 class="emp-name">{{ individualReview.employeeName }}</h3>
                <p class="emp-meta">{{ individualReview.position }} • Phòng {{ individualReview.department }} • Tháng {{ individualReview.month }}/{{ individualReview.year }}</p>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-label">Hiệu suất KPI</span>
                <span class="stat-value text-indigo">{{ individualReview.kpi | number:'1.1-1' }}%</span>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="individualReview.kpi" [style.background]="'#6366f1'"></div>
                </div>
              </div>
              <div class="stat-box">
                <span class="stat-label">Ngày công thực tế</span>
                <span class="stat-value text-slate">{{ individualReview.workDays }} công</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Đi muộn / Về sớm</span>
                <span class="stat-value" [class.text-red]="individualReview.lateDays > 0 || individualReview.earlyDays > 0" [class.text-slate]="individualReview.lateDays === 0 && individualReview.earlyDays === 0">
                  {{ individualReview.lateDays }} / {{ individualReview.earlyDays }} lần
                </span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Quên checkout / Nghỉ KP</span>
                <span class="stat-value" [class.text-red]="individualReview.noCheckout > 0 || individualReview.absentDays > 0" [class.text-slate]="individualReview.noCheckout === 0 && individualReview.absentDays === 0">
                  {{ individualReview.noCheckout }} / {{ individualReview.absentDays }}
                </span>
              </div>
            </div>

            <!-- Callout Discipline -->
            <div class="callout-box info-callout">
              <div class="callout-title"><mat-icon>verified_user</mat-icon> Đánh Giá Chuyên Cần & Kỷ Luật</div>
              <p class="callout-text">{{ individualReview.disciplineAssessment }}</p>
            </div>

            <!-- Callout Recommendation -->
            <div class="callout-box" [class.success-callout]="individualReview.aiRecommendationType === 'SUCCESS'"
                                    [class.info-callout]="individualReview.aiRecommendationType === 'INFO'"
                                    [class.warning-callout]="individualReview.aiRecommendationType === 'WARNING'">
              <div class="callout-title">
                <mat-icon>psychology</mat-icon> Đề Xuất Từ Trí Tuệ Nhân Tạo (AI)
              </div>
              <p class="callout-text font-bold">{{ individualReview.aiRecommendation }}</p>
            </div>

            <!-- Financial summary -->
            <div class="financial-summary-grid">
              <div class="fin-box bg-green-light">
                <span class="fin-label">Tổng thưởng</span>
                <span class="fin-val text-green">+{{ fmt(individualReview.totalBonus) }}đ</span>
              </div>
              <div class="fin-box bg-red-light">
                <span class="fin-label">Phạt trừ</span>
                <span class="fin-val text-red">-{{ fmt(individualReview.totalPenalty) }}đ</span>
              </div>
              <div class="fin-box bg-indigo-light">
                <span class="fin-label">Thực lĩnh</span>
                <span class="fin-val text-indigo">{{ fmt(individualReview.totalSalary) }}đ</span>
              </div>
            </div>
          </div>

          <!-- TEAM REVIEW DISPLAY -->
          <div class="review-display" *ngIf="reviewMode === 'team' && teamReview && !loading">
            <div class="review-title-section">
              <div class="user-avatar-bg team-avatar">
                <mat-icon>groups</mat-icon>
              </div>
              <div>
                <h3 class="emp-name">Báo Cáo Tổng Quan Toàn Nhân Sự</h3>
                <p class="emp-meta">Kỳ đánh giá: Tháng {{ teamReview.month }}/{{ teamReview.year }} • Quy mô: {{ teamReview.totalEmployees }} nhân sự</p>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
              <div class="stat-box">
                <span class="stat-label">KPI Trung Bình</span>
                <span class="stat-value text-indigo">{{ teamReview.avgKpi | number:'1.1-1' }}%</span>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="teamReview.avgKpi" [style.background]="'#6366f1'"></div>
                </div>
              </div>
              <div class="stat-box">
                <span class="stat-label">Đi muộn / Về sớm toàn quán</span>
                <span class="stat-value" [class.text-red]="teamReview.totalLate + teamReview.totalEarly > teamReview.totalEmployees" [class.text-slate]="teamReview.totalLate + teamReview.totalEarly <= teamReview.totalEmployees">
                  {{ teamReview.totalLate }} / {{ teamReview.totalEarly }} lần
                </span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Tổng lượt nghỉ không phép</span>
                <span class="stat-value" [class.text-red]="teamReview.totalAbsent > 0" [class.text-slate]="teamReview.totalAbsent === 0">
                  {{ teamReview.totalAbsent }} ngày
                </span>
              </div>
              <div class="stat-box">
                <span class="stat-label">Tổng quỹ lương thực chi</span>
                <span class="stat-value text-green">{{ fmt(teamReview.totalPayroll) }}đ</span>
              </div>
            </div>

            <!-- Callout Assessment -->
            <div class="callout-box" [class.success-callout]="teamReview.overallAssessmentType === 'SUCCESS'"
                                    [class.info-callout]="teamReview.overallAssessmentType === 'INFO'"
                                    [class.warning-callout]="teamReview.overallAssessmentType === 'WARNING'">
              <div class="callout-title">
                <mat-icon>insights</mat-icon> Nhận Xét & Khuyến Nghị Hệ Thống (AI)
              </div>
              <p class="callout-text font-bold">{{ teamReview.overallAssessment }}</p>
            </div>

            <!-- Employees Table -->
            <div class="table-container">
              <div class="table-title">Chi Tiết Hiệu Suất Từng Nhân Sự</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Bộ phận</th>
                    <th>KPI tháng</th>
                    <th>Kỷ luật ca trực</th>
                    <th class="text-right">Đề xuất quản lý (AI)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let emp of teamReview.employeeReviews">
                    <td>
                      <span class="table-emp-name">{{ emp.employeeName }}</span>
                    </td>
                    <td><span class="dept-badge">{{ emp.department }}</span></td>
                    <td>
                      <div class="table-kpi-container">
                        <span class="kpi-percent">{{ emp.kpi | number:'1.1-1' }}%</span>
                        <div class="table-kpi-bar">
                          <div class="table-kpi-fill" [style.width.%]="emp.kpi" [class.bg-green]="emp.kpi >= 90" [class.bg-yellow]="emp.kpi < 90 && emp.kpi >= 75" [class.bg-red]="emp.kpi < 75"></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span *ngIf="emp.kpi > 0 && emp.lateDays === 0 && emp.earlyDays === 0 && emp.absentDays === 0" class="badge-success">Tốt</span>
                      <span *ngIf="emp.kpi > 0 && (emp.lateDays > 0 || emp.earlyDays > 0 || emp.absentDays > 0)" class="badge-warning">
                        {{ emp.lateDays > 0 ? emp.lateDays + ' trễ' : '' }}
                        {{ emp.earlyDays > 0 ? (emp.lateDays > 0 ? ' / ' : '') + emp.earlyDays + ' sớm' : '' }}
                        {{ emp.absentDays > 0 ? (emp.lateDays > 0 || emp.earlyDays > 0 ? ' / ' : '') + emp.absentDays + ' nghỉ' : '' }}
                      </span>
                      <span *ngIf="emp.kpi === 0">—</span>
                    </td>
                    <td class="text-right">
                      <span *ngIf="emp.kpi > 0 && emp.recommendation" class="rec-badge" [class.rec-success]="emp.recommendType === 'SUCCESS'"
                                              [class.rec-info]="emp.recommendType === 'INFO'"
                                              [class.rec-warning]="emp.recommendType === 'WARNING'">
                        {{ emp.recommendation }}
                      </span>
                      <span *ngIf="emp.kpi === 0 || !emp.recommendation">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="empty-state" *ngIf="!individualReview && !teamReview && !loading">
            <mat-icon>forum</mat-icon>
            <p *ngIf="reviewMode === 'individual'">
              Vui lòng chọn nhân viên ở bảng điều khiển bên trái và nhấn nút <strong>"Sinh Đánh Giá AI"</strong> để xem nhận xét cá nhân chi tiết.
            </p>
            <p *ngIf="reviewMode === 'team'">
              Vui lòng nhấn nút <strong>"Sinh Đánh Giá AI"</strong> ở bảng điều khiển bên trái để tạo báo cáo tổng quan toàn bộ nhân viên trong tháng.
            </p>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-title { margin: 0; font-size: 26px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
    .page-subtitle { margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-weight: 500; }

    .main-layout { display: flex; gap: 24px; align-items: flex-start; }
    .control-panel { width: 340px; flex-shrink: 0; }
    .display-panel { flex: 1; }

    .premium-card { border-radius: 16px !important; padding: 24px !important; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02) !important; background: #ffffff; }
    .result-card { min-height: 520px; display: flex; flex-direction: column; }

    .card-header-accent { font-size: 16px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
    .card-header-accent mat-icon { color: #6366f1; }

    .form-group { margin-bottom: 18px; }
    .form-label { display: block; font-size: 13.5px; font-weight: 700; color: #475569; margin-bottom: 8px; }

    .toggle-container { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; gap: 4px; }
    .toggle-btn { flex: 1; height: 36px; border: none; background: transparent; border-radius: 6px; font-size: 13.5px; font-weight: 700; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
    .toggle-btn.active { background: #ffffff; color: #6366f1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

    .period-selectors { display: flex; gap: 10px; }
    .styled-select { flex: 1; height: 42px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #f8fafc; outline: none; transition: border-color 0.2s, box-shadow 0.2s; cursor: pointer; width: 100%; }
    .styled-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); background-color: #ffffff; }

    .divider { border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0; }

    .action-section { margin-bottom: 12px; }
    .action-btn { width: 100%; height: 44px; border-radius: 8px !important; font-size: 14px !important; font-weight: 700 !important; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .ai-btn { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35) !important; border: none; }
    .ai-btn:hover:not([disabled]) { opacity: 0.95; }
    .excel-btn { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35) !important; border: none; }
    .excel-btn:hover:not([disabled]) { opacity: 0.95; }

    .ai-banner { display: flex; align-items: center; background: linear-gradient(to right, #f8fafc, #eef2ff); border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
    .ai-icon-bg { width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 12px -3px rgba(99, 102, 241, 0.3); margin-right: 16px; flex-shrink: 0; }
    .ai-icon-bg mat-icon { color: white; font-size: 24px; width: 24px; height: 24px; }
    .ai-banner-text { flex: 1; }
    .ai-banner-text h3 { margin: 0 0 4px 0; font-size: 15px; font-weight: 800; color: #1e293b; }
    .ai-banner-text p { margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5; font-weight: 500; }

    .loading-state { padding: 50px 0; display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; justify-content: center; }
    .loading-state h4 { margin: 20px 0 6px 0; font-size: 16px; font-weight: 800; color: #6366f1; }
    .loading-state p { margin: 0; color: #64748b; font-size: 13.5px; font-weight: 500; }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; color: #94a3b8; padding: 40px; }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; margin-bottom: 16px; color: #cbd5e1; }
    .empty-state p { font-size: 14px; line-height: 1.6; max-width: 420px; }

    /* Premium Review Display */
    .review-display { animation: fadeUp 0.4s ease; display: flex; flex-direction: column; gap: 20px; }
    .review-title-section { display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
    .user-avatar-bg { width: 54px; height: 54px; border-radius: 50%; background: #eef2ff; display: flex; align-items: center; justify-content: center; }
    .user-avatar-bg mat-icon { color: #6366f1; font-size: 28px; width: 28px; height: 28px; }
    .team-avatar { background: #f0fdf4; }
    .team-avatar mat-icon { color: #10b981; }

    .emp-name { margin: 0; font-size: 19px; font-weight: 800; color: #1e293b; }
    .emp-meta { margin: 4px 0 0 0; font-size: 13.5px; font-weight: 600; color: #64748b; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
    .stat-box { border-radius: 12px; border: 1px solid #f1f5f9; background: #f8fafc; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 18px; font-weight: 800; }
    
    .progress-bar-bg { width: 100%; height: 5px; background: #e2e8f0; border-radius: 10px; margin-top: 6px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 10px; }

    .text-indigo { color: #4f46e5; }
    .text-slate { color: #334155; }
    .text-red { color: #ef4444; }
    .text-green { color: #10b981; }

    .callout-box { border-radius: 12px; padding: 18px; border-left: 4px solid; display: flex; flex-direction: column; gap: 6px; }
    .callout-title { font-size: 13.5px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
    .callout-title mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .callout-text { margin: 0; font-size: 13.5px; line-height: 1.6; }
    .font-bold { font-weight: 600; }

    .info-callout { background: #f8fafc; border-left-color: #94a3b8; color: #334155; }
    .info-callout .callout-title { color: #475569; }
    
    .success-callout { background: #f0fdf4; border-left-color: #10b981; color: #14532d; }
    .success-callout .callout-title { color: #166534; }

    .warning-callout { background: #fffbeb; border-left-color: #f59e0b; color: #78350f; }
    .warning-callout .callout-title { color: #92400e; }

    .financial-summary-grid { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 16px; margin-top: 8px; }
    .fin-box { border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .fin-label { font-size: 12px; font-weight: 700; color: #64748b; }
    .fin-val { font-size: 18px; font-weight: 800; }

    .bg-green-light { background: #f0fdf4; }
    .bg-red-light { background: #fef2f2; }
    .bg-indigo-light { background: #eef2ff; border: 1px dashed #6366f1; }

    /* Team Table Styles */
    .table-container { margin-top: 12px; }
    .table-title { font-size: 14.5px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
    .report-table { width: 100%; border-collapse: collapse; }
    .report-table th { font-size: 12.5px; font-weight: 700; color: #64748b; text-align: left; padding: 10px 14px; border-bottom: 2px solid #cbd5e1; }
    .report-table td { font-size: 13.5px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .report-table tbody tr:hover { background: #f8fafc; }

    .table-emp-name { font-weight: 700; color: #1e293b; }
    .dept-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e2e8f0; color: #475569; }
    
    .table-kpi-container { display: flex; align-items: center; gap: 8px; width: 120px; }
    .kpi-percent { font-size: 12.5px; font-weight: 700; color: #334155; width: 45px; }
    .table-kpi-bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .table-kpi-fill { height: 100%; border-radius: 3px; }
    
    .bg-green { background: #10b981; }
    .bg-yellow { background: #f59e0b; }
    .bg-red { background: #ef4444; }

    .badge-success { font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; }
    .badge-warning { font-size: 11px; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; }

    .rec-badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 700; }
    .rec-success { background: #dcfce7; color: #15803d; }
    .rec-info { background: #dbeafe; color: #1d4ed8; }
    .rec-warning { background: #fee2e2; color: #b91c1c; }

    .text-right { text-align: right !important; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 900px) {
      .main-layout { flex-direction: column; }
      .control-panel { width: 100%; }
      .financial-summary-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class SalaryComponent implements OnInit {
  loading = false;
  exporting = false;
  reviewMode: 'individual' | 'team' = 'individual';
  employees: any[] = [];
  selectedEmployeeId: number | null = null;
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  individualReview: any = null;
  teamReview: any = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.http.get<any[]>('http://localhost:8080/api/employees').subscribe({
      next: (data) => {
        this.employees = data.filter(e => e.role !== 'ADMIN');
        if (this.employees.length > 0) {
          this.selectedEmployeeId = this.employees[0].id;
        }
      },
      error: () => {
        this.snackBar.open('❌ Không thể tải danh sách nhân viên từ Backend.', 'Đóng', { duration: 3000 });
      }
    });
  }

  setReviewMode(mode: 'individual' | 'team') {
    this.reviewMode = mode;
    this.individualReview = null;
    this.teamReview = null;
  }

  onParamsChange() {
    this.individualReview = null;
    this.teamReview = null;
  }

  getReview() {
    this.loading = true;
    this.individualReview = null;
    this.teamReview = null;

    if (this.reviewMode === 'individual') {
      if (!this.selectedEmployeeId) {
        this.snackBar.open('⚠️ Vui lòng chọn nhân viên trước khi sinh đánh giá.', 'Đóng', { duration: 3000 });
        this.loading = false;
        return;
      }

      this.http.get<any>(`http://localhost:8080/api/ai/review/${this.selectedEmployeeId}`, {
        params: {
          month: this.selectedMonth.toString(),
          year: this.selectedYear.toString()
        }
      }).subscribe({
        next: (res) => {
          setTimeout(() => {
            this.individualReview = res;
            this.loading = false;
          }, 1200);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('❌ Lỗi kết nối máy chủ AI.', 'Đóng', { duration: 3000 });
        }
      });
    } else {
      // Team review
      this.http.get<any>('http://localhost:8080/api/ai/review-all', {
        params: {
          month: this.selectedMonth.toString(),
          year: this.selectedYear.toString()
        }
      }).subscribe({
        next: (res) => {
          setTimeout(() => {
            this.teamReview = res;
            this.loading = false;
          }, 1500);
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('❌ Lỗi kết nối máy chủ AI để phân tích nhóm.', 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  exportExcel() {
    this.exporting = true;
    this.snackBar.open('⏳ Đang tính toán và xuất báo cáo lương...', 'Đóng', { duration: 3000 });

    this.http.post(`http://localhost:8080/api/salaries/calculate-all?month=${this.selectedMonth}&year=${this.selectedYear}`, {}).subscribe({
      next: () => {
        this.exporting = false;
        window.location.href = `http://localhost:8080/api/salaries/export?month=${this.selectedMonth}&year=${this.selectedYear}`;
        this.snackBar.open('✔ Đã tải xuống file báo cáo lương.', 'Đóng', { duration: 3000 });
      },
      error: () => {
        this.exporting = false;
        this.snackBar.open('❌ Lỗi khi thực hiện tính toán báo cáo lương.', 'Đóng', { duration: 3000 });
      }
    });
  }

  fmt(val: number): string {
    if (val == null) return '0';
    return Math.round(val).toLocaleString('vi-VN');
  }
}
