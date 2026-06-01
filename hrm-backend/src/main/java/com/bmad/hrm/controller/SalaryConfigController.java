package com.bmad.hrm.controller;

import com.bmad.hrm.entity.SalaryConfig;
import com.bmad.hrm.repository.SalaryConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salaries/config")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SalaryConfigController {

    private final SalaryConfigRepository repository;

    @GetMapping
    public SalaryConfig getConfig() {
        return repository.findAll().stream().findFirst()
                .orElse(SalaryConfig.builder().build());
    }

    @PostMapping
    public SalaryConfig updateConfig(@RequestBody SalaryConfig config) {
        // Clear old ones to keep only one record
        repository.deleteAll();
        return repository.save(config);
    }
}
