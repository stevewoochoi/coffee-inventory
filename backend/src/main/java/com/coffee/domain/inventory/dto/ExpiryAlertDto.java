package com.coffee.domain.inventory.dto;

import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.ItemExpiryAlert;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ExpiryAlertDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long storeId;
        private Long itemId;
        private String lotNo;
        private LocalDate expDate;
        private BigDecimal qtyBaseUnit;
        private AlertStatus alertStatus;
        private LocalDateTime notifiedAt;
        private LocalDateTime createdAt;
    }

    public static Response fromEntity(ItemExpiryAlert alert) {
        return Response.builder()
                .id(alert.getId())
                .storeId(alert.getStoreId())
                .itemId(alert.getItemId())
                .lotNo(alert.getLotNo())
                .expDate(alert.getExpDate())
                .qtyBaseUnit(alert.getQtyBaseUnit())
                .alertStatus(alert.getAlertStatus())
                .notifiedAt(alert.getNotifiedAt())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}
