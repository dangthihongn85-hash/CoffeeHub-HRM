package com.bmad.hrm.service;

import org.springframework.stereotype.Service;

@Service
public class EmailService {

    public void sendEmail(String to, String subject, String text) {
        // Mock email logic for graduation project demo
        // In production, inject JavaMailSender and send real emails
        System.out.println("------------------------------------------");
        System.out.println("MOCK EMAIL SENT");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Content: " + text);
        System.out.println("------------------------------------------");
    }
}
