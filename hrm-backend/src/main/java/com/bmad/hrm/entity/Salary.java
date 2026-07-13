package com.bmad.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "salaries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Integer year;

    // Loại nhân viên tại thời điểm tính lương (snapshot)
    @Enumerated(EnumType.STRING)
    @Column(name = "employee_type")
    private EmployeeType employeeType;

    // ---- Giờ công ----
    @Column(name = "regular_hours")
    private Double regularHours;     // Giờ làm bình thường

    @Column(name = "ot_hours")
    private Double otHours;          // Giờ tăng ca

    @Column(name = "holiday_hours")
    private Double holidayHours;     // Giờ làm ngày lễ

    @Column(name = "work_days")
    private Double workDays;        // Số công làm việc (Double)

    // ---- Lương ----
    @Column(name = "base_salary")
    private Double baseSalary;       // Lương giờ/tháng cơ bản gốc

    @Column(name = "actual_base_salary")
    private Double actualBaseSalary; // Lương cơ bản tính theo công thực tế

    @Column(name = "ot_salary")
    private Double otSalary;         // Lương OT

    @Column(name = "holiday_salary")
    private Double holidaySalary;    // Lương/thưởng ngày lễ

    // ---- Thưởng ----
    @Column(name = "bonus_attendance")
    private Double bonusAttendance;  // Thưởng chuyên cần (đủ 26 ngày + không đi trễ)

    @Column(name = "bonus_revenue")
    private Double bonusRevenue;     // Thưởng doanh thu (POOL)

    // ---- Phạt ----
    @Column(name = "penalty_late")
    private Double penaltyLate;      // Phạt đi trễ

    @Column(name = "penalty_no_checkout")
    private Double penaltyNoCheckout; // Phạt thiếu check-out

    @Column(name = "penalty_absent")
    private Double penaltyAbsent;    // Phạt nghỉ không phép

    // ---- Tổng ----
    @Column(name = "total_penalty")
    private Double totalPenalty;

    @Column(name = "total_bonus")
    private Double totalBonus;

    @Column(name = "total_salary")
    private Double totalSalary;      // Lương cuối cùng

    @Column(name = "status")
    @Builder.Default
    private String status = "PENDING";
}
