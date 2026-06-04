package com.bmad.hrm.dto;

import com.bmad.hrm.entity.EmployeeType;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * DTO đầy đủ cho phiếu lương - trả về cho frontend.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SalaryPayrollDto {
    private Long salaryId;
    private Long employeeId;
    private String employeeName;
    private String department;
    private String position;
    private EmployeeType employeeType;

    private Integer month;
    private Integer year;

    // Giờ công
    private Double regularHours;
    private Double otHours;
    private Double holidayHours;
    private Double workDays;

    // Lương
    private Double baseSalary;
    private Double actualBaseSalary;
    private Double otSalary;
    private Double holidaySalary;

    // Thưởng
    private Double bonusAttendance;   // Thưởng chuyên cần
    private Double bonusRevenue;      // Thưởng doanh thu POOL
    private Double totalBonus;

    // Phạt
    private Double penaltyLate;
    private Double penaltyNoCheckout;
    private Double penaltyAbsent;
    private Double totalPenalty;

    // Tổng
    private Double totalSalary;

    // Thống kê chấm công
    private Long lateDays;
    private Long specialLeaveDays;
    private Long absentNoPerm;
    private Long noCheckoutDays;
    private Long earlyDays;

    private String status;
}
