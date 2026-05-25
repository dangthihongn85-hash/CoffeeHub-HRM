import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

const API = 'http://localhost:8080/api';

@Component({
  selector: 'app-salary-management',
  templateUrl: './salary-management.component.html',
  styleUrls: ['./salary-management.component.css']
})
export class SalaryManagementComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────────
  employees:  any[] = [];
  salaries:   any[] = [];
  editingEmpId: number | null = null;
  loading = false;
  loadingRevenue = false;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();
  months = [1,2,3,4,5,6,7,8,9,10,11,12];
  years  = [2024, 2025, 2026, 2027];

  filterType: string = 'ALL';
  filterDept: string = 'ALL';
  departments: string[] = [];

  // ── Doanh thu ─────────────────────────────────────────────────────────────
  monthlyRevenue = 0;
  bonusPool      = 0;
  bonusRate      = 1.0;
  revenueNotes   = '';
  revenueLoaded  = false;

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalPayroll       = 0;
  totalBonusRevenue  = 0;
  totalPenalty       = 0;

  // ── Detail panel ──────────────────────────────────────────────────────────
  selectedSalary: any = null;
  editingSalaryId: number | null = null;
  showEditModal = false;
  editSalaryModel: any = {};

  // ── Confirm Dialog ────────────────────────────────────────────────────────
  confirmDialogVisible = false;
  salaryToApprove: any = null;
  approveEvent: Event | null = null;

  // ── Tab ───────────────────────────────────────────────────────────────────
  activeTab: 'payroll' | 'revenue' | 'employees' = 'payroll';

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadEmployees();
    this.loadRevenue();
    this.loadSalaries();
  }

  // ── Data loaders ──────────────────────────────────────────────────────────

  loadEmployees() {
    this.http.get<any[]>(`${API}/employees`).subscribe({
      next: d => {
        this.employees = d;
        this.departments = [...new Set(d.map(e => e.department).filter(Boolean))];
      }
    });
  }

  loadRevenue() {
    this.http.get<any>(`${API}/salaries/revenue?month=${this.selectedMonth}&year=${this.selectedYear}`).subscribe({
      next: d => {
        this.monthlyRevenue = d.monthlyRevenue || 0;
        this.bonusPool      = d.bonusPool      || 0;
        this.bonusRate      = d.bonusRate      || 1.0;
        this.revenueNotes   = d.notes          || '';
        this.revenueLoaded  = true;
      },
      error: () => { this.revenueLoaded = true; }
    });
  }

  loadSalaries() {
    this.http.get<any[]>(`${API}/salaries?month=${this.selectedMonth}&year=${this.selectedYear}`).subscribe({
      next: d => {
        this.salaries = d.map(s => {
          s.regularHours = s.regularHours != null ? Math.round(s.regularHours * 10) / 10 : 0;
          s.otHours = s.otHours != null ? Math.round(s.otHours * 10) / 10 : 0;
          s.baseSalary = s.baseSalary != null ? Math.round(s.baseSalary) : 0;
          s.otSalary = s.otSalary != null ? Math.round(s.otSalary) : 0;
          s.bonusAttendance = s.bonusAttendance != null ? Math.round(s.bonusAttendance) : 0;
          s.bonusRevenue = s.bonusRevenue != null ? Math.round(s.bonusRevenue) : 0;
          s.totalBonus = s.totalBonus != null ? Math.round(s.totalBonus) : 0;
          s.totalPenalty = s.totalPenalty != null ? Math.round(s.totalPenalty) : 0;
          s.totalSalary = s.totalSalary != null ? Math.round(s.totalSalary) : 0;
          return s;
        });
        this.recalcStats();
      }
    });
  }

  onPeriodChange() {
    this.salaries  = [];
    this.selectedSalary = null;
    this.loadRevenue();
    this.loadSalaries();
  }

  // ── Luồng 0: Nhập doanh thu ───────────────────────────────────────────────

  saveRevenue() {
    if (!this.monthlyRevenue || this.monthlyRevenue <= 0) {
      this.snackBar.open('⚠️ Vui lòng nhập doanh thu > 0', 'Đóng', { duration: 3000 });
      return;
    }
    this.loadingRevenue = true;
    this.http.post<any>(`${API}/salaries/revenue`, {
      month: this.selectedMonth,
      year:  this.selectedYear,
      monthlyRevenue: this.monthlyRevenue,
      bonusRate: this.bonusRate,
      notes: this.revenueNotes
    }).subscribe({
      next: d => {
        this.bonusPool = d.bonusPool;
        this.bonusRate = d.bonusRate;
        this.loadingRevenue = false;
        this.snackBar.open(`✅ Đã lưu doanh thu — Quỹ thưởng: ${this.fmt(d.bonusPool)}`, 'Đóng', { duration: 4000 });
      },
      error: () => {
        this.loadingRevenue = false;
        this.snackBar.open('❌ Lưu doanh thu thất bại', 'Đóng', { duration: 3000 });
      }
    });
  }

  // ── Tính lương toàn bộ ────────────────────────────────────────────────────

  calculateAll() {
    if (this.monthlyRevenue <= 0) {
      this.snackBar.open('⚠️ Hãy nhập doanh thu tháng trước khi tính lương!', 'Đóng', { duration: 4000 });
      this.activeTab = 'revenue';
      return;
    }
    this.loading = true;
    this.salaries = [];
    this.selectedSalary = null;
    this.http.post<any[]>(`${API}/salaries/calculate-all?month=${this.selectedMonth}&year=${this.selectedYear}`, {}).subscribe({
      next: d => {
        this.salaries = d.map(s => {
          s.regularHours = s.regularHours != null ? Math.round(s.regularHours * 10) / 10 : 0;
          s.otHours = s.otHours != null ? Math.round(s.otHours * 10) / 10 : 0;
          s.baseSalary = s.baseSalary != null ? Math.round(s.baseSalary) : 0;
          s.otSalary = s.otSalary != null ? Math.round(s.otSalary) : 0;
          s.bonusAttendance = s.bonusAttendance != null ? Math.round(s.bonusAttendance) : 0;
          s.bonusRevenue = s.bonusRevenue != null ? Math.round(s.bonusRevenue) : 0;
          s.totalBonus = s.totalBonus != null ? Math.round(s.totalBonus) : 0;
          s.totalPenalty = s.totalPenalty != null ? Math.round(s.totalPenalty) : 0;
          s.totalSalary = s.totalSalary != null ? Math.round(s.totalSalary) : 0;
          return s;
        });
        this.recalcStats();
        this.loading = false;
        this.snackBar.open(`✅ Đã tính lương ${d.length} nhân viên`, 'Đóng', { duration: 3000 });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('❌ Tính lương thất bại', 'Đóng', { duration: 3000 });
      }
    });
  }

  recalcStats() {
    this.totalPayroll      = this.salaries.reduce((s, r) => s + (r.totalSalary      || 0), 0);
    this.totalBonusRevenue = this.salaries.reduce((s, r) => s + (r.bonusRevenue     || 0), 0);
    this.totalPenalty      = this.salaries.reduce((s, r) => s + (r.totalPenalty     || 0), 0);
  }

  get filteredSalaries() {
    return this.salaries.filter(s => {
      const matchType = this.filterType === 'ALL' || s.employeeType === this.filterType;
      const matchDept = this.filterDept === 'ALL' || s.department === this.filterDept;
      return matchType && matchDept;
    });
  }

  // ── Sửa lương trong bảng ──────────────────────────────────────────────────

  editSalary(sal: any, event: Event) {
    event.stopPropagation();
    this.editSalaryModel = JSON.parse(JSON.stringify(sal));
    this.editSalaryModel.baseSalaryStr = this.formatCurrencyInput(this.editSalaryModel.baseSalary);
    this.editSalaryModel.bonusAttendanceStr = this.formatCurrencyInput(this.editSalaryModel.bonusAttendance);
    this.editSalaryModel.bonusRevenueStr = this.formatCurrencyInput(this.editSalaryModel.bonusRevenue);
    this.editSalaryModel.totalPenaltyStr = this.formatCurrencyInput(this.editSalaryModel.totalPenalty);
    this.showEditModal = true;
  }

  cancelEditSalary(event: Event) {
    event.stopPropagation();
    this.showEditModal = false;
    this.editSalaryModel = {};
    this.loadSalaries();
  }

  onSalaryFieldChange(sal: any) {
    const HOURLY_RATE_FT = 25000;
    const HOURLY_RATE_PT = 20000;
    const OT_MULTIPLIER = 1.5;

    // Round input hours first to exactly 1 decimal place (e.g. 5.8333333333 = 5.8, 5.877778 = 5.9)
    sal.regularHours = sal.regularHours != null ? Math.round(sal.regularHours * 10) / 10 : 0;
    sal.otHours = sal.otHours != null ? Math.round(sal.otHours * 10) / 10 : 0;

    // IF Part-time: Lương CB = giờ làm * hourly_rate
    if (sal.employeeType === 'PART_TIME') {
      sal.baseSalary = Math.round((sal.regularHours || 0) * HOURLY_RATE_PT);
    } else if (sal.employeeType === 'FULL_TIME') {
      const emp = this.employees.find(e => e.id === sal.employeeId);
      const originalBase = emp ? emp.salaryBase : 0;
      if (originalBase > 0) {
        // Giữ nguyên lương cơ bản gốc
        sal.baseSalary = Math.round(originalBase);

        // Tính phạt đi làm thiếu giờ chuẩn (208h, hụt quá 4h mới phạt)
        let underTimePenalty = 0;
        if ((sal.regularHours || 0) < 208.0) {
          const deficit = 208.0 - sal.regularHours;
          if (deficit > 4.0) {
            underTimePenalty = Math.round(deficit * (originalBase / 208.0));
          }
        }

        // Cập nhật lại các khoản phạt cụ thể
        const penaltyLate = (sal.lateDays || 0) * 20000;
        const penaltyNoCheckout = (sal.noCheckoutDays || 0) * 50000;
        const penaltyAbsentNoPerm = (sal.absentNoPerm || 0) * 100000;

        sal.penaltyLate = penaltyLate;
        sal.penaltyNoCheckout = penaltyNoCheckout;
        sal.penaltyAbsent = Math.round(penaltyAbsentNoPerm + underTimePenalty);

        // Tổng phạt = các phạt vi phạm + phạt thiếu giờ
        sal.totalPenalty = Math.round(penaltyLate + penaltyNoCheckout + sal.penaltyAbsent);
      }
    }

    // Tính OT Salary (VNĐ)
    const rate = sal.employeeType === 'PART_TIME' ? HOURLY_RATE_PT : HOURLY_RATE_FT;
    sal.otSalary = Math.round((sal.otHours || 0) * rate * OT_MULTIPLIER);

    // Gross = base + OT + Thưởng (VNĐ)
    const totalBonus = Math.round((sal.bonusAttendance || 0) + (sal.bonusRevenue || 0));
    const gross = Math.round((sal.baseSalary || 0) + (sal.otSalary || 0) + totalBonus);

    // Net = Gross - Phạt (VNĐ)
    sal.totalSalary = Math.round(gross - (sal.totalPenalty || 0));
    if (sal.totalSalary < 0) sal.totalSalary = 0;

    // Sync totalBonus field (if exists in DTO for display)
    sal.totalBonus = totalBonus;

    // Sync the string properties for UI inputs
    sal.baseSalaryStr = this.formatCurrencyInput(sal.baseSalary);
    sal.bonusAttendanceStr = this.formatCurrencyInput(sal.bonusAttendance);
    sal.bonusRevenueStr = this.formatCurrencyInput(sal.bonusRevenue);
    sal.totalPenaltyStr = this.formatCurrencyInput(sal.totalPenalty);
  }

  saveSalary(event: Event) {
    event.stopPropagation();
    this.http.put<any>(`${API}/salaries/${this.editSalaryModel.salaryId}`, this.editSalaryModel).subscribe({
      next: (updated) => {
        const idx = this.salaries.findIndex(s => s.salaryId === this.editSalaryModel.salaryId);
        if (idx !== -1) this.salaries[idx] = updated;
        this.showEditModal = false;
        this.editSalaryModel = {};
        this.recalcStats();
        this.loadSalaries();
        this.snackBar.open('✅ Đã cập nhật bảng lương thành công!', 'Đóng', { duration: 2000 });
      },
      error: () => this.snackBar.open('❌ Lỗi khi lưu bảng lương!', 'Đóng', { duration: 3000 })
    });
  }

  approveSalary(sal: any, event: Event) {
    event.stopPropagation();
    this.salaryToApprove = sal;
    this.approveEvent = event;
    this.confirmDialogVisible = true;
  }

  confirmApprove() {
    if (!this.salaryToApprove) return;
    const sal = this.salaryToApprove;
    this.confirmDialogVisible = false;
    this.salaryToApprove = null;
    this.approveEvent = null;
    
    this.http.put<any>(`${API}/salaries/${sal.salaryId}/approve`, {}).subscribe({
      next: (updated) => {
        const idx = this.salaries.findIndex(s => s.salaryId === sal.salaryId);
        if (idx !== -1) this.salaries[idx] = updated;
        this.recalcStats();
        if (this.selectedSalary && this.selectedSalary.salaryId === sal.salaryId) {
          this.selectedSalary = updated;
        }
        this.snackBar.open(`✅ Đã duyệt lương: ${sal.employeeName}`, 'Đóng', { duration: 3000 });
      },
      error: () => this.snackBar.open('❌ Lỗi khi duyệt lương', 'Đóng', { duration: 3000 })
    });
  }

  cancelApprove() {
    this.confirmDialogVisible = false;
    this.salaryToApprove = null;
    this.approveEvent = null;
  }

  // ── Employee type ─────────────────────────────────────────────────────────

  editEmployeeType(emp: any) {
    this.editingEmpId = emp.id;
  }

  cancelEditType() {
    this.editingEmpId = null;
    this.loadEmployees(); // Reload to reset any unsaved changes
  }

  saveEmployeeType(emp: any) {
    this.http.put<any>(`${API}/employees/${emp.id}`, emp).subscribe({
      next: () => {
        this.editingEmpId = null;
        this.snackBar.open(`✅ Đã cập nhật loại NV: ${emp.name}`, 'Đóng', { duration: 3000 });
      },
      error: () => this.snackBar.open('❌ Cập nhật thất bại', 'Đóng', { duration: 3000 })
    });
  }

  // ── Detail panel ──────────────────────────────────────────────────────────

  openDetail(sal: any) {
    this.selectedSalary = sal;
  }

  closeDetail() {
    this.selectedSalary = null;
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportExcel() {
    window.location.href = `${API}/salaries/export?month=${this.selectedMonth}&year=${this.selectedYear}`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  fmt(val: number | null | undefined): string {
    if (!val || val === 0) return '0 ₫';
    const rounded = Math.round(val / 1000) * 1000;
    return rounded.toLocaleString('vi-VN') + ' ₫';
  }

  typeBadge(type: string): string {
    switch (type) {
      case 'MANAGER':   return 'badge-manager';
      case 'PART_TIME': return 'badge-parttime';
      default:          return 'badge-fulltime';
    }
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'MANAGER':   return 'Manager';
      case 'PART_TIME': return 'Part-time';
      default:          return 'Full-time';
    }
  }

  get poolBreakdown() {
    if (!this.bonusPool || this.bonusPool <= 0) return null;
    const ft = this.employees.filter(e => e.employeeType === 'FULL_TIME').length;
    const mg = this.employees.filter(e => e.employeeType === 'MANAGER').length;
    const totalWeight = ft * 1 + mg * 2;
    if (totalWeight === 0) return null;
    const pointValue = this.bonusPool / totalWeight;
    return {
      ft, mg, totalWeight,
      pointValue,
      ftBonus: pointValue,
      mgBonus: pointValue * 2
    };
  }

  formatCurrencyInput(val: any): string {
    if (val === null || val === undefined || isNaN(val)) return '';
    return Math.round(Number(val)).toLocaleString('vi-VN') + ' ₫';
  }

  onCurrencyInput(field: string, event: any) {
    const inputElement = event.target;
    let originalValue = inputElement.value;
    
    // Get cursor position before formatting
    let selectionStart = inputElement.selectionStart;
    
    // Strip non-digits
    const cleanVal = originalValue.replace(/\D/g, '');
    
    if (!cleanVal) {
      this.editSalaryModel[field] = 0;
      this.editSalaryModel[field + 'Str'] = '0 ₫';
      inputElement.value = '0 ₫';
      setTimeout(() => {
        inputElement.setSelectionRange(0, 0);
      }, 0);
      this.onSalaryFieldChange(this.editSalaryModel);
      return;
    }
    
    const num = parseInt(cleanVal, 10);
    this.editSalaryModel[field] = num;
    const formatted = num.toLocaleString('vi-VN') + ' ₫';
    
    this.editSalaryModel[field + 'Str'] = formatted;
    inputElement.value = formatted;
    
    // Adjust cursor position to handle added/removed dots and suffix
    const origDigitsBeforeCursor = originalValue.substring(0, selectionStart).replace(/\D/g, '').length;
    
    let newCursorPos = 0;
    let digitsFound = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitsFound++;
      }
      newCursorPos = i + 1;
      if (digitsFound === origDigitsBeforeCursor) {
        break;
      }
    }
    
    // Prevent cursor from going past the digits into the " ₫" suffix
    const digitsOnlyLength = formatted.length - 2; // Subtract " ₫"
    if (newCursorPos > digitsOnlyLength) {
      newCursorPos = digitsOnlyLength;
    }
    
    setTimeout(() => {
      inputElement.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    this.onSalaryFieldChange(this.editSalaryModel);
  }
}
