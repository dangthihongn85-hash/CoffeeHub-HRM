package com.bmad.hrm.dto;

import java.util.List;

public class AiReviewDto {

    public record IndividualReview(
        String employeeName,
        String department,
        String position,
        int month,
        int year,
        double kpi,
        double workDays,
        long lateDays,
        long earlyDays,
        long noCheckout,
        long absentDays,
        double totalBonus,
        double totalPenalty,
        double totalSalary,
        String disciplineAssessment,
        String aiRecommendation,
        String aiRecommendationType
    ) {}

    public record EmployeeSummary(
        String employeeName,
        String department,
        double kpi,
        long lateDays,
        long earlyDays,
        long absentDays,
        String recommendation,
        String recommendationType
    ) {}

    public record TeamReview(
        int month,
        int year,
        int totalEmployees,
        double avgKpi,
        int totalLate,
        int totalEarly,
        int totalNoCheckout,
        int totalAbsent,
        double totalPayroll,
        String overallAssessment,
        String overallAssessmentType,
        List<EmployeeSummary> employeeReviews
    ) {}
}
