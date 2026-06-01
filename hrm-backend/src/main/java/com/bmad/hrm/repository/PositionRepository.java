package com.bmad.hrm.repository;

import com.bmad.hrm.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    List<Position> findByDepartmentName(String departmentName);
    void deleteByDepartmentName(String departmentName);

    @Modifying
    @Query("UPDATE Position p SET p.departmentName = :newName WHERE p.departmentName = :oldName")
    void updateDepartmentName(String oldName, String newName);
}
