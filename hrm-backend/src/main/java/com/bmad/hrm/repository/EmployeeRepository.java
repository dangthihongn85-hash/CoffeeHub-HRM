package com.bmad.hrm.repository;

import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.entity.EmployeeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmail(String email);
    List<Employee> findByEmployeeType(EmployeeType type);
    long countByEmployeeType(EmployeeType type);

    @Modifying
    @Query("UPDATE Employee e SET e.position = :newName WHERE e.position = :oldName")
    void updateEmployeePositionName(String oldName, String newName);

    @Modifying
    @Query("UPDATE Employee e SET e.department = :newName WHERE e.department = :oldName")
    void updateEmployeeDepartmentName(String oldName, String newName);
}
