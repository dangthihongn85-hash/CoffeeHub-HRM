import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

const API = 'http://localhost:8080/api';

@Component({
  selector: 'app-departments',
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.css']
})
export class DepartmentsComponent implements OnInit {
  departments: any[] = [];
  positions: any[] = [];
  employees: any[] = [];
  loading = false;

  // Confirmation Modal State
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  // === Department state ===
  showAddDept = false;
  newDept = { name: '', description: '' };
  editingDeptId: number | null = null;
  editDeptModel: any = {};

  // === Position state ===
  showAddPosDeptName: string | null = null;
  newPos = { name: '', departmentName: '' };
  editingPosId: number | null = null;
  editPosModel: any = {};

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.http.get<any[]>(`${API}/departments`).subscribe(depts => {
      this.departments = depts;
      this.http.get<any[]>(`${API}/departments/positions`).subscribe(pos => {
        this.positions = pos;
        this.http.get<any[]>(`${API}/employees`).subscribe(emps => {
          this.employees = emps;
          this.loading = false;
        });
      });
    });
  }

  positionsOf(deptName: string) {
    return this.positions.filter(p => p.departmentName === deptName);
  }

  employeesOf(deptName: string) {
    return this.employees.filter(e => e.department === deptName);
  }

  // ===== DEPARTMENTS =====

  saveDept() {
    if (!this.newDept.name.trim()) {
      this.snack.open('Tên phòng ban không được để trống!', 'Đóng', { duration: 3000 }); return;
    }
    this.http.post<any>(`${API}/departments`, this.newDept).subscribe({
      next: (d) => {
        this.departments.push(d);
        this.newDept = { name: '', description: '' };
        this.showAddDept = false;
        this.snack.open('✅ Đã thêm phòng ban!', 'Đóng', { duration: 3000 });
      },
      error: (e) => this.snack.open('❌ ' + (e.error?.message || 'Lỗi'), 'Đóng', { duration: 3000 })
    });
  }

  startEditDept(dept: any) {
    this.editingDeptId = dept.id;
    this.editDeptModel = { ...dept };
  }

  saveEditDept() {
    this.http.put<any>(`${API}/departments/${this.editingDeptId}`, this.editDeptModel).subscribe({
      next: (d) => {
        const idx = this.departments.findIndex(x => x.id === d.id);
        if (idx !== -1) this.departments[idx] = d;
        this.editingDeptId = null;
        this.snack.open('✅ Cập nhật phòng ban thành công!', 'Đóng', { duration: 3000 });
      },
      error: () => this.snack.open('❌ Lỗi cập nhật', 'Đóng', { duration: 3000 })
    });
  }

  deleteDept(dept: any) {
    const empCount = this.employeesOf(dept.name).length;
    if (empCount > 0) {
      this.snack.open(`❌ Không thể xoá! Phòng ban "${dept.name}" đang có ${empCount} nhân viên.`, 'Đóng', { 
        duration: 5000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    this.openConfirm(
      'Xóa Phòng Ban',
      `Bạn có chắc chắn muốn xoá phòng ban "${dept.name}" không?`,
      () => {
        this.http.delete(`${API}/departments/${dept.id}`).subscribe({
          next: () => {
            this.departments = this.departments.filter(d => d.id !== dept.id);
            this.positions = this.positions.filter(p => p.departmentName !== dept.name);
            this.snack.open('✅ Đã xoá phòng ban!', 'Đóng', { duration: 3000 });
          },
          error: () => this.snack.open('❌ Lỗi xoá', 'Đóng', { duration: 3000 })
        });
      }
    );
  }

  // ===== POSITIONS =====

  showAddPos(deptName: string) {
    this.showAddPosDeptName = deptName;
    this.newPos = { name: '', departmentName: deptName };
  }

  savePos() {
    if (!this.newPos.name.trim()) {
      this.snack.open('Tên chức vụ không được để trống!', 'Đóng', { duration: 3000 }); return;
    }
    this.http.post<any>(`${API}/departments/positions`, this.newPos).subscribe({
      next: (p) => {
        this.positions.push(p);
        this.showAddPosDeptName = null;
        this.snack.open('✅ Đã thêm chức vụ!', 'Đóng', { duration: 3000 });
      },
      error: () => this.snack.open('❌ Lỗi thêm chức vụ', 'Đóng', { duration: 3000 })
    });
  }

  startEditPos(pos: any) {
    this.editingPosId = pos.id;
    this.editPosModel = { ...pos };
  }

  saveEditPos() {
    this.http.put<any>(`${API}/departments/positions/${this.editingPosId}`, this.editPosModel).subscribe({
      next: (p) => {
        const idx = this.positions.findIndex(x => x.id === p.id);
        if (idx !== -1) this.positions[idx] = p;
        this.editingPosId = null;
        this.snack.open('✅ Cập nhật chức vụ thành công!', 'Đóng', { duration: 3000 });
      },
      error: () => this.snack.open('❌ Lỗi cập nhật', 'Đóng', { duration: 3000 })
    });
  }

  deletePos(pos: any) {
    const empCount = this.countEmployeesInPos(pos.departmentName, pos.name);
    if (empCount > 0) {
      this.snack.open(`❌ Không thể xoá! Chức vụ "${pos.name}" đang có ${empCount} nhân viên đảm nhiệm.`, 'Đóng', { 
        duration: 5000 
      });
      return;
    }

    this.openConfirm(
      'Xóa Chức Vụ',
      `Bạn có chắc chắn muốn xoá chức vụ "${pos.name}" không?`,
      () => {
        this.http.delete(`${API}/departments/positions/${pos.id}`).subscribe({
          next: () => {
            this.positions = this.positions.filter(p => p.id !== pos.id);
            this.snack.open('✅ Đã xoá chức vụ!', 'Đóng', { duration: 3000 });
          },
          error: () => this.snack.open('❌ Lỗi xoá', 'Đóng', { duration: 3000 })
        });
      }
    );
  }

  countEmployeesInPos(deptName: string, posName: string): number {
    return this.employees.filter(e => e.department === deptName && e.position === posName).length;
  }

  // ===== Shared Confirmation Modal Handlers =====
  openConfirm(title: string, msg: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = msg;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  closeConfirm() {
    this.showConfirmModal = false;
    this.confirmAction = null;
  }

  triggerConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirm();
  }
}
