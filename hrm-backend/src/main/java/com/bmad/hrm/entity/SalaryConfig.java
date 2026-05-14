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

    private Double latePenalty; // Tiền phạt mỗi ngày đi muộn
    private Double perfectAttendanceBonus; // Tiền thưởng chuyên cần
    private Integer requiredPerfectDays; // Số ngày đúng giờ tối thiểu để nhận thưởng
}
