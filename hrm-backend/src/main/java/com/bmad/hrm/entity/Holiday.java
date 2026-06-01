package com.bmad.hrm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "holidays")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Holiday {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    @Builder.Default
    private Double coefficient = 3.0; // Hệ số lương Part-time (x2, x3...)

    @Column(nullable = false, name = "full_time_bonus")
    @Builder.Default
    private Double fullTimeBonus = 500000.0; // Tiền thưởng cố định cho Full-time (VND)

    @Column(nullable = false, name = "manager_bonus")
    @Builder.Default
    private Double managerBonus = 1000000.0; // Tiền thưởng cố định cho Manager (VND)

    @Column(nullable = false, name = "repeat_yearly")
    @Builder.Default
    private Boolean repeatYearly = false; // Lặp lại hàng năm (repeat yearly)
}
