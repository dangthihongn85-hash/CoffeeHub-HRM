package com.bmad.hrm.service;

import com.bmad.hrm.dto.AiReviewDto;
import com.bmad.hrm.dto.SalaryPayrollDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiService {

    public AiReviewDto.IndividualReview generateEmployeeReview(SalaryPayrollDto dto, double kpi) {
        String empName = dto.getEmployeeName();
        String dept = dto.getDepartment();
        String pos = dto.getPosition();
        double workDays = dto.getWorkDays() != null ? dto.getWorkDays() : 0.0;
        long lateDays = dto.getLateDays() != null ? dto.getLateDays() : 0;
        long earlyDays = dto.getEarlyDays() != null ? dto.getEarlyDays() : 0;
        long absentDays = dto.getAbsentNoPerm() != null ? dto.getAbsentNoPerm() : 0;
        long noCheckout = dto.getNoCheckoutDays() != null ? dto.getNoCheckoutDays() : 0;
        double totalSalary = dto.getTotalSalary() != null ? dto.getTotalSalary() : 0.0;
        double totalBonus = dto.getTotalBonus() != null ? dto.getTotalBonus() : 0.0;
        double totalPenalty = dto.getTotalPenalty() != null ? dto.getTotalPenalty() : 0.0;

        StringBuilder discipline = new StringBuilder();
        String recommendation;
        String recType;

        if (kpi == 0.0) {
            discipline.append("Không đi làm trong kỳ này (KPI 0%). Không đánh giá chuyên cần.");
            recommendation = null;
            recType = null;
        } else {
            if (lateDays == 0 && earlyDays == 0 && absentDays == 0 && noCheckout == 0) {
                discipline.append("Tuyệt vời! Nhân viên tuân thủ nghiêm ngặt giờ giấc làm việc, đạt chuyên cần xuất sắc trong tháng. Không ghi nhận lỗi vi phạm quy chế.");
            } else {
                List<String> issues = new ArrayList<>();
                if (lateDays > 0) {
                    issues.add(String.format("đi muộn %d lần", lateDays));
                }
                if (earlyDays > 0) {
                    issues.add(String.format("về sớm %d lần", earlyDays));
                }
                if (noCheckout > 0) {
                    issues.add(String.format("quên check-out %d lần", noCheckout));
                }
                if (absentDays > 0) {
                    issues.add(String.format("tự ý nghỉ không phép %d lần", absentDays));
                }
                discipline.append("Cần cải thiện: Ghi nhận ").append(String.join(", ", issues)).append(". Đề nghị nhân sự chú ý chấp hành đúng quy định ca trực.");
            }

            if (kpi >= 100.0 && lateDays == 0 && earlyDays == 0 && absentDays == 0 && noCheckout == 0) {
                recommendation = "Khen ngợi cá nhân xuất sắc trước tập thể. Ưu tiên cân nhắc tăng thưởng hiệu suất hoặc nâng bậc lương cơ bản.";
                recType = "SUCCESS";
            } else if (kpi < 90.0) {
                recommendation = "Phê bình nghiêm khắc trước tập thể vì hiệu suất thấp (KPI dưới 90%). Yêu cầu giải trình bằng văn bản và xem xét giảm lương/thử thách lại.";
                recType = "WARNING";
            } else {
                recommendation = "Yêu cầu quản lý trực tiếp làm việc chấn chỉnh kỷ luật giờ giấc. Xem xét cắt thưởng chuyên cần kỳ này.";
                recType = "WARNING";
            }
        }

        return new AiReviewDto.IndividualReview(
                empName, dept, pos, dto.getMonth(), dto.getYear(), kpi, workDays,
                lateDays, earlyDays, noCheckout, absentDays, totalBonus, totalPenalty, totalSalary,
                discipline.toString(), recommendation, recType
        );
    }

    public AiReviewDto.TeamReview generateTeamReview(List<SalaryPayrollDto> list, int month, int year) {
        int totalEmployees = list.size();
        double sumKpi = 0;
        int totalLate = 0;
        int totalEarly = 0;
        int totalAbsent = 0;
        int totalNoCheckout = 0;
        double totalPayroll = 0;

        List<AiReviewDto.EmployeeSummary> summaries = new ArrayList<>();

        for (SalaryPayrollDto s : list) {
            double work = s.getWorkDays() != null ? s.getWorkDays() : 0.0;
            double leave = s.getSpecialLeaveDays() != null ? s.getSpecialLeaveDays() : 0.0;
            double kpi = Math.min(100.0, ((work + leave) / 26.0) * 100.0);
            sumKpi += kpi;

            long late = s.getLateDays() != null ? s.getLateDays() : 0;
            long early = s.getEarlyDays() != null ? s.getEarlyDays() : 0;
            long absent = s.getAbsentNoPerm() != null ? s.getAbsentNoPerm() : 0;
            long noCheck = s.getNoCheckoutDays() != null ? s.getNoCheckoutDays() : 0;

            totalLate += late;
            totalEarly += early;
            totalAbsent += absent;
            totalNoCheckout += noCheck;
            totalPayroll += s.getTotalSalary() != null ? s.getTotalSalary() : 0.0;

            String recommend;
            String recType;
            if (kpi == 0.0) {
                recommend = null;
                recType = null;
            } else if (kpi >= 100.0 && late == 0 && early == 0 && absent == 0 && noCheck == 0) {
                recommend = "Khen thưởng";
                recType = "SUCCESS";
            } else if (kpi < 90.0) {
                recommend = "Phê bình nghiêm khắc";
                recType = "WARNING";
            } else {
                recommend = "Cần chấn chỉnh";
                recType = "WARNING";
            }

            summaries.add(new AiReviewDto.EmployeeSummary(
                    s.getEmployeeName(),
                    s.getDepartment() != null ? s.getDepartment() : "Chưa rõ",
                    kpi, late, early, absent, recommend, recType
            ));
        }

        double avgKpi = totalEmployees > 0 ? sumKpi / totalEmployees : 0.0;

        String assessment;
        String assessType;
        if (avgKpi >= 90 && totalLate <= totalEmployees && totalEarly <= totalEmployees) {
            assessment = "Đội ngũ hoạt động rất ổn định, tính kỷ luật cao. Chỉ số đi trễ và về sớm ở mức rất thấp. Khuyến nghị: Tiếp tục duy trì chính sách hiện tại, khen thưởng động viên kịp thời.";
            assessType = "SUCCESS";
        } else if (totalLate > totalEmployees * 1.5 || totalEarly > totalEmployees * 1.5) {
            assessment = "Tình trạng đi trễ hoặc về sớm của nhân viên đang có xu hướng gia tăng rõ rệt. Khuyến nghị: Quản lý cần thắt chặt kỷ luật giờ giấc đầu và cuối ca làm việc, rà soát lại lịch trực của các nhân sự thường xuyên vi phạm.";
            assessType = "WARNING";
        } else {
            assessment = "Hiệu suất đội ngũ đạt mức trung bình khá. Ghi nhận một vài trường hợp đi trễ, về sớm hoặc quên check-out lẻ tẻ, cần nhắc nhở trực tiếp tại các ca làm việc.";
            assessType = "INFO";
        }

        return new AiReviewDto.TeamReview(
                month, year, totalEmployees, avgKpi, totalLate, totalEarly, totalNoCheckout,
                totalAbsent, totalPayroll, assessment, assessType, summaries
        );
    }
}
