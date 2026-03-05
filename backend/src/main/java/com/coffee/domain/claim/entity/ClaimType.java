package com.coffee.domain.claim.entity;

public enum ClaimType {
    // Legacy types (kept for backward compatibility)
    DEFECTIVE,
    WRONG_ITEM,
    QUALITY,

    // Active types
    DAMAGE,
    EXPIRY_ISSUE,
    LABELING,
    ORDER_ERROR,
    DEFECTIVE_FOOD,
    DEFECTIVE_NONFOOD,
    FOREIGN_MATTER,
    SHORTAGE,
    OVER_DELIVERY,
    OTHER
}
