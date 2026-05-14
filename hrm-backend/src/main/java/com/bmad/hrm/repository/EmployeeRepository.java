package com.bmad.hrm.repository;

import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.entity.EmployeeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmail(String email);
    List<Employee> findByEmployeeType(EmployeeType type);
    long countByEmployeeType(EmployeeType type);
}
