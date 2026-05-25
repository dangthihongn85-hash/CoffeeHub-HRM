package com.bmad.hrm.controller;

import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.entity.Shift;
import com.bmad.hrm.entity.ShiftAssignment;
import com.bmad.hrm.repository.EmployeeRepository;
import com.bmad.hrm.repository.ShiftAssignmentRepository;
import com.bmad.hrm.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ShiftController {

    private final ShiftRepository           shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final EmployeeRepository        employeeRepository;

    // ── Shifts CRUD ───────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Shift>> getAllShifts() {
        return ResponseEntity.ok(shiftRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Shift> createShift(@RequestBody Shift shift) {
        if (shift.getStandardHours() == null) {
            shift.setStandardHours(8.0);
        }
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Shift> updateShift(@PathVariable Long id, @RequestBody Shift updated) {
        Shift existing = shiftRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ca làm: " + id));
        existing.setName(updated.getName());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setStandardHours(updated.getStandardHours() != null ? updated.getStandardHours() : 8.0);
        existing.setMaxEmployees(updated.getMaxEmployees());
        return ResponseEntity.ok(shiftRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShift(@PathVariable Long id) {
        shiftRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Assignments ───────────────────────────────────────────────────────────
    @GetMapping("/assignments")
    public ResponseEntity<List<ShiftAssignment>> getAssignments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(shiftAssignmentRepository.findByDateBetween(start, end));
    }

    @GetMapping("/assignments/employee/{employeeId}")
    public ResponseEntity<List<ShiftAssignment>> getEmployeeAssignments(
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(shiftAssignmentRepository.findByEmployeeIdAndDateBetween(employeeId, start, end));
    }

    @PostMapping("/assignments/bulk")
    @Transactional
    public ResponseEntity<?> bulkAssign(@RequestBody Map<String, Object> body) {
        Long employeeId = Long.valueOf(body.get("employeeId").toString());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        Long shiftId = body.get("shiftId") != null ? Long.valueOf(body.get("shiftId").toString()) : null;
        Shift shift = shiftId != null ? shiftRepository.findById(shiftId).orElse(null) : null;

        List<String> dateStrings = (List<String>) body.get("dates");
        if (dateStrings == null || dateStrings.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Danh sách ngày không được trống"));
        }

        for (String dStr : dateStrings) {
            LocalDate date = LocalDate.parse(dStr);
            
            Optional<ShiftAssignment> existingOpt = shiftAssignmentRepository.findByEmployeeIdAndDate(employeeId, date);
            if (shift == null) {
                // Set to OFF -> Delete existing assignment if exists
                existingOpt.ifPresent(shiftAssignmentRepository::delete);
            } else {
                if (existingOpt.isPresent()) {
                    // Update existing assignment in-place
                    ShiftAssignment assignment = existingOpt.get();
                    assignment.setShift(shift);
                    shiftAssignmentRepository.save(assignment);
                } else {
                    // Insert new assignment
                    ShiftAssignment assignment = ShiftAssignment.builder()
                            .employee(employee)
                            .shift(shift)
                            .date(date)
                            .build();
                    shiftAssignmentRepository.save(assignment);
                }
            }
        }

        return ResponseEntity.ok(Map.of("message", "Đã phân lịch thành công cho " + dateStrings.size() + " ngày"));
    }
}
