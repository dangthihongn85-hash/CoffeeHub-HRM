package com.bmad.hrm.controller;

import com.bmad.hrm.dto.AiReviewDto;
import com.bmad.hrm.dto.SalaryPayrollDto;
import com.bmad.hrm.service.AiService;
import com.bmad.hrm.service.SalaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiService aiService;
    private final SalaryService salaryService;

    @GetMapping("/review/{employeeId}")
    public ResponseEntity<AiReviewDto.IndividualReview> generateReview(
            @PathVariable Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year) {

        // First attempt to get calculated salaries
        List<SalaryPayrollDto> list = salaryService.getSalariesByMonth(month, year);
        SalaryPayrollDto targetDto = list.stream()
                .filter(s -> s.getEmployeeId().equals(employeeId))
                .findFirst()
                .orElse(null);

        // If not calculated yet, calculate on the fly
        if (targetDto == null) {
            targetDto = salaryService.calculateSalaryForOne(employeeId, month, year);
        }

        // Calculate KPI based on standard working days (default 26 days)
        double workDays = targetDto.getWorkDays() != null ? targetDto.getWorkDays() : 0.0;
        double specialLeave = targetDto.getSpecialLeaveDays() != null ? targetDto.getSpecialLeaveDays() : 0.0;
        double kpi = Math.min(100.0, ((workDays + specialLeave) / 26.0) * 100.0);

        return ResponseEntity.ok(aiService.generateEmployeeReview(targetDto, kpi));
    }

    @GetMapping("/review-all")
    public ResponseEntity<AiReviewDto.TeamReview> generateTeamReview(
            @RequestParam Integer month,
            @RequestParam Integer year) {

        List<SalaryPayrollDto> list = salaryService.getSalariesByMonth(month, year);
        if (list.isEmpty()) {
            list = salaryService.calculateAllSalaries(month, year);
        }

        return ResponseEntity.ok(aiService.generateTeamReview(list, month, year));
    }
}
