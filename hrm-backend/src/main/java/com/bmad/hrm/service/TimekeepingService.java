package com.bmad.hrm.service;

import com.bmad.hrm.entity.Attendance;
import com.bmad.hrm.entity.AttendanceStatus;
import com.bmad.hrm.entity.Employee;
import com.bmad.hrm.repository.AttendanceRepository;
import com.bmad.hrm.repository.EmployeeRepository;
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

        LocalTime now = LocalTime.now();
        // Trễ khi check-in sau 08:40 (tức là trễ > 10 phút so với 08:30)
        AttendanceStatus status = now.isAfter(LATE_CUTOFF)
                ? AttendanceStatus.LATE
                : AttendanceStatus.ON_TIME;

        Attendance att = existing.orElse(new Attendance());
        att.setEmployee(employee);
        att.setDate(today);
        att.setCheckInTime(now);
        att.setStatus(status);
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

        // Về sớm: check-out trước 17:00 và đang ON_TIME
        if (now.isBefore(SHIFT_END) && att.getStatus() == AttendanceStatus.ON_TIME) {
            att.setStatus(AttendanceStatus.EARLY);
        }

        return attendanceRepository.save(att);
    }

    // ── Nghỉ đặc biệt (Manager cập nhật thủ công) ───────────────────────────
    /**
     * Đánh dấu nghỉ đặc biệt cho nhân viên (tang lễ, tai nạn, v.v.).
     * SPECIAL_LEAVE: không tính công, không phạt.
     */
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
}
