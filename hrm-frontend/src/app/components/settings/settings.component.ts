import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

const API = 'http://localhost:8080/api';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  config: any = {};
  loading = false;
  saving = false;
  activeTab: 'time' | 'penalty' | 'bonus' | 'salary' | 'holiday' = 'time';
  showResetConfirm = false;

  holidays: any[] = [];
  newHoliday: any = {
    name: '',
    date: '',
    coefficient: 3.0,
    fullTimeBonus: 500000,
    managerBonus: 1000000,
    repeatYearly: false
  };
  editingHolidayId: number | null = null;
  editingHoliday: any = {};
  showDeleteConfirm = false;
  holidayToDelete: any = null;
  validationErrors: any = {};
  
  clearValidationErrors() {
    this.validationErrors = {};
  }

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.loading = true;
    this.http.get<any>(`${API}/salaries/config`).subscribe({
      next: (data) => {
        this.config = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('❌ Không thể tải cấu hình hệ thống', 'Đóng', { duration: 3000 });
      }
    });
  }

  saveConfig() {
    this.clearValidationErrors();
    let hasError = false;

    if (this.config.lateGraceMinutes === null || this.config.lateGraceMinutes === undefined || this.config.lateGraceMinutes < 0) {
      this.validationErrors.lateGraceMinutes = '⚠️ Thời gian không được âm!';
      hasError = true;
    }
    if (this.config.earlyGraceMinutes === null || this.config.earlyGraceMinutes === undefined || this.config.earlyGraceMinutes < 0) {
      this.validationErrors.earlyGraceMinutes = '⚠️ Thời gian không được âm!';
      hasError = true;
    }
    if (this.config.absentThresholdMinutes === null || this.config.absentThresholdMinutes === undefined || this.config.absentThresholdMinutes < 0) {
      this.validationErrors.absentThresholdMinutes = '⚠️ Ngưỡng không được âm!';
      hasError = true;
    }
    if (this.config.standardWorkingHours === null || this.config.standardWorkingHours === undefined || this.config.standardWorkingHours <= 0 || this.config.standardWorkingHours > 24) {
      this.validationErrors.standardWorkingHours = '⚠️ Số giờ công chuẩn phải từ 1 đến 24!';
      hasError = true;
    }

    if (hasError) {
      this.snackBar.open('⚠️ Có lỗi nhập liệu, vui lòng kiểm tra các ô màu đỏ!', 'Đóng', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.http.post<any>(`${API}/salaries/config`, this.config).subscribe({
      next: (saved) => {
        this.config = saved;
        this.saving = false;
        this.snackBar.open('✅ Đã lưu cấu hình hệ thống thành công!', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('❌ Lưu cấu hình thất bại', 'Đóng', { duration: 3000 });
      }
    });
  }

  resetToDefault() {
    this.showResetConfirm = true;
  }

  confirmReset() {
    this.showResetConfirm = false;
    const defaults = {
      lateGraceMinutes: 10,
      earlyGraceMinutes: 0,
      absentThresholdMinutes: 240,
      standardWorkingHours: 8.0,
      requiredPerfectDays: 26,
      perfectAttendanceBonus: 200000.0,
      bonusNoLate: 100000.0,
      latePenalty: 50000.0,
      missingCheckoutPenalty: 50000.0,
      absentPenalty: 100000.0,
      partTimeHourlyRate: 20000.0,
      fullTimeBaseSalary: 6000000.0,
      managerBaseSalary: 8000000.0,
      managerAllowance: 500000.0,
      otMultiplier: 1.5,
      revenuePoolRate: 1.0,
      fullTimeShareWeight: 1.0,
      managerShareWeight: 2.0
    };
    
    this.saving = true;
    this.http.post<any>(`${API}/salaries/config`, defaults).subscribe({
      next: (saved) => {
        this.config = saved;
        this.saving = false;
        this.snackBar.open('✅ Đã khôi phục tham số mặc định thành công!', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open('❌ Lỗi khi khôi phục tham số', 'Đóng', { duration: 3000 });
      }
    });
  }

  formatCurrency(value: number): string {
    if (value === null || value === undefined) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  loadHolidays() {
    this.loading = true;
    this.http.get<any[]>(`${API}/holidays`).subscribe({
      next: (data) => {
        this.holidays = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('❌ Không thể tải danh sách ngày lễ', 'Đóng', { duration: 3000 });
      }
    });
  }

  addHoliday() {
    this.clearValidationErrors();
    let hasError = false;

    if (!this.newHoliday.name || !this.newHoliday.name.trim()) {
      this.validationErrors.newHolidayName = '⚠️ Vui lòng nhập tên ngày lễ!';
      hasError = true;
    }
    if (!this.newHoliday.date) {
      this.validationErrors.newHolidayDate = '⚠️ Vui lòng chọn ngày dương lịch!';
      hasError = true;
    }
    if (this.newHoliday.coefficient === null || this.newHoliday.coefficient === undefined || this.newHoliday.coefficient <= 0) {
      this.validationErrors.newHolidayCoefficient = '⚠️ Hệ số phải lớn hơn 0!';
      hasError = true;
    }
    if (this.newHoliday.fullTimeBonus === null || this.newHoliday.fullTimeBonus === undefined || this.newHoliday.fullTimeBonus < 0) {
      this.validationErrors.newHolidayFullTimeBonus = '⚠️ Tiền thưởng không được âm!';
      hasError = true;
    }
    if (this.newHoliday.managerBonus === null || this.newHoliday.managerBonus === undefined || this.newHoliday.managerBonus < 0) {
      this.validationErrors.newHolidayManagerBonus = '⚠️ Tiền thưởng không được âm!';
      hasError = true;
    }

    if (hasError) return;

    this.saving = true;
    this.http.post<any>(`${API}/holidays`, this.newHoliday).subscribe({
      next: (saved) => {
        this.saving = false;
        this.snackBar.open('✅ Thêm ngày lễ thành công!', 'Đóng', { duration: 3000 });
        this.resetHolidayForm();
        this.loadHolidays();
      },
      error: (err) => {
        this.saving = false;
        const errMsg = err.error?.message || 'Thêm ngày lễ thất bại';
        this.snackBar.open(`❌ ${errMsg}`, 'Đóng', { duration: 4000 });
      }
    });
  }

  resetHolidayForm() {
    this.newHoliday = {
      name: '',
      date: '',
      coefficient: 3.0,
      fullTimeBonus: 500000,
      managerBonus: 1000000,
      repeatYearly: false
    };
    this.clearValidationErrors();
  }

  deleteHoliday(h: any) {
    this.holidayToDelete = h;
    this.showDeleteConfirm = true;
  }

  confirmDeleteHoliday() {
    if (!this.holidayToDelete) return;
    this.http.delete(`${API}/holidays/${this.holidayToDelete.id}`).subscribe({
      next: () => {
        this.snackBar.open('✅ Xóa ngày lễ thành công!', 'Đóng', { duration: 3000 });
        this.showDeleteConfirm = false;
        this.holidayToDelete = null;
        this.loadHolidays();
      },
      error: (err) => {
        this.snackBar.open('❌ Xóa ngày lễ thất bại', 'Đóng', { duration: 3000 });
        this.showDeleteConfirm = false;
        this.holidayToDelete = null;
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  startEdit(h: any) {
    this.editingHolidayId = h.id;
    this.editingHoliday = { ...h };
  }

  cancelInlineEdit() {
    this.editingHolidayId = null;
    this.editingHoliday = {};
  }

  saveInlineEdit() {
    this.clearValidationErrors();
    let hasError = false;

    if (!this.editingHoliday.name || !this.editingHoliday.name.trim()) {
      this.validationErrors.editHolidayName = '⚠️ Vui lòng nhập tên ngày lễ!';
      hasError = true;
    }
    if (!this.editingHoliday.date) {
      this.validationErrors.editHolidayDate = '⚠️ Vui lòng chọn ngày dương lịch!';
      hasError = true;
    }
    if (this.editingHoliday.coefficient === null || this.editingHoliday.coefficient === undefined || this.editingHoliday.coefficient <= 0) {
      this.validationErrors.editHolidayCoefficient = '⚠️ Hệ số phải lớn hơn 0!';
      hasError = true;
    }
    if (this.editingHoliday.fullTimeBonus === null || this.editingHoliday.fullTimeBonus === undefined || this.editingHoliday.fullTimeBonus < 0) {
      this.validationErrors.editHolidayFullTimeBonus = '⚠️ Tiền thưởng không được âm!';
      hasError = true;
    }
    if (this.editingHoliday.managerBonus === null || this.editingHoliday.managerBonus === undefined || this.editingHoliday.managerBonus < 0) {
      this.validationErrors.editHolidayManagerBonus = '⚠️ Tiền thưởng không được âm!';
      hasError = true;
    }

    if (hasError) return;

    this.saving = true;
    this.http.post<any>(`${API}/holidays`, this.editingHoliday).subscribe({
      next: (saved) => {
        this.saving = false;
        this.snackBar.open('✅ Cập nhật ngày lễ thành công!', 'Đóng', { duration: 3000 });
        this.editingHolidayId = null;
        this.editingHoliday = {};
        this.loadHolidays();
      },
      error: (err) => {
        this.saving = false;
        const errMsg = err.error?.message || 'Cập nhật ngày lễ thất bại';
        this.snackBar.open(`❌ ${errMsg}`, 'Đóng', { duration: 4000 });
      }
    });
  }
}
