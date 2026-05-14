package com.bmad.hrm.controller;

import com.bmad.hrm.entity.Attendance;
import com.bmad.hrm.service.TimekeepingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final TimekeepingService timekeepingService;

    @PostMapping("/{employeeId}/check-in")
    public ResponseEntity<Attendance> checkIn(@PathVariable Long employeeId) {
        return ResponseEntity.ok(timekeepingService.checkIn(employeeId));
    }

    @PostMapping("/{employeeId}/check-out")
    public ResponseEntity<Attendance> checkOut(@PathVariable Long employeeId) {
        return ResponseEntity.ok(timekeepingService.checkOut(employeeId));
    }

    @GetMapping("/{employeeId}/monthly")
    public ResponseEntity<List<Attendance>> getMonthly(
            @PathVariable Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        return ResponseEntity.ok(timekeepingService.getMonthlyAttendance(employeeId, month, year));
    }

    @GetMapping("/{employeeId}/monthly/stats")
    public ResponseEntity<Map<String, Object>> getMonthlyStats(
            @PathVariable Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        return ResponseEntity.ok(timekeepingService.getMonthlyStats(employeeId, month, year));
    }

    /**
     * Quản lý đánh dấu nghỉ đặc biệt (tang lễ, tai nạn).
     * POST /api/attendance/{employeeId}/special-leave?date=2026-05-10
     */
    @PostMapping("/{employeeId}/special-leave")
    public ResponseEntity<Attendance> markSpecialLeave(
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, defaultValue = "") String reason) {
        return ResponseEntity.ok(timekeepingService.markSpecialLeave(employeeId, date, reason));
    }

    /**
     * Đánh dấu nghỉ không phép.
     * POST /api/attendance/{employeeId}/absent-no-permission?date=2026-05-10
     */
    @PostMapping("/{employeeId}/absent-no-permission")
    public ResponseEntity<Attendance> markAbsentNoPermission(
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(timekeepingService.markAbsentNoPermission(employeeId, date));
    }
}
