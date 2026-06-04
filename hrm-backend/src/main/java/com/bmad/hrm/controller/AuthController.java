package com.bmad.hrm.controller;

import com.bmad.hrm.dto.AuthRequest;
import com.bmad.hrm.dto.AuthResponse;
import com.bmad.hrm.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final com.bmad.hrm.repository.EmployeeRepository employeeRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        String token = jwtUtils.generateToken(request.getEmail());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody com.bmad.hrm.dto.ChangePasswordRequest request) {
        var employeeOpt = employeeRepository.findByEmail(request.getEmail());
        if (employeeOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Email không tồn tại"));
        }
        var employee = employeeOpt.get();
        if (!passwordEncoder.matches(request.getOldPassword(), employee.getPassword())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Mật khẩu cũ không chính xác"));
        }
        employee.setPassword(passwordEncoder.encode(request.getNewPassword()));
        employeeRepository.save(employee);
        return ResponseEntity.ok(java.util.Map.of("message", "Thay đổi mật khẩu thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(java.security.Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("message", "Unauthorized"));
        }
        return employeeRepository.findByEmail(principal.getName())
                .map(emp -> ResponseEntity.ok(java.util.Map.of(
                        "id", emp.getId(),
                        "name", emp.getName(),
                        "email", emp.getEmail(),
                        "role", emp.getRole(),
                        "position", emp.getPosition() != null ? emp.getPosition() : "",
                        "department", emp.getDepartment() != null ? emp.getDepartment() : ""
                )))
                .orElse(ResponseEntity.status(404).build());
    }
}
