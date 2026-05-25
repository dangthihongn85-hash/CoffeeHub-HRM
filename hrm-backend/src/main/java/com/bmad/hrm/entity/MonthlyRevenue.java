package com.bmad.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Lưu doanh thu tháng để tính quỹ thưởng POOL.
 * bonus_pool = monthly_revenue * 1%
 */
@Entity
@Table(name = "monthly_revenues",
       uniqueConstraints = @UniqueConstraint(columnNames = {"month", "year"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyRevenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer month;

    @Column(nullable = false)
    private Integer year;

    @Column(name = "monthly_revenue", nullable = false)
    private Double monthlyRevenue;

    /** Quỹ thưởng = 1% doanh thu */
    @Column(name = "bonus_pool")
    private Double bonusPool;

    @Column(name = "bonus_rate")
    private Double bonusRate; // e.g. 1.0 for 1%, 2.5 for 2.5%

    @Column(name = "notes")
    private String notes;
}
