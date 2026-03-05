package com.coffee.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.DayOfWeek;
import java.time.LocalDateTime;

@Entity
@Table(name = "item_delivery_schedule")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ItemDeliverySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Builder.Default
    private Boolean mon = false;
    @Builder.Default
    private Boolean tue = false;
    @Builder.Default
    private Boolean wed = false;
    @Builder.Default
    private Boolean thu = false;
    @Builder.Default
    private Boolean fri = false;
    @Builder.Default
    private Boolean sat = false;
    @Builder.Default
    private Boolean sun = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isAvailable(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> Boolean.TRUE.equals(mon);
            case TUESDAY -> Boolean.TRUE.equals(tue);
            case WEDNESDAY -> Boolean.TRUE.equals(wed);
            case THURSDAY -> Boolean.TRUE.equals(thu);
            case FRIDAY -> Boolean.TRUE.equals(fri);
            case SATURDAY -> Boolean.TRUE.equals(sat);
            case SUNDAY -> Boolean.TRUE.equals(sun);
        };
    }

    public boolean hasAnyDay() {
        return Boolean.TRUE.equals(mon) || Boolean.TRUE.equals(tue) || Boolean.TRUE.equals(wed)
                || Boolean.TRUE.equals(thu) || Boolean.TRUE.equals(fri) || Boolean.TRUE.equals(sat)
                || Boolean.TRUE.equals(sun);
    }

    public String getDisplayDays() {
        StringBuilder sb = new StringBuilder();
        if (Boolean.TRUE.equals(mon)) sb.append("월");
        if (Boolean.TRUE.equals(tue)) sb.append("화");
        if (Boolean.TRUE.equals(wed)) sb.append("수");
        if (Boolean.TRUE.equals(thu)) sb.append("목");
        if (Boolean.TRUE.equals(fri)) sb.append("금");
        if (Boolean.TRUE.equals(sat)) sb.append("토");
        return sb.isEmpty() ? "-" : sb.toString();
    }
}
