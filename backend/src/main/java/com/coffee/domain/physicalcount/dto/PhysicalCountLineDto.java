package com.coffee.domain.physicalcount.dto;

import com.coffee.domain.physicalcount.entity.PhysicalCountLine;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

public class PhysicalCountLineDto {

    @Getter
    @AllArgsConstructor
    public static class UpdateRequest {
        private BigDecimal actualQty;
        private String note;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long countId;
        private Long itemId;
        private BigDecimal systemQty;
        private BigDecimal actualQty;
        private BigDecimal gapQty;
        private String note;
    }

    public static Response fromEntity(PhysicalCountLine line) {
        return Response.builder()
                .id(line.getId())
                .countId(line.getCountId())
                .itemId(line.getItemId())
                .systemQty(line.getSystemQty())
                .actualQty(line.getActualQty())
                .gapQty(line.getGapQty())
                .note(line.getNote())
                .build();
    }
}
