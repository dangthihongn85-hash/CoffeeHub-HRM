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
  loading = false;
  loadingRevenue = false;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear  = new Date().getFullYear();
  months = [1,2,3,4,5,6,7,8,9,10,11,12];
  years  = [2024, 2025, 2026, 2027];

  // ── Doanh thu ─────────────────────────────────────────────────────────────
  monthlyRevenue = 0;
  bonusPool      = 0;
  revenueNotes   = '';
  revenueLoaded  = false;

  // ── Stats ─────────────────────────────────────────────────────────────────
  totalPayroll       = 0;
  totalBonusRevenue  = 0;
  totalPenalty       = 0;

  // ── Detail panel ──────────────────────────────────────────────────────────
  selectedSalary: any = null;

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
      next: d => this.employees = d
    });
  }

  loadRevenue() {
    this.http.get<any>(`${API}/salaries/revenue?month=${this.selectedMonth}&year=${this.selectedYear}`).subscribe({
      next: d => {
        this.monthlyRevenue = d.monthlyRevenue || 0;
        this.bonusPool      = d.bonusPool      || 0;
        this.revenueNotes   = d.notes          || '';
        this.revenueLoaded  = true;
      },
      error: () => { this.revenueLoaded = true; }
    });
  }

  loadSalaries() {
    this.http.get<any[]>(`${API}/salaries?month=${this.selectedMonth}&year=${this.selectedYear}`).subscribe({
      next: d => {
        this.salaries = d;
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
      notes: this.revenueNotes
    }).subscribe({
      next: d => {
        this.bonusPool = d.bonusPool;
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
        this.salaries = d;
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

  // ── Employee type ─────────────────────────────────────────────────────────

  saveEmployeeType(emp: any) {
    this.http.put<any>(`${API}/employees/${emp.id}`, emp).subscribe({
      next: () => this.snackBar.open(`✅ Đã cập nhật loại NV: ${emp.name}`, 'Đóng', { duration: 3000 }),
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
    if (!val) return '0 ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
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
}
