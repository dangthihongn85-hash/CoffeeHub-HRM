package com.bmad.hrm.service;

import com.bmad.hrm.entity.Attendance;
import com.bmad.hrm.entity.AttendanceStatus;
import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.entity.Shift;
import com.bmad.hrm.entity.ShiftAssignment;
import com.bmad.hrm.repository.AttendanceRepository;
import com.bmad.hrm.repository.EmployeeRepository;
import com.bmad.hrm.repository.ShiftRepository;
import com.bmad.hrm.repository.ShiftAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TimekeepingService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository   employeeRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final ShiftRepository           shiftRepository;

    /** Ca bắt đầu: 08:00 | Ngưỡng trễ: 08:40 (trễ > 10 phút) */
    private static final LocalTime SHIFT_START  = LocalTime.of(8, 0);
    private static final LocalTime LATE_CUTOFF  = LocalTime.of(8, 40);
    /** Ca kết thúc: 17:00 */
    private static final LocalTime SHIFT_END    = LocalTime.of(17, 0);

    // ── Check-in ──────────────────────────────────────────────────────────────
    public Attendance checkIn(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        LocalDate today = LocalDate.now();
        Optional<Attendance> existing = attendanceRepository.findByEmployeeIdAndDate(employeeId, today);
        if (existing.isPresent() && existing.get().getCheckInTime() != null) {
            throw new RuntimeException("Đã check-in hôm nay rồi.");
        }

        // Find shift assignment
        Optional<ShiftAssignment> assignmentOpt = shiftAssignmentRepository.findByEmployeeIdAndDate(employeeId, today);
        Shift shift;
        if (assignmentOpt.isPresent()) {
            shift = assignmentOpt.get().getShift();
        } else {
            // Default shift fallback so check-in is never blocked
            List<Shift> allShifts = shiftRepository.findAll();
            if (allShifts.isEmpty()) {
                Shift defaultShift = Shift.builder()
                        .name("Ca sáng")
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(17, 0))
                        .standardHours(8.0)
                        .maxEmployees(10)
                        .build();
                shift = shiftRepository.save(defaultShift);
            } else {
                shift = allShifts.get(0);
            }
        }

        LocalTime now = LocalTime.now();
        // Check late: check-in after shift start time + 10 mins
        long lateMinutes = now.isAfter(shift.getStartTime()) 
                ? java.time.Duration.between(shift.getStartTime(), now).toMinutes() : 0;
        
        AttendanceStatus status = lateMinutes > 10 
                ? AttendanceStatus.LATE 
                : AttendanceStatus.ON_TIME;

        Attendance att = existing.orElse(new Attendance());
        att.setEmployee(employee);
        att.setShift(shift);
        att.setDate(today);
        att.setCheckInTime(now);
        att.setStatus(status);
        att.setWorkPoints(1.0); // Temporarily set full công, recalculated on checkout
        return attendanceRepository.save(att);
    }

    // ── Check-out ─────────────────────────────────────────────────────────────
    public Attendance checkOut(Long employeeId) {
        LocalDate today = LocalDate.now();
        Attendance att = attendanceRepository.findByEmployeeIdAndDate(employeeId, today)
                .orElseThrow(() -> new RuntimeException("Chưa có bản ghi check-in hôm nay."));

        if (att.getCheckOutTime() != null) {
            throw new RuntimeException("Đã check-out hôm nay rồi.");
        }

        LocalTime now = LocalTime.now();
        att.setCheckOutTime(now);

        Shift shift = att.getShift();
        if (shift == null) {
            // Fallback shift if not set
            List<Shift> allShifts = shiftRepository.findAll();
            shift = allShifts.isEmpty() ? null : allShifts.get(0);
        }

        if (shift != null) {
            LocalTime checkIn = att.getCheckInTime();
            double workedHours = java.time.Duration.between(checkIn, now).toMinutes() / 60.0;
            
            long lateMinutes = checkIn.isAfter(shift.getStartTime())
                    ? java.time.Duration.between(shift.getStartTime(), checkIn).toMinutes() : 0;
            long earlyMinutes = now.isBefore(shift.getEndTime())
                    ? java.time.Duration.between(now, shift.getEndTime()).toMinutes() : 0;

            // Recalculate workPoints & status based on the new rules
            if (lateMinutes >= 240) { // 4 hours
                att.setWorkPoints(0.0);
                att.setStatus(AttendanceStatus.ABSENT_NO_PERMISSION);
            } else {
                double points = workedHours / shift.getStandardHours();
                att.setWorkPoints(Math.min(1.0, Math.max(0.0, points)));
                
                if (earlyMinutes > 0) {
                    att.setStatus(AttendanceStatus.EARLY);
                } else if (lateMinutes > 10) {
                    att.setStatus(AttendanceStatus.LATE);
                } else {
                    att.setStatus(AttendanceStatus.ON_TIME);
                }
            }
        } else {
            att.setWorkPoints(1.0);
        }

        return attendanceRepository.save(att);
    }

    // ── Nghỉ đặc biệt (Manager cập nhật thủ công) ───────────────────────────
    public Attendance markSpecialLeave(Long employeeId, LocalDate date, String reason) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        Attendance att = attendanceRepository.findByEmployeeIdAndDate(employeeId, date)
                .orElse(new Attendance());
        att.setEmployee(employee);
        att.setDate(date);
        att.setStatus(AttendanceStatus.SPECIAL_LEAVE);
        att.setCheckInTime(null);
        att.setCheckOutTime(null);
        att.setWorkPoints(0.0); // Nghỉ đặc biệt không tính công
        return attendanceRepository.save(att);
    }

    // ── Nghỉ không phép (hệ thống hoặc manager đánh dấu) ───────────────────
    public Attendance markAbsentNoPermission(Long employeeId, LocalDate date) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        Attendance att = attendanceRepository.findByEmployeeIdAndDate(employeeId, date)
                .orElse(new Attendance());
        att.setEmployee(employee);
        att.setDate(date);
        att.setStatus(AttendanceStatus.ABSENT_NO_PERMISSION);
        att.setCheckInTime(null);
        att.setCheckOutTime(null);
        att.setWorkPoints(0.0); // Nghỉ không phép không tính công
        return attendanceRepository.save(att);
    }

    // ── Lấy bảng chấm công tháng ─────────────────────────────────────────────
    public List<Attendance> getMonthlyAttendance(Long employeeId, Integer month, Integer year) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        return attendanceRepository.findByEmployeeIdAndDateBetween(employeeId, start, end);
    }

    // ── Thống kê tháng ────────────────────────────────────────────────────────
    public Map<String, Object> getMonthlyStats(Long employeeId, Integer month, Integer year) {
        List<Attendance> records = getMonthlyAttendance(employeeId, month, year);
        long onTime       = records.stream().filter(a -> a.getStatus() == AttendanceStatus.ON_TIME).count();
        long late         = records.stream().filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
        long absent       = records.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT).count();
        long absentNoPerm = records.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT_NO_PERMISSION).count();
        long specialLeave = records.stream().filter(a -> a.getStatus() == AttendanceStatus.SPECIAL_LEAVE).count();
        long noCheckout   = records.stream().filter(a -> a.getCheckInTime() != null && a.getCheckOutTime() == null
                && a.getStatus() != AttendanceStatus.SPECIAL_LEAVE).count();
        return Map.of(
                "onTime", onTime,
                "late", late,
                "absent", absent,
                "absentNoPermission", absentNoPerm,
                "specialLeave", specialLeave,
                "noCheckout", noCheckout,
                "totalRecords", records.size()
        );
    }

    // ── Quản lý lưu/sửa chấm công theo ngày thủ công (Admin) ───────────────────
    public Attendance saveManualAttendance(Long employeeId, LocalDate date, LocalTime checkInTime, LocalTime checkOutTime, AttendanceStatus status, Long shiftId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        Shift shift = null;
        if (shiftId != null) {
            shift = shiftRepository.findById(shiftId).orElse(null);
        }
        if (shift == null) {
            // Find daily assignment or fallback
            Optional<ShiftAssignment> assignmentOpt = shiftAssignmentRepository.findByEmployeeIdAndDate(employeeId, date);
            if (assignmentOpt.isPresent()) {
                shift = assignmentOpt.get().getShift();
            } else {
                List<Shift> all = shiftRepository.findAll();
                shift = all.isEmpty() ? null : all.get(0);
            }
        }

        Double workPoints = 0.0;

        // Validations & recalculation
        if (status == AttendanceStatus.ABSENT || status == AttendanceStatus.ABSENT_NO_PERMISSION || status == AttendanceStatus.SPECIAL_LEAVE) {
            checkInTime = null;
            checkOutTime = null;
            workPoints = 0.0;
        } else {
            if (checkInTime == null) {
                throw new RuntimeException("Các ngày đi làm bình thường phải có giờ vào check-in!");
            }
            if (checkOutTime != null && checkOutTime.isBefore(checkInTime)) {
                throw new RuntimeException("Giờ ra (check-out) phải sau giờ vào (check-in)!");
            }

            if (shift != null) {
                long lateMinutes = checkInTime.isAfter(shift.getStartTime())
                        ? java.time.Duration.between(shift.getStartTime(), checkInTime).toMinutes() : 0;
                
                if (lateMinutes >= 240) {
                    workPoints = 0.0;
                    status = AttendanceStatus.ABSENT_NO_PERMISSION; // Muộn nửa ngày -> không tính công
                } else if (checkOutTime != null) {
                    double workedHours = java.time.Duration.between(checkInTime, checkOutTime).toMinutes() / 60.0;
                    workPoints = Math.min(1.0, Math.max(0.0, workedHours / shift.getStandardHours()));
                } else {
                    workPoints = 1.0; // Default full công if checkOut is not provided yet
                }
            } else {
                workPoints = 1.0;
            }
        }

        Attendance att = attendanceRepository.findByEmployeeIdAndDate(employeeId, date)
                .orElse(new Attendance());
        att.setEmployee(employee);
        att.setShift(shift);
        att.setDate(date);
        att.setCheckInTime(checkInTime);
        att.setCheckOutTime(checkOutTime);
        att.setStatus(status);
        att.setWorkPoints(workPoints);
        return attendanceRepository.save(att);
    }

    // ── Xóa chấm công ngày (Admin) ───────────────────────────────────────────
    public void deleteManualAttendance(Long employeeId, LocalDate date) {
        attendanceRepository.findByEmployeeIdAndDate(employeeId, date)
                .ifPresent(attendanceRepository::delete);
    }
}
