import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { EmployeesComponent } from './components/employees/employees.component';
import { AttendanceComponent } from './components/attendance/attendance.component';
import { SalaryComponent } from './components/salary/salary.component';
import { SalaryManagementComponent } from './components/salary-management/salary-management.component';
import { DepartmentsComponent } from './components/departments/departments.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: LayoutComponent, 
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'employees', pathMatch: 'full' },
      { path: 'employees', component: EmployeesComponent },
      { path: 'attendance', component: AttendanceComponent },
      { path: 'salary-management', component: SalaryManagementComponent },
      { path: 'departments', component: DepartmentsComponent },
      { path: 'salaries', component: SalaryComponent }
    ]
  },
  { path: '**', redirectTo: 'employees' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
