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
    private static final double PENALTY_LATE          = 50_000.0;   // đi trễ > 10 phút
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
    private final SalaryConfigRepository     salaryConfigRepository;
    private final HolidayRepository          holidayRepository;

    private SalaryConfig getSystemConfig() {
        return salaryConfigRepository.findAll().stream().findFirst()
                .orElse(SalaryConfig.builder().build());
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Luồng 0: Quản lý nhập / cập nhật doanh thu tháng.
     */
    public MonthlyRevenue saveMonthlyRevenue(Integer month, Integer year, Double revenue, Double bonusRate, String notes) {
        MonthlyRevenue mr = revenueRepository.findByMonthAndYear(month, year)
                .orElse(new MonthlyRevenue());
        mr.setMonth(month);
        mr.setYear(year);
        mr.setMonthlyRevenue(revenue);
        
        double defaultRate = getSystemConfig().getRevenuePoolRate();
        double rate = bonusRate != null ? bonusRate : defaultRate;
        mr.setBonusRate(rate);
        mr.setBonusPool(revenue * (rate / 100.0));
        
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
        List<Employee> allEmployees = employeeRepository.findAll().stream()
                .filter(e -> e.getRole() != com.bmad.hrm.entity.Role.ADMIN)
                .collect(Collectors.toList());

        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd   = monthStart.withDayOfMonth(monthStart.lengthOfMonth());

        List<Employee> employees = allEmployees.stream()
                .filter(e -> {
                    if (!"LEAVE".equals(e.getStatus()) && !"DELETED".equals(e.getStatus())) {
                        return true;
                    }
                    // For inactive (LEAVE/DELETED) employees, check if they have any attendance records in this month
                    return !attendanceRepository.findByEmployeeIdAndDateBetween(e.getId(), monthStart, monthEnd).isEmpty();
                })
                .collect(Collectors.toList());

        // ── Bước 1: lấy doanh thu → tính quỹ POOL ──────────────────────────
        double bonusPool = revenueRepository.findByMonthAndYear(month, year)
                .map(r -> r.getBonusPool() != null ? r.getBonusPool() : 0.0)
                .orElse(0.0);

        // ── Bước 2: đếm weight để chia POOL ────────────────────────────────
        SalaryConfig config = getSystemConfig();
        double ftWeight = config.getFullTimeShareWeight();
        double mgWeight = config.getManagerShareWeight();

        long fullTimeCount = employees.stream()
                .filter(e -> e.getEmployeeType() == null || e.getEmployeeType() == EmployeeType.FULL_TIME).count();
        long managerCount = employees.stream()
                .filter(e -> e.getEmployeeType() == EmployeeType.MANAGER).count();
        double totalWeight = (fullTimeCount * ftWeight) + (managerCount * mgWeight);

        double pointValue      = totalWeight > 0 ? bonusPool / totalWeight : 0.0;
        double fullTimeBonusRev = pointValue * ftWeight;
        double managerBonusRev  = pointValue * mgWeight;

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
        SalaryConfig config = getSystemConfig();
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
        double holidayHours = 0.0;
        double holidaySalary = 0.0;
        long   lateDays     = 0;
        long   noCheckout   = 0;
        long   absentNoPerm = 0;

        List<Holiday> allHolidays = holidayRepository.findAll();
        List<Holiday> holidays = allHolidays.stream()
                .filter(h -> {
                    if (h.getRepeatYearly() != null && h.getRepeatYearly()) {
                        return h.getDate().getMonthValue() == month;
                    } else {
                        return !h.getDate().isBefore(start) && !h.getDate().isAfter(end);
                    }
                })
                .collect(Collectors.toList());

        // Count total working days as sum of actual work points.
        double workDays = records.stream()
                .mapToDouble(a -> a.getWorkPoints() != null ? a.getWorkPoints() : 0.0)
                .sum();
        workDays = roundHours(workDays);

        for (Attendance a : normalRecords) {
            if (a.getStatus() == AttendanceStatus.ABSENT_NO_PERMISSION) {
                absentNoPerm++;
            }

            // Check if this date is a holiday
            Optional<Holiday> holidayOpt = holidays.stream()
                    .filter(h -> h.getDate().equals(a.getDate()))
                    .findFirst();

            // Phạt đi trễ nghiêm khắc dựa trên giờ check-in thực tế, không phụ thuộc trạng thái hiển thị của ngày hôm đó
            if (a.getCheckInTime() != null) {
                LocalTime shiftStart = a.getShift() != null ? a.getShift().getStartTime() : SHIFT_START;
                long lateMinutes = a.getCheckInTime().isAfter(shiftStart)
                        ? java.time.Duration.between(shiftStart, a.getCheckInTime()).toMinutes() : 0;
                if (lateMinutes > config.getLateGraceMinutes()) {
                    lateDays++;
                }
            }

            // Check missing checkout
            boolean isMissingCheckout = a.getCheckInTime() != null && a.getCheckOutTime() == null && 
                a.getStatus() != AttendanceStatus.ABSENT && a.getStatus() != AttendanceStatus.ABSENT_NO_PERMISSION && a.getStatus() != AttendanceStatus.SPECIAL_LEAVE;
            
            if (isMissingCheckout) {
                noCheckout++;
            }

            boolean isHoliday = holidayOpt.isPresent();
            // Nhân viên thực sự đi làm ngày Lễ: có check-in thực tế VÀ không phải là các trạng thái nghỉ/vắng
            boolean didWorkOnHoliday = isHoliday && a.getCheckInTime() != null 
                    && a.getStatus() != AttendanceStatus.ABSENT 
                    && a.getStatus() != AttendanceStatus.ABSENT_NO_PERMISSION 
                    && a.getStatus() != AttendanceStatus.SPECIAL_LEAVE;

            if (didWorkOnHoliday) {
                Holiday hol = holidayOpt.get();
                if (type == EmployeeType.PART_TIME) {
                    if (a.getCheckOutTime() != null) {
                        double hoursWorked = computeHours(a.getCheckInTime(), a.getCheckOutTime());
                        holidayHours += hoursWorked;
                        double hourlyRate = (emp.getSalaryBase() != null && emp.getSalaryBase() > 0) ? emp.getSalaryBase() : config.getPartTimeHourlyRate();
                        double coeff = hol.getCoefficient() != null ? hol.getCoefficient() : 3.0;
                        holidaySalary += roundAmount(hoursWorked * hourlyRate * coeff);
                    }
                } else {
                    // Full-time hoặc Manager đi làm ngày Lễ
                    double hoursWorked = 0.0;
                    if (a.getCheckOutTime() != null) {
                        hoursWorked = computeHours(a.getCheckInTime(), a.getCheckOutTime());
                    } else {
                        // Fallback về số giờ tiêu chuẩn của ca/hệ thống nếu quên checkout để tính giờ công
                        hoursWorked = a.getShift() != null ? a.getShift().getStandardHours() : config.getStandardWorkingHours();
                    }
                    
                    holidayHours += hoursWorked;
                    
                    double stdHours = a.getShift() != null ? a.getShift().getStandardHours() : config.getStandardWorkingHours();
                    if (hoursWorked <= stdHours) {
                        regularHours += hoursWorked;
                    } else {
                        regularHours += stdHours;
                        otHours      += (hoursWorked - stdHours);
                    }
                    
                    double bonusAmount = 0.0;
                    if (type == EmployeeType.MANAGER) {
                        bonusAmount = hol.getManagerBonus() != null ? hol.getManagerBonus() : 0.0;
                    } else {
                        bonusAmount = hol.getFullTimeBonus() != null ? hol.getFullTimeBonus() : 0.0;
                    }
                    
                    double pts = a.getWorkPoints() != null ? a.getWorkPoints() : 0.0;
                    holidaySalary += roundAmount(bonusAmount * pts);
                }
            } else if (!isMissingCheckout && a.getCheckInTime() != null && a.getCheckOutTime() != null) {
                // Ngày thường đi làm bình thường (hoặc ngày lễ nhưng không được tính đi làm lễ)
                double hoursWorked = computeHours(a.getCheckInTime(), a.getCheckOutTime());
                if (type == EmployeeType.PART_TIME) {
                    regularHours += hoursWorked;
                } else {
                    double stdHours = a.getShift() != null ? a.getShift().getStandardHours() : config.getStandardWorkingHours();
                    if (hoursWorked <= stdHours) {
                        regularHours += hoursWorked;
                    } else {
                        regularHours += stdHours;
                        otHours      += (hoursWorked - stdHours);
                    }
                }
            }
        }

        regularHours = roundHours(regularHours);
        otHours      = roundHours(otHours);
        holidayHours = roundHours(holidayHours);

        // ── Luồng: Tính lương cơ bản ─────────────────────────────────────────
        double baseSalary;
        double actualBaseSalary;
        double otSalary;

        if (type == EmployeeType.PART_TIME) {
            double hourlyRate = (emp.getSalaryBase() != null && emp.getSalaryBase() > 0) ? emp.getSalaryBase() : config.getPartTimeHourlyRate();
            baseSalary = hourlyRate; // Lương cơ bản là mức lương theo giờ
            actualBaseSalary = roundAmount(regularHours * hourlyRate);
            otSalary = 0.0; // Part-time không có OT
        } else if (emp.getSalaryBase() != null && emp.getSalaryBase() > 0) {
            baseSalary = roundAmount(emp.getSalaryBase()); // Lương cơ bản gốc
            
            // Lương thực tế tính tỷ lệ theo số ngày làm thực tế (gồm cả nghỉ đặc biệt được hưởng nguyên lương)
            // Tối đa 100% lương cơ bản gốc khi đạt đủ hoặc vượt số ngày công yêu cầu
            double totalEffectiveDays = workDays + specialLeaveDays;
            double paidDays = Math.min((double) config.getRequiredPerfectDays(), totalEffectiveDays);
            actualBaseSalary = roundAmount((emp.getSalaryBase() * paidDays) / config.getRequiredPerfectDays());
            
            otSalary   = roundAmount(otHours * (emp.getSalaryBase() / (config.getRequiredPerfectDays() * config.getStandardWorkingHours())) * config.getOtMultiplier());
        } else {
            switch (type) {
                case MANAGER:
                    baseSalary = config.getManagerBaseSalary() + config.getManagerAllowance();
                    otSalary   = 0.0; // Manager không OT
                    actualBaseSalary = baseSalary;
                    break;
                default: // FULL_TIME
                    baseSalary = config.getFullTimeBaseSalary();
                    double totalEffectiveDays = workDays + specialLeaveDays;
                    double paidDays = Math.min((double) config.getRequiredPerfectDays(), totalEffectiveDays);
                    actualBaseSalary = roundAmount((baseSalary * paidDays) / config.getRequiredPerfectDays());
                    otSalary = roundAmount(otHours * (baseSalary / (config.getRequiredPerfectDays() * config.getStandardWorkingHours())) * config.getOtMultiplier());
                    break;
            }
        }

        // ── Luồng: Thưởng/Phạt ──────────────────────────────────────────────
        // Phạt (áp dụng cho tất cả loại NORMAL)
        double penaltyLateAmt     = roundAmount(lateDays     * config.getLatePenalty());
        double penaltyNoCheckAmt  = roundAmount(noCheckout   * config.getMissingCheckoutPenalty());
        // Chỉ phạt vắng đối với số ngày nghỉ không phép thực tế
        double penaltyAbsentAmt   = roundAmount(absentNoPerm * config.getAbsentPenalty());
        double totalPenalty       = roundAmount(penaltyLateAmt + penaltyNoCheckAmt + penaltyAbsentAmt);

        // Thưởng chuyên cần (chỉ Full-time và Manager)
        double bonusFullDays = 0.0;
        double bonusNoLate   = 0.0;
        double totalEffectiveDaysForBonus = workDays + specialLeaveDays;
        if (type == EmployeeType.FULL_TIME || type == EmployeeType.MANAGER) {
            if (totalEffectiveDaysForBonus >= config.getRequiredPerfectDays()) {
                bonusFullDays = config.getPerfectAttendanceBonus();
            }
            if (lateDays == 0) {
                bonusNoLate = config.getBonusNoLate();
            }
        }
        double bonusAttendance = roundAmount(bonusFullDays + bonusNoLate);

        // Thưởng doanh thu (Part-time = 0, đã tính bên ngoài và truyền vào)
        double bonusRevenue = (type == EmployeeType.PART_TIME) ? 0.0 : roundAmount(revBonus);

        double totalBonus = roundAmount(bonusAttendance + bonusRevenue);

        // ── Luồng: Tính lương cuối ───────────────────────────────────────────
        double totalSalary = roundAmount(actualBaseSalary + otSalary + holidaySalary + totalBonus - totalPenalty);
        if (totalSalary < 0) totalSalary = 0;

        // Nếu không đi làm ngày nào (0 ngày và 0 công), thực lĩnh và tất cả khoản lương, thưởng, phạt tự động bằng 0
        if (workDays == 0.0 && regularHours == 0.0 && holidayHours == 0.0) {
            baseSalary = 0.0;
            actualBaseSalary = 0.0;
            otSalary = 0.0;
            holidayHours = 0.0;
            holidaySalary = 0.0;
            bonusAttendance = 0.0;
            bonusRevenue = 0.0;
            penaltyLateAmt = 0.0;
            penaltyNoCheckAmt = 0.0;
            penaltyAbsentAmt = 0.0;
            totalPenalty = 0.0;
            totalBonus = 0.0;
            totalSalary = 0.0;
        }

        // ── Persist ──────────────────────────────────────────────────────────
        Optional<Salary> existing = salaryRepository.findByEmployeeIdAndMonthAndYear(emp.getId(), month, year);
        Salary salary = existing.orElse(new Salary());
        salary.setEmployee(emp);
        salary.setMonth(month);
        salary.setYear(year);
        salary.setEmployeeType(type);
        salary.setRegularHours(regularHours);
        salary.setOtHours(otHours);
        salary.setHolidayHours(holidayHours);
        salary.setWorkDays(workDays);
        salary.setBaseSalary(baseSalary);
        salary.setActualBaseSalary(actualBaseSalary);
        salary.setOtSalary(otSalary);
        salary.setHolidaySalary(holidaySalary);
        salary.setBonusAttendance(bonusAttendance);
        salary.setBonusRevenue(bonusRevenue);
        salary.setPenaltyLate(penaltyLateAmt);
        salary.setPenaltyNoCheckout(penaltyNoCheckAmt);
        salary.setPenaltyAbsent(penaltyAbsentAmt);
        salary.setTotalPenalty(totalPenalty);
        salary.setTotalBonus(totalBonus);
        salary.setTotalSalary(totalSalary);
        salary.setStatus("PENDING");
        salaryRepository.save(salary);

        // Lương đã được tính và lưu
        // (Không gửi email thông báo lương tự động tại đây để tránh spam khi chấm công, chỉ gửi khi được duyệt)

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
                .holidayHours(holidayHours)
                .workDays(workDays)
                .baseSalary(baseSalary)
                .actualBaseSalary(actualBaseSalary)
                .otSalary(otSalary)
                .holidaySalary(holidaySalary)
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
                .status(salary.getStatus())
                .build();
    }

    public SalaryPayrollDto updateSalary(Long id, SalaryPayrollDto dto) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bảng lương: " + id));

        salary.setWorkDays(dto.getWorkDays());
        salary.setRegularHours(roundHours(dto.getRegularHours()));
        salary.setOtHours(roundHours(dto.getOtHours()));
        salary.setHolidayHours(dto.getHolidayHours() != null ? roundHours(dto.getHolidayHours()) : 0.0);
        salary.setBaseSalary(roundAmount(dto.getBaseSalary()));
        salary.setActualBaseSalary(roundAmount(dto.getActualBaseSalary() != null ? dto.getActualBaseSalary() : dto.getBaseSalary()));
        salary.setOtSalary(roundAmount(dto.getOtSalary()));
        salary.setHolidaySalary(dto.getHolidaySalary() != null ? roundAmount(dto.getHolidaySalary()) : 0.0);
        salary.setBonusAttendance(roundAmount(dto.getBonusAttendance()));
        salary.setBonusRevenue(roundAmount(dto.getBonusRevenue()));
        salary.setTotalPenalty(roundAmount(dto.getTotalPenalty()));
        
        // Recalculate total
        double totalSalary = (salary.getActualBaseSalary() != null ? salary.getActualBaseSalary() : 0)
                           + (salary.getOtSalary() != null ? salary.getOtSalary() : 0)
                           + (salary.getHolidaySalary() != null ? salary.getHolidaySalary() : 0)
                           + (salary.getBonusAttendance() != null ? salary.getBonusAttendance() : 0)
                           + (salary.getBonusRevenue() != null ? salary.getBonusRevenue() : 0)
                           - (salary.getTotalPenalty() != null ? salary.getTotalPenalty() : 0);
        if (totalSalary < 0) totalSalary = 0;
        
        salary.setTotalBonus(roundAmount((salary.getBonusAttendance() != null ? salary.getBonusAttendance() : 0)
                           + (salary.getBonusRevenue() != null ? salary.getBonusRevenue() : 0)));
        salary.setTotalSalary(roundAmount(totalSalary));
        
        // Cập nhật ngược lại vào hồ sơ Nhân sự (Employee profile) để lần sau tự động lấy số này
        if (salary.getEmployee() != null) {
            salary.getEmployee().setSalaryBase(dto.getBaseSalary());
            employeeRepository.save(salary.getEmployee());
        }
        
        return toDto(salaryRepository.save(salary));
    }

    public SalaryPayrollDto approveSalary(Long id) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bảng lương: " + id));
        salary.setStatus("APPROVED");
        
        SalaryPayrollDto dto = toDto(salaryRepository.save(salary));
        // Gửi email khi duyệt lương
        if (salary.getEmployee() != null) {
            sendPayrollEmail(salary.getEmployee(), salary.getMonth(), salary.getYear(), salary.getTotalSalary());
        }
        return dto;
    }

    public SalaryPayrollDto revertSalary(Long id) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bảng lương: " + id));
        salary.setStatus("PENDING");
        return toDto(salaryRepository.save(salary));
    }

    public SalaryPayrollDto rejectSalary(Long id) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bảng lương: " + id));
        salary.setStatus("REJECTED");
        return toDto(salaryRepository.save(salary));
    }

    public List<SalaryPayrollDto> approveAllSalaries(Integer month, Integer year) {
        List<Salary> list = salaryRepository.findByMonthAndYear(month, year);
        for (Salary salary : list) {
            salary.setStatus("APPROVED");
            salaryRepository.save(salary);
            // Gửi email khi duyệt lương
            if (salary.getEmployee() != null) {
                sendPayrollEmail(salary.getEmployee(), salary.getMonth(), salary.getYear(), salary.getTotalSalary());
            }
        }
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<SalaryPayrollDto> approveMultipleSalaries(List<Long> ids, Integer month, Integer year) {
        if (ids != null && !ids.isEmpty()) {
            List<Salary> list = salaryRepository.findAllById(ids);
            for (Salary salary : list) {
                salary.setStatus("APPROVED");
                salaryRepository.save(salary);
                // Gửi email khi duyệt lương
                if (salary.getEmployee() != null) {
                    sendPayrollEmail(salary.getEmployee(), salary.getMonth(), salary.getYear(), salary.getTotalSalary());
                }
            }
        }
        return getSalariesByMonth(month, year);
    }

    public List<SalaryPayrollDto> revertMultipleSalaries(List<Long> ids, Integer month, Integer year) {
        if (ids != null && !ids.isEmpty()) {
            List<Salary> list = salaryRepository.findAllById(ids);
            for (Salary salary : list) {
                salary.setStatus("PENDING");
                salaryRepository.save(salary);
            }
        }
        return getSalariesByMonth(month, year);
    }

    public List<SalaryPayrollDto> rejectMultipleSalaries(List<Long> ids, Integer month, Integer year) {
        if (ids != null && !ids.isEmpty()) {
            List<Salary> list = salaryRepository.findAllById(ids);
            for (Salary salary : list) {
                salary.setStatus("REJECTED");
                salaryRepository.save(salary);
            }
        }
        return getSalariesByMonth(month, year);
    }

    /**
     * Tính revenue bonus cho 1 nhân viên trong ngữ cảnh toàn bộ công ty.
     */
    private double computeRevenueBonusForEmployee(Employee emp, Integer month, Integer year) {
        if (emp.getEmployeeType() == EmployeeType.PART_TIME) return 0.0;

        double bonusPool = revenueRepository.findByMonthAndYear(month, year)
                .map(r -> r.getBonusPool() != null ? r.getBonusPool() : 0.0)
                .orElse(0.0);

        SalaryConfig config = getSystemConfig();
        double ftWeight = config.getFullTimeShareWeight();
        double mgWeight = config.getManagerShareWeight();

        List<Employee> all = employeeRepository.findAll().stream()
                .filter(e -> e.getRole() != com.bmad.hrm.entity.Role.ADMIN && !"DELETED".equals(e.getStatus()) && !"LEAVE".equals(e.getStatus()))
                .collect(Collectors.toList());
        long ft = all.stream().filter(e -> e.getEmployeeType() == null || e.getEmployeeType() == EmployeeType.FULL_TIME).count();
        long mg = all.stream().filter(e -> e.getEmployeeType() == EmployeeType.MANAGER).count();
        double totalWeight = (ft * ftWeight) + (mg * mgWeight);
        if (totalWeight == 0) return 0.0;

        double pointValue = bonusPool / totalWeight;
        double rawBonus = emp.getEmployeeType() == EmployeeType.MANAGER ? pointValue * mgWeight : pointValue * ftWeight;
        return (double) Math.round(rawBonus);
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
                .holidayHours(s.getHolidayHours())
                .workDays(s.getWorkDays())
                .baseSalary(s.getBaseSalary())
                .actualBaseSalary(s.getActualBaseSalary())
                .otSalary(s.getOtSalary())
                .holidaySalary(s.getHolidaySalary())
                .bonusAttendance(s.getBonusAttendance())
                .bonusRevenue(s.getBonusRevenue())
                .totalBonus(s.getTotalBonus())
                .penaltyLate(s.getPenaltyLate())
                .penaltyNoCheckout(s.getPenaltyNoCheckout())
                .penaltyAbsent(s.getPenaltyAbsent())
                .totalPenalty(s.getTotalPenalty())
                .totalSalary(s.getTotalSalary())
                .status(s.getStatus())
                .build();
    }

    private double roundHours(double val) {
        return Math.round(val * 10.0) / 10.0;
    }

    private double roundAmount(double val) {
        return (double) Math.round(val);
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
