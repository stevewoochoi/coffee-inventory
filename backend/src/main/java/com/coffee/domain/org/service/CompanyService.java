package com.coffee.domain.org.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.org.dto.CompanyDto;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyService {

    private final CompanyRepository companyRepository;

    public List<CompanyDto.Response> findAll() {
        return companyRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public CompanyDto.Response findById(Long id) {
        return toResponse(getCompanyOrThrow(id));
    }

    @Transactional
    public CompanyDto.Response create(CompanyDto.Request request) {
        Company company = Company.builder()
                .name(request.getName())
                .build();
        return toResponse(companyRepository.save(company));
    }

    @Transactional
    public CompanyDto.Response update(Long id, CompanyDto.Request request) {
        Company company = getCompanyOrThrow(id);
        company.setName(request.getName());
        return toResponse(companyRepository.save(company));
    }

    @Transactional
    public void delete(Long id) {
        getCompanyOrThrow(id);
        companyRepository.deleteById(id);
    }

    private Company getCompanyOrThrow(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", id));
    }

    private CompanyDto.Response toResponse(Company company) {
        return CompanyDto.Response.builder()
                .id(company.getId())
                .name(company.getName())
                .createdAt(company.getCreatedAt())
                .build();
    }
}
