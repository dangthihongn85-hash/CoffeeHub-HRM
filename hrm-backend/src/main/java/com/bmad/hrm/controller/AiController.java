package com.bmad.hrm.controller;

import com.bmad.hrm.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;

    @GetMapping("/review/{employeeId}")
    public ResponseEntity<String> generateReview(
            @PathVariable Long employeeId,
            @RequestParam(defaultValue = "0") int lateDays,
            @RequestParam(defaultValue = "100") double kpi) {
        
        return ResponseEntity.ok(aiService.generateEmployeeReview(employeeId, lateDays, kpi));
    }
}
