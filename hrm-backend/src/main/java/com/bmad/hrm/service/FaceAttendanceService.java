package com.bmad.hrm.service;

import com.bmad.hrm.entity.Attendance;
import com.bmad.hrm.entity.AttendanceStatus;
import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.repository.AttendanceRepository;
import com.bmad.hrm.repository.EmployeeRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FaceAttendanceService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Euclidean distance threshold for face matching (face-api.js standard: < 0.6 = same person) */
    private static final double MATCH_THRESHOLD = 0.55;

    /**
     * Register (or update) the face descriptor for an employee
     */
    public Employee registerFace(Long employeeId, List<Double> descriptor) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên"));
        try {
            String descriptorJson = objectMapper.writeValueAsString(descriptor);
            employee.setFaceDescriptor(descriptorJson);
            return employeeRepository.save(employee);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi lưu face descriptor: " + e.getMessage());
        }
    }

    /**
     * Match incoming descriptor against all registered employees
     * Returns the best matching employee or throws if no match
     */
    public Employee matchFace(List<Double> incomingDescriptor) {
        List<Employee> registeredEmployees = employeeRepository.findAll().stream()
                .filter(e -> e.getFaceDescriptor() != null && !e.getFaceDescriptor().isEmpty())
                .toList();

        if (registeredEmployees.isEmpty()) {
            throw new RuntimeException("Chưa có nhân viên nào đăng ký khuôn mặt");
        }

        Employee bestMatch = null;
        double bestDistance = Double.MAX_VALUE;

        for (Employee employee : registeredEmployees) {
            try {
                List<Double> storedDescriptor = objectMapper.readValue(
                        employee.getFaceDescriptor(),
                        new TypeReference<List<Double>>() {}
                );
                double distance = euclideanDistance(incomingDescriptor, storedDescriptor);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                }
            } catch (Exception ignored) {}
        }

        if (bestMatch == null || bestDistance > MATCH_THRESHOLD) {
            throw new RuntimeException("Không nhận dạng được khuôn mặt (distance=" +
                    String.format("%.3f", bestDistance) + ", threshold=" + MATCH_THRESHOLD + ")");
        }

        return bestMatch;
    }

    /**
     * Face Check-in
     */
    public Attendance faceCheckIn(List<Double> descriptor) {
        Employee employee = matchFace(descriptor);

        LocalDate today = LocalDate.now();
        Optional<Attendance> existing = attendanceRepository.findByEmployeeIdAndDate(employee.getId(), today);
        if (existing.isPresent() && existing.get().getCheckInTime() != null) {
            throw new RuntimeException(employee.getName() + " đã check-in hôm nay rồi!");
        }

        LocalTime now = LocalTime.now();
        AttendanceStatus status = now.isAfter(LocalTime.of(8, 30))
                ? AttendanceStatus.LATE
                : AttendanceStatus.ON_TIME;

        Attendance attendance = existing.orElse(new Attendance());
        attendance.setEmployee(employee);
        attendance.setDate(today);
        attendance.setCheckInTime(now);
        attendance.setStatus(status);

        return attendanceRepository.save(attendance);
    }

    /**
     * Face Check-out
     */
    public Attendance faceCheckOut(List<Double> descriptor) {
        Employee employee = matchFace(descriptor);

        LocalDate today = LocalDate.now();
        Attendance attendance = attendanceRepository.findByEmployeeIdAndDate(employee.getId(), today)
                .orElseThrow(() -> new RuntimeException(employee.getName() + " chưa check-in hôm nay!"));

        if (attendance.getCheckOutTime() != null) {
            throw new RuntimeException(employee.getName() + " đã check-out hôm nay rồi!");
        }

        LocalTime now = LocalTime.now();
        attendance.setCheckOutTime(now);

        if (now.isBefore(LocalTime.of(17, 30)) && attendance.getStatus() == AttendanceStatus.ON_TIME) {
            attendance.setStatus(AttendanceStatus.EARLY);
        }

        return attendanceRepository.save(attendance);
    }

    /**
     * Admin: get all attendance records for a date range
     */
    public List<Attendance> getAllAttendance(LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByDateBetweenOrderByDateDescCheckInTimeDesc(startDate, endDate);
    }

    /**
     * Admin: today's attendance
     */
    public List<Attendance> getTodayAttendance() {
        return attendanceRepository.findByDateOrderByCheckInTimeDesc(LocalDate.now());
    }

    /**
     * Compute Euclidean distance between two 128-dim float vectors
     */
    private double euclideanDistance(List<Double> a, List<Double> b) {
        if (a.size() != b.size()) throw new RuntimeException("Descriptor dimension mismatch");
        double sum = 0;
        for (int i = 0; i < a.size(); i++) {
            double diff = a.get(i) - b.get(i);
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
}
