package com.bmad.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "positions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Position {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "department_name")
    private String departmentName;
}
