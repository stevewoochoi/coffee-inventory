package com.coffee.domain.warehouse.dto;

import com.coffee.domain.org.entity.Store;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class WarehouseDto {
    private Long id;
    private Long brandId;
    private String name;
    private String storeType;
    private Boolean isInternalWarehouse;
    private String status;
    private String timezone;

    public static WarehouseDto from(Store s) {
        return WarehouseDto.builder()
                .id(s.getId())
                .brandId(s.getBrandId())
                .name(s.getName())
                .storeType(s.getStoreType())
                .isInternalWarehouse(s.getIsInternalWarehouse())
                .status(s.getStatus())
                .timezone(s.getTimezone())
                .build();
    }
}
