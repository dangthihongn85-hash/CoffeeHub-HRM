package com.bmad.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "salary_configs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SalaryConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- ⏰ Cấu hình ca làm & thời gian ---
    @Builder.Default
    private Integer lateGraceMinutes = 10; // Số phút đi muộn cho phép

    @Builder.Default
    private Integer earlyGraceMinutes = 0; // Số phút về sớm cho phép

    @Builder.Default
    private Integer absentThresholdMinutes = 240; // Ngưỡng tự động nghỉ không phép (4 tiếng)

    @Builder.Default
    private Double standardWorkingHours = 8.0; // Số giờ công chuẩn 1 ngày

    // --- 🎁 Chế độ thưởng chuyên cần ---
    @Builder.Default
    private Integer requiredPerfectDays = 26; // Số ngày công tối thiểu để nhận thưởng

    @Builder.Default
    private Double perfectAttendanceBonus = 200000.0; // Thưởng chuyên cần tròn công

    @Builder.Default
    private Double bonusNoLate = 100000.0; // Thưởng không đi muộn ngày nào

    // --- 💸 Mức phạt vi phạm ---
    @Builder.Default
    private Double latePenalty = 50000.0; // Tiền phạt mỗi ngày đi muộn

    @Builder.Default
    private Double missingCheckoutPenalty = 50000.0; // Phạt thiếu Check-out

    @Builder.Default
    private Double absentPenalty = 100000.0; // Phạt nghỉ không phép

    // --- 💰 Lương chuẩn mặc định ---
    @Builder.Default
    private Double partTimeHourlyRate = 20000.0; // Lương giờ Part-time mặc định

    @Builder.Default
    private Double fullTimeBaseSalary = 6000000.0; // Lương tháng mặc định Full-time

    @Builder.Default
    private Double managerBaseSalary = 8000000.0; // Lương cứng mặc định Quản lý

    @Builder.Default
    private Double managerAllowance = 500000.0; // Phụ cấp mặc định Quản lý

    @Builder.Default
    private Double otMultiplier = 1.5; // Hệ số lương OT

    // --- 📈 Quỹ thưởng doanh thu ---
    @Builder.Default
    private Double revenuePoolRate = 1.0; // % trích quỹ doanh thu tháng (ví dụ: 1.0%)

    @Builder.Default
    private Double fullTimeShareWeight = 1.0; // Trọng số chia thưởng Full-time

    @Builder.Default
    private Double managerShareWeight = 2.0; // Trọng số chia thưởng Quản lý
}
