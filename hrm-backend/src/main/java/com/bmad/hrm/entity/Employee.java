package com.bmad.hrm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.bmad.hrm.entity.EmployeeType;

@Entity
@Table(name = "employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String department;

    private String position;

    private String status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "salary_base")
    private Double salaryBase;

    @Enumerated(EnumType.STRING)
    @Column(name = "employee_type")
    private EmployeeType employeeType; // PART_TIME | FULL_TIME | MANAGER

    @Column(name = "face_descriptor", columnDefinition = "TEXT")
    private String faceDescriptor; // JSON array of Float128 from face-api.js

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
