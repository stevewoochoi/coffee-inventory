package com.coffee.domain.ordering.controller;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.common.response.ApiResponse;
import com.coffee.domain.ordering.entity.DeliveryHoliday;
import com.coffee.domain.ordering.repository.DeliveryHolidayRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/delivery-holidays")
@RequiredArgsConstructor
public class DeliveryHolidayController {

    private final DeliveryHolidayRepository holidayRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DeliveryHoliday>>> getHolidays(@RequestParam Long brandId) {
        return ResponseEntity.ok(ApiResponse.ok(
                holidayRepository.findByBrandIdOrderByHolidayDateAsc(brandId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeliveryHoliday>> createHoliday(@Valid @RequestBody CreateHolidayRequest request) {
        DeliveryHoliday holiday = DeliveryHoliday.builder()
                .brandId(request.getBrandId())
                .holidayDate(request.getHolidayDate())
                .description(request.getDescription())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(holidayRepository.save(holiday), "Holiday created"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHoliday(@PathVariable Long id) {
        DeliveryHoliday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DeliveryHoliday", id));
        holidayRepository.delete(holiday);
        return ResponseEntity.ok(ApiResponse.ok(null, "Holiday deleted"));
    }

    @Getter
    @Setter
    public static class CreateHolidayRequest {
        @NotNull private Long brandId;
        @NotNull private LocalDate holidayDate;
        private String description;
    }
}
