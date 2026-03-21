package com.coffee.domain.master.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ItemOperationalRequest {
    private String stockUnit;
    private String orderUnit;
    private Double conversionQty;
    private Integer minOrderQty;
    private Double parLevel;
    private String countCycle;
    private String storageZone;
    private String itemGrade;
    private Long substituteItemId;
    private String lotTracking;
    private Boolean isPosTracked;
}
