package com.bmad.hrm.controller;

import com.bmad.hrm.entity.Department;
import com.bmad.hrm.entity.Position;
import com.bmad.hrm.repository.DepartmentRepository;
import com.bmad.hrm.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final com.bmad.hrm.repository.EmployeeRepository employeeRepository;

    // ===== DEPARTMENTS =====

    @GetMapping
    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createDepartment(@RequestBody Department dept) {
        if (departmentRepository.existsByName(dept.getName())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên phòng ban đã tồn tại!"));
        }
        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateDepartment(@PathVariable Long id, @RequestBody Department updated) {
        return departmentRepository.findById(id).map(dept -> {
            String oldName = dept.getName();
            String newName = updated.getName();
            
            dept.setName(newName);
            dept.setDescription(updated.getDescription());
            Department saved = departmentRepository.save(dept);
            
            if (oldName != null && !oldName.equals(newName)) {
                // Propagate to positions under this department
                positionRepository.updateDepartmentName(oldName, newName);
                // Propagate to employees under this department
                employeeRepository.updateEmployeeDepartmentName(oldName, newName);
            }
            
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        departmentRepository.findById(id).ifPresent(dept -> {
            positionRepository.deleteByDepartmentName(dept.getName());
            departmentRepository.delete(dept);
        });
        return ResponseEntity.noContent().build();
    }

    // ===== POSITIONS =====

    @GetMapping("/{deptName}/positions")
    public List<Position> getPositionsByDept(@PathVariable String deptName) {
        return positionRepository.findByDepartmentName(deptName);
    }

    @GetMapping("/positions")
    public List<Position> getAllPositions() {
        return positionRepository.findAll();
    }

    @PostMapping("/positions")
    public ResponseEntity<?> createPosition(@RequestBody Position pos) {
        return ResponseEntity.ok(positionRepository.save(pos));
    }

    @PutMapping("/positions/{id}")
    @Transactional
    public ResponseEntity<?> updatePosition(@PathVariable Long id, @RequestBody Position updated) {
        return positionRepository.findById(id).map(pos -> {
            String oldName = pos.getName();
            String newName = updated.getName();
            
            pos.setName(newName);
            pos.setDepartmentName(updated.getDepartmentName());
            Position saved = positionRepository.save(pos);
            
            if (oldName != null && !oldName.equals(newName)) {
                // Propagate to employees holding this position
                employeeRepository.updateEmployeePositionName(oldName, newName);
            }
            
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/positions/{id}")
    public ResponseEntity<Void> deletePosition(@PathVariable Long id) {
        positionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
