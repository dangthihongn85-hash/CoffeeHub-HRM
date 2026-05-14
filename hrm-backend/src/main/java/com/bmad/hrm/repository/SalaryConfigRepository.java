package com.bmad.hrm.repository;

import com.bmad.hrm.entity.SalaryConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SalaryConfigRepository extends JpaRepository<SalaryConfig, Long> {
}
