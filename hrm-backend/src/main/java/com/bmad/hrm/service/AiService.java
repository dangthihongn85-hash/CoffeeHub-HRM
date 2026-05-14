package com.bmad.hrm.service;

import org.springframework.stereotype.Service;

@Service
public class AiService {

    public String generateEmployeeReview(Long employeeId, int lateDays, double kpi) {
        // Real implementation would use RestTemplate or WebClient to call external LLM APIs (Gemini/ChatGPT)
        // String response = restTemplate.postForObject(...)
        
        return String.format(
            "Dịch vụ AI Phân Tích (Mocked):\n- Mã nhân viên: %d\n- Số ngày đi trễ: %d\n- Hiệu suất (KPI): %.1f%%\n\n[Đề Xuất Sinh Bởi AI]: Nhân viên giữ mức độ hoàn thành công việc ổn. Tuy nhiên, việc đi trễ %d ngày cần được chấn chỉnh. Đề xuất: Phê bình nhẹ hoặc cắt thưởng chuyên cần.",
            employeeId, lateDays, kpi, lateDays
        );
    }
}
