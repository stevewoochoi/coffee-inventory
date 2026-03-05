package com.coffee.domain.org.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.org.dto.StoreDto;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreService {

    private final StoreRepository storeRepository;
    private final BrandRepository brandRepository;

    public List<StoreDto.Response> findAll() {
        return storeRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<StoreDto.Response> findByBrandId(Long brandId) {
        return storeRepository.findByBrandId(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    public StoreDto.Response findById(Long id) {
        return toResponse(getStoreOrThrow(id));
    }

    @Transactional
    public StoreDto.Response create(StoreDto.Request request) {
        brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));

        Store store = Store.builder()
                .brandId(request.getBrandId())
                .name(request.getName())
                .timezone(request.getTimezone() != null ? request.getTimezone() : "Asia/Tokyo")
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .address(request.getAddress())
                .phone(request.getPhone())
                .openDate(request.getOpenDate())
                .memo(request.getMemo())
                .build();
        return toResponse(storeRepository.save(store));
    }

    @Transactional
    public StoreDto.Response update(Long id, StoreDto.Request request) {
        Store store = getStoreOrThrow(id);
        store.setName(request.getName());
        if (request.getBrandId() != null) {
            brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Brand", request.getBrandId()));
            store.setBrandId(request.getBrandId());
        }
        if (request.getTimezone() != null) {
            store.setTimezone(request.getTimezone());
        }
        if (request.getStatus() != null) {
            store.setStatus(request.getStatus());
        }
        store.setAddress(request.getAddress());
        store.setPhone(request.getPhone());
        store.setOpenDate(request.getOpenDate());
        store.setMemo(request.getMemo());
        return toResponse(storeRepository.save(store));
    }

    @Transactional
    public void delete(Long id) {
        Store store = getStoreOrThrow(id);
        store.setStatus("INACTIVE");
        storeRepository.save(store);
    }

    private Store getStoreOrThrow(Long id) {
        return storeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Store", id));
    }

    private StoreDto.Response toResponse(Store store) {
        return StoreDto.Response.builder()
                .id(store.getId())
                .brandId(store.getBrandId())
                .name(store.getName())
                .timezone(store.getTimezone())
                .status(store.getStatus())
                .address(store.getAddress())
                .phone(store.getPhone())
                .openDate(store.getOpenDate())
                .memo(store.getMemo())
                .createdAt(store.getCreatedAt())
                .build();
    }
}
