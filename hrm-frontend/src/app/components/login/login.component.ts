import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  // Change password properties
  showChangePasswordModal = false;
  cpEmail = '';
  cpOldPassword = '';
  cpNewPassword = '';
  cpConfirmPassword = '';
  cpLoading = false;
  cpError = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  login() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    
    // Simulating call for graduation project when local auth might lack DB users initially
    if (this.email === 'admin@bmad.com' && this.password === 'admin') {
      localStorage.setItem('hrm_token', 'mock-admin-token');
      this.router.navigate(['/']);
      this.loading = false;
      return;
    }

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Đăng nhập thất bại. Kiểm tra lại thông tin!';
      }
    });
  }

  openChangePassword() {
    this.showChangePasswordModal = true;
    this.cpEmail = this.email; // Prefill if user already typed it
    this.cpOldPassword = '';
    this.cpNewPassword = '';
    this.cpConfirmPassword = '';
    this.cpError = '';
  }

  closeChangePassword() {
    this.showChangePasswordModal = false;
  }

  changePassword() {
    if (!this.cpEmail || !this.cpOldPassword || !this.cpNewPassword || !this.cpConfirmPassword) {
      this.cpError = 'Vui lòng điền đầy đủ các thông tin!';
      return;
    }

    if (this.cpNewPassword !== this.cpConfirmPassword) {
      this.cpError = 'Mật khẩu xác nhận không khớp!';
      return;
    }

    if (this.cpNewPassword.length < 6) {
      this.cpError = 'Mật khẩu mới phải từ 6 ký tự trở lên!';
      return;
    }

    this.cpLoading = true;
    this.cpError = '';

    this.authService.changePassword({
      email: this.cpEmail,
      oldPassword: this.cpOldPassword,
      newPassword: this.cpNewPassword
    }).subscribe({
      next: (res) => {
        this.cpLoading = false;
        this.snackBar.open('Đổi mật khẩu thành công!', 'Đóng', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.closeChangePassword();
      },
      error: (err) => {
        this.cpLoading = false;
        this.cpError = err.error?.message || 'Có lỗi xảy ra, vui lòng thử lại!';
      }
    });
  }
}
