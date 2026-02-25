package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_dispatch_log")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderDispatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_plan_id", nullable = false)
    private Long orderPlanId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DispatchMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DispatchStatus status;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(name = "dispatched_at", updatable = false)
    private LocalDateTime dispatchedAt;

    @PrePersist
    protected void onCreate() {
        this.dispatchedAt = LocalDateTime.now();
    }
}
