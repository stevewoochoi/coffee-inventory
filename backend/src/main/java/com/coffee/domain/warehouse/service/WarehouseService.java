package com.coffee.domain.warehouse.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WarehouseService {

    private final StoreRepository storeRepository;

    public List<Store> getWarehousesForBrand(Long brandId) {
        return storeRepository.findByBrandIdAndStoreTypeAndStatus(brandId, "WAREHOUSE", "ACTIVE");
    }

    /** Validate that warehouseId exists, is WAREHOUSE type, and belongs to caller's brand. */
    public Store getWarehouse(Long warehouseId, Long brandId) {
        Store s = storeRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse", warehouseId));
        if (!s.isWarehouse()) {
            throw new BusinessException("Not a WAREHOUSE store: id=" + warehouseId, HttpStatus.BAD_REQUEST);
        }
        if (brandId != null && s.getBrandId() != null && !s.getBrandId().equals(brandId)) {
            throw new BusinessException("Forbidden: warehouse belongs to another brand", HttpStatus.FORBIDDEN);
        }
        return s;
    }
}
