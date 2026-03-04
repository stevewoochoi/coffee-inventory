package com.coffee.domain.ordering.entity;

public enum OrderStatus {
    DRAFT,
    CONFIRMED,
    CUTOFF_CLOSED,
    DISPATCHED,
    PARTIALLY_RECEIVED,
    DELIVERED,
    CANCELLED
}
