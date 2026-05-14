package com.bmad.hrm.entity;

public enum AttendanceStatus {
    ON_TIME,           // Đúng giờ
    LATE,              // Đi trễ (check-in sau 08:30 + 10 phút = 08:40)
    EARLY,             // Về sớm
    ABSENT,            // Vắng mặt (có phép)
    ABSENT_NO_PERMISSION, // Nghỉ không phép → phạt 100,000
    SPECIAL_LEAVE      // Nghỉ đặc biệt (tang lễ, tai nạn) → không tính công, không phạt
}
