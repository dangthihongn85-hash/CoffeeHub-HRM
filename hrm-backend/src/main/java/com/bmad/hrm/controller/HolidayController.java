package com.bmad.hrm.controller;

import com.bmad.hrm.entity.Holiday;
import com.bmad.hrm.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HolidayController {

    private final HolidayRepository repository;

    @GetMapping
    public List<Holiday> getAllHolidays() {
        return repository.findAll(Sort.by(Sort.Direction.ASC, "date"));
    }

    @PostMapping
    public ResponseEntity<?> saveHoliday(@RequestBody Holiday holiday) {
        if (holiday.getRepeatYearly() == null) {
            holiday.setRepeatYearly(false);
        }
        
        List<Holiday> allHolidays = repository.findAll();
        for (Holiday existing : allHolidays) {
            // Bỏ qua chính nó khi đang chỉnh sửa
            if (holiday.getId() != null && holiday.getId().equals(existing.getId())) {
                continue;
            }
            
            boolean sameExactDate = holiday.getDate().equals(existing.getDate());
            
            boolean holidayRepeats = holiday.getRepeatYearly();
            boolean existingRepeats = existing.getRepeatYearly() != null && existing.getRepeatYearly();
            
            boolean sameMonthAndDay = holiday.getDate().getMonthValue() == existing.getDate().getMonthValue()
                    && holiday.getDate().getDayOfMonth() == existing.getDate().getDayOfMonth();
            
            boolean conflict = sameExactDate || (sameMonthAndDay && (holidayRepeats || existingRepeats));
            
            if (conflict) {
                String repeatSuffix = existingRepeats ? " (Lặp lại hàng năm)" : "";
                return ResponseEntity.badRequest().body(java.util.Map.of("message", 
                        "Ngày này đã trùng lịch với ngày lễ: " + existing.getName() + repeatSuffix));
            }
        }
        return ResponseEntity.ok(repository.save(holiday));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
