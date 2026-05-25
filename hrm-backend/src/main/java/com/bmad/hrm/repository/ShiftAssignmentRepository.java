package com.bmad.hrm.repository;

import com.bmad.hrm.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {
    Optional<ShiftAssignment> findByEmployeeIdAndDate(Long employeeId, LocalDate date);
    
    List<ShiftAssignment> findByDateBetween(LocalDate start, LocalDate end);
    
    List<ShiftAssignment> findByEmployeeIdAndDateBetween(Long employeeId, LocalDate start, LocalDate end);
    
    void deleteByEmployeeIdAndDate(Long employeeId, LocalDate date);
    
    void deleteByEmployeeId(Long employeeId);
}
