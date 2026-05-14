package com.bmad.hrm.repository;

import com.bmad.hrm.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByEmployeeIdAndDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    Optional<Attendance> findByEmployeeIdAndDate(Long employeeId, LocalDate date);
    List<Attendance> findByDateBetweenOrderByDateDescCheckInTimeDesc(LocalDate startDate, LocalDate endDate);
    List<Attendance> findByDateOrderByCheckInTimeDesc(LocalDate date);
    void deleteByEmployeeId(Long employeeId);
}
