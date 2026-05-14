package com.bmad.hrm.repository;

import com.bmad.hrm.entity.MonthlyRevenue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MonthlyRevenueRepository extends JpaRepository<MonthlyRevenue, Long> {
    Optional<MonthlyRevenue> findByMonthAndYear(Integer month, Integer year);
}
