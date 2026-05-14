package com.bmad.hrm.service;

import com.bmad.hrm.dto.SalaryPayrollDto;
import com.bmad.hrm.entity.*;
import com.bmad.hrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Luồng QUẢN LÝ LƯƠNG NHÂN VIÊN QUÁN CAFE – FINAL
 * ===================================================
 * Luồng: Doanh thu → Chấm công → Validate → Nghỉ đặc biệt
 *        → Tính giờ → Tính lương → Thưởng/Phạt → Chia doanh thu → Xuất lương
 */
@Service
@RequiredArgsConstructor
public class SalaryService {

    // ─── Cấu hình cứng theo RSD ───────────────────────────────────────────────
    private static final double PART_TIME_HOURLY = 20_000.0;
    private static final double FULL_TIME_HOURLY = 25_000.0;
    private static final double MANAGER_BASE     = 8_000_000.0;
    private static final double MANAGER_ALLOWANCE = 500_000.0;
    private static final double OT_MULTIPLIER    = 1.5;

    // Thưởng chuyên cần
    private static final int    REQUIRED_WORK_DAYS   = 26;
    private static final double BONUS_FULL_DAYS       = 200_000.0;
    private static final double BONUS_NO_LATE         = 100_000.0;

    // Phạt
    private static final double PENALTY_LATE          = 20_000.0;   // đi trễ > 10 phút
    private static final double PENALTY_NO_CHECKOUT   = 50_000.0;   // thiếu check-out
    private static final double PENALTY_ABSENT_NO_PERM= 100_000.0;  // nghỉ không phép

    // Quỹ doanh thu
    private static final double REVENUE_POOL_RATE     = 0.01;       // 1%

    // Giờ chuẩn 1 ngày, mốc OT
    private static final LocalTime SHIFT_START  = LocalTime.of(8, 0);
    private static final LocalTime SHIFT_END    = LocalTime.of(17, 0); // 9 giờ/ngày = 8 giờ net
    private static final LocalTime LATE_CUTOFF  = LocalTime.of(8, 40); // trễ > 10 phút
    private static final double    DAILY_NORMAL_HOURS = 8.0;

    private final SalaryRepository           salaryRepository;
    private final EmployeeRepository         employeeRepository;
    private final AttendanceRepository       attendanceRepository;
    private final MonthlyRevenueRepository   revenueRepository;
    private final EmailService               emailService;

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Luồng 0: Quản lý nhập / cập nhật doanh thu tháng.
     */
    public MonthlyRevenue saveMonthlyRevenue(Integer month, Integer year, Double revenue, String notes) {
        MonthlyRevenue mr = revenueRepository.findByMonthAndYear(month, year)
                .orElse(new MonthlyRevenue());
        mr.setMonth(month);
        mr.setYear(year);
        mr.setMonthlyRevenue(revenue);
        mr.setBonusPool(revenue * REVENUE_POOL_RATE);
        mr.setNotes(notes);
        return revenueRepository.save(mr);
    }

    public Optional<MonthlyRevenue> getMonthlyRevenue(Integer month, Integer year) {
        return revenueRepository.findByMonthAndYear(month, year);
    }

    /**
     * Tính lương toàn bộ nhân viên trong tháng (bulk calculate).
     * Trả về danh sách SalaryPayrollDto đã có thưởng doanh thu POOL.
     */
    public List<SalaryPayrollDto> calculateAllSalaries(Integer month, Integer year) {
        List<Employee> employees = employeeRepository.findAll();

        // ── Bước 1: lấy doanh thu → tính quỹ POOL ──────────────────────────
        double bonusPool = revenueRepository.findByMonthAndYear(month, year)
                .map(r -> r.getBonusPool() != null ? r.getBonusPool() : 0.0)
                .orElse(0.0);

        // ── Bước 2: đếm weight để chia POOL ────────────────────────────────
        long fullTimeCount = employees.stream()
                .filter(e -> e.getEmployeeType() == null || e.getEmployeeType() == EmployeeType.FULL_TIME).count();
        long managerCount = employees.stream()
                .filter(e -> e.getEmployeeType() == EmployeeType.MANAGER).count();
        double totalWeight = (fullTimeCount * 1.0) + (managerCount * 2.0);

        double pointValue      = totalWeight > 0 ? bonusPool / totalWeight : 0.0;
        double fullTimeBonusRev = pointValue * 1.0;
        double managerBonusRev  = pointValue * 2.0;

        // ── Bước 3: tính lương từng người ───────────────────────────────────
        List<SalaryPayrollDto> results = new ArrayList<>();
        for (Employee emp : employees) {
            double revBonus = 0.0;
            if (emp.getEmployeeType() == EmployeeType.FULL_TIME) revBonus = fullTimeBonusRev;
            else if (emp.getEmployeeType() == EmployeeType.MANAGER) revBonus = managerBonusRev;

            SalaryPayrollDto dto = calculateOneSalary(emp, month, year, revBonus);
            results.add(dto);
        }
        return results;
    }

    /**
     * Tính lương 1 nhân viên (cũng persist vào DB).
     */
    public SalaryPayrollDto calculateSalaryForOne(Long employeeId, Integer month, Integer year) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        // Tính revenue bonus riêng cho người này trong ngữ cảnh toàn công ty
        double revBonus = computeRevenueBonusForEmployee(emp, month, year);
        return calculateOneSalary(emp, month, year, revBonus);
    }

    /**
     * Lấy danh sách bảng lương đã tính trong tháng.
     */
    public List<SalaryPayrollDto> getSalariesByMonth(Integer month, Integer year) {
        return salaryRepository.findByMonthAndYear(month, year)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // PRIVATE – CORE LOGIC
    // =========================================================================

    private SalaryPayrollDto calculateOneSalary(Employee emp, Integer month, Integer year, double revBonus) {
        EmployeeType type = emp.getEmployeeType() != null ? emp.getEmployeeType() : EmployeeType.FULL_TIME;

        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());

        // ── Luồng: Chấm công → Validate ─────────────────────────────────────
        List<Attendance> records = attendanceRepository.findByEmployeeIdAndDateBetween(
                emp.getId(), start, end);

        // ── Luồng: Nghỉ đặc biệt → tách ra, không tính công, không phạt ────
        long specialLeaveDays = records.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.SPECIAL_LEAVE).count();

        List<Attendance> normalRecords = records.stream()
                .filter(a -> a.getStatus() != AttendanceStatus.SPECIAL_LEAVE)
                .collect(Collectors.toList());

        // ── Luồng: Tính giờ công ─────────────────────────────────────────────
        double regularHours = 0.0;
        double otHours      = 0.0;
        long   lateDays     = 0;
        long   noCheckout   = 0;
        long   absentNoPerm = 0;
        int    workDays     = 0;

        for (Attendance a : normalRecords) {
            if (a.getStatus() == AttendanceStatus.ABSENT_NO_PERMISSION) {
                absentNoPerm++;
                continue; // không tính giờ
            }
            if (a.getStatus() == AttendanceStatus.ABSENT) {
                continue; // vắng có phép, không tính
            }

            // Kiểm tra đi trễ: check-in sau 08:40 (trễ > 10 phút)
            if (a.getCheckInTime() != null && a.getCheckInTime().isAfter(LATE_CUTOFF)) {
                lateDays++;
            }

            // Kiểm tra thiếu check-out
            if (a.getCheckInTime() != null && a.getCheckOutTime() == null) {
                noCheckout++;
                // Không tính giờ nếu thiếu checkout (thiếu thông tin)
                continue;
            }

            if (a.getCheckInTime() != null && a.getCheckOutTime() != null) {
                double hoursWorked = computeHours(a.getCheckInTime(), a.getCheckOutTime());
                if (hoursWorked <= DAILY_NORMAL_HOURS) {
                    regularHours += hoursWorked;
                } else {
                    regularHours += DAILY_NORMAL_HOURS;
                    otHours      += (hoursWorked - DAILY_NORMAL_HOURS);
                }
                workDays++;
            }
        }

        // ── Luồng: Tính lương cơ bản ─────────────────────────────────────────
        double baseSalary;
        double otSalary;

        switch (type) {
            case PART_TIME:
                baseSalary = regularHours * PART_TIME_HOURLY;
                otSalary   = otHours * PART_TIME_HOURLY * OT_MULTIPLIER;
                break;
            case MANAGER:
                baseSalary = MANAGER_BASE + MANAGER_ALLOWANCE;
                otSalary   = 0.0; // Manager không OT
                break;
            default: // FULL_TIME
                baseSalary = regularHours * FULL_TIME_HOURLY;
                otSalary   = otHours * FULL_TIME_HOURLY * OT_MULTIPLIER;
                break;
        }

        // ── Luồng: Thưởng/Phạt ──────────────────────────────────────────────
        // Phạt (áp dụng cho tất cả loại NORMAL)
        double penaltyLateAmt     = lateDays     * PENALTY_LATE;
        double penaltyNoCheckAmt  = noCheckout   * PENALTY_NO_CHECKOUT;
        double penaltyAbsentAmt   = absentNoPerm * PENALTY_ABSENT_NO_PERM;
        double totalPenalty       = penaltyLateAmt + penaltyNoCheckAmt + penaltyAbsentAmt;

        // Thưởng chuyên cần (chỉ Full-time và Manager)
        double bonusFullDays = 0.0;
        double bonusNoLate   = 0.0;
        if (type == EmployeeType.FULL_TIME || type == EmployeeType.MANAGER) {
            if (workDays >= REQUIRED_WORK_DAYS) {
                bonusFullDays = BONUS_FULL_DAYS;
            }
            if (lateDays == 0) {
                bonusNoLate = BONUS_NO_LATE;
            }
        }
        double bonusAttendance = bonusFullDays + bonusNoLate;

        // Thưởng doanh thu (Part-time = 0, đã tính bên ngoài và truyền vào)
        double bonusRevenue = (type == EmployeeType.PART_TIME) ? 0.0 : revBonus;

        double totalBonus = bonusAttendance + bonusRevenue;

        // ── Luồng: Tính lương cuối ───────────────────────────────────────────
        double totalSalary = baseSalary + otSalary + totalBonus - totalPenalty;
        if (totalSalary < 0) totalSalary = 0;

        // ── Persist ──────────────────────────────────────────────────────────
        Optional<Salary> existing = salaryRepository.findByEmployeeIdAndMonthAndYear(emp.getId(), month, year);
        Salary salary = existing.orElse(new Salary());
        salary.setEmployee(emp);
        salary.setMonth(month);
        salary.setYear(year);
        salary.setEmployeeType(type);
        salary.setRegularHours(regularHours);
        salary.setOtHours(otHours);
        salary.setWorkDays(workDays);
        salary.setBaseSalary(baseSalary);
        salary.setOtSalary(otSalary);
        salary.setBonusAttendance(bonusAttendance);
        salary.setBonusRevenue(bonusRevenue);
        salary.setPenaltyLate(penaltyLateAmt);
        salary.setPenaltyNoCheckout(penaltyNoCheckAmt);
        salary.setPenaltyAbsent(penaltyAbsentAmt);
        salary.setTotalPenalty(totalPenalty);
        salary.setTotalBonus(totalBonus);
        salary.setTotalSalary(totalSalary);
        salaryRepository.save(salary);

        // Gửi email thông báo lương
        sendPayrollEmail(emp, month, year, totalSalary);

        // ── Build DTO ─────────────────────────────────────────────────────────
        return SalaryPayrollDto.builder()
                .salaryId(salary.getId())
                .employeeId(emp.getId())
                .employeeName(emp.getName())
                .department(emp.getDepartment())
                .position(emp.getPosition())
                .employeeType(type)
                .month(month).year(year)
                .regularHours(regularHours)
                .otHours(otHours)
                .workDays(workDays)
                .baseSalary(baseSalary)
                .otSalary(otSalary)
                .bonusAttendance(bonusAttendance)
                .bonusRevenue(bonusRevenue)
                .totalBonus(totalBonus)
                .penaltyLate(penaltyLateAmt)
                .penaltyNoCheckout(penaltyNoCheckAmt)
                .penaltyAbsent(penaltyAbsentAmt)
                .totalPenalty(totalPenalty)
                .totalSalary(totalSalary)
                .lateDays(lateDays)
                .specialLeaveDays(specialLeaveDays)
                .absentNoPerm(absentNoPerm)
                .noCheckoutDays(noCheckout)
                .build();
    }

    /**
     * Tính revenue bonus cho 1 nhân viên trong ngữ cảnh toàn bộ công ty.
     */
    private double computeRevenueBonusForEmployee(Employee emp, Integer month, Integer year) {
        if (emp.getEmployeeType() == EmployeeType.PART_TIME) return 0.0;

        double bonusPool = revenueRepository.findByMonthAndYear(month, year)
                .map(r -> r.getBonusPool() != null ? r.getBonusPool() : 0.0)
                .orElse(0.0);

        List<Employee> all = employeeRepository.findAll();
        long ft = all.stream().filter(e -> e.getEmployeeType() == null || e.getEmployeeType() == EmployeeType.FULL_TIME).count();
        long mg = all.stream().filter(e -> e.getEmployeeType() == EmployeeType.MANAGER).count();
        double totalWeight = (ft * 1.0) + (mg * 2.0);
        if (totalWeight == 0) return 0.0;

        double pointValue = bonusPool / totalWeight;
        return emp.getEmployeeType() == EmployeeType.MANAGER ? pointValue * 2.0 : pointValue;
    }

    /**
     * Map Salary entity → DTO (dùng khi đọc từ DB).
     */
    private SalaryPayrollDto toDto(Salary s) {
        Employee emp = s.getEmployee();
        return SalaryPayrollDto.builder()
                .salaryId(s.getId())
                .employeeId(emp != null ? emp.getId() : null)
                .employeeName(emp != null ? emp.getName() : "")
                .department(emp != null ? emp.getDepartment() : "")
                .position(emp != null ? emp.getPosition() : "")
                .employeeType(s.getEmployeeType())
                .month(s.getMonth()).year(s.getYear())
                .regularHours(s.getRegularHours())
                .otHours(s.getOtHours())
                .workDays(s.getWorkDays())
                .baseSalary(s.getBaseSalary())
                .otSalary(s.getOtSalary())
                .bonusAttendance(s.getBonusAttendance())
                .bonusRevenue(s.getBonusRevenue())
                .totalBonus(s.getTotalBonus())
                .penaltyLate(s.getPenaltyLate())
                .penaltyNoCheckout(s.getPenaltyNoCheckout())
                .penaltyAbsent(s.getPenaltyAbsent())
                .totalPenalty(s.getTotalPenalty())
                .totalSalary(s.getTotalSalary())
                .build();
    }

    private double computeHours(LocalTime in, LocalTime out) {
        if (out.isBefore(in)) return 0;
        return java.time.Duration.between(in, out).toMinutes() / 60.0;
    }

    private void sendPayrollEmail(Employee emp, int month, int year, double totalSalary) {
        try {
            String text = String.format(
                "Thân gửi %s,\n\nLương tháng %d/%d của bạn là: %,.0f VNĐ.\n\nTrân trọng,\nHệ thống HRM",
                emp.getName(), month, year, totalSalary);
            emailService.sendEmail(emp.getEmail(), "Thông báo lương tháng " + month + "/" + year, text);
        } catch (Exception e) {
            System.err.println("Lỗi gửi email lương: " + e.getMessage());
        }
    }
}
