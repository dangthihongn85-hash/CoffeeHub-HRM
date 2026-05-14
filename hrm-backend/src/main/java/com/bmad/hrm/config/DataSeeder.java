package com.bmad.hrm.config;

import com.bmad.hrm.entity.*;
import com.bmad.hrm.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // === Seed Cafe Departments & Positions ===
        if (departmentRepository.count() == 0) {
            List<String[]> deptData = Arrays.asList(
                new String[]{"Pha Chế", "Bộ phận pha chế các loại đồ uống"},
                new String[]{"Phục Vụ", "Nhân viên phục vụ tại bàn"},
                new String[]{"Bếp & Thực Phẩm", "Đội bếp và chuẩn bị thức ăn"},
                new String[]{"Thu Ngân", "Bộ phận thu tiền và quản lý hóa đơn"}
            );
            List<String[][]> posData = Arrays.asList(
                new String[][]{{"Barista Trưởng","Pha Chế"},{"Barista","Pha Chế"},{"Trợ Lý Barista","Pha Chế"}},
                new String[][]{{"Trưởng Ca Phục Vụ","Phục Vụ"},{"Nhân Viên Phục Vụ","Phục Vụ"},{"Nhân Viên Part-time","Phục Vụ"}},
                new String[][]{{"Bếp Trưởng","Bếp & Thực Phẩm"},{"Đầu Bếp","Bếp & Thực Phẩm"},{"Phụ Bếp","Bếp & Thực Phẩm"}},
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
            System.out.println("Seeded Cafe Departments & Positions!");
        }

        // === Seed Employees ===
        if (employeeRepository.count() < 10) {
            System.out.println("Seeding dummy employees...");

            if (!employeeRepository.findByEmail("admin@bmad.com").isPresent()) {
                Employee admin = new Employee();
                admin.setName("Nguyễn Thị Quản Lý");
                admin.setEmail("admin@bmad.com");
                admin.setPassword(passwordEncoder.encode("admin"));
                admin.setRole(Role.ADMIN);
                admin.setDepartment("Quản Lý");
                admin.setPosition("Quản Lý Chuỗi");
                admin.setSalaryBase(20000000.0);
                admin.setStatus("ACTIVE");
                employeeRepository.save(admin);
            }

            List<String> names = Arrays.asList(
                "Trần Văn Hùng", "Lê Thị Mai", "Phạm Văn Đức", "Hoàng Thị Lan", "Đỗ Văn Minh",
                "Ngô Thị Hoa", "Dương Văn Nam", "Lý Thị Thu", "Bùi Văn Tuấn", "Vũ Thị Ngọc",
                "Đặng Văn Long", "Bùi Thị Trang", "Trịnh Văn Hải", "Đinh Thị Yến", "Võ Văn Bình",
                "Lâm Thị Kim", "Mai Văn Sơn", "Phan Thị Ly", "Thái Văn Duy", "Hoàng Thị Bảo"
            );

            String[][] cafePosData = {
                {"Barista", "Pha Chế"}, {"Nhân Viên Phục Vụ", "Phục Vụ"},
                {"Barista Trưởng", "Pha Chế"}, {"Thu Ngân", "Thu Ngân"},
                {"Trợ Lý Barista", "Pha Chế"}, {"Bếp Trưởng", "Bếp & Thực Phẩm"},
                {"Nhân Viên Phục Vụ", "Phục Vụ"}, {"Phụ Bếp", "Bếp & Thực Phẩm"},
                {"Trưởng Ca Phục Vụ", "Phục Vụ"}, {"Thu Ngân Trưởng", "Thu Ngân"},
                {"Barista", "Pha Chế"}, {"Nhân Viên Part-time", "Phục Vụ"},
                {"Đầu Bếp", "Bếp & Thực Phẩm"}, {"Nhân Viên Phục Vụ", "Phục Vụ"},
                {"Barista", "Pha Chế"}, {"Quản Lý Ca", "Quản Lý"},
                {"Nhân Viên Phục Vụ", "Phục Vụ"}, {"Barista", "Pha Chế"},
                {"Phụ Bếp", "Bếp & Thực Phẩm"}, {"Thu Ngân", "Thu Ngân"}
            };
            double[] salaries = {
                8000000, 6500000, 10000000, 7000000, 7000000,
                12000000, 6500000, 8000000, 8000000, 9000000,
                7500000, 5500000, 10000000, 6500000, 7500000,
                15000000, 6500000, 7500000, 7000000, 6500000
            };

            for (int i = 0; i < 20; i++) {
                String empEmail = "nv" + (i + 1) + "@cafe.com";
                if (!employeeRepository.findByEmail(empEmail).isPresent()) {
                    Employee emp = new Employee();
                    emp.setName(names.get(i));
                    emp.setEmail(empEmail);
                    emp.setPassword(passwordEncoder.encode("123456"));
                    emp.setRole(Role.EMPLOYEE);
                    emp.setPosition(cafePosData[i][0]);
                    emp.setDepartment(cafePosData[i][1]);
                    emp.setSalaryBase(salaries[i]);
                    emp.setStatus(i % 6 == 0 ? "LEAVE" : "ACTIVE");
                    employeeRepository.save(emp);
                }
            }
            System.out.println("20 Cafe Employees seeded!");
        }
    }
}
