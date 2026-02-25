package com.coffee.domain.receiving.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_scan")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DeliveryScan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "delivery_id", nullable = false)
    private Long deliveryId;

    @Column(name = "packaging_id", nullable = false)
    private Long packagingId;

    @Column(name = "lot_no", length = 100)
    private String lotNo;

    @Column(name = "exp_date")
    private LocalDate expDate;

    @Column(name = "pack_count_scanned")
    @Builder.Default
    private Integer packCountScanned = 1;

    @Column(name = "scanned_at", updatable = false)
    private LocalDateTime scannedAt;

    @PrePersist
    protected void onCreate() {
        this.scannedAt = LocalDateTime.now();
    }
}
