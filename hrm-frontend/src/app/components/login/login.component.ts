import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

  constructor(private authService: AuthService, private router: Router) {}

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
}
