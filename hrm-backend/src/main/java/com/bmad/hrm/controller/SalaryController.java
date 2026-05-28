package com.bmad.hrm.controller;

import com.bmad.hrm.dto.SalaryPayrollDto;
import com.bmad.hrm.entity.MonthlyRevenue;
import com.bmad.hrm.service.SalaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salaries")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SalaryController {

    private final SalaryService salaryService;

    // ── Luồng 0: Nhập doanh thu ─────────────────────────────────────────────
    @PostMapping("/revenue")
    public ResponseEntity<MonthlyRevenue> saveRevenue(@RequestBody Map<String, Object> body) {
        Integer month   = (Integer) body.get("month");
        Integer year    = (Integer) body.get("year");
        Double  revenue = ((Number) body.get("monthlyRevenue")).doubleValue();
        Double  bonusRate = body.containsKey("bonusRate") && body.get("bonusRate") != null ? ((Number) body.get("bonusRate")).doubleValue() : 1.0;
        String  notes   = (String) body.getOrDefault("notes", "");
        return ResponseEntity.ok(salaryService.saveMonthlyRevenue(month, year, revenue, bonusRate, notes));
    }

    @GetMapping("/revenue")
    public ResponseEntity<?> getRevenue(@RequestParam Integer month, @RequestParam Integer year) {
        return salaryService.getMonthlyRevenue(month, year)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(Map.of("monthlyRevenue", 0, "bonusPool", 0, "bonusRate", 1.0)));
    }

    // ── Luồng tính lương toàn bộ (bulk) ─────────────────────────────────────
    @PostMapping("/calculate-all")
    public ResponseEntity<List<SalaryPayrollDto>> calculateAll(
            @RequestParam Integer month, @RequestParam Integer year) {
        return ResponseEntity.ok(salaryService.calculateAllSalaries(month, year));
    }

    // ── Tính lương 1 nhân viên ────────────────────────────────────────────────
    @PostMapping("/calculate/{employeeId}")
    public ResponseEntity<SalaryPayrollDto> calculateOne(
            @PathVariable Long employeeId,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        return ResponseEntity.ok(salaryService.calculateSalaryForOne(employeeId, month, year));
    }

    // ── Lấy bảng lương tháng (đã tính sẵn) ──────────────────────────────────
    @GetMapping
    public ResponseEntity<List<SalaryPayrollDto>> getSalaries(
            @RequestParam Integer month, @RequestParam Integer year) {
        return ResponseEntity.ok(salaryService.getSalariesByMonth(month, year));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SalaryPayrollDto> updateSalary(
            @PathVariable Long id, @RequestBody SalaryPayrollDto dto) {
        return ResponseEntity.ok(salaryService.updateSalary(id, dto));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<SalaryPayrollDto> approveSalary(@PathVariable Long id) {
        return ResponseEntity.ok(salaryService.approveSalary(id));
    }

    @PutMapping("/{id}/revert")
    public ResponseEntity<SalaryPayrollDto> revertSalary(@PathVariable Long id) {
        return ResponseEntity.ok(salaryService.revertSalary(id));
    }

    @PutMapping("/approve-all")
    public ResponseEntity<List<SalaryPayrollDto>> approveAllSalaries(
            @RequestParam Integer month, @RequestParam Integer year) {
        return ResponseEntity.ok(salaryService.approveAllSalaries(month, year));
    }

    @PutMapping("/approve-multiple")
    public ResponseEntity<List<SalaryPayrollDto>> approveMultipleSalaries(
            @RequestBody List<Long> ids,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        return ResponseEntity.ok(salaryService.approveMultipleSalaries(ids, month, year));
    }

    // ── Xuất bảng lương CSV (UTF-8 BOM cho Excel) ────────────────────────────
    @GetMapping("/export")
    public ResponseEntity<String> exportCsv(@RequestParam Integer month, @RequestParam Integer year) {
        List<SalaryPayrollDto> list = salaryService.getSalariesByMonth(month, year);
        if (list.isEmpty()) {
            list = salaryService.calculateAllSalaries(month, year);
        }

        StringBuilder csv = new StringBuilder("\uFEFF"); // UTF-8 BOM
        csv.append("ID,Tên NV,Phòng Ban,Chức Vụ,Loại NV,Ngày Làm,Giờ TT,Giờ OT,")
           .append("Lương CB,Lương OT,Thưởng CK,Thưởng DT,Tổng Thưởng,")
           .append("Phạt Trễ,Phạt Checkout,Phạt Nghỉ,Tổng Phạt,Tổng Lĩnh\n");

        for (SalaryPayrollDto s : list) {
            csv.append(String.format(
                "%s,%s,%s,%s,%s,%.1f,%.1f,%.1f,%.0f,%.0f,%.0f,%.0f,%.0f,%.0f,%.0f,%.0f,%.0f,%.0f\n",
                s.getEmployeeId(),
                csvEscape(s.getEmployeeName()),
                csvEscape(s.getDepartment()),
                csvEscape(s.getPosition()),
                s.getEmployeeType() != null ? s.getEmployeeType().name() : "",
                s.getWorkDays()      != null ? s.getWorkDays()      : 0.0,
                s.getRegularHours()  != null ? s.getRegularHours()  : 0.0,
                s.getOtHours()       != null ? s.getOtHours()       : 0.0,
                orZero(s.getBaseSalary()),
                orZero(s.getOtSalary()),
                orZero(s.getBonusAttendance()),
                orZero(s.getBonusRevenue()),
                orZero(s.getTotalBonus()),
                orZero(s.getPenaltyLate()),
                orZero(s.getPenaltyNoCheckout()),
                orZero(s.getPenaltyAbsent()),
                orZero(s.getTotalPenalty()),
                orZero(s.getTotalSalary())
            ));
        }

        return ResponseEntity.ok()
                .header("Content-Disposition",
                        "attachment; filename=BangLuong_T" + month + "_" + year + ".csv")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csv.toString());
    }

    private double orZero(Double v) { return v != null ? v : 0.0; }
    private String csvEscape(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n"))
            return "\"" + s.replace("\"", "\"\"") + "\"";
        return s;
    }
}
