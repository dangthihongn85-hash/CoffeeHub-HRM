package com.bmad.hrm.controller;

import com.bmad.hrm.entity.Attendance;
import com.bmad.hrm.service.TimekeepingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
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

    /**
     * Admin: Lưu/Sửa chấm công thủ công theo ngày.
     */
    @PostMapping("/{employeeId}/manual")
    public ResponseEntity<Attendance> saveManualAttendance(
            @PathVariable Long employeeId,
            @RequestBody Map<String, Object> body) {
        LocalDate date = LocalDate.parse((String) body.get("date"));
        LocalTime checkInTime = body.get("checkInTime") != null && !((String) body.get("checkInTime")).isEmpty()
                ? LocalTime.parse((String) body.get("checkInTime")) : null;
        LocalTime checkOutTime = body.get("checkOutTime") != null && !((String) body.get("checkOutTime")).isEmpty()
                ? LocalTime.parse((String) body.get("checkOutTime")) : null;
        com.bmad.hrm.entity.AttendanceStatus status = com.bmad.hrm.entity.AttendanceStatus.valueOf((String) body.get("status"));
        Long shiftId = body.get("shiftId") != null && !body.get("shiftId").toString().isEmpty()
                ? Long.valueOf(body.get("shiftId").toString()) : null;
        return ResponseEntity.ok(timekeepingService.saveManualAttendance(employeeId, date, checkInTime, checkOutTime, status, shiftId));
    }

    /**
     * Admin: Xóa chấm công theo ngày.
     */
    @DeleteMapping("/{employeeId}/manual")
    public ResponseEntity<Void> deleteManualAttendance(
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        timekeepingService.deleteManualAttendance(employeeId, date);
        return ResponseEntity.ok().build();
    }
}
