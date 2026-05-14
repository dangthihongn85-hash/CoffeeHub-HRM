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
  allPositions: any[] = [];
  filteredPositions: any[] = []; // Current list for the dropdown

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.fetchData();
    this.loadDropdowns();
  }

  loadDropdowns() {
    this.http.get<any[]>('http://localhost:8080/api/departments').subscribe(data => {
      this.availableDepartments = data;
    });
    this.http.get<any[]>('http://localhost:8080/api/departments/positions').subscribe(data => {
      this.allPositions = data;
    });
  }

  onDeptChange(deptName: string) {
    this.filteredPositions = this.allPositions.filter(p => p.departmentName === deptName);
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
    if(confirm('Bạn có chắc chắn muốn xoá nhân viên này không? Dữ liệu không thể khôi phục.')) {
      this.http.delete(`http://localhost:8080/api/employees/${id}`).subscribe({
        next: () => {
          this.employees = this.employees.filter(e => e.id !== id);
          this.onSearch(false);
          this.calculateStats();
          this.snackBar.open('✅ Đã xoá nhân viên', 'Đóng', {duration: 3000});
        },
        error: (err) => this.snackBar.open('❌ Lỗi xoá nhân viên', 'Đóng', {duration: 3000})
      });
    }
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
}
