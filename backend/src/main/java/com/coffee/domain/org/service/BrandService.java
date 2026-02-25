package com.coffee.domain.org.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.org.dto.BrandDto;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrandService {

    private final BrandRepository brandRepository;
    private final CompanyRepository companyRepository;

    public List<BrandDto.Response> findAll() {
        return brandRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<BrandDto.Response> findByCompanyId(Long companyId) {
        return brandRepository.findByCompanyId(companyId).stream()
                .map(this::toResponse)
                .toList();
    }

    public BrandDto.Response findById(Long id) {
        return toResponse(getBrandOrThrow(id));
    }

    @Transactional
    public BrandDto.Response create(BrandDto.Request request) {
        companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));

        Brand brand = Brand.builder()
                .companyId(request.getCompanyId())
                .name(request.getName())
                .build();
        return toResponse(brandRepository.save(brand));
    }

    @Transactional
    public BrandDto.Response update(Long id, BrandDto.Request request) {
        Brand brand = getBrandOrThrow(id);
        brand.setName(request.getName());
        if (request.getCompanyId() != null) {
            companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Company", request.getCompanyId()));
            brand.setCompanyId(request.getCompanyId());
        }
        return toResponse(brandRepository.save(brand));
    }

    @Transactional
    public void delete(Long id) {
        getBrandOrThrow(id);
        brandRepository.deleteById(id);
    }

    private Brand getBrandOrThrow(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brand", id));
    }

    private BrandDto.Response toResponse(Brand brand) {
        return BrandDto.Response.builder()
                .id(brand.getId())
                .companyId(brand.getCompanyId())
                .name(brand.getName())
                .createdAt(brand.getCreatedAt())
                .build();
    }
}
