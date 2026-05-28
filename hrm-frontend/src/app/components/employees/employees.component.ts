import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css']
})
export class EmployeesComponent implements OnInit {
  employees: any[] = [];
  filteredEmployees: any[] = [];
  searchQuery: string = '';
  filterDepartment: string = '';
  filterPosition: string = '';
  filterType: string = '';
  filterStatus: string = '';

  loading = true;
  filterExpanded = true;
  totalActive = 0;
  totalLeave = 0;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  pagedEmployees: any[] = [];

  isAdding = false;
  newEmployee: any = { name: '', department: '', email: '', position: '', status: 'ACTIVE', password: 'password123', salaryBase: 15000000, role: 'EMPLOYEE', employeeType: 'FULL_TIME' };

  editingId: number | null = null;
  editModel: any = {};

  // For dynamic dropdowns
  availableDepartments: any[] = [];
  availableShifts: any[] = [];
  allPositions: any[] = [];
  filteredPositions: any[] = []; // Current list for the dropdown
  filteredPositionsForFilter: any[] = []; // Positions filtered by department in filter panel

  // Calendar/Attendance Modal State
  showAttendanceModal = false;
  selectedEmpForAttendance: any = null;
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  monthsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  yearsList = [2025, 2026, 2027];
  attendanceRecords: any[] = [];
  calendarDays: any[] = [];
  loadingAttendance = false;

  // Modal Stats variables
  modalWorkPoints = 0;
  modalAbsentNoPerm = 0;
  modalAbsentWithPerm = 0;
  modalSpecialLeave = 0;
  modalLateEarly = 0;

  filterAttendanceStatus = 'ALL';

  // Confirmation Modal State
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.fetchData();
    this.loadDropdowns();
    this.loadShifts();
  }

  loadDropdowns() {
    this.http.get<any[]>('http://localhost:8080/api/departments').subscribe(data => {
      this.availableDepartments = data;
    });
    this.http.get<any[]>('http://localhost:8080/api/departments/positions').subscribe(data => {
      this.allPositions = data;
      this.filteredPositionsForFilter = [...data];
    });
  }

  loadShifts() {
    this.http.get<any[]>('http://localhost:8080/api/shifts').subscribe(data => {
      this.availableShifts = data;
    });
  }

  onDeptChange(deptName: string) {
    this.filteredPositions = this.allPositions.filter(p => p.departmentName === deptName);
  }

  onFilterDeptChange() {
    if (this.filterDepartment) {
      this.filteredPositionsForFilter = this.allPositions.filter(p => p.departmentName === this.filterDepartment);
      // Reset position if it no longer belongs to selected department
      const valid = this.filteredPositionsForFilter.some(p => p.name === this.filterPosition);
      if (!valid) this.filterPosition = '';
    } else {
      this.filteredPositionsForFilter = [...this.allPositions];
    }
    this.onSearch();
  }

  fetchData() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8080/api/employees').subscribe({
      next: (data) => {
        this.employees = data.sort((a,b) => b.id - a.id); // sort latest first
        this.filteredEmployees = [...this.employees];
        this.calculateStats();
        this.updatePagedData();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Lỗi kết nối. Hãy chắc chắn Spring Boot API đang chạy!', 'Đóng', {duration: 5000});
      }
    });
  }

  onSearch(resetPage: boolean = true) {
    this.filteredEmployees = this.employees.filter(e => {
      let matchesSearch = true;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        matchesSearch = e.name.toLowerCase().includes(q) || 
                        e.email.toLowerCase().includes(q) ||
                        (e.position && e.position.toLowerCase().includes(q));
      }
      
      let matchesDept = this.filterDepartment ? e.department === this.filterDepartment : true;
      let matchesPos = this.filterPosition ? e.position === this.filterPosition : true;
      let matchesType = this.filterType ? e.employeeType === this.filterType : true;
      let matchesStatus = this.filterStatus ? e.status === this.filterStatus : true;

      return matchesSearch && matchesDept && matchesPos && matchesType && matchesStatus;
    });
    if (resetPage) {
      this.pageIndex = 0; // Reset search page
    } else {
      const maxPageIndex = Math.max(0, Math.ceil(this.filteredEmployees.length / this.pageSize) - 1);
      if (this.pageIndex > maxPageIndex) {
        this.pageIndex = maxPageIndex;
      }
    }
    this.updatePagedData();
  }

  // Reset specific filter
  clearFilter(filter: string) {
    switch (filter) {
      case 'department':
        this.filterDepartment = '';
        break;
      case 'position':
        this.filterPosition = '';
        break;
      case 'type':
        this.filterType = '';
        break;
      case 'status':
        this.filterStatus = '';
        break;
      case 'search':
        this.searchQuery = '';
        break;
    }
    this.onSearch();
  }

  // Reset all filters and search
  clearAllFilters() {
    this.filterDepartment = '';
    this.filterPosition = '';
    this.filterType = '';
    this.filterStatus = '';
    this.searchQuery = '';
    this.filteredPositionsForFilter = [...this.allPositions];
    this.onSearch();
  }

  updatePagedData() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedEmployees = this.filteredEmployees.slice(start, end);
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedData();
  }

  calculateStats() {
    this.totalActive = this.employees.filter(e => e.status === 'ACTIVE').length;
    this.totalLeave = this.employees.filter(e => e.status === 'LEAVE').length;
  }

  toggleAdd() {
    this.isAdding = !this.isAdding;
    this.newEmployee = { name: '', department: '', email: '', position: '', status: 'ACTIVE', password: 'password123', salaryBase: 15000000, role: 'EMPLOYEE', employeeType: 'FULL_TIME' };
  }

  saveEmployee() {
    if(!this.newEmployee.name || !this.newEmployee.email) {
      this.snackBar.open('⚠️ Vui lòng điền đủ Tên và Email', 'Đóng', {duration: 3000});
      return;
    }
    
    this.loading = true;
    this.http.post<any>('http://localhost:8080/api/employees', this.newEmployee).subscribe({
      next: (res) => {
        this.employees.unshift(res);
        this.onSearch(true);
        this.calculateStats();
        this.isAdding = false;
        this.loading = false;
        this.snackBar.open('✅ Đã thêm nhân viên thành công!', 'Đóng', {duration: 3000});
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', {duration: 4000});
      }
    });
  }

  startEdit(emp: any) {
    this.editingId = emp.id;
    this.editModel = { ...emp };
    // Pre-filter positions for the department of the employee being edited
    if (emp.department) {
      this.onDeptChange(emp.department);
    }
  }

  cancelEdit() {
    this.editingId = null;
  }

  saveEdit() {
    if(!this.editModel.name || !this.editModel.email) {
      this.snackBar.open('Tên và Email không được để trống!', 'Đóng', {duration: 3000});
      return;
    }
    this.http.put<any>(`http://localhost:8080/api/employees/${this.editingId}`, this.editModel).subscribe({
      next: (res) => {
        const idx = this.employees.findIndex(e => e.id === this.editingId);
        if(idx !== -1) {
          this.employees[idx] = res;
        }
        this.onSearch(false);
        this.calculateStats();
        this.editingId = null;
        this.snackBar.open('✅ Đã cập nhật chuyên viên thành công!', 'Đóng', {duration: 3000});
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', {duration: 3000});
      }
    });
  }

  deleteEmployee(id: number) {
    this.openConfirm(
      'Xóa Nhân Viên',
      'Bạn có chắc chắn muốn xoá nhân viên này không? Dữ liệu không thể khôi phục.',
      () => {
        this.http.delete(`http://localhost:8080/api/employees/${id}`).subscribe({
          next: () => {
            this.employees = this.employees.filter(e => e.id !== id);
            this.onSearch(false);
            this.calculateStats();
            this.snackBar.open('✅ Đã xoá nhân viên thành công!', 'Đóng', {duration: 3000});
          },
          error: (err) => this.snackBar.open('❌ Lỗi xoá nhân viên!', 'Đóng', {duration: 3000})
        });
      }
    );
  }

  toggleStatus(emp: any) {
    if(this.editingId) return; // disabled while editing
    const oldStatus = emp.status;
    emp.status = emp.status === 'ACTIVE' ? 'LEAVE' : 'ACTIVE';
    this.http.put<any>(`http://localhost:8080/api/employees/${emp.id}`, emp).subscribe({
      next: () => {
        this.calculateStats();
        this.snackBar.open(`Đã cập nhật trạng thái thành ${emp.status}`, 'Đóng', {duration: 2000});
      },
      error: () => {
        emp.status = oldStatus;
        this.snackBar.open('❌ Cập nhật thất bại', 'Đóng', {duration: 3000});
      }
    });
  }

  fmt(val: number | null | undefined): string {
    if (!val || val === 0) return '0 ₫';
    const rounded = Math.round(val / 1000) * 1000;
    return rounded.toLocaleString('vi-VN') + ' ₫';
  }

  // ===== Attendance Calendar Management Methods =====
  openAttendanceModal(emp: any) {
    this.selectedEmpForAttendance = emp;
    this.showAttendanceModal = true;
    this.selectedMonth = new Date().getMonth() + 1;
    this.selectedYear = new Date().getFullYear();
    this.filterAttendanceStatus = 'ALL'; // Reset bộ lọc trạng thái
    this.loadAttendanceData();
  }

  closeAttendanceModal() {
    this.showAttendanceModal = false;
    this.selectedEmpForAttendance = null;
    this.attendanceRecords = [];
    this.calendarDays = [];
  }

  loadAttendanceData() {
    if (!this.selectedEmpForAttendance) return;
    this.loadingAttendance = true;
    this.http.get<any[]>(`http://localhost:8080/api/attendance/${this.selectedEmpForAttendance.id}/monthly`, {
      params: {
        month: this.selectedMonth.toString(),
        year: this.selectedYear.toString()
      }
    }).subscribe({
      next: (data) => {
        this.attendanceRecords = data;
        
        // Calculate modal stats
        this.modalWorkPoints = data.reduce((sum, r) => sum + (r.workPoints != null ? r.workPoints : 0), 0);
        this.modalWorkPoints = Math.round(this.modalWorkPoints * 100) / 100;
        
        this.modalAbsentWithPerm = data.filter(r => r.status === 'ABSENT').length;
        this.modalAbsentNoPerm = data.filter(r => r.status === 'ABSENT_NO_PERMISSION').length;
        this.modalSpecialLeave = data.filter(r => r.status === 'SPECIAL_LEAVE').length;
        this.modalLateEarly = data.filter(r => r.status === 'LATE' || r.status === 'EARLY').length;
        
        this.generateCalendarDays();
        this.loadingAttendance = false;
      },
      error: (err) => {
        this.loadingAttendance = false;
        this.snackBar.open('❌ Lỗi tải dữ liệu chấm công!', 'Đóng', {duration: 3000});
      }
    });
  }

  generateCalendarDays() {
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const record = this.attendanceRecords.find(r => r.date === dateStr);
      
      days.push({
        dayNum: i,
        dateStr: dateStr,
        record: record ? { ...record } : null,
        editing: false,
        editCheckIn: record && record.checkInTime ? record.checkInTime.substring(0, 5) : '',
        editCheckOut: record && record.checkOutTime ? record.checkOutTime.substring(0, 5) : '',
        editStatus: record ? record.status : 'ON_TIME',
        editShiftId: record && record.shift ? record.shift.id : null
      });
    }
    this.calendarDays = days;
  }

  get filteredCalendarDays() {
    if (this.filterAttendanceStatus === 'ALL') {
      return this.calendarDays;
    }
    return this.calendarDays.filter(day => {
      if (this.filterAttendanceStatus === 'NO_RECORD') {
        return !day.record;
      }
      return day.record && day.record.status === this.filterAttendanceStatus;
    });
  }

  getDayOfWeekName(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
  }

  startEditDay(day: any) {
    day.editing = true;
    day.editCheckIn = day.record && day.record.checkInTime ? day.record.checkInTime.substring(0, 5) : '08:00';
    day.editCheckOut = day.record && day.record.checkOutTime ? day.record.checkOutTime.substring(0, 5) : '17:00';
    day.editStatus = day.record ? day.record.status : 'ON_TIME';
    day.editShiftId = day.record && day.record.shift ? day.record.shift.id : (this.availableShifts.length > 0 ? this.availableShifts[0].id : null);
  }

  cancelEditDay(day: any) {
    day.editing = false;
  }

  saveDayAttendance(day: any) {
    // Basic frontend validations
    if (day.editStatus !== 'ABSENT' && day.editStatus !== 'ABSENT_NO_PERMISSION' && day.editStatus !== 'SPECIAL_LEAVE') {
      if (!day.editCheckIn) {
        this.snackBar.open('⚠️ Giờ check-in không được để trống khi đi làm!', 'Đóng', {duration: 3000});
        return;
      }
      if (day.editCheckIn && day.editCheckOut && day.editCheckOut < day.editCheckIn) {
        this.snackBar.open('⚠️ Giờ check-out phải sau giờ check-in!', 'Đóng', {duration: 3000});
        return;
      }
    }

    const body = {
      date: day.dateStr,
      checkInTime: (day.editStatus === 'ABSENT' || day.editStatus === 'ABSENT_NO_PERMISSION' || day.editStatus === 'SPECIAL_LEAVE')
                   ? null : (day.editCheckIn ? day.editCheckIn + ':00' : null),
      checkOutTime: (day.editStatus === 'ABSENT' || day.editStatus === 'ABSENT_NO_PERMISSION' || day.editStatus === 'SPECIAL_LEAVE')
                    ? null : (day.editCheckOut ? day.editCheckOut + ':00' : null),
      status: day.editStatus,
      shiftId: day.editShiftId
    };

    this.http.post<any>(`http://localhost:8080/api/attendance/${this.selectedEmpForAttendance.id}/manual`, body).subscribe({
      next: () => {
        this.snackBar.open('✅ Đã lưu chấm công thành công!', 'Đóng', {duration: 2000});
        day.editing = false;
        this.loadAttendanceData();
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', {duration: 3500});
      }
    });
  }

  deleteDayAttendance(day: any) {
    if (!day.record) return;
    this.openConfirm(
      'Xóa Chấm Công Ngày',
      `Bạn có chắc chắn muốn xoá chấm công ngày ${day.dateStr} không?`,
      () => {
        this.http.delete(`http://localhost:8080/api/attendance/${this.selectedEmpForAttendance.id}/manual`, {
          params: { date: day.dateStr }
        }).subscribe({
          next: () => {
            this.snackBar.open('✅ Đã xoá chấm công thành công!', 'Đóng', {duration: 2000});
            this.loadAttendanceData();
          },
          error: (err) => {
            this.snackBar.open('❌ Lỗi xoá chấm công!', 'Đóng', {duration: 3000});
          }
        });
      }
    );
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ON_TIME': return 'chip-green';
      case 'LATE': return 'chip-orange';
      case 'EARLY': return 'chip-orange';
      case 'ABSENT': return 'chip-rose-light';
      case 'ABSENT_NO_PERMISSION': return 'chip-rose';
      case 'SPECIAL_LEAVE': return 'chip-indigo';
      default: return 'chip-gray';
    }
  }

  isPastDay(dateStr: string): boolean {
    const today = new Date();
    // Chuyển today về timezone địa phương yyyy-MM-dd để so sánh chuẩn xác với database dateStr
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = localToday.toISOString().substring(0, 10);
    return dateStr < todayStr;
  }

  getStatusText(status: string, dateStr: string): string {
    switch (status) {
      case 'ON_TIME': return 'Đúng giờ';
      case 'LATE': return 'Đi trễ';
      case 'EARLY': return 'Về sớm';
      case 'ABSENT': return 'Nghỉ có phép';
      case 'ABSENT_NO_PERMISSION': return 'Nghỉ không phép';
      case 'SPECIAL_LEAVE': return 'Nghỉ đặc biệt';
      default: return status || (this.isPastDay(dateStr) ? 'Nghỉ' : 'Chưa chấm công');
    }
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
