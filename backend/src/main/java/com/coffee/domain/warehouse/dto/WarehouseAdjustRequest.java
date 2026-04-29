package com.coffee.domain.warehouse.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class WarehouseAdjustRequest {
    @NotNull
    private Long itemId;

    /** Positive = increase, negative = decrease */
    @NotNull
    private BigDecimal qtyDelta;

    private LocalDate expDate;
    private String lotNo;

    /** Reason: DAMAGE, ERROR, RECOUNT, OTHER */
    private String reason;
    private String memo;
}
