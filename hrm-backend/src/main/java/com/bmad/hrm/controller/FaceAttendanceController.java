package com.bmad.hrm.controller;

import com.bmad.hrm.entity.Attendance;
import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.repository.AttendanceRepository;
import com.bmad.hrm.repository.EmployeeRepository;
import com.bmad.hrm.service.FaceAttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/face-attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FaceAttendanceController {

    private final FaceAttendanceService faceAttendanceService;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    /**
     * Register face descriptor for an employee (admin only)
     * Body: { "employeeId": 1, "descriptor": [0.1, 0.2, ...128 floats] }
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerFace(@RequestBody Map<String, Object> body) {
        Long employeeId = Long.valueOf(body.get("employeeId").toString());
        @SuppressWarnings("unchecked")
        List<Double> descriptor = (List<Double>) body.get("descriptor");
        Employee employee = faceAttendanceService.registerFace(employeeId, descriptor);
        return ResponseEntity.ok(Map.of(
            "message", "Đăng ký khuôn mặt thành công cho: " + employee.getName(),
            "employeeId", employee.getId()
        ));
    }

    /**
     * Face Check-in: sends descriptor, server matches and records check-in
     * Body: { "descriptor": [128 floats] }
     */
    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Double> descriptor = (List<Double>) body.get("descriptor");
        Attendance attendance = faceAttendanceService.faceCheckIn(descriptor);
        return ResponseEntity.ok(Map.of(
            "message", "Check-in thành công!",
            "employeeName", attendance.getEmployee().getName(),
            "checkInTime", attendance.getCheckInTime().toString(),
            "status", attendance.getStatus().toString(),
            "attendanceId", attendance.getId()
        ));
    }

    /**
     * Face Check-out: sends descriptor, server matches and records check-out
     * Body: { "descriptor": [128 floats] }
     */
    @PostMapping("/check-out")
    public ResponseEntity<?> checkOut(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Double> descriptor = (List<Double>) body.get("descriptor");
        Attendance attendance = faceAttendanceService.faceCheckOut(descriptor);
        return ResponseEntity.ok(Map.of(
            "message", "Check-out thành công!",
            "employeeName", attendance.getEmployee().getName(),
            "checkOutTime", attendance.getCheckOutTime().toString(),
            "status", attendance.getStatus().toString(),
            "attendanceId", attendance.getId()
        ));
    }

    /**
     * Get all employees with face registered
     */
    @GetMapping("/registered-employees")
    public ResponseEntity<List<Employee>> getRegisteredEmployees() {
        List<Employee> employees = employeeRepository.findAll().stream()
            .filter(e -> e.getFaceDescriptor() != null && !e.getFaceDescriptor().isEmpty())
            .toList();
        return ResponseEntity.ok(employees);
    }

    /**
     * Admin: Get all attendance records for a date range (all employees)
     */
    @GetMapping("/all")
    public ResponseEntity<List<Attendance>> getAllAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1);
        if (endDate == null) endDate = LocalDate.now();
        return ResponseEntity.ok(faceAttendanceService.getAllAttendance(startDate, endDate));
    }

    /**
     * Admin: Get today's attendance for all employees
     */
    @GetMapping("/today")
    public ResponseEntity<List<Attendance>> getTodayAttendance() {
        return ResponseEntity.ok(faceAttendanceService.getTodayAttendance());
    }

    /**
     * Get attendance for a single employee by month
     */
    @GetMapping("/employee/{employeeId}/monthly")
    public ResponseEntity<List<Attendance>> getEmployeeMonthly(
            @PathVariable Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return ResponseEntity.ok(attendanceRepository.findByEmployeeIdAndDateBetween(employeeId, start, end));
    }
}
