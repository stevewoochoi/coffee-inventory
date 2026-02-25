package com.coffee.domain.master.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.dto.SupplierDto;
import com.coffee.domain.master.dto.SupplierItemDto;
import com.coffee.domain.master.entity.OrderMethod;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.org.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final BrandRepository brandRepository;
    private final PackagingRepository packagingRepository;

    public List<SupplierDto.Response> findAll(Long brandId) {
        List<Supplier> suppliers = brandId != null
                ? supplierRepository.findByBrandId(brandId)
                : supplierRepository.findAll();
        return suppliers.stream().map(this::toResponse).toList();
    }

    public SupplierDto.Response findById(Long id) {
        return toResponse(getOrThrow(id));
    }

    @Transactional
    public SupplierDto.Response create(SupplierDto.Request request) {
        brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));

        Supplier supplier = Supplier.builder()
                .brandId(request.getBrandId())
                .name(request.getName())
                .email(request.getEmail())
                .orderMethod(request.getOrderMethod() != null
                        ? OrderMethod.valueOf(request.getOrderMethod()) : OrderMethod.EMAIL)
                .build();
        return toResponse(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierDto.Response update(Long id, SupplierDto.Request request) {
        Supplier supplier = getOrThrow(id);
        supplier.setName(request.getName());
        if (request.getEmail() != null) supplier.setEmail(request.getEmail());
        if (request.getOrderMethod() != null) supplier.setOrderMethod(OrderMethod.valueOf(request.getOrderMethod()));
        return toResponse(supplierRepository.save(supplier));
    }

    @Transactional
    public void delete(Long id) {
        getOrThrow(id);
        supplierRepository.deleteById(id);
    }

    // SupplierItem
    public List<SupplierItemDto.Response> findSupplierItems(Long supplierId) {
        return supplierItemRepository.findBySupplierId(supplierId).stream()
                .map(this::toItemResponse)
                .toList();
    }

    @Transactional
    public SupplierItemDto.Response createSupplierItem(SupplierItemDto.Request request) {
        getOrThrow(request.getSupplierId());
        packagingRepository.findById(request.getPackagingId())
                .orElseThrow(() -> new ResourceNotFoundException("Packaging", request.getPackagingId()));

        SupplierItem si = SupplierItem.builder()
                .supplierId(request.getSupplierId())
                .packagingId(request.getPackagingId())
                .supplierSku(request.getSupplierSku())
                .leadTimeDays(request.getLeadTimeDays() != null ? request.getLeadTimeDays() : 1)
                .price(request.getPrice())
                .build();
        return toItemResponse(supplierItemRepository.save(si));
    }

    @Transactional
    public void deleteSupplierItem(Long id) {
        supplierItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SupplierItem", id));
        supplierItemRepository.deleteById(id);
    }

    private Supplier getOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", id));
    }

    private SupplierDto.Response toResponse(Supplier s) {
        return SupplierDto.Response.builder()
                .id(s.getId())
                .brandId(s.getBrandId())
                .name(s.getName())
                .email(s.getEmail())
                .orderMethod(s.getOrderMethod().name())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private SupplierItemDto.Response toItemResponse(SupplierItem si) {
        return SupplierItemDto.Response.builder()
                .id(si.getId())
                .supplierId(si.getSupplierId())
                .packagingId(si.getPackagingId())
                .supplierSku(si.getSupplierSku())
                .leadTimeDays(si.getLeadTimeDays())
                .price(si.getPrice())
                .build();
    }
}
