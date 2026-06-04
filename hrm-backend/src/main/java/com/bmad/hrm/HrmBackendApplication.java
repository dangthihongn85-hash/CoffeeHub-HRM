package com.bmad.hrm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HrmBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(HrmBackendApplication.class, args);
	}

	@org.springframework.context.annotation.Bean
	public org.springframework.boot.CommandLineRunner initAdmin(
			com.bmad.hrm.repository.EmployeeRepository employeeRepository,
			org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
		return args -> {
			java.util.Optional<com.bmad.hrm.entity.Employee> adminOpt = employeeRepository.findByEmail("admin");
			if (adminOpt.isPresent()) {
				com.bmad.hrm.entity.Employee admin = adminOpt.get();
				admin.setName("Đặng Thị Hồng Nhung");
				if (admin.getPassword() == null || !admin.getPassword().startsWith("$2")) {
					admin.setPassword(passwordEncoder.encode("123456"));
				}
				employeeRepository.save(admin);
				System.out.println(">>> Updated existing admin name to Đặng Thị Hồng Nhung and password!");
			} else {
				com.bmad.hrm.entity.Employee admin = com.bmad.hrm.entity.Employee.builder()
						.name("Đặng Thị Hồng Nhung")
						.email("admin")
						.password(passwordEncoder.encode("123456"))
						.role(com.bmad.hrm.entity.Role.ADMIN)
						.department("Quản Lý")
						.position("Quản Lý Cửa Hàng")
						.salaryBase(20000000.0)
						.status("ACTIVE")
						.build();
				employeeRepository.save(admin);
				System.out.println(">>> Created default admin account with name Đặng Thị Hồng Nhung and BCrypt password!");
			}
			
			// Force reset all dummy accounts starting with 'nv' to '123456' hashed with BCrypt
			// to ensure the user can always log in with nv*@cafe.com / 123456
			employeeRepository.findAll().forEach(emp -> {
				if (emp.getEmail() != null && emp.getEmail().startsWith("nv")) {
					emp.setPassword(passwordEncoder.encode("123456"));
					employeeRepository.save(emp);
					System.out.println(">>> Reset & hashed password to '123456' for dummy employee: " + emp.getEmail());
				} else if (emp.getPassword() != null && !emp.getPassword().startsWith("$2")) {
					emp.setPassword(passwordEncoder.encode(emp.getPassword()));
					employeeRepository.save(emp);
					System.out.println(">>> Hashed plain text password for employee: " + emp.getEmail());
				}
			});
		};
	}

}
