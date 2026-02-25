package com.coffee.domain.org.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.org.dto.CompanyDto;
import com.coffee.domain.org.service.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/org/companies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CompanyDto.Response>>> findAll() {
        return ResponseEntity.ok(ApiResponse.ok(companyService.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CompanyDto.Response>> create(@Valid @RequestBody CompanyDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(companyService.create(request), "Company created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody CompanyDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.update(id, request), "Company updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        companyService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Company deleted"));
    }
}
