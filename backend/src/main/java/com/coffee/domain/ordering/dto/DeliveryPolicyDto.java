package com.coffee.domain.ordering.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class DeliveryPolicyDto {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AvailableDateResponse {
        private List<AvailableDate> availableDates;
        private String storeDeliveryType;
        private String cutoffTime;
        private int maxDisplayDays;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class AvailableDate {
        private LocalDate date;
        private String dayOfWeek;
        private boolean isRecommended;
        private LocalDateTime orderDeadline;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class OrderAvailability {
        private boolean available;
        private LocalDateTime deadline;
        private long remainingMinutes;
    }
}
