package com.bmad.hrm.repository;

import com.bmad.hrm.entity.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, Long> {
    List<Salary> findByMonthAndYear(Integer month, Integer year);
    Optional<Salary> findByEmployeeIdAndMonthAndYear(Long employeeId, Integer month, Integer year);
    void deleteByEmployeeId(Long employeeId);
}
