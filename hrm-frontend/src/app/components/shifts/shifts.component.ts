import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.css']
})
export class ShiftsComponent implements OnInit {
  // Tabs: 'schedule' or 'config'
  activeTab: 'schedule' | 'config' = 'schedule';

  // Shifts state
  shifts: any[] = [];
  loadingShifts = false;
  isAddingShift = false;
  editingShiftId: number | null = null;
  
  newShift: any = {
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    standardHours: 8.0,
    maxEmployees: 10
  };
  editShiftModel: any = {};

  // Employees & Scheduling state
  employees: any[] = [];
  loadingEmployees = false;
  assignments: any[] = [];
  loadingAssignments = false;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  pagedEmployees: any[] = [];

  currentDate = new Date();
  dateInputString = '';

  // Premium Custom Calendar Picker State
  showCustomDatePicker = false;
  pickerViewDate = new Date();
  pickerDays: { date: Date; dateStr: string; dayNum: number; isCurrentMonth: boolean; isSelected: boolean }[] = [];

  weekDays: { name: string; date: Date; dateStr: string }[] = [];
  assignmentGrid: { [empId: number]: { [dateStr: string]: any } } = {};

  // Cell Edit Modal
  showCellEditModal = false;
  selectedCell: { employee: any; day: any; currentShiftId: number | null } | null = null;
  cellEditShiftId: number | null = null;
  savingCell = false;

  // Premium Custom Cell Dropdown State
  activeCellDropdown: { empId: number, dateStr: string } | null = null;

  // Bulk Assignment Modal
  showBulkModal = false;
  bulkModel: any = {
    employeeId: null,
    shiftId: null,
    startDate: '',
    endDate: '',
    selectedDays: {
      1: true, // Mon
      2: true, // Tue
      3: true, // Wed
      4: true, // Thu
      5: true, // Fri
      6: true, // Sat
      0: false // Sun
    }
  };
  savingBulk = false;

  // Confirmation Modal
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.fetchShifts();
    this.fetchEmployees();
    this.generateWeek();
  }

  // ── Shifts CRUD ───────────────────────────────────────────────────────────
  fetchShifts() {
    this.loadingShifts = true;
    this.http.get<any[]>('http://localhost:8080/api/shifts').subscribe({
      next: (data) => {
        this.shifts = data;
        this.loadingShifts = false;
      },
      error: () => {
        this.loadingShifts = false;
        this.snackBar.open('❌ Lỗi tải danh sách ca làm!', 'Đóng', { duration: 3000 });
      }
    });
  }

  toggleAddShift() {
    this.isAddingShift = !this.isAddingShift;
    this.newShift = {
      name: '',
      startTime: '08:00',
      endTime: '17:00',
      standardHours: 8.0,
      maxEmployees: 10
    };
  }

  saveNewShift() {
    if (!this.newShift.name || !this.newShift.startTime || !this.newShift.endTime) {
      this.snackBar.open('⚠️ Vui lòng điền đủ Tên ca và giờ làm việc!', 'Đóng', { duration: 3000 });
      return;
    }
    
    // Add :00 seconds to time strings if not present
    let start = this.newShift.startTime;
    if (start.split(':').length === 2) start += ':00';
    let end = this.newShift.endTime;
    if (end.split(':').length === 2) end += ':00';

    const payload = {
      ...this.newShift,
      startTime: start,
      endTime: end
    };

    this.http.post<any>('http://localhost:8080/api/shifts', payload).subscribe({
      next: () => {
        this.fetchShifts();
        this.isAddingShift = false;
        this.snackBar.open('✅ Đã thêm ca làm việc mới!', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 4000 });
      }
    });
  }

  startEditShift(shift: any) {
    this.editingShiftId = shift.id;
    this.editShiftModel = {
      ...shift,
      startTime: shift.startTime.substring(0, 5),
      endTime: shift.endTime.substring(0, 5)
    };
  }

  cancelEditShift() {
    this.editingShiftId = null;
  }

  saveEditShift() {
    if (!this.editShiftModel.name || !this.editShiftModel.startTime || !this.editShiftModel.endTime) {
      this.snackBar.open('⚠️ Các trường không được để trống!', 'Đóng', { duration: 3000 });
      return;
    }

    let start = this.editShiftModel.startTime;
    if (start.split(':').length === 2) start += ':00';
    let end = this.editShiftModel.endTime;
    if (end.split(':').length === 2) end += ':00';

    const payload = {
      ...this.editShiftModel,
      startTime: start,
      endTime: end
    };

    this.http.put<any>(`http://localhost:8080/api/shifts/${this.editingShiftId}`, payload).subscribe({
      next: () => {
        this.fetchShifts();
        this.editingShiftId = null;
        this.snackBar.open('✅ Đã cập nhật ca làm việc!', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 4000 });
      }
    });
  }

  deleteShift(id: number) {
    this.openConfirm(
      'Xóa Ca Làm Việc',
      'Bạn có chắc chắn muốn xóa ca làm này không? Các lịch phân ca thuộc ca này có thể bị ảnh hưởng.',
      () => {
        this.http.delete(`http://localhost:8080/api/shifts/${id}`).subscribe({
          next: () => {
            this.fetchShifts();
            this.snackBar.open('✅ Đã xóa ca làm việc thành công!', 'Đóng', { duration: 3000 });
          },
          error: () => this.snackBar.open('❌ Lỗi xóa ca làm!', 'Đóng', { duration: 3000 })
        });
      }
    );
  }

  // ── Scheduling Grid ──────────────────────────────────────────────────────
  fetchEmployees() {
    this.loadingEmployees = true;
    this.http.get<any[]>('http://localhost:8080/api/employees').subscribe({
      next: (data) => {
        // Exclude admin role as they are not employees dotting shifts
        this.employees = data.filter(e => e.role !== 'ADMIN').sort((a, b) => a.id - b.id);
        this.loadingEmployees = false;
        this.mapAssignmentsToGrid();
        this.updatePagedData();
      },
      error: () => {
        this.loadingEmployees = false;
      }
    });
  }

  // Filter state
  filterShiftId: string = 'ALL';

  get filteredEmployees(): any[] {
    if (this.filterShiftId === 'ALL') {
      return this.employees;
    }
    
    return this.employees.filter(emp => {
      return this.weekDays.some(day => {
        const shiftIdVal = this.getAssignmentShiftId(emp.id, day.dateStr);
        if (this.filterShiftId === 'OFF') {
          return shiftIdVal === 'OFF';
        } else {
          return shiftIdVal.toString() === this.filterShiftId.toString();
        }
      });
    });
  }

  updatePagedData() {
    const list = this.filteredEmployees;
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedEmployees = list.slice(start, end);
  }

  onFilterShiftChange() {
    this.pageIndex = 0;
    this.updatePagedData();
  }

  toggleShiftFilter(shiftId: string | number) {
    if (this.filterShiftId.toString() === shiftId.toString()) {
      this.filterShiftId = 'ALL';
    } else {
      this.filterShiftId = shiftId.toString();
    }
    this.pageIndex = 0;
    this.updatePagedData();
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedData();
  }

  updateDateInputString() {
    const date = this.currentDate;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    this.dateInputString = `${d}/${m}/${y}`;
  }

  generateWeek() {
    this.updateDateInputString();
    const days = [];
    const date = new Date(this.currentDate);
    // Find the Monday of the current week (0 = Sunday, 1 = Monday, etc.)
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(date.setDate(diff));

    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push({
        name: dayNames[i],
        date: nextDay,
        dateStr: this.formatDate(nextDay)
      });
    }
    this.weekDays = days;
    this.fetchAssignments();
  }

  prevWeek() {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.generateWeek();
  }

  nextWeek() {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.generateWeek();
  }

  todayWeek() {
    this.currentDate = new Date();
    this.generateWeek();
  }

  onDateSelect(event: any) {
    const val = event.target.value; // "YYYY-MM-DD"
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        this.currentDate = new Date(year, month, day);
        this.generateWeek();
      }
    }
  }

  onTextDateChange(event: any) {
    const val = event.target.value.trim();
    if (!val) return;

    // Supports separators: /, -, or .
    const parts = val.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);

      // Validate basic bounds
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const testDate = new Date(year, month, day);
        // Verify real Gregorian date (e.g. invalidating February 30th)
        if (testDate.getDate() === day && testDate.getMonth() === month && testDate.getFullYear() === year) {
          this.currentDate = testDate;
          this.generateWeek();
          this.snackBar.open(`📅 Đã chuyển sang tuần chứa ngày ${this.dateInputString}!`, 'Đóng', { duration: 2000 });
          return;
        }
      }
    }

    // Reset if invalid
    this.updateDateInputString();
    this.snackBar.open('⚠️ Ngày không hợp lệ! Vui lòng nhập đúng dạng dd/mm/yyyy (Ví dụ: 25/05/2026)', 'Đóng', { duration: 4000 });
  }

  toggleCustomDatePicker() {
    this.showCustomDatePicker = !this.showCustomDatePicker;
    if (this.showCustomDatePicker) {
      this.pickerViewDate = new Date(this.currentDate);
      this.generatePickerMonth();
    }
  }

  generatePickerMonth() {
    const year = this.pickerViewDate.getFullYear();
    const month = this.pickerViewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = totalDaysInPrevMonth - i;
      const d = new Date(year, month - 1, prevDay);
      days.push({
        date: d,
        dateStr: this.formatDate(d),
        dayNum: prevDay,
        isCurrentMonth: false,
        isSelected: this.isSameDay(d, this.currentDate)
      });
    }

    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateStr: this.formatDate(d),
        dayNum: i,
        isCurrentMonth: true,
        isSelected: this.isSameDay(d, this.currentDate)
      });
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: this.formatDate(d),
        dayNum: i,
        isCurrentMonth: false,
        isSelected: this.isSameDay(d, this.currentDate)
      });
    }

    this.pickerDays = days;
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  prevPickerMonth() {
    this.pickerViewDate = new Date(this.pickerViewDate.getFullYear(), this.pickerViewDate.getMonth() - 1, 1);
    this.generatePickerMonth();
  }

  nextPickerMonth() {
    this.pickerViewDate = new Date(this.pickerViewDate.getFullYear(), this.pickerViewDate.getMonth() + 1, 1);
    this.generatePickerMonth();
  }

  selectPickerDate(day: any) {
    this.currentDate = day.date;
    this.generateWeek();
    this.showCustomDatePicker = false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (this.showCustomDatePicker) {
      const clickedInside = event.target.closest('.date-picker-wrapper');
      if (!clickedInside) {
        this.showCustomDatePicker = false;
      }
    }
    if (this.activeCellDropdown) {
      const clickedInsideDropdown = event.target.closest('.schedule-cell');
      if (!clickedInsideDropdown) {
        this.activeCellDropdown = null;
      }
    }
  }

  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  fetchAssignments() {
    if (this.weekDays.length === 0) return;
    const startStr = this.weekDays[0].dateStr;
    const endStr = this.weekDays[6].dateStr;
    
    this.loadingAssignments = true;
    this.http.get<any[]>(`http://localhost:8080/api/shifts/assignments?start=${startStr}&end=${endStr}`).subscribe({
      next: (data) => {
        this.assignments = data;
        this.mapAssignmentsToGrid();
        this.loadingAssignments = false;
      },
      error: () => {
        this.loadingAssignments = false;
        this.snackBar.open('❌ Lỗi tải lịch phân ca!', 'Đóng', { duration: 3000 });
      }
    });
  }

  fetchAssignmentsSilent() {
    if (this.weekDays.length === 0) return;
    const startStr = this.weekDays[0].dateStr;
    const endStr = this.weekDays[6].dateStr;
    
    this.http.get<any[]>(`http://localhost:8080/api/shifts/assignments?start=${startStr}&end=${endStr}`).subscribe({
      next: (data) => {
        this.assignments = data;
        this.mapAssignmentsToGrid();
      },
      error: () => {
        // Fail silently in background
      }
    });
  }

  mapAssignmentsToGrid() {
    this.assignmentGrid = {};
    this.employees.forEach(emp => {
      this.assignmentGrid[emp.id] = {};
      this.weekDays.forEach(day => {
        this.assignmentGrid[emp.id][day.dateStr] = null;
      });
    });

    this.assignments.forEach(assign => {
      const empId = assign.employee?.id;
      const dateStr = assign.date;
      if (empId && this.assignmentGrid[empId]) {
        this.assignmentGrid[empId][dateStr] = assign;
      }
    });
  }

  // ── Cell Editing ──────────────────────────────────────────────────────────
  openCellEdit(employee: any, day: any) {
    const currentAssign = this.assignmentGrid[employee.id][day.dateStr];
    const currentShiftId = currentAssign && currentAssign.shift ? currentAssign.shift.id : null;
    
    this.selectedCell = {
      employee,
      day,
      currentShiftId
    };
    this.cellEditShiftId = currentShiftId;
    this.showCellEditModal = true;
  }

  closeCellEdit() {
    this.showCellEditModal = false;
    this.selectedCell = null;
  }

  saveCellAssignment() {
    if (!this.selectedCell) return;
    this.savingCell = true;

    const payload = {
      employeeId: this.selectedCell.employee.id,
      shiftId: this.cellEditShiftId, // nullable for OFF
      dates: [this.selectedCell.day.dateStr]
    };

    this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
      next: () => {
        this.snackBar.open('✅ Đã phân ca thành công!', 'Đóng', { duration: 2000 });
        this.fetchAssignments();
        this.closeCellEdit();
        this.savingCell = false;
      },
      error: (err) => {
        this.savingCell = false;
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 3500 });
      }
    });
  }

  // ── Bulk Assignment ───────────────────────────────────────────────────────
  openBulkModal() {
    this.bulkModel = {
      employeeId: this.employees.length > 0 ? this.employees[0].id : null,
      shiftId: this.shifts.length > 0 ? this.shifts[0].id : null,
      startDate: this.weekDays[0].dateStr,
      endDate: this.weekDays[6].dateStr,
      selectedDays: {
        1: true, // Monday
        2: true,
        3: true,
        4: true,
        5: true,
        6: true, // Saturday
        0: false // Sunday
      }
    };
    this.showBulkModal = true;
  }

  closeBulkModal() {
    this.showBulkModal = false;
  }

  saveBulkAssignment() {
    if (!this.bulkModel.employeeId || !this.bulkModel.startDate || !this.bulkModel.endDate) {
      this.snackBar.open('⚠️ Vui lòng điền đủ Tên nhân viên và Khoảng ngày!', 'Đóng', { duration: 3000 });
      return;
    }

    const start = new Date(this.bulkModel.startDate);
    const end = new Date(this.bulkModel.endDate);
    if (end < start) {
      this.snackBar.open('⚠️ Ngày kết thúc phải sau ngày bắt đầu!', 'Đóng', { duration: 3000 });
      return;
    }

    this.savingBulk = true;

    // Collect all dates that match selected days of the week
    const dateStrings: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, etc.
      if (this.bulkModel.selectedDays[dayOfWeek]) {
        dateStrings.push(this.formatDate(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (dateStrings.length === 0) {
      this.savingBulk = false;
      this.snackBar.open('⚠️ Không tìm thấy ngày nào khớp với cấu hình lọc Thứ!', 'Đóng', { duration: 3000 });
      return;
    }

    const payload = {
      employeeId: this.bulkModel.employeeId,
      shiftId: this.bulkModel.shiftId, // nullable for OFF
      dates: dateStrings
    };

    this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
      next: (res: any) => {
        this.snackBar.open(`✅ ${res.message || 'Phân lịch thành công!'}`, 'Đóng', { duration: 3000 });
        this.fetchAssignments();
        this.closeBulkModal();
        this.savingBulk = false;
      },
      error: (err) => {
        this.savingBulk = false;
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 3500 });
      }
    });
  }

  clearWeekSchedule() {
    this.openConfirm(
      'Làm Mới Lịch Tuần Này',
      `Bạn có chắc chắn muốn làm mới toàn bộ lịch phân ca của tuần này (${this.weekDays[0].dateStr} - ${this.weekDays[6].dateStr}) cho tất cả nhân sự?`,
      () => {
        this.loadingAssignments = true;
        const promises = this.employees.map(emp => {
          const payload = {
            employeeId: emp.id,
            shiftId: null,
            dates: this.weekDays.map(d => d.dateStr)
          };
          return this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).toPromise();
        });

        Promise.all(promises)
          .then(() => {
            this.snackBar.open('✅ Đã làm mới toàn bộ lịch phân ca tuần này!', 'Đóng', { duration: 3000 });
            this.fetchAssignments();
          })
          .catch((err) => {
            this.snackBar.open('❌ Lỗi khi xóa lịch!', 'Đóng', { duration: 3000 });
            this.fetchAssignments();
          });
      }
    );
  }

  clearEmployeeWeek(employee: any) {
    this.openConfirm(
      `Xóa Lịch Nhân Sự`,
      `Bạn có chắc chắn muốn xóa toàn bộ lịch phân ca tuần này của nhân viên ${employee.name}?`,
      () => {
        this.loadingAssignments = true;
        const payload = {
          employeeId: employee.id,
          shiftId: null,
          dates: this.weekDays.map(d => d.dateStr)
        };

        this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
          next: () => {
            this.snackBar.open(`✅ Đã xóa lịch phân ca tuần này của ${employee.name}!`, 'Đóng', { duration: 2000 });
            this.fetchAssignments();
          },
          error: (err) => {
            this.loadingAssignments = false;
            this.snackBar.open('❌ Lỗi khi xóa lịch nhân sự!', 'Đóng', { duration: 3000 });
            this.fetchAssignments();
          }
        });
      }
    );
  }

  getAssignmentShiftId(empId: number, dateStr: string): string | number {
    const assign = this.assignmentGrid[empId]?.[dateStr];
    return assign && assign.shift ? assign.shift.id : 'OFF';
  }

  getShiftColorClassById(shiftId: string | number | undefined | null): string {
    if (!shiftId || shiftId === 'OFF') return 'shift-off';
    const shift = this.shifts.find(s => s.id.toString() === shiftId.toString());
    return shift ? this.getShiftColorClass(shift.name) : 'shift-off';
  }

  getShiftNameById(shiftId: string | number | undefined | null): string {
    if (!shiftId || shiftId === 'OFF') return 'OFF';
    const shift = this.shifts.find(s => s.id.toString() === shiftId.toString());
    return shift ? shift.name : 'OFF';
  }

  toggleCellDropdown(empId: number, dateStr: string, event: Event) {
    event.stopPropagation();
    if (this.activeCellDropdown && this.activeCellDropdown.empId === empId && this.activeCellDropdown.dateStr === dateStr) {
      this.activeCellDropdown = null;
    } else {
      this.activeCellDropdown = { empId, dateStr };
    }
  }

  selectCellShift(employee: any, day: any, shiftId: number | null) {
    const payload = {
      employeeId: employee.id,
      shiftId: shiftId,
      dates: [day.dateStr]
    };

    // Optimistically update the UI grid state instantly to eliminate latency and blinking
    const assign = this.assignmentGrid[employee.id]?.[day.dateStr];
    if (shiftId === null) {
      if (this.assignmentGrid[employee.id]) {
        this.assignmentGrid[employee.id][day.dateStr] = null;
      }
    } else {
      const selectedShift = this.shifts.find(s => s.id === shiftId);
      if (this.assignmentGrid[employee.id]) {
        if (!assign) {
          const tempAssign = {
            employee: { id: employee.id },
            date: day.dateStr,
            shift: selectedShift
          };
          this.assignmentGrid[employee.id][day.dateStr] = tempAssign;
        } else {
          assign.shift = selectedShift;
        }
      }
    }

    this.activeCellDropdown = null;

    this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
      next: () => {
        this.fetchAssignmentsSilent();
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 3500 });
        this.fetchAssignments(); // Rollback to actual server state on failure
      }
    });
  }

  onCellShiftChange(employee: any, day: any, event: any) {
    const selectVal = event.target.value;
    const shiftId = selectVal === 'OFF' ? null : Number(selectVal);
    
    const payload = {
      employeeId: employee.id,
      shiftId: shiftId,
      dates: [day.dateStr]
    };

    // Optimistically update the UI grid state
    const assign = this.assignmentGrid[employee.id]?.[day.dateStr];
    if (shiftId === null) {
      if (this.assignmentGrid[employee.id]) {
        this.assignmentGrid[employee.id][day.dateStr] = null;
      }
    } else {
      const selectedShift = this.shifts.find(s => s.id === shiftId);
      if (this.assignmentGrid[employee.id]) {
        if (!assign) {
          const tempAssign = {
            employee: { id: employee.id },
            date: day.dateStr,
            shift: selectedShift
          };
          this.assignmentGrid[employee.id][day.dateStr] = tempAssign;
        } else {
          assign.shift = selectedShift;
        }
      }
    }

    this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
      next: () => {
        this.fetchAssignmentsSilent();
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 3500 });
        this.fetchAssignments(); // Rollback to actual server state on failure
      }
    });
  }

  getShiftColorClass(shiftName: string | undefined): string {
    if (!shiftName) return 'shift-off';
    const name = shiftName.toLowerCase();
    if (name.includes('sáng')) return 'shift-morning';
    if (name.includes('chiều')) return 'shift-afternoon';
    if (name.includes('gãy')) return 'shift-broken';
    return 'shift-custom';
  }

  // ── Confirmation Modal ────────────────────────────────────────────────────
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
