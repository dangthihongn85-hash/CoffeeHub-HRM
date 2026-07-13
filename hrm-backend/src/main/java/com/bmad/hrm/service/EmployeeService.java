package com.bmad.hrm.service;

import com.bmad.hrm.dto.EmployeeDto;
import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.repository.EmployeeRepository;
import com.bmad.hrm.repository.SalaryRepository;
import com.bmad.hrm.repository.AttendanceRepository;
import com.bmad.hrm.repository.ShiftAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final SalaryRepository salaryRepository;
    private final AttendanceRepository attendanceRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public List<EmployeeDto> getAllEmployees() {
        return employeeRepository.findAll().stream()
                .filter(e -> e.getRole() != com.bmad.hrm.entity.Role.ADMIN && !"DELETED".equals(e.getStatus()))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public EmployeeDto createEmployee(EmployeeDto employeeDto) {
        if (employeeRepository.findByEmail(employeeDto.getEmail()).isPresent()) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống!");
        }
        Employee employee = mapToEntity(employeeDto);
        if (employee.getPassword() == null || employee.getPassword().isEmpty()) {
            employee.setPassword(passwordEncoder.encode("123456"));
        } else {
            employee.setPassword(passwordEncoder.encode(employee.getPassword()));
        }
        Employee saved = employeeRepository.save(employee);
        return mapToDto(saved);
    }

    public EmployeeDto updateEmployee(Long id, EmployeeDto updated) {
        Employee existing = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên"));

        if (!existing.getEmail().equals(updated.getEmail()) &&
                employeeRepository.findByEmail(updated.getEmail()).isPresent()) {
            throw new RuntimeException("Email đã tồn tại trong hệ thống!");
        }

        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPosition(updated.getPosition());
        existing.setDepartment(updated.getDepartment());
        if (updated.getStatus() != null)
            existing.setStatus(updated.getStatus());
        if (updated.getSalaryBase() != null)
            existing.setSalaryBase(updated.getSalaryBase());
        if (updated.getEmployeeType() != null)
            existing.setEmployeeType(updated.getEmployeeType());
        if (updated.getRole() != null)
            existing.setRole(updated.getRole());
        if (updated.getPassword() != null && !updated.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(updated.getPassword()));
        }

        return mapToDto(employeeRepository.save(existing));
    }

    @Transactional
    public void deleteEmployee(Long id) {
        employeeRepository.findById(id).ifPresent(e -> {
            e.setStatus("DELETED");
            employeeRepository.save(e);
        });
    }

    private EmployeeDto mapToDto(Employee employee) {
        EmployeeDto dto = new EmployeeDto();
        dto.setId(employee.getId());
        dto.setName(employee.getName());
        dto.setEmail(employee.getEmail());
        dto.setDepartment(employee.getDepartment());
        dto.setRole(employee.getRole());
        dto.setEmployeeType(employee.getEmployeeType());
        dto.setSalaryBase(employee.getSalaryBase());
        dto.setPosition(employee.getPosition());
        dto.setStatus(employee.getStatus());
        dto.setFaceDescriptor(
                employee.getFaceDescriptor() != null && !employee.getFaceDescriptor().isEmpty() ? "REGISTERED" : null);
        return dto;
    }

    private Employee mapToEntity(EmployeeDto dto) {
        return Employee.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .password(dto.getPassword())
                .department(dto.getDepartment())
                .role(dto.getRole())
                .employeeType(dto.getEmployeeType())
                .salaryBase(dto.getSalaryBase())
                .position(dto.getPosition())
                .status(dto.getStatus() == null ? "ACTIVE" : dto.getStatus())
                .build();
    }
}
