package com.coffee.domain.ordering.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "store_delivery_policy")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StoreDeliveryPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "delivery_policy_id", nullable = false)
    private Long deliveryPolicyId;

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = true;
}
