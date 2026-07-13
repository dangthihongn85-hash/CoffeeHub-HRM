// package com.bmad.hrm.config;

// import com.bmad.hrm.entity.*;
// import com.bmad.hrm.repository.*;
// import lombok.RequiredArgsConstructor;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.security.crypto.password.PasswordEncoder;
// import org.springframework.stereotype.Component;

// import com.bmad.hrm.service.SalaryService;
// import java.util.Arrays;
// import java.util.List;
// import java.util.Random;
// import java.time.LocalDate;
// import java.time.LocalTime;

// @Component
// @RequiredArgsConstructor
// public class DataSeeder implements CommandLineRunner {

// private final EmployeeRepository employeeRepository;
// private final DepartmentRepository departmentRepository;
// private final PositionRepository positionRepository;
// private final AttendanceRepository attendanceRepository;
// private final ShiftRepository shiftRepository;
// private final ShiftAssignmentRepository shiftAssignmentRepository;
// private final MonthlyRevenueRepository monthlyRevenueRepository;
// private final SalaryRepository salaryRepository;
// private final SalaryService salaryService;
// private final PasswordEncoder passwordEncoder;
// private final HolidayRepository holidayRepository;

// @Override
// public void run(String... args) throws Exception {
// if (employeeRepository.count() > 0) {
// System.out.println("Database already seeded. Skipping DataSeeder to preserve
// user changes.");
// return;
// }

// // 1. Wipe everything to ensure fresh, consistent state
// System.out.println("Clearing old seeded data for clean re-seed...");
// salaryRepository.deleteAll();
// attendanceRepository.deleteAll();
// shiftAssignmentRepository.deleteAll();
// employeeRepository.deleteAll();
// shiftRepository.deleteAll();
// departmentRepository.deleteAll();
// positionRepository.deleteAll();
// monthlyRevenueRepository.deleteAll();
// holidayRepository.deleteAll();

// // 2. Seed coffee shop shifts
// Shift caSang = Shift.builder()
// .name("Ca sáng")
// .startTime(LocalTime.of(6, 0))
// .endTime(LocalTime.of(14, 0))
// .standardHours(8.0)
// .maxEmployees(10)
// .build();
// Shift caChieu = Shift.builder()
// .name("Ca chiều")
// .startTime(LocalTime.of(14, 0))
// .endTime(LocalTime.of(22, 0))
// .standardHours(8.0)
// .maxEmployees(10)
// .build();
// Shift caGay = Shift.builder()
// .name("Ca gãy")
// .startTime(LocalTime.of(10, 0))
// .endTime(LocalTime.of(18, 0))
// .standardHours(8.0)
// .maxEmployees(5)
// .build();
// shiftRepository.saveAll(Arrays.asList(caSang, caChieu, caGay));
// System.out.println("Seeded shifts!");

// // 3. Seed Cafe Departments & Positions
// List<String[]> deptData = Arrays.asList(
// new String[]{"Pha Chế", "Bộ phận pha chế các loại đồ uống"},
// new String[]{"Phục Vụ", "Nhân viên phục vụ tại bàn"},
// new String[]{"Thu Ngân", "Bộ phận thu tiền và quản lý hóa đơn"},
// new String[]{"Quản Lý", "Ban quản lý cửa hàng"}
// );
// List<String[][]> posData = Arrays.asList(
// new String[][]{{"Barista Trưởng","Pha Chế"},{"Barista","Pha Chế"},{"Trợ Lý
// Barista","Pha Chế"}},
// new String[][]{{"Trưởng Ca Phục Vụ","Phục Vụ"},{"Nhân Viên Phục Vụ","Phục
// Vụ"},{"Nhân Viên Part-time","Phục Vụ"}},
// new String[][]{{"Thu Ngân Trưởng","Thu Ngân"},{"Thu Ngân","Thu Ngân"}},
// new String[][]{{"Quản Lý Cửa Hàng","Quản Lý"},{"Quản Lý Ca","Quản Lý"}}
// );
// for (String[] d : deptData) {
// departmentRepository.save(Department.builder().name(d[0]).description(d[1]).build());
// }
// for (String[][] group : posData) {
// for (String[] p : group) {
// positionRepository.save(Position.builder().name(p[0]).departmentName(p[1]).build());
// }
// }
// System.out.println("Seeded departments and positions!");

// // 4. Seed Admin
// Employee admin = new Employee();
// admin.setName("Nguyễn Thị Quản Lý");
// admin.setEmail("admin");
// admin.setPassword(passwordEncoder.encode("123456"));
// admin.setRole(Role.ADMIN);
// admin.setDepartment("Quản Lý");
// admin.setPosition("Quản Lý Cửa Hàng");
// admin.setSalaryBase(20000000.0);
// admin.setStatus("ACTIVE");
// employeeRepository.save(admin);
// System.out.println("Seeded admin!");

// // 5. Seed Current Employees (Dynamic)
// Object[][] employeeData = {
//     {"Trần Văn Hùng", "nv1@cafe.com", Role.EMPLOYEE, "Barista", "Pha Chế", 8000000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Lê Thị Mai", "nv2@cafe.com", Role.EMPLOYEE, "Nhân Viên Phục Vụ", "Phục Vụ", 7000000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Phạm Văn Đức", "nv3@cafe.com", Role.EMPLOYEE, "Barista Trưởng", "Pha Chế", 9500000.0, EmployeeType.MANAGER, "ACTIVE", dummyFaceJson},
//     {"Hoàng Thị Lan", "nv4@cafe.com", Role.EMPLOYEE, "Thu Ngân", "Thu Ngân", 8000000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Đỗ Văn Minh", "nv5@cafe.com", Role.EMPLOYEE, "Trợ Lý Barista", "Pha Chế", 7500000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Ngô Thị Hoa", "nv6@cafe.com", Role.EMPLOYEE, "Barista Trưởng", "Pha Chế", 10000000.0, EmployeeType.MANAGER, "ACTIVE", dummyFaceJson},
//     {"Dương Văn Nam", "nv7@cafe.com", Role.EMPLOYEE, "Nhân Viên Phục Vụ", "Phục Vụ", 6800000.0, EmployeeType.FULL_TIME, "LEAVE", dummyFaceJson},
//     {"Lý Thị Thu", "nv8@cafe.com", Role.EMPLOYEE, "Nhân Viên Part-time", "Phục Vụ", 25000.0, EmployeeType.PART_TIME, "ACTIVE", dummyFaceJson},
//     {"Bùi Văn Tuấn", "nv9@cafe.com", Role.EMPLOYEE, "Trưởng Ca Phục Vụ", "Phục Vụ", 8500000.0, EmployeeType.MANAGER, "ACTIVE", dummyFaceJson},
//     {"Vũ Thị Ngọc", "nv10@cafe.com", Role.EMPLOYEE, "Thu Ngân Trưởng", "Thu Ngân", 9000000.0, EmployeeType.MANAGER, "ACTIVE", dummyFaceJson},
//     {"Đặng Văn Long", "nv11@cafe.com", Role.EMPLOYEE, "Barista", "Pha Chế", 8000000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Bùi Thị Trang", "nv12@cafe.com", Role.EMPLOYEE, "Nhân Viên Part-time", "Phục Vụ", 25000.0, EmployeeType.PART_TIME, "ACTIVE", dummyFaceJson},
//     {"Trịnh Văn Hải", "nv13@cafe.com", Role.EMPLOYEE, "Barista", "Pha Chế", 9000000.0, EmployeeType.FULL_TIME, "LEAVE", dummyFaceJson},
//     {"Đinh Thị Yến", "nv14@cafe.com", Role.EMPLOYEE, "Nhân Viên Phục Vụ", "Phục Vụ", 7200000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Võ Văn Bình", "nv15@cafe.com", Role.EMPLOYEE, "Barista", "Pha Chế", 8100000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Lâm Thị Kim", "nv16@cafe.com", Role.EMPLOYEE, "Quản Lý Ca", "Quản Lý", 10000000.0, EmployeeType.MANAGER, "ACTIVE", dummyFaceJson},
//     {"Mai Văn Sơn", "nv17@cafe.com", Role.EMPLOYEE, "Nhân Viên Phục Vụ", "Phục Vụ", 6900000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"Bon's House", "nv18@cafe.com", Role.EMPLOYEE, "Barista", "Pha Chế", 8200000.0, EmployeeType.FULL_TIME, "ACTIVE", dummyFaceJson},
//     {"thắng", "hoa@gmail.com", Role.HR, "Trưởng Ca Phục Vụ", "Phục Vụ", 25000.0, EmployeeType.PART_TIME, "ACTIVE", dummyFaceJson},
// };

// // Create a dummy JSON face descriptor array of 128 zeros
// StringBuilder sb = new StringBuilder("[");
// for (int j = 0; j < 128; j++) {
//     sb.append("0.0");
//     if (j < 127) sb.append(",");
// }
// sb.append("]");
// String dummyFaceJson = sb.toString();

// for (Object[] row : employeeData) {
//     Employee emp = new Employee();
//     emp.setName((String) row[0]);
//     emp.setEmail((String) row[1]);
//     emp.setPassword(passwordEncoder.encode("123456"));
//     emp.setRole((Role) row[2]);
//     emp.setPosition((String) row[3]);
//     emp.setDepartment((String) row[4]);
//     emp.setSalaryBase(((Number) row[5]).doubleValue());
//     emp.setEmployeeType((EmployeeType) row[6]);
//     emp.setStatus((String) row[7]);
//     emp.setFaceDescriptor((String) row[8]);
//     employeeRepository.save(emp);
// }
// System.out.println("Seeded " + employeeData.length + " employees from current state!");

// // 6. Seed Monthly Revenue
// LocalDate targetMonthDate = LocalDate.of(2026, 5, 1);
// int year = targetMonthDate.getYear();
// int month = targetMonthDate.getMonthValue();
// MonthlyRevenue rev = new MonthlyRevenue();
// rev.setMonth(month);
// rev.setYear(year);
// rev.setMonthlyRevenue(540000000.0);
// rev.setBonusRate(1.0);
// rev.setBonusPool(5400000.0);
// rev.setNotes("Doanh thu tháng " + month + "/" + year + " ổn định");
// monthlyRevenueRepository.save(rev);
// System.out.println("Seeded Monthly Revenue!");

// // 7. Seed Attendance & Shift Assignments Daily Logs
// System.out.println("Seeding high-fidelity shift assignments and attendance
// records...");
// List<Employee> allEmployees = employeeRepository.findAll().stream()
// .filter(e -> e.getRole() != Role.ADMIN)
// .collect(java.util.stream.Collectors.toList());

// List<Shift> shifts = shiftRepository.findAll();
// java.util.Random random = new java.util.Random();

// int endAttendanceDay = targetMonthDate.lengthOfMonth();
// int totalDaysInMonth = targetMonthDate.lengthOfMonth();

// for (int i = 0; i < allEmployees.size(); i++) {
// Employee emp = allEmployees.get(i);

// // If the employee has NO face descriptor (the 3 unregistered employees),
// // we DO NOT seed any shift assignments or attendance records for them!
// if (emp.getFaceDescriptor() == null) {
// continue;
// }

// Shift primaryShift = shifts.get(i % shifts.size());

// for (int day = 1; day <= totalDaysInMonth; day++) {
// LocalDate date = LocalDate.of(year, month, day);

// // Every 6th day is a rest day (OFF) -> no shift assignment, no attendance
// if (day % 6 == 0) {
// continue;
// }

// // Seed Shift Assignment for the entire month!
// ShiftAssignment sa = ShiftAssignment.builder()
// .employee(emp)
// .shift(primaryShift)
// .date(date)
// .build();
// shiftAssignmentRepository.save(sa);

// // Seed Attendance only for past days!
// if (day <= endAttendanceDay) {
// int randAbsent = random.nextInt(100);
// if (randAbsent < 2) {
// // Nghỉ không phép
// Attendance att = Attendance.builder()
// .employee(emp)
// .shift(primaryShift)
// .date(date)
// .status(AttendanceStatus.ABSENT_NO_PERMISSION)
// .workPoints(0.0)
// .build();
// attendanceRepository.save(att);
// continue;
// } else if (randAbsent < 4) {
// // Nghỉ có phép
// Attendance att = Attendance.builder()
// .employee(emp)
// .shift(primaryShift)
// .date(date)
// .status(AttendanceStatus.ABSENT)
// .workPoints(0.0)
// .build();
// attendanceRepository.save(att);
// continue;
// } else if (randAbsent < 5) {
// // Nghỉ đặc biệt
// Attendance att = Attendance.builder()
// .employee(emp)
// .shift(primaryShift)
// .date(date)
// .status(AttendanceStatus.SPECIAL_LEAVE)
// .workPoints(0.0)
// .build();
// attendanceRepository.save(att);
// continue;
// }

// // Normal work day present
// LocalTime checkIn;
// int checkInRoll = random.nextInt(100);
// if (checkInRoll < 8) {
// // Late check-in (> 10 mins late)
// int lateMinutes = 11 + random.nextInt(45);
// checkIn = primaryShift.getStartTime().plusMinutes(lateMinutes);
// } else {
// // On time
// int offset = random.nextInt(25) - 20; // -20 to +4 mins
// checkIn = primaryShift.getStartTime().plusMinutes(offset);
// }

// LocalTime checkOut;
// int checkOutRoll = random.nextInt(100);
// if (checkOutRoll < 5) {
// // Early check-out
// int earlyMinutes = 15 + random.nextInt(90);
// checkOut = primaryShift.getEndTime().minusMinutes(earlyMinutes);
// } else if (checkOutRoll < 15) {
// // OT
// int otMinutes = 30 + random.nextInt(120);
// checkOut = primaryShift.getEndTime().plusMinutes(otMinutes);
// } else {
// // Standard checkout
// int offset = random.nextInt(20); // 0 to 19 mins late
// checkOut = primaryShift.getEndTime().plusMinutes(offset);
// }

// // Calculate point & status
// double workedHours = java.time.Duration.between(checkIn,
// checkOut).toMinutes() / 60.0;
// long lateMinutes = checkIn.isAfter(primaryShift.getStartTime())
// ? java.time.Duration.between(primaryShift.getStartTime(),
// checkIn).toMinutes() : 0;
// long earlyMinutes = checkOut.isBefore(primaryShift.getEndTime())
// ? java.time.Duration.between(checkOut, primaryShift.getEndTime()).toMinutes()
// : 0;

// Double workPoints;
// AttendanceStatus status;

// if (lateMinutes >= 240) { // 4 hours
// workPoints = 0.0;
// status = AttendanceStatus.ABSENT_NO_PERMISSION;
// checkIn = null;
// checkOut = null;
// } else {
// workPoints = Math.min(1.0, Math.max(0.0, workedHours /
// primaryShift.getStandardHours()));
// if (earlyMinutes > 0) {
// status = AttendanceStatus.EARLY;
// } else if (lateMinutes > 10) {
// status = AttendanceStatus.LATE;
// } else {
// status = AttendanceStatus.ON_TIME;
// }
// }

// Attendance att = Attendance.builder()
// .employee(emp)
// .shift(primaryShift)
// .date(date)
// .checkInTime(checkIn)
// .checkOutTime(checkOut)
// .status(status)
// .workPoints(workPoints)
// .build();
// attendanceRepository.save(att);
// }
// }
// }

// // 8. Seed Holidays for 2026
// System.out.println("Seeding holidays...");
// holidayRepository.save(Holiday.builder().name("Tết Dương Lịch
// 2026").date(LocalDate.of(2026, 1,
// 1)).coefficient(2.0).fullTimeBonus(300000.0).repeatYearly(true).build());
// holidayRepository.save(Holiday.builder().name("Tết Nguyên Đán (30
// Tết)").date(LocalDate.of(2026, 2,
// 16)).coefficient(3.0).fullTimeBonus(1000000.0).repeatYearly(false).build());
// holidayRepository.save(Holiday.builder().name("Tết Nguyên Đán (Mùng
// 1)").date(LocalDate.of(2026, 2,
// 17)).coefficient(3.0).fullTimeBonus(1000000.0).repeatYearly(false).build());
// holidayRepository.save(Holiday.builder().name("Tết Nguyên Đán (Mùng
// 2)").date(LocalDate.of(2026, 2,
// 18)).coefficient(3.0).fullTimeBonus(1000000.0).repeatYearly(false).build());
// holidayRepository.save(Holiday.builder().name("Tết Nguyên Đán (Mùng
// 3)").date(LocalDate.of(2026, 2,
// 19)).coefficient(3.0).fullTimeBonus(1000000.0).repeatYearly(false).build());
// holidayRepository.save(Holiday.builder().name("Tết Nguyên Đán (Mùng
// 4)").date(LocalDate.of(2026, 2,
// 20)).coefficient(3.0).fullTimeBonus(1000000.0).repeatYearly(false).build());
// holidayRepository.save(Holiday.builder().name("Giỗ Tổ Hùng Vương
// 2026").date(LocalDate.of(2026, 4,
// 26)).coefficient(2.0).fullTimeBonus(300000.0).repeatYearly(false).build());
// holidayRepository.save(Holiday.builder().name("Giải Phóng Miền
// Nam").date(LocalDate.of(2026, 4,
// 30)).coefficient(3.0).fullTimeBonus(500000.0).repeatYearly(true).build());
// holidayRepository.save(Holiday.builder().name("Quốc Tế Lao
// Động").date(LocalDate.of(2026, 5,
// 1)).coefficient(3.0).fullTimeBonus(500000.0).repeatYearly(true).build());
// holidayRepository.save(Holiday.builder().name("Quốc Khánh 2026 (Đợt
// 1)").date(LocalDate.of(2026, 9,
// 1)).coefficient(3.0).fullTimeBonus(500000.0).repeatYearly(true).build());
// holidayRepository.save(Holiday.builder().name("Quốc Khánh 2026 (Đợt
// 2)").date(LocalDate.of(2026, 9,
// 2)).coefficient(3.0).fullTimeBonus(500000.0).repeatYearly(true).build());
// System.out.println("Seeded holidays!");

// System.out.println("High-fidelity daily logs seeded! Pre-computing monthly
// payroll sheets...");
// try {
// salaryService.calculateAllSalaries(month, year);
// System.out.println("Successfully pre-computed and seeded monthly payroll
// sheets!");
// } catch (Exception e) {
// System.out.println("Warning: Pre-computing salaries encountered: " +
// e.getMessage());
// }
// }
// }
