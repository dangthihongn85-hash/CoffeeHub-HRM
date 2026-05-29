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

  get activeEmployees(): any[] {
    return this.employees.filter(e => e.status !== 'LEAVE');
  }

  get filteredEmployees(): any[] {
    // 1. Filter active employees OR inactive ones who have assignments in the current week
    const eligibleEmployees = this.employees.filter(emp => {
      if (emp.status !== 'LEAVE') {
        return true;
      }
      return this.weekDays.some(day => {
        const assign = this.assignmentGrid[emp.id] && this.assignmentGrid[emp.id][day.dateStr];
        return assign != null;
      });
    });

    // 2. Apply the shift filter
    if (this.filterShiftId === 'ALL') {
      return eligibleEmployees;
    }
    
    return eligibleEmployees.filter(emp => {
      return this.weekDays.some(day => {
        const assign = this.assignmentGrid[emp.id] && this.assignmentGrid[emp.id][day.dateStr];
        const shiftIdVal = assign && assign.shift ? assign.shift.id : 'OFF';
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

    // Collect all dates that match selected days of the week, excluding past dates
    const dateStrings: string[] = [];
    let skippedPastCount = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, etc.
      if (this.bulkModel.selectedDays[dayOfWeek]) {
        const dateStr = this.formatDate(current);
        if (this.isPastDate(dateStr)) {
          skippedPastCount++;
        } else {
          dateStrings.push(dateStr);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    if (dateStrings.length === 0) {
      this.savingBulk = false;
      if (skippedPastCount > 0) {
        this.snackBar.open('⚠️ Tất cả các ngày được chọn đều thuộc về quá khứ và bị khóa chỉnh sửa!', 'Đóng', { duration: 4000 });
      } else {
        this.snackBar.open('⚠️ Không tìm thấy ngày nào khớp với cấu hình lọc Thứ!', 'Đóng', { duration: 3000 });
      }
      return;
    }

    const payload = {
      employeeId: this.bulkModel.employeeId,
      shiftId: this.bulkModel.shiftId, // nullable for OFF
      dates: dateStrings
    };

    this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
      next: (res: any) => {
        let msg = `✅ Đã phân lịch thành công!`;
        if (skippedPastCount > 0) {
          msg += ` (Đã bỏ qua ${skippedPastCount} ngày trong quá khứ)`;
        }
        this.snackBar.open(msg, 'Đóng', { duration: 4000 });
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
    const activeDates = this.weekDays.map(d => d.dateStr).filter(d => !this.isPastDate(d));
    if (activeDates.length === 0) {
      this.snackBar.open('⚠️ Tất cả các ngày trong tuần này đã thuộc về quá khứ và bị khóa!', 'Đóng', { duration: 4000 });
      return;
    }

    this.openConfirm(
      'Làm Mới Lịch Tuần Này',
      `Bạn có chắc chắn muốn làm mới toàn bộ lịch phân ca của các ngày khả dụng trong tuần này (giữ nguyên các ca trong quá khứ) cho tất cả nhân sự?`,
      () => {
        this.loadingAssignments = true;
        const promises = this.employees.map(emp => {
          const payload = {
            employeeId: emp.id,
            shiftId: null,
            dates: activeDates
          };
          return this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).toPromise();
        });

        Promise.all(promises)
          .then(() => {
            this.snackBar.open('✅ Đã làm mới lịch phân ca các ngày khả dụng tuần này!', 'Đóng', { duration: 3000 });
            this.fetchAssignments();
          })
          .catch((err) => {
            this.snackBar.open('❌ Lỗi khi làm mới lịch!', 'Đóng', { duration: 3000 });
            this.fetchAssignments();
          });
      }
    );
  }

  clearEmployeeWeek(employee: any) {
    const activeDates = this.weekDays.map(d => d.dateStr).filter(d => !this.isPastDate(d));
    if (activeDates.length === 0) {
      this.snackBar.open('⚠️ Tất cả các ngày trong tuần này đã thuộc về quá khứ và bị khóa!', 'Đóng', { duration: 4000 });
      return;
    }

    this.openConfirm(
      `Xóa Lịch Nhân Sự`,
      `Bạn có chắc chắn muốn xóa lịch phân ca các ngày khả dụng trong tuần này của nhân viên ${employee.name} (giữ nguyên các ca trong quá khứ)?`,
      () => {
        this.loadingAssignments = true;
        const payload = {
          employeeId: employee.id,
          shiftId: null,
          dates: activeDates
        };

        this.http.post('http://localhost:8080/api/shifts/assignments/bulk', payload).subscribe({
          next: () => {
            this.snackBar.open(`✅ Đã xóa lịch phân ca các ngày khả dụng tuần này của ${employee.name}!`, 'Đóng', { duration: 2000 });
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

  isPastDate(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const dateParts = dateStr.split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const targetDate = new Date(year, month, day);
      targetDate.setHours(0,0,0,0);
      
      return targetDate < today;
    }
    return false;
  }

  isWeekPast(): boolean {
    if (this.weekDays.length === 0) return false;
    return this.weekDays.every(d => this.isPastDate(d.dateStr));
  }

  toggleCellDropdown(empId: number, dateStr: string, event: Event) {
    event.stopPropagation();
    if (this.isPastDate(dateStr)) {
      this.snackBar.open('⚠️ Không thể chỉnh sửa ca làm việc trong quá khứ!', 'Đóng', { duration: 3000 });
      return;
    }
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

  // ── Export PDF Feature ───────────────────────────────────────────────────
  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  getShiftTimeStrById(shiftId: string | number | undefined | null): string {
    if (!shiftId || shiftId === 'OFF') return '';
    const shift = this.shifts.find(s => s.id.toString() === shiftId.toString());
    if (shift) {
      return `${shift.startTime.substring(0, 5)} - ${shift.endTime.substring(0, 5)}`;
    }
    return '';
  }

  getLegendColor(shiftName: string | undefined): string {
    if (!shiftName) return '#94a3b8'; // OFF (slate)
    const name = shiftName.toLowerCase();
    if (name.includes('sáng')) return '#3b82f6'; // Blue
    if (name.includes('chiều')) return '#f59e0b'; // Amber
    if (name.includes('gãy')) return '#ef4444'; // Red
    return '#6366f1'; // Indigo
  }

  exportPDF() {
    if (this.weekDays.length === 0) {
      this.snackBar.open('⚠️ Không tìm thấy thông tin lịch phân ca!', 'Đóng', { duration: 3000 });
      return;
    }

    const startDateStr = this.formatDisplayDate(this.weekDays[0].dateStr);
    const endDateStr = this.formatDisplayDate(this.weekDays[6].dateStr);

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      this.snackBar.open('⚠️ Trình duyệt đã chặn cửa sổ popup. Vui lòng cấp quyền mở popup để xuất PDF!', 'Đóng', { duration: 5000 });
      return;
    }

    const employeesToPrint = this.filteredEmployees;
    
    let tableRowsHtml = '';
    employeesToPrint.forEach(emp => {
      let dayCellsHtml = '';
      this.weekDays.forEach(day => {
        const shiftId = this.getAssignmentShiftId(emp.id, day.dateStr);
        const shiftName = this.getShiftNameById(shiftId);
        const shiftTimeStr = this.getShiftTimeStrById(shiftId);

        let badgeStyle = '';
        let timeHtml = '';
        if (shiftId === 'OFF') {
          badgeStyle = 'background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;';
        } else {
          const nameLower = shiftName.toLowerCase();
          if (nameLower.includes('sáng')) {
            badgeStyle = 'background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-weight: bold;';
          } else if (nameLower.includes('chiều')) {
            badgeStyle = 'background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: bold;';
          } else if (nameLower.includes('gãy')) {
            badgeStyle = 'background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-weight: bold;';
          } else {
            badgeStyle = 'background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; font-weight: bold;';
          }
          timeHtml = `<div style="font-size: 10px; margin-top: 2px; font-weight: normal; color: #64748b;">${shiftTimeStr}</div>`;
        }

        dayCellsHtml += `
          <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; vertical-align: middle;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 12px; ${badgeStyle}">
              ${shiftName}
            </span>
            ${timeHtml}
          </td>
        `;
      });

      tableRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="border: 1px solid #cbd5e1; padding: 12px; font-weight: bold; color: #0f172a;">
            <div style="font-size: 14px;">${emp.name}</div>
            <div style="font-size: 11px; font-weight: normal; color: #64748b; margin-top: 2px;">${emp.position || 'Nhân viên'}</div>
          </td>
          ${dayCellsHtml}
        </tr>
      `;
    });

    let shiftLegendsHtml = '';
    this.shifts.forEach(s => {
      shiftLegendsHtml += `
        <span style="margin-right: 15px; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: bold; color: #334155;">
          <span style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; background-color: ${this.getLegendColor(s.name)}"></span>
          ${s.name} (${s.startTime.substring(0, 5)} - ${s.endTime.substring(0, 5)})
        </span>
      `;
    });

    shiftLegendsHtml += `
      <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: bold; color: #334155;">
        <span style="width: 10px; height: 10px; border-radius: 50%; display: inline-block; background-color: #94a3b8"></span>
        Nghỉ (OFF)
      </span>
    `;

    let weekHeaderColsHtml = '';
    this.weekDays.forEach(day => {
      const dayDisplayDate = this.formatDisplayDate(day.dateStr).substring(0, 5); // dd/MM
      weekHeaderColsHtml += `
        <th style="border: 1px solid #cbd5e1; background-color: #f8fafc; color: #334155; padding: 12px; text-align: center; width: 11%;">
          <div style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${day.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${dayDisplayDate}</div>
        </th>
      `;
    });

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CoffeeHub - Bảng Phân Ca Hàng Tuần</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 26px;
            font-weight: 900;
            background: linear-gradient(135deg, #4f46e5, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #1e1b4b;
            margin-top: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .date-range {
            font-size: 14px;
            font-weight: bold;
            color: #4f46e5;
            margin-top: 4px;
          }
          .meta-info {
            text-align: right;
            font-size: 12px;
            color: #64748b;
          }
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .legends-container {
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            padding: 10px 15px;
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .footer-container {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 10px;
          }
          .signature-box {
            width: 250px;
            text-align: center;
          }
          .signature-title {
            font-size: 13px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
          }
          .signature-space {
            height: 70px;
          }
          .signature-name {
            font-size: 13px;
            font-style: italic;
            color: #64748b;
          }
          .rules-note {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 11px;
            color: #991b1b;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div>
            <h1 class="brand-title">☕ CoffeeHub HRM</h1>
            <div class="doc-title">Bảng Phân Công Lịch Làm Việc Tuần</div>
            <div class="date-range">Tuần: ${startDateStr} - ${endDateStr}</div>
          </div>
          <div class="meta-info">
            <div>Ngày xuất bản: ${new Date().toLocaleDateString('vi-VN')}</div>
            <div>Trạng thái: Đã phê duyệt chính thức</div>
          </div>
        </div>

        <table class="schedule-table">
          <thead>
            <tr>
              <th style="border: 1px solid #cbd5e1; background-color: #f8fafc; color: #334155; padding: 12px; text-align: left; width: 18%; font-size: 13px; font-weight: bold; text-transform: uppercase;">Nhân Viên</th>
              ${weekHeaderColsHtml}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="legends-container">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Chú thích các ca làm:</div>
          <div>
            ${shiftLegendsHtml}
          </div>
        </div>

        <div class="rules-note">
          <strong>LƯU Ý QUAN TRỌNG:</strong> Tất cả nhân sự đi làm đúng giờ (trước ca 10 phút), mặc đồng phục đúng quy định và check-in đầy đủ trên hệ thống. 
          Mọi yêu cầu đổi ca làm việc hoặc xin nghỉ xin vui lòng liên hệ trực tiếp với Quản lý tối thiểu trước 24 giờ để được phê duyệt.
        </div>

        <div class="footer-container">
          <div class="signature-box">
            <div class="signature-title">Xác nhận của nhân viên</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">(Ký và ghi rõ họ tên)</div>
            <div class="signature-space"></div>
            <div class="signature-name">Đại diện tập thể nhân sự</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Người duyệt lịch phân ca</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">(Ký tên, đóng dấu)</div>
            <div class="signature-space"></div>
            <div class="signature-name">Quản lý CoffeeHub</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
}
