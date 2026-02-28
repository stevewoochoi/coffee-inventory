package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;

@Entity
@Table(name = "order_line")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_plan_id", nullable = false)
    private Long orderPlanId;

    @Column(name = "packaging_id", nullable = false)
    private Long packagingId;

    @Min(1)
    @Column(name = "pack_qty", nullable = false)
    private Integer packQty;
}
