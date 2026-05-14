package com.bmad.hrm.dto;

import com.bmad.hrm.entity.EmployeeType;
import com.bmad.hrm.entity.Role;
import lombok.Data;

@Data
public class EmployeeDto {
    private Long id;
    private String name;
    private String email;
    private String password;
    private String department;
    private Role role;
    private EmployeeType employeeType;  // PART_TIME | FULL_TIME | MANAGER
    private Double salaryBase;
    private String position;
    private String status;
    private String faceDescriptor;
}
