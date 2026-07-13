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
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Luồng QUẢN LÝ LƯƠNG NHÂN VIÊN QUÁN CAFE – FINAL
 */
@Service
@RequiredArgsConstructor
public class SalaryService {

    private final SalaryRepository           salaryRepository;
    private final EmployeeRepository         employeeRepository;
    private final AttendanceRepository       attendanceRepository;
    private final MonthlyRevenueRepository   revenueRepository;
    private final EmailService               emailService;
    private final SalaryConfigRepository     salaryConfigRepository;
    private final HolidayRepository          holidayRepository;

    private static final LocalTime SHIFT_START  = LocalTime.of(8, 0);

    public SalaryConfig getSystemConfig() {
        return salaryConfigRepository.findAll().stream().findFirst()
                .orElse(SalaryConfig.builder().build());
    }

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

    public List<SalaryPayrollDto> calculateAllSalaries(Integer month, Integer year) {
        List<Employee> allEmployees = employeeRepository.findAll().stream()
                .filter(e -> e.getRole() != com.bmad.hrm.entity.Role.ADMIN)
                .collect(Collectors.toList());

        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd   = monthStart.withDayOfMonth(monthStart.lengthOfMonth());

        List<Attendance> allAttendances = attendanceRepository.findByDateBetweenOrderByDateDescCheckInTimeDesc(monthStart, monthEnd);
        Map<Long, List<Attendance>> attMap = allAttendances.stream()
                .filter(a -> a.getEmployee() != null)
                .collect(Collectors.groupingBy(a -> a.getEmployee().getId()));

        List<Employee> employees = allEmployees.stream()
                .filter(e -> {
                    if (!"LEAVE".equals(e.getStatus()) && !"DELETED".equals(e.getStatus())) {
                        return true;
                    }
                    return attMap.containsKey(e.getId()) && !attMap.get(e.getId()).isEmpty();
                })
                .collect(Collectors.toList());

        double bonusPool = revenueRepository.findByMonthAndYear(month, year)
                .map(r -> r.getBonusPool() != null ? r.getBonusPool() : 0.0)
                .orElse(0.0);

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

        List<Holiday> allHolidays = holidayRepository.findAll();
        List<Salary> existingSalaries = salaryRepository.findByMonthAndYear(month, year);
        Map<Long, Salary> salaryMap = existingSalaries.stream()
                .filter(s -> s.getEmployee() != null)
                .collect(Collectors.toMap(s -> s.getEmployee().getId(), s -> s));

        List<Salary> salariesToSave = new ArrayList<>();
        List<SalaryPayrollDto> results = new ArrayList<>();

        for (Employee emp : employees) {
            double revBonus = 0.0;
            if (emp.getEmployeeType() == EmployeeType.FULL_TIME) revBonus = fullTimeBonusRev;
            else if (emp.getEmployeeType() == EmployeeType.MANAGER) revBonus = managerBonusRev;

            List<Attendance> records = attMap.getOrDefault(emp.getId(), new ArrayList<>());
            Salary existing = salaryMap.get(emp.getId());
            
            Salary processedSalary = calculateOneSalaryCore(emp, month, year, revBonus, records, allHolidays, existing, config);
            salariesToSave.add(processedSalary);
        }

        List<Salary> savedSalaries = salaryRepository.saveAll(salariesToSave);

        for (Salary s : savedSalaries) {
            results.add(toDtoWithRecords(s, attMap.getOrDefault(s.getEmployee().getId(), new ArrayList<>()), config));
        }

        return results;
    }

    public SalaryPayrollDto calculateSalaryForOne(Long employeeId, Integer month, Integer year) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + employeeId));

        double revBonus = computeRevenueBonusForEmployee(emp, month, year);
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<Attendance> records = attendanceRepository.findByEmployeeIdAndDateBetween(emp.getId(), start, end);
        List<Holiday> holidays = holidayRepository.findAll();
        Salary existing = salaryRepository.findByEmployeeIdAndMonthAndYear(emp.getId(), month, year).orElse(null);
        SalaryConfig config = getSystemConfig();

        Salary salary = calculateOneSalaryCore(emp, month, year, revBonus, records, holidays, existing, config);
        salary = salaryRepository.save(salary);
        
        if (salary.getEmployee() != null) {
            salary.getEmployee().setSalaryBase(salary.getBaseSalary());
            employeeRepository.save(salary.getEmployee());
        }

        return toDtoWithRecords(salary, records, config);
    }

    public List<SalaryPayrollDto> getSalariesByMonth(Integer month, Integer year) {
        List<Salary> salaries = salaryRepository.findByMonthAndYear(month, year);
        if (salaries.isEmpty()) return new ArrayList<>();

        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<Attendance> allRecords = attendanceRepository.findByDateBetweenOrderByDateDescCheckInTimeDesc(start, end);
        Map<Long, List<Attendance>> attMap = allRecords.stream()
                .filter(a -> a.getEmployee() != null)
                .collect(Collectors.groupingBy(a -> a.getEmployee().getId()));

        SalaryConfig config = getSystemConfig();

        return salaries.stream()
                .map(s -> toDtoWithRecords(s, attMap.getOrDefault(s.getEmployee().getId(), new ArrayList<>()), config))
                .collect(Collectors.toList());
    }

    private Salary calculateOneSalaryCore(Employee emp, Integer month, Integer year, double revBonus, List<Attendance> records, List<Holiday> allHolidays, Salary existing, SalaryConfig config) {
        EmployeeType type = emp.getEmployeeType() != null ? emp.getEmployeeType() : EmployeeType.FULL_TIME;
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());

        long specialLeaveDays = records.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.SPECIAL_LEAVE).count();

        List<Attendance> normalRecords = records.stream()
                .filter(a -> a.getStatus() != AttendanceStatus.SPECIAL_LEAVE)
                .collect(Collectors.toList());

        double regularHours = 0.0;
        double otHours      = 0.0;
        double holidayHours = 0.0;
        double holidaySalary = 0.0;
        long   lateDays     = 0;
        long   noCheckout   = 0;
        long   absentNoPerm = 0;
        long   earlyDays    = 0;

        List<Holiday> holidays = allHolidays.stream()
                .filter(h -> {
                    if (h.getRepeatYearly() != null && h.getRepeatYearly()) {
                        return h.getDate().getMonthValue() == month;
                    } else {
                        return !h.getDate().isBefore(start) && !h.getDate().isAfter(end);
                    }
                })
                .collect(Collectors.toList());

        double workDays = records.stream()
                .mapToDouble(a -> a.getWorkPoints() != null ? a.getWorkPoints() : 0.0)
                .sum();
        workDays = roundHours(workDays);

        for (Attendance a : normalRecords) {
            if (a.getStatus() == AttendanceStatus.ABSENT_NO_PERMISSION) {
                absentNoPerm++;
            }

            Optional<Holiday> holidayOpt = holidays.stream()
                    .filter(h -> h.getDate().equals(a.getDate()))
                    .findFirst();

            if (a.getCheckInTime() != null) {
                LocalTime shiftStart = a.getShift() != null ? a.getShift().getStartTime() : SHIFT_START;
                long lateMinutes = a.getCheckInTime().isAfter(shiftStart)
                        ? java.time.Duration.between(shiftStart, a.getCheckInTime()).toMinutes() : 0;
                if (lateMinutes > config.getLateGraceMinutes()) {
                    lateDays++;
                }
            }

            boolean isMissingCheckout = a.getCheckInTime() != null && a.getCheckOutTime() == null && 
                a.getStatus() != AttendanceStatus.ABSENT && a.getStatus() != AttendanceStatus.ABSENT_NO_PERMISSION && a.getStatus() != AttendanceStatus.SPECIAL_LEAVE;
            
            if (isMissingCheckout) {
                noCheckout++;
            }

            boolean isEarly = a.getStatus() == AttendanceStatus.EARLY;
            if (!isEarly && a.getCheckOutTime() != null) {
                LocalTime shiftEnd = a.getShift() != null ? a.getShift().getEndTime() : SHIFT_START.plusHours(9);
                long earlyMinutes = a.getCheckOutTime().isBefore(shiftEnd)
                        ? java.time.Duration.between(a.getCheckOutTime(), shiftEnd).toMinutes() : 0;
                if (earlyMinutes > config.getEarlyGraceMinutes()) {
                    isEarly = true;
                }
            }
            if (isEarly) {
                earlyDays++;
            }

            boolean isHoliday = holidayOpt.isPresent();
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
                    double hoursWorked = 0.0;
                    if (a.getCheckOutTime() != null) {
                        hoursWorked = computeHours(a.getCheckInTime(), a.getCheckOutTime());
                    } else {
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

        double baseSalary;
        double actualBaseSalary;
        double otSalary;

        if (type == EmployeeType.PART_TIME) {
            double hourlyRate = (emp.getSalaryBase() != null && emp.getSalaryBase() > 0) ? emp.getSalaryBase() : config.getPartTimeHourlyRate();
            baseSalary = hourlyRate;
            actualBaseSalary = roundAmount(regularHours * hourlyRate);
            otSalary = 0.0;
        } else if (emp.getSalaryBase() != null && emp.getSalaryBase() > 0) {
            baseSalary = roundAmount(emp.getSalaryBase());
            double totalEffectiveDays = workDays + specialLeaveDays;
            double paidDays = Math.min((double) config.getRequiredPerfectDays(), totalEffectiveDays);
            actualBaseSalary = roundAmount((emp.getSalaryBase() * paidDays) / config.getRequiredPerfectDays());
            otSalary   = roundAmount(otHours * (emp.getSalaryBase() / (config.getRequiredPerfectDays() * config.getStandardWorkingHours())) * config.getOtMultiplier());
        } else {
            switch (type) {
                case MANAGER:
                    baseSalary = config.getManagerBaseSalary() + config.getManagerAllowance();
                    otSalary   = 0.0;
                    actualBaseSalary = baseSalary;
                    break;
                default:
                    baseSalary = config.getFullTimeBaseSalary();
                    double totalEffectiveDays = workDays + specialLeaveDays;
                    double paidDays = Math.min((double) config.getRequiredPerfectDays(), totalEffectiveDays);
                    actualBaseSalary = roundAmount((baseSalary * paidDays) / config.getRequiredPerfectDays());
                    otSalary = roundAmount(otHours * (baseSalary / (config.getRequiredPerfectDays() * config.getStandardWorkingHours())) * config.getOtMultiplier());
                    break;
            }
        }

        double penaltyLateAmt     = roundAmount(lateDays     * config.getLatePenalty());
        double penaltyNoCheckAmt  = roundAmount(noCheckout   * config.getMissingCheckoutPenalty());
        double penaltyAbsentAmt   = roundAmount(absentNoPerm * config.getAbsentPenalty());
        double totalPenalty       = roundAmount(penaltyLateAmt + penaltyNoCheckAmt + penaltyAbsentAmt);

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
        double bonusRevenue = (type == EmployeeType.PART_TIME) ? 0.0 : roundAmount(revBonus);
        double totalBonus = roundAmount(bonusAttendance + bonusRevenue);

        double totalSalary = roundAmount(actualBaseSalary + otSalary + holidaySalary + totalBonus - totalPenalty);
        if (totalSalary < 0) totalSalary = 0;

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

        Salary salary = existing != null ? existing : new Salary();
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
        if (salary.getStatus() == null) salary.setStatus("PENDING");

        return salary;
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
        
        if (salary.getEmployee() != null) {
            salary.getEmployee().setSalaryBase(dto.getBaseSalary());
            employeeRepository.save(salary.getEmployee());
        }
        
        LocalDate start = LocalDate.of(salary.getYear(), salary.getMonth(), 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<Attendance> records = attendanceRepository.findByEmployeeIdAndDateBetween(salary.getEmployee().getId(), start, end);
        
        return toDtoWithRecords(salaryRepository.save(salary), records, getSystemConfig());
    }

    public SalaryPayrollDto approveSalary(Long id) {
        Salary salary = salaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bảng lương: " + id));
        salary.setStatus("APPROVED");
        salary = salaryRepository.save(salary);
        
        LocalDate start = LocalDate.of(salary.getYear(), salary.getMonth(), 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<Attendance> records = attendanceRepository.findByEmployeeIdAndDateBetween(salary.getEmployee().getId(), start, end);
        
        SalaryPayrollDto dto = toDtoWithRecords(salary, records, getSystemConfig());
        if (salary.getEmployee() != null) {
            sendPayrollEmail(salary.getEmployee(), salary.getMonth(), salary.getYear(), salary.getTotalSalary());
        }
        return dto;
    }

    public SalaryPayrollDto revertSalary(Long id) {
        Salary salary = salaryRepository.findById(id).orElseThrow();
        salary.setStatus("PENDING");
        salary = salaryRepository.save(salary);
        LocalDate start = LocalDate.of(salary.getYear(), salary.getMonth(), 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<Attendance> records = attendanceRepository.findByEmployeeIdAndDateBetween(salary.getEmployee().getId(), start, end);
        return toDtoWithRecords(salary, records, getSystemConfig());
    }

    public SalaryPayrollDto rejectSalary(Long id) {
        Salary salary = salaryRepository.findById(id).orElseThrow();
        salary.setStatus("REJECTED");
        salary = salaryRepository.save(salary);
        LocalDate start = LocalDate.of(salary.getYear(), salary.getMonth(), 1);
        LocalDate end   = start.withDayOfMonth(start.lengthOfMonth());
        List<Attendance> records = attendanceRepository.findByEmployeeIdAndDateBetween(salary.getEmployee().getId(), start, end);
        return toDtoWithRecords(salary, records, getSystemConfig());
    }

    public List<SalaryPayrollDto> approveAllSalaries(Integer month, Integer year) {
        List<Salary> list = salaryRepository.findByMonthAndYear(month, year);
        for (Salary salary : list) {
            salary.setStatus("APPROVED");
            salaryRepository.save(salary);
            if (salary.getEmployee() != null) {
                sendPayrollEmail(salary.getEmployee(), salary.getMonth(), salary.getYear(), salary.getTotalSalary());
            }
        }
        return getSalariesByMonth(month, year);
    }

    public List<SalaryPayrollDto> approveMultipleSalaries(List<Long> ids, Integer month, Integer year) {
        if (ids != null && !ids.isEmpty()) {
            List<Salary> list = salaryRepository.findAllById(ids);
            for (Salary salary : list) {
                salary.setStatus("APPROVED");
                salaryRepository.save(salary);
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

    private SalaryPayrollDto toDtoWithRecords(Salary s, List<Attendance> records, SalaryConfig config) {
        Employee emp = s.getEmployee();
        long lateDays = 0;
        long specialLeaveDays = 0;
        long absentNoPerm = 0;
        long noCheckout = 0;
        long earlyDays = 0;

        if (emp != null && records != null) {
            specialLeaveDays = records.stream()
                    .filter(a -> a.getStatus() == AttendanceStatus.SPECIAL_LEAVE).count();

            for (Attendance a : records) {
                if (a.getStatus() == AttendanceStatus.ABSENT_NO_PERMISSION) {
                    absentNoPerm++;
                }

                if (a.getCheckInTime() != null) {
                    LocalTime shiftStart = a.getShift() != null ? a.getShift().getStartTime() : SHIFT_START;
                    long lateMinutes = a.getCheckInTime().isAfter(shiftStart)
                            ? java.time.Duration.between(shiftStart, a.getCheckInTime()).toMinutes() : 0;
                    if (lateMinutes > config.getLateGraceMinutes()) {
                        lateDays++;
                    }
                }

                boolean isMissingCheckout = a.getCheckInTime() != null && a.getCheckOutTime() == null &&
                        a.getStatus() != AttendanceStatus.ABSENT && a.getStatus() != AttendanceStatus.ABSENT_NO_PERMISSION && a.getStatus() != AttendanceStatus.SPECIAL_LEAVE;
                if (isMissingCheckout) {
                    noCheckout++;
                }

                boolean isEarly = a.getStatus() == AttendanceStatus.EARLY;
                if (!isEarly && a.getCheckOutTime() != null) {
                    LocalTime shiftEnd = a.getShift() != null ? a.getShift().getEndTime() : SHIFT_START.plusHours(9);
                    long earlyMinutes = a.getCheckOutTime().isBefore(shiftEnd)
                            ? java.time.Duration.between(a.getCheckOutTime(), shiftEnd).toMinutes() : 0;
                    if (earlyMinutes > config.getEarlyGraceMinutes()) {
                        isEarly = true;
                    }
                }
                if (isEarly) {
                    earlyDays++;
                }
            }
        }

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
                .lateDays(lateDays)
                .specialLeaveDays(specialLeaveDays)
                .absentNoPerm(absentNoPerm)
                .noCheckoutDays(noCheckout)
                .earlyDays(earlyDays)
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
