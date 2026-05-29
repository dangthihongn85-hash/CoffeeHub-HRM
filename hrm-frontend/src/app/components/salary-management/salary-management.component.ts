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
  searchName: string = '';
  departments: string[] = [];

  // Pagination Configuration
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

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
  confirmBulkDialogVisible = false;
  selectedSalaryIds = new Set<number>();
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
    this.selectedSalaryIds.clear();
    this.http.get<any[]>(`${API}/salaries?month=${this.selectedMonth}&year=${this.selectedYear}`).subscribe({
      next: d => {
        this.salaries = d.map(s => {
          s.regularHours = s.regularHours != null ? Math.round(s.regularHours * 10) / 10 : 0;
          s.otHours = s.otHours != null ? Math.round(s.otHours * 10) / 10 : 0;
          s.baseSalary = s.baseSalary != null ? Math.round(s.baseSalary) : 0;
          s.actualBaseSalary = s.actualBaseSalary != null ? Math.round(s.actualBaseSalary) : s.baseSalary;
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
    this.selectedSalaryIds.clear();
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
          s.actualBaseSalary = s.actualBaseSalary != null ? Math.round(s.actualBaseSalary) : s.baseSalary;
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

  get hasPendingSalaries(): boolean {
    return this.salaries.some(s => s.status !== 'APPROVED');
  }

  get hasPendingSelected(): boolean {
    return this.salaries.some(s => s.status !== 'APPROVED' && this.selectedSalaryIds.has(s.salaryId));
  }

  toggleSelectSalary(salId: number, event: any) {
    event.stopPropagation();
    if (this.selectedSalaryIds.has(salId)) {
      this.selectedSalaryIds.delete(salId);
    } else {
      this.selectedSalaryIds.add(salId);
    }
  }

  isSalarySelected(salId: number): boolean {
    return this.selectedSalaryIds.has(salId);
  }

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    if (checked) {
      this.pagedSalaries.forEach(s => {
        this.selectedSalaryIds.add(s.salaryId);
      });
    } else {
      this.pagedSalaries.forEach(s => {
        this.selectedSalaryIds.delete(s.salaryId);
      });
    }
  }

  isAllSelected(): boolean {
    if (this.pagedSalaries.length === 0) return false;
    return this.pagedSalaries.every(s => this.selectedSalaryIds.has(s.salaryId));
  }

  get hasApprovedSelected(): boolean {
    return this.salaries.some(s => s.status === 'APPROVED' && this.selectedSalaryIds.has(s.salaryId));
  }

  get hasRevertableSelected(): boolean {
    return this.salaries.some(s => s.status !== 'REJECTED' && this.selectedSalaryIds.has(s.salaryId));
  }

  get filteredSalaries() {
    return this.salaries.filter(s => {
      const matchType = this.filterType === 'ALL' || s.employeeType === this.filterType;
      const matchDept = this.filterDept === 'ALL' || s.department === this.filterDept;
      
      const nameRaw = s.employeeName || s.employee?.name || '';
      const nameLower = this.removeAccents(nameRaw.toLowerCase());
      const searchLower = this.removeAccents(this.searchName.trim().toLowerCase());
      const matchName = !searchLower || nameLower.includes(searchLower);
      
      return matchType && matchDept && matchName;
    });
  }

  get pagedSalaries(): any[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredSalaries.slice(start, end);
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  // ── Sửa lương trong bảng ──────────────────────────────────────────────────

  editSalary(sal: any, event: Event) {
    event.stopPropagation();
    this.editSalaryModel = JSON.parse(JSON.stringify(sal));
    this.editSalaryModel.baseSalaryStr = this.formatCurrencyInput(this.editSalaryModel.baseSalary);
    this.editSalaryModel.actualBaseSalaryStr = this.formatCurrencyInput(this.editSalaryModel.actualBaseSalary != null ? this.editSalaryModel.actualBaseSalary : this.editSalaryModel.baseSalary);
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
    const emp = this.employees.find(e => e.id === sal.employeeId);
    const HOURLY_RATE_FT = 25000;
    const HOURLY_RATE_PT = (emp && emp.salaryBase > 0) ? emp.salaryBase : 20000;
    const OT_MULTIPLIER = 1.5;

    // Round input hours first to exactly 1 decimal place (e.g. 5.8333333333 = 5.8, 5.877778 = 5.9)
    sal.regularHours = sal.regularHours != null ? Math.round(sal.regularHours * 10) / 10 : 0;
    sal.otHours = sal.otHours != null ? Math.round(sal.otHours * 10) / 10 : 0;

    // IF Part-time: Lương CB = giờ làm * hourly_rate, không có OT, không có Thưởng
    if (sal.employeeType === 'PART_TIME') {
      // Gộp toàn bộ giờ OT (nếu lỡ nhập) thành giờ thường và set otHours = 0
      sal.regularHours = Math.round(((sal.regularHours || 0) + (sal.otHours || 0)) * 10) / 10;
      sal.otHours = 0;
      sal.baseSalary = HOURLY_RATE_PT; // Lưu trữ mức lương theo giờ
      sal.actualBaseSalary = Math.round((sal.regularHours || 0) * HOURLY_RATE_PT);
      sal.bonusAttendance = 0;
      sal.bonusRevenue = 0;
      sal.totalBonus = 0;
    } else {
      const originalBase = emp ? emp.salaryBase : 0;
      if (originalBase > 0) {
        // Giữ nguyên lương cơ bản gốc
        sal.baseSalary = Math.round(originalBase);

        // Tính tỷ lệ lương thực tế theo số ngày làm việc thực tế
        const totalEffectiveDays = (sal.workDays || 0) + (sal.specialLeaveDays || 0);
        const paidDays = Math.min(26.0, totalEffectiveDays);
        sal.actualBaseSalary = Math.round((originalBase * paidDays) / 26.0);

        // Cập nhật lại các khoản phạt cụ thể (chỉ phạt đi muộn, thiếu check-out, nghỉ không phép)
        const penaltyLate = (sal.lateDays || 0) * 50000;
        const penaltyNoCheckout = (sal.noCheckoutDays || 0) * 50000;
        const penaltyAbsentNoPerm = (sal.absentNoPerm || 0) * 100000;

        sal.penaltyLate = penaltyLate;
        sal.penaltyNoCheckout = penaltyNoCheckout;
        sal.penaltyAbsent = Math.round(penaltyAbsentNoPerm);

        // Tổng phạt = các phạt vi phạm
        sal.totalPenalty = Math.round(penaltyLate + penaltyNoCheckout + sal.penaltyAbsent);
      } else {
        sal.baseSalary = sal.employeeType === 'MANAGER' ? 8500000 : Math.round((sal.regularHours || 0) * HOURLY_RATE_FT);
        sal.actualBaseSalary = sal.baseSalary;
      }
    }

    // Tính OT Salary (VNĐ)
    let rate;
    if (sal.employeeType === 'PART_TIME') {
      rate = HOURLY_RATE_PT;
      sal.otSalary = 0; // Part-time không có OT
    } else {
      rate = (emp && emp.salaryBase > 0) ? (emp.salaryBase / 208.0) : HOURLY_RATE_FT;
      sal.otSalary = Math.round((sal.otHours || 0) * rate * OT_MULTIPLIER);
    }

    // Gross = actualBaseSalary + OT + Thưởng (VNĐ)
    const totalBonus = Math.round((sal.bonusAttendance || 0) + (sal.bonusRevenue || 0));
    const gross = Math.round((sal.actualBaseSalary || 0) + (sal.otSalary || 0) + totalBonus);

    // Net = Gross - Phạt (VNĐ)
    sal.totalSalary = Math.round(gross - (sal.totalPenalty || 0));
    if (sal.totalSalary < 0) sal.totalSalary = 0;

    // Sync totalBonus field (if exists in DTO for display)
    sal.totalBonus = totalBonus;

    // Sync the string properties for UI inputs
    sal.baseSalaryStr = this.formatCurrencyInput(sal.baseSalary);
    sal.actualBaseSalaryStr = this.formatCurrencyInput(sal.actualBaseSalary);
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

  revertSalary(sal: any, event: Event) {
    event.stopPropagation();
    
    this.http.put<any>(`${API}/salaries/${sal.salaryId}/revert`, {}).subscribe({
      next: (updated) => {
        const idx = this.salaries.findIndex(s => s.salaryId === sal.salaryId);
        if (idx !== -1) this.salaries[idx] = updated;
        this.recalcStats();
        if (this.selectedSalary && this.selectedSalary.salaryId === sal.salaryId) {
          this.selectedSalary = updated;
        }
        this.snackBar.open(`↩️ Đã khôi phục trạng thái chờ duyệt: ${sal.employeeName}`, 'Đóng', { duration: 3000 });
      },
      error: () => this.snackBar.open('❌ Lỗi khi khôi phục bảng lương', 'Đóng', { duration: 3000 })
    });
  }

  rejectSalary(sal: any, event: Event) {
    event.stopPropagation();
    
    this.http.put<any>(`${API}/salaries/${sal.salaryId}/reject`, {}).subscribe({
      next: (updated) => {
        const idx = this.salaries.findIndex(s => s.salaryId === sal.salaryId);
        if (idx !== -1) this.salaries[idx] = updated;
        this.recalcStats();
        if (this.selectedSalary && this.selectedSalary.salaryId === sal.salaryId) {
          this.selectedSalary = updated;
        }
        this.snackBar.open(`❌ Đã hủy duyệt (Từ chối): ${sal.employeeName}`, 'Đóng', { duration: 3000 });
      },
      error: () => this.snackBar.open('❌ Lỗi khi hủy duyệt bảng lương', 'Đóng', { duration: 3000 })
    });
  }

  approveAll() {
    if (this.selectedSalaryIds.size === 0) {
      this.snackBar.open('⚠️ Hãy chọn ít nhất một nhân viên để duyệt lương!', 'Đóng', { duration: 3000 });
      return;
    }
    this.confirmBulkDialogVisible = true;
  }

  confirmBulkApprove() {
    this.confirmBulkDialogVisible = false;
    this.loading = true;
    
    const selectedIds = Array.from(this.selectedSalaryIds);
    this.http.put<any[]>(`${API}/salaries/approve-multiple?month=${this.selectedMonth}&year=${this.selectedYear}`, selectedIds).subscribe({
      next: (updatedList) => {
        this.salaries = updatedList.map(s => {
          s.regularHours = s.regularHours != null ? Math.round(s.regularHours * 10) / 10 : 0;
          s.otHours = s.otHours != null ? Math.round(s.otHours * 10) / 10 : 0;
          s.baseSalary = s.baseSalary != null ? Math.round(s.baseSalary) : 0;
          s.actualBaseSalary = s.actualBaseSalary != null ? Math.round(s.actualBaseSalary) : s.baseSalary;
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
        
        const countApproved = this.selectedSalaryIds.size;
        this.selectedSalaryIds.clear();

        if (this.selectedSalary) {
          const matched = this.salaries.find(s => s.salaryId === this.selectedSalary.salaryId);
          if (matched) this.selectedSalary = matched;
        }
        this.snackBar.open(`✅ Đã duyệt lương thành công cho ${countApproved} nhân viên được chọn!`, 'Đóng', { duration: 4000 });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('❌ Lỗi khi duyệt lương các nhân viên đã chọn', 'Đóng', { duration: 3000 });
      }
    });
  }

  confirmBulkRevertDialogVisible = false;

  revertSelected() {
    if (this.selectedSalaryIds.size === 0) {
      this.snackBar.open('⚠️ Hãy chọn ít nhất một nhân viên để khôi phục chờ duyệt!', 'Đóng', { duration: 3000 });
      return;
    }
    this.confirmBulkRevertDialogVisible = true;
  }

  confirmBulkRevert() {
    this.confirmBulkRevertDialogVisible = false;
    this.loading = true;
    
    const selectedIds = Array.from(this.selectedSalaryIds);
    this.http.put<any[]>(`${API}/salaries/revert-multiple?month=${this.selectedMonth}&year=${this.selectedYear}`, selectedIds).subscribe({
      next: (updatedList) => {
        this.salaries = updatedList.map(s => {
          s.regularHours = s.regularHours != null ? Math.round(s.regularHours * 10) / 10 : 0;
          s.otHours = s.otHours != null ? Math.round(s.otHours * 10) / 10 : 0;
          s.baseSalary = s.baseSalary != null ? Math.round(s.baseSalary) : 0;
          s.actualBaseSalary = s.actualBaseSalary != null ? Math.round(s.actualBaseSalary) : s.baseSalary;
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
        
        const countReverted = this.selectedSalaryIds.size;
        this.selectedSalaryIds.clear();

        if (this.selectedSalary) {
          const matched = this.salaries.find(s => s.salaryId === this.selectedSalary.salaryId);
          if (matched) this.selectedSalary = matched;
        }
        this.snackBar.open(`↩️ Đã khôi phục chờ duyệt thành công cho ${countReverted} nhân viên được chọn!`, 'Đóng', { duration: 4000 });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('❌ Lỗi khi khôi phục chờ duyệt các nhân viên đã chọn', 'Đóng', { duration: 3000 });
      }
    });
  }

  confirmBulkRejectDialogVisible = false;

  rejectSelected() {
    if (this.selectedSalaryIds.size === 0) {
      this.snackBar.open('⚠️ Hãy chọn ít nhất một nhân viên để hủy duyệt!', 'Đóng', { duration: 3000 });
      return;
    }
    this.confirmBulkRejectDialogVisible = true;
  }

  confirmBulkReject() {
    this.confirmBulkRejectDialogVisible = false;
    this.loading = true;
    
    const selectedIds = Array.from(this.selectedSalaryIds);
    this.http.put<any[]>(`${API}/salaries/reject-multiple?month=${this.selectedMonth}&year=${this.selectedYear}`, selectedIds).subscribe({
      next: (updatedList) => {
        this.salaries = updatedList.map(s => {
          s.regularHours = s.regularHours != null ? Math.round(s.regularHours * 10) / 10 : 0;
          s.otHours = s.otHours != null ? Math.round(s.otHours * 10) / 10 : 0;
          s.baseSalary = s.baseSalary != null ? Math.round(s.baseSalary) : 0;
          s.actualBaseSalary = s.actualBaseSalary != null ? Math.round(s.actualBaseSalary) : s.baseSalary;
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
        
        const countRejected = this.selectedSalaryIds.size;
        this.selectedSalaryIds.clear();

        if (this.selectedSalary) {
          const matched = this.salaries.find(s => s.salaryId === this.selectedSalary.salaryId);
          if (matched) this.selectedSalary = matched;
        }
        this.snackBar.open(`❌ Đã hủy duyệt thành công cho ${countRejected} nhân viên được chọn!`, 'Đóng', { duration: 4000 });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('❌ Lỗi khi hủy duyệt các nhân viên đã chọn', 'Đóng', { duration: 3000 });
      }
    });
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

  exportPayslipPDF(sal: any) {
    if (!sal) {
      this.snackBar.open('⚠️ Không tìm thấy thông tin bảng lương!', 'Đóng', { duration: 3000 });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) {
      this.snackBar.open('⚠️ Trình duyệt đã chặn cửa sổ popup. Vui lòng cấp quyền mở popup để xuất phiếu lương!', 'Đóng', { duration: 5000 });
      return;
    }

    const title = `PhieuLuong_${sal.employeeName.replace(/\s+/g, '_')}_T${sal.month}_${sal.year}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 40px;
            font-size: 14px;
            line-height: 1.5;
          }
          .payslip-container {
            max-width: 700px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 30px;
          }
          .logo-area h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
          }
          .logo-area p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
          }
          .title-area {
            text-align: right;
          }
          .title-area h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }
          .title-area p {
            margin: 6px 0 0 0;
            font-size: 13px;
            color: #4f46e5;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 30px;
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #f1f5f9;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
          }
          .info-label {
            color: #64748b;
            font-weight: 500;
          }
          .info-val {
            font-weight: 700;
            color: #0f172a;
          }
          .section-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin: 24px 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .slip-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          .slip-table th, .slip-table td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #f1f5f9;
          }
          .slip-table th {
            color: #64748b;
            font-weight: 600;
            font-size: 13px;
            background-color: #f8fafc;
          }
          .slip-table td.amount {
            text-align: right;
            font-weight: 700;
          }
          .slip-table td.amount.green {
            color: #16a34a;
          }
          .slip-table td.amount.red {
            color: #dc2626;
          }
          .net-salary-card {
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: white;
            border-radius: 12px;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.25);
          }
          .net-title {
            font-size: 15px;
            font-weight: 700;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .net-amount {
            font-size: 28px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 50px;
            text-align: center;
          }
          .sig-box {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .sig-title {
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 80px;
          }
          .sig-name {
            font-weight: 600;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            width: 180px;
          }
          @media print {
            body {
              padding: 0;
              background-color: transparent;
            }
            .payslip-container {
              border: none;
              box-shadow: none;
              padding: 0;
              max-width: 100%;
            }
            .net-salary-card {
              box-shadow: none;
              background: linear-gradient(135deg, #4f46e5, #6366f1) !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <div class="header">
            <div class="logo-area">
              <h1>☕ CoffeeHub HRM</h1>
              <p>Hệ thống Quản lý Nhân sự & Tiền lương</p>
            </div>
            <div class="title-area">
              <h2>PHIẾU LƯƠNG CHI TIẾT</h2>
              <p>Tháng ${sal.month} / ${sal.year}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Mã Nhân Viên:</span>
              <span class="info-val">#${sal.employeeId || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Họ và Tên:</span>
              <span class="info-val">${sal.employeeName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Phòng Ban:</span>
              <span class="info-val">${sal.department || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Chức Vụ:</span>
              <span class="info-val">${sal.position || 'Nhân viên'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Loại Nhân Viên:</span>
              <span class="info-val">${this.typeLabel(sal.employeeType)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Ngày / Giờ Công:</span>
              <span class="info-val">
                ${sal.workDays || 0} ngày (${(sal.regularHours || 0).toFixed(1)}h)
              </span>
            </div>
          </div>

          <div class="section-title">Chi Tiết Thu Nhập (Earnings)</div>
          <table class="slip-table">
            <thead>
              <tr>
                <th>Khoản thu nhập</th>
                <th style="text-align: right;">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${sal.employeeType === 'PART_TIME' ? 'Lương theo giờ (' + sal.regularHours + 'h × ' + this.fmt(sal.baseSalary, true) + ')' : 'Lương cơ bản (Theo công chuẩn)'}</td>
                <td class="amount">${this.fmt(sal.actualBaseSalary != null ? sal.actualBaseSalary : sal.baseSalary)}</td>
              </tr>
              ${(sal.otHours || 0) > 0 ? `
              <tr>
                <td>Lương tăng ca (OT ${(sal.otHours || 0).toFixed(1)}h × 1.5)</td>
                <td class="amount">${this.fmt(sal.otSalary)}</td>
              </tr>
              ` : ''}
              ${(sal.bonusAttendance || 0) > 0 ? `
              <tr>
                <td>Thưởng chuyên cần (Đủ ngày công / Không đi trễ)</td>
                <td class="amount green">+${this.fmt(sal.bonusAttendance)}</td>
              </tr>
              ` : ''}
              ${(sal.bonusRevenue || 0) > 0 ? `
              <tr>
                <td>Thưởng hiệu suất doanh thu (Quỹ thưởng POOL)</td>
                <td class="amount green">+${this.fmt(sal.bonusRevenue)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          ${(sal.totalPenalty || 0) > 0 ? `
          <div class="section-title">Chi Tiết Khấu Trừ (Deductions)</div>
          <table class="slip-table">
            <thead>
              <tr>
                <th>Khoản khấu trừ</th>
                <th style="text-align: right;">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              ${(sal.penaltyLate || 0) > 0 ? `
              <tr>
                <td>Phạt đi trễ quá giờ quy định</td>
                <td class="amount red">-${this.fmt(sal.penaltyLate)}</td>
              </tr>
              ` : ''}
              ${(sal.penaltyNoCheckout || 0) > 0 ? `
              <tr>
                <td>Phạt thiếu thông tin Checkout</td>
                <td class="amount red">-${this.fmt(sal.penaltyNoCheckout)}</td>
              </tr>
              ` : ''}
              ${(sal.penaltyAbsent || 0) > 0 ? `
              <tr>
                <td>Phạt nghỉ không phép / Thiếu công chuẩn</td>
                <td class="amount red">-${this.fmt(sal.penaltyAbsent)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
          ` : ''}

          <div class="net-salary-card">
            <div class="net-title">Tổng Thực Lĩnh (Net Take-home)</div>
            <div class="net-amount">${this.fmt(sal.totalSalary)}</div>
          </div>

          <div class="signature-section">
            <div class="sig-box">
              <span class="sig-title">Người Lập Phiếu</span>
              <span class="sig-name">Bộ phận Nhân sự</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">Nhân Viên Ký Nhận</span>
              <span class="sig-name">${sal.employeeName}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }


  // ── Helpers ───────────────────────────────────────────────────────────────

  fmt(val: number | null | undefined, isHourly: boolean = false): string {
    if (!val || val === 0) return '0 ₫';
    if (isHourly) {
      return val.toLocaleString('vi-VN') + ' ₫/giờ';
    }
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

  removeAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');
  }
}
