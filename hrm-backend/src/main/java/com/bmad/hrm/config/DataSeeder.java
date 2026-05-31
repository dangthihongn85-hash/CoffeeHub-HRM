package com.bmad.hrm.config;

import com.bmad.hrm.entity.*;
import com.bmad.hrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.bmad.hrm.service.SalaryService;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.time.LocalDate;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final AttendanceRepository attendanceRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository shiftAssignmentRepository;
    private final MonthlyRevenueRepository monthlyRevenueRepository;
    private final SalaryRepository salaryRepository;
    private final SalaryService salaryService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Wipe everything to ensure fresh, consistent state
        System.out.println("Clearing old seeded data for clean re-seed...");
        salaryRepository.deleteAll();
        attendanceRepository.deleteAll();
        shiftAssignmentRepository.deleteAll();
        employeeRepository.deleteAll();
        shiftRepository.deleteAll();
        departmentRepository.deleteAll();
        positionRepository.deleteAll();
        monthlyRevenueRepository.deleteAll();

        // 2. Seed coffee shop shifts
        Shift caSang = Shift.builder()
                .name("Ca sáng")
                .startTime(LocalTime.of(6, 0))
                .endTime(LocalTime.of(14, 0))
                .standardHours(8.0)
                .maxEmployees(10)
                .build();
        Shift caChieu = Shift.builder()
                .name("Ca chiều")
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(22, 0))
                .standardHours(8.0)
                .maxEmployees(10)
                .build();
        Shift caGay = Shift.builder()
                .name("Ca gãy")
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(18, 0))
                .standardHours(8.0)
                .maxEmployees(5)
                .build();
        shiftRepository.saveAll(Arrays.asList(caSang, caChieu, caGay));
        System.out.println("Seeded shifts!");

        // 3. Seed Cafe Departments & Positions
        List<String[]> deptData = Arrays.asList(
            new String[]{"Pha Chế", "Bộ phận pha chế các loại đồ uống"},
            new String[]{"Phục Vụ", "Nhân viên phục vụ tại bàn"},
            new String[]{"Thu Ngân", "Bộ phận thu tiền và quản lý hóa đơn"}
        );
        List<String[][]> posData = Arrays.asList(
            new String[][]{{"Barista Trưởng","Pha Chế"},{"Barista","Pha Chế"},{"Trợ Lý Barista","Pha Chế"}},
            new String[][]{{"Trưởng Ca Phục Vụ","Phục Vụ"},{"Nhân Viên Phục Vụ","Phục Vụ"},{"Nhân Viên Part-time","Phục Vụ"}},
            new String[][]{{"Thu Ngân Trưởng","Thu Ngân"},{"Thu Ngân","Thu Ngân"}}
        );
        for (String[] d : deptData) {
            departmentRepository.save(Department.builder().name(d[0]).description(d[1]).build());
        }
        for (String[][] group : posData) {
            for (String[] p : group) {
                positionRepository.save(Position.builder().name(p[0]).departmentName(p[1]).build());
            }
        }
        System.out.println("Seeded departments and positions!");

        // 4. Seed Admin
        Employee admin = new Employee();
        admin.setName("Nguyễn Thị Quản Lý");
        admin.setEmail("admin");
        admin.setPassword(passwordEncoder.encode("123456"));
        admin.setRole(Role.ADMIN);
        admin.setDepartment("Quản Lý");
        admin.setPosition("Quản Lý Cửa Hàng");
        admin.setSalaryBase(20000000.0);
        admin.setStatus("ACTIVE");
        employeeRepository.save(admin);
        System.out.println("Seeded admin!");

        // 5. Seed 20 Dummy Employees
        List<String> names = Arrays.asList(
            "Trần Văn Hùng", "Lê Thị Mai", "Phạm Văn Đức", "Hoàng Thị Lan", "Đỗ Văn Minh",
            "Ngô Thị Hoa", "Dương Văn Nam", "Lý Thị Thu", "Bùi Văn Tuấn", "Vũ Thị Ngọc",
            "Đặng Văn Long", "Bùi Thị Trang", "Trịnh Văn Hải", "Đinh Thị Yến", "Võ Văn Bình",
            "Lâm Thị Kim", "Mai Văn Sơn", "Phan Thị Ly", "Thái Văn Duy", "Hoàng Thị Bảo"
        );

        String[][] cafePosData = {
            {"Barista", "Pha Chế"}, {"Nhân Viên Phục Vụ", "Phục Vụ"},
            {"Barista Trưởng", "Pha Chế"}, {"Thu Ngân", "Thu Ngân"},
            {"Trợ Lý Barista", "Pha Chế"}, {"Barista Trưởng", "Pha Chế"},
            {"Nhân Viên Phục Vụ", "Phục Vụ"}, {"Nhân Viên Part-time", "Phục Vụ"},
            {"Trưởng Ca Phục Vụ", "Phục Vụ"}, {"Thu Ngân Trưởng", "Thu Ngân"},
            {"Barista", "Pha Chế"}, {"Nhân Viên Part-time", "Phục Vụ"},
            {"Barista", "Pha Chế"}, {"Nhân Viên Phục Vụ", "Phục Vụ"},
            {"Barista", "Pha Chế"}, {"Quản Lý Ca", "Quản Lý"},
            {"Nhân Viên Phục Vụ", "Phục Vụ"}, {"Barista", "Pha Chế"},
            {"Nhân Viên Phục Vụ", "Phục Vụ"}, {"Thu Ngân", "Thu Ngân"}
        };
        double[] salaries = {
            8000000, 7000000, 9500000, 8000000, 7500000,
            10000000, 6800000, 8000000, 8500000, 9000000,
            8000000, 3500000, 9000000, 7200000, 8100000,
            10000000, 6900000, 8200000, 7800000, 8000000
        };

        // Create a dummy JSON face descriptor array of 128 zeros
        StringBuilder sb = new StringBuilder("[");
        for (int j = 0; j < 128; j++) {
            sb.append("0.0");
            if (j < 127) sb.append(",");
        }
        sb.append("]");
        String dummyFaceJson = sb.toString();

        for (int i = 0; i < 20; i++) {
            Employee emp = new Employee();
            emp.setName(names.get(i));
            emp.setEmail("nv" + (i + 1) + "@cafe.com");
            emp.setPassword(passwordEncoder.encode("123456"));
            emp.setRole(Role.EMPLOYEE);
            emp.setPosition(cafePosData[i][0]);
            emp.setDepartment(cafePosData[i][1]);
            emp.setSalaryBase(salaries[i]);
            
            // Assign explicit EmployeeType based on position name
            if (cafePosData[i][0].contains("Part-time")) {
                emp.setEmployeeType(EmployeeType.PART_TIME);
            } else if (cafePosData[i][0].contains("Trưởng") || cafePosData[i][0].contains("Quản Lý")) {
                emp.setEmployeeType(EmployeeType.MANAGER);
            } else {
                emp.setEmployeeType(EmployeeType.FULL_TIME);
            }
            
            emp.setStatus(i % 6 == 0 ? "LEAVE" : "ACTIVE");

            // Employees 0 to 16 (17 people) HAVE registered faces.
            // Employees 17, 18, 19 (the last 3 people) DO NOT have registered faces (faceDescriptor is NULL)
            // and they will have NO historical attendance records seeded!
            if (i < 17) {
                emp.setFaceDescriptor(dummyFaceJson);
            } else {
                emp.setFaceDescriptor(null);
            }

            employeeRepository.save(emp);
        }
        System.out.println("Seeded 20 employees (17 with face registered, 3 without)!");

        // 6. Seed Monthly Revenue
        LocalDate targetMonthDate = LocalDate.of(2026, 5, 1);
        int year = targetMonthDate.getYear();
        int month = targetMonthDate.getMonthValue();
        MonthlyRevenue rev = new MonthlyRevenue();
        rev.setMonth(month);
        rev.setYear(year);
        rev.setMonthlyRevenue(540000000.0);
        rev.setBonusRate(1.0);
        rev.setBonusPool(5400000.0);
        rev.setNotes("Doanh thu tháng " + month + "/" + year + " ổn định");
        monthlyRevenueRepository.save(rev);
        System.out.println("Seeded Monthly Revenue!");

        // 7. Seed Attendance & Shift Assignments Daily Logs
        System.out.println("Seeding high-fidelity shift assignments and attendance records...");
        List<Employee> allEmployees = employeeRepository.findAll().stream()
                .filter(e -> e.getRole() != Role.ADMIN)
                .collect(java.util.stream.Collectors.toList());

        List<Shift> shifts = shiftRepository.findAll();
        java.util.Random random = new java.util.Random();
        
        int endAttendanceDay = targetMonthDate.lengthOfMonth();
        int totalDaysInMonth = targetMonthDate.lengthOfMonth();

        for (int i = 0; i < allEmployees.size(); i++) {
            Employee emp = allEmployees.get(i);
            
            // If the employee has NO face descriptor (the 3 unregistered employees),
            // we DO NOT seed any shift assignments or attendance records for them!
            if (emp.getFaceDescriptor() == null) {
                continue;
            }

            Shift primaryShift = shifts.get(i % shifts.size());

            for (int day = 1; day <= totalDaysInMonth; day++) {
                LocalDate date = LocalDate.of(year, month, day);

                // Every 6th day is a rest day (OFF) -> no shift assignment, no attendance
                if (day % 6 == 0) {
                    continue;
                }

                // Seed Shift Assignment for the entire month!
                ShiftAssignment sa = ShiftAssignment.builder()
                        .employee(emp)
                        .shift(primaryShift)
                        .date(date)
                        .build();
                shiftAssignmentRepository.save(sa);

                // Seed Attendance only for past days!
                if (day <= endAttendanceDay) {
                    int randAbsent = random.nextInt(100);
                    if (randAbsent < 2) {
                        // Nghỉ không phép
                        Attendance att = Attendance.builder()
                                .employee(emp)
                                .shift(primaryShift)
                                .date(date)
                                .status(AttendanceStatus.ABSENT_NO_PERMISSION)
                                .workPoints(0.0)
                                .build();
                        attendanceRepository.save(att);
                        continue;
                    } else if (randAbsent < 4) {
                        // Nghỉ có phép
                        Attendance att = Attendance.builder()
                                .employee(emp)
                                .shift(primaryShift)
                                .date(date)
                                .status(AttendanceStatus.ABSENT)
                                .workPoints(0.0)
                                .build();
                        attendanceRepository.save(att);
                        continue;
                    } else if (randAbsent < 5) {
                        // Nghỉ đặc biệt
                        Attendance att = Attendance.builder()
                                .employee(emp)
                                .shift(primaryShift)
                                .date(date)
                                .status(AttendanceStatus.SPECIAL_LEAVE)
                                .workPoints(0.0)
                                .build();
                        attendanceRepository.save(att);
                        continue;
                    }

                    // Normal work day present
                    LocalTime checkIn;
                    int checkInRoll = random.nextInt(100);
                    if (checkInRoll < 8) {
                        // Late check-in (> 10 mins late)
                        int lateMinutes = 11 + random.nextInt(45);
                        checkIn = primaryShift.getStartTime().plusMinutes(lateMinutes);
                    } else {
                        // On time
                        int offset = random.nextInt(25) - 20; // -20 to +4 mins
                        checkIn = primaryShift.getStartTime().plusMinutes(offset);
                    }

                    LocalTime checkOut;
                    int checkOutRoll = random.nextInt(100);
                    if (checkOutRoll < 5) {
                        // Early check-out
                        int earlyMinutes = 15 + random.nextInt(90);
                        checkOut = primaryShift.getEndTime().minusMinutes(earlyMinutes);
                    } else if (checkOutRoll < 15) {
                        // OT
                        int otMinutes = 30 + random.nextInt(120);
                        checkOut = primaryShift.getEndTime().plusMinutes(otMinutes);
                    } else {
                        // Standard checkout
                        int offset = random.nextInt(20); // 0 to 19 mins late
                        checkOut = primaryShift.getEndTime().plusMinutes(offset);
                    }

                    // Calculate point & status
                    double workedHours = java.time.Duration.between(checkIn, checkOut).toMinutes() / 60.0;
                    long lateMinutes = checkIn.isAfter(primaryShift.getStartTime()) 
                            ? java.time.Duration.between(primaryShift.getStartTime(), checkIn).toMinutes() : 0;
                    long earlyMinutes = checkOut.isBefore(primaryShift.getEndTime()) 
                            ? java.time.Duration.between(checkOut, primaryShift.getEndTime()).toMinutes() : 0;

                    Double workPoints;
                    AttendanceStatus status;

                    if (lateMinutes >= 240) { // 4 hours
                        workPoints = 0.0;
                        status = AttendanceStatus.ABSENT_NO_PERMISSION;
                        checkIn = null;
                        checkOut = null;
                    } else {
                        workPoints = Math.min(1.0, Math.max(0.0, workedHours / primaryShift.getStandardHours()));
                        if (earlyMinutes > 0) {
                            status = AttendanceStatus.EARLY;
                        } else if (lateMinutes > 10) {
                            status = AttendanceStatus.LATE;
                        } else {
                            status = AttendanceStatus.ON_TIME;
                        }
                    }

                    Attendance att = Attendance.builder()
                            .employee(emp)
                            .shift(primaryShift)
                            .date(date)
                            .checkInTime(checkIn)
                            .checkOutTime(checkOut)
                            .status(status)
                            .workPoints(workPoints)
                            .build();
                    attendanceRepository.save(att);
                }
            }
        }

        System.out.println("High-fidelity daily logs seeded! Pre-computing monthly payroll sheets...");
        try {
            salaryService.calculateAllSalaries(month, year);
            System.out.println("Successfully pre-computed and seeded monthly payroll sheets!");
        } catch (Exception e) {
            System.out.println("Warning: Pre-computing salaries encountered: " + e.getMessage());
        }
    }
}
