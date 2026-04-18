package com.coffee.domain.org.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "store")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "brand_id", nullable = false)
    private Long brandId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    @Builder.Default
    private String timezone = "Asia/Tokyo";

    @Column(length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(length = 300)
    private String address;

    @Column(length = 30)
    private String phone;

    @Column(name = "open_date")
    private LocalDate openDate;

    @Column(columnDefinition = "TEXT")
    private String memo;

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
}
