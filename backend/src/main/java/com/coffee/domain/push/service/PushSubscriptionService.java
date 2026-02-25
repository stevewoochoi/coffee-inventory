package com.coffee.domain.push.service;

import com.coffee.domain.push.dto.PushSubscriptionDto;
import com.coffee.domain.push.entity.PushSubscription;
import com.coffee.domain.push.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PushSubscriptionService {

    private final PushSubscriptionRepository repository;

    @Transactional
    public PushSubscriptionDto.Response subscribe(PushSubscriptionDto.SubscribeRequest request) {
        // Upsert: if endpoint already exists, update; otherwise create
        PushSubscription subscription = repository.findByEndpoint(request.getEndpoint())
                .map(existing -> {
                    existing.setUserId(request.getUserId());
                    existing.setP256dh(request.getP256dh());
                    existing.setAuth(request.getAuth());
                    return existing;
                })
                .orElseGet(() -> PushSubscription.builder()
                        .userId(request.getUserId())
                        .endpoint(request.getEndpoint())
                        .p256dh(request.getP256dh())
                        .auth(request.getAuth())
                        .build());

        PushSubscription saved = repository.save(subscription);
        return toResponse(saved);
    }

    private PushSubscriptionDto.Response toResponse(PushSubscription s) {
        return PushSubscriptionDto.Response.builder()
                .id(s.getId())
                .userId(s.getUserId())
                .endpoint(s.getEndpoint())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
