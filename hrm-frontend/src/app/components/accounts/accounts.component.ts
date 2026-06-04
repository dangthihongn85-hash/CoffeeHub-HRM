import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts: any[] = [];
  filteredAccounts: any[] = [];
  searchQuery: string = '';
  filterRole: string = '';
  filterStatus: string = '';
  loading = false;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  pagedAccounts: any[] = [];

  // Add Account form
  isAdding = false;
  newAccount = {
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    employeeType: 'FULL_TIME',
    salaryBase: 6000000,
    position: ''
  };

  // Edit Account form
  editingId: number | null = null;
  editModel: any = {};

  // Reset Password Modal
  showResetModal = false;
  selectedAccountForReset: any = null;
  newPasswordValue = '';

  // Validation
  validationErrors: any = {};

  // Stats
  totalAccounts = 0;
  adminCount = 0;
  hrCount = 0;
  employeeCount = 0;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.fetchAccounts();
  }

  calculateStats() {
    this.totalAccounts = this.accounts.length;
    this.adminCount = this.accounts.filter(a => a.role === 'ADMIN').length;
    this.hrCount = this.accounts.filter(a => a.role === 'HR').length;
    this.employeeCount = this.accounts.filter(a => a.role === 'EMPLOYEE').length;
  }

  fetchAccounts() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8080/api/employees').subscribe({
      next: (data) => {
        // Filter out DELETED accounts
        this.accounts = data.filter(e => e.status !== 'DELETED').sort((a, b) => b.id - a.id);
        this.calculateStats();
        this.filteredAccounts = [...this.accounts];
        this.updatePagedData();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('❌ Lỗi tải danh sách tài khoản!', 'Đóng', { duration: 3000 });
      }
    });
  }

  updatePagedData() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedAccounts = this.filteredAccounts.slice(start, end);
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedData();
  }

  onSearch() {
    this.filteredAccounts = this.accounts.filter(a => {
      let matchesSearch = true;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        matchesSearch = a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      }
      let matchesRole = this.filterRole ? a.role === this.filterRole : true;
      let matchesStatus = this.filterStatus ? a.status === this.filterStatus : true;
      return matchesSearch && matchesRole && matchesStatus;
    });
    this.pageIndex = 0;
    this.updatePagedData();
  }

  toggleAdd() {
    this.isAdding = !this.isAdding;
    this.newAccount = {
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      employeeType: 'FULL_TIME',
      salaryBase: 6000000,
      position: ''
    };
    this.validationErrors = {};
  }

  saveAccount() {
    this.validationErrors = {};
    let hasError = false;

    if (!this.newAccount.name || !this.newAccount.name.trim()) {
      this.validationErrors.name = '⚠️ Họ tên không được để trống!';
      hasError = true;
    }
    if (!this.newAccount.email || !this.newAccount.email.trim()) {
      this.validationErrors.email = '⚠️ Email không được để trống!';
      hasError = true;
    }
    if (!this.newAccount.password || this.newAccount.password.length < 6) {
      this.validationErrors.password = '⚠️ Mật khẩu phải tối thiểu 6 ký tự!';
      hasError = true;
    }

    if (hasError) return;

    this.loading = true;
    this.http.post<any>('http://localhost:8080/api/employees', this.newAccount).subscribe({
      next: (res) => {
        this.accounts.unshift(res);
        this.calculateStats();
        this.onSearch();
        this.isAdding = false;
        this.loading = false;
        this.snackBar.open('✅ Đã thêm tài khoản thành công!', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 4000 });
      }
    });
  }

  startEdit(account: any) {
    this.editingId = account.id;
    this.editModel = { ...account, password: '' };
  }

  cancelEdit() {
    this.editingId = null;
    this.validationErrors = {};
  }

  saveEdit() {
    this.validationErrors = {};
    let hasError = false;

    if (!this.editModel.name || !this.editModel.name.trim()) {
      this.validationErrors.editName = '⚠️ Họ tên không được để trống!';
      hasError = true;
    }
    if (!this.editModel.email || !this.editModel.email.trim()) {
      this.validationErrors.editEmail = '⚠️ Email không được để trống!';
      hasError = true;
    }

    if (hasError) return;

    this.http.put<any>(`http://localhost:8080/api/employees/${this.editingId}`, this.editModel).subscribe({
      next: (res) => {
        const idx = this.accounts.findIndex(a => a.id === this.editingId);
        if (idx !== -1) {
          this.accounts[idx] = res;
        }
        this.calculateStats();
        this.onSearch();
        this.editingId = null;
        this.snackBar.open('✅ Đã cập nhật tài khoản thành công!', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 3000 });
      }
    });
  }

  deleteAccount(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này không?')) {
      this.http.delete(`http://localhost:8080/api/employees/${id}`).subscribe({
        next: () => {
          this.accounts = this.accounts.filter(a => a.id !== id);
          this.calculateStats();
          this.onSearch();
          this.snackBar.open('✅ Đã xóa tài khoản thành công!', 'Đóng', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('❌ Lỗi xóa tài khoản!', 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  openResetModal(account: any) {
    this.selectedAccountForReset = account;
    this.newPasswordValue = '';
    this.showResetModal = true;
  }

  closeResetModal() {
    this.showResetModal = false;
    this.selectedAccountForReset = null;
    this.newPasswordValue = '';
  }

  submitResetPassword() {
    if (!this.newPasswordValue || this.newPasswordValue.length < 6) {
      this.snackBar.open('⚠️ Mật khẩu mới phải từ 6 ký tự trở lên!', 'Đóng', { duration: 3000 });
      return;
    }

    const payload = {
      ...this.selectedAccountForReset,
      password: this.newPasswordValue
    };

    this.http.put<any>(`http://localhost:8080/api/employees/${this.selectedAccountForReset.id}`, payload).subscribe({
      next: () => {
        this.snackBar.open('✅ Đã đặt lại mật khẩu thành công!', 'Đóng', { duration: 3000 });
        this.closeResetModal();
      },
      error: (err) => {
        this.snackBar.open('❌ Lỗi: ' + (err.error?.message || err.message), 'Đóng', { duration: 3500 });
      }
    });
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'role-admin';
      case 'HR': return 'role-hr';
      default: return 'role-employee';
    }
  }
}
