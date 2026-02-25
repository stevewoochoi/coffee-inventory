package com.coffee.domain.push.service;

import com.coffee.domain.push.entity.PushSubscription;
import com.coffee.domain.push.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    private final PushSubscriptionRepository subscriptionRepository;

    @Value("${app.vapid.public-key:}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key:}")
    private String vapidPrivateKey;

    @Value("${app.vapid.subject:mailto:admin@coffee.com}")
    private String vapidSubject;

    private PushService pushService;
    private boolean configured = false;

    @PostConstruct
    public void init() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        if (vapidPublicKey != null && !vapidPublicKey.isBlank()
                && vapidPrivateKey != null && !vapidPrivateKey.isBlank()) {
            try {
                pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
                configured = true;
                log.info("WebPush service initialized with VAPID keys");
            } catch (Exception e) {
                log.warn("Failed to initialize WebPush service: {}", e.getMessage());
            }
        } else {
            log.info("WebPush service not configured (VAPID keys not set)");
        }
    }

    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    public boolean isConfigured() {
        return configured;
    }

    public void sendToUser(Long userId, String title, String body) {
        if (!configured) {
            log.debug("WebPush not configured, skipping notification for user {}", userId);
            return;
        }

        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(userId);
        for (PushSubscription sub : subscriptions) {
            sendNotification(sub, title, body);
        }
    }

    public void sendToAllSubscribers(String title, String body) {
        if (!configured) {
            log.debug("WebPush not configured, skipping broadcast notification");
            return;
        }

        List<PushSubscription> all = subscriptionRepository.findAll();
        for (PushSubscription sub : all) {
            sendNotification(sub, title, body);
        }
    }

    private void sendNotification(PushSubscription sub, String title, String body) {
        try {
            String payload = String.format(
                    "{\"title\":\"%s\",\"body\":\"%s\",\"icon\":\"/vite.svg\"}",
                    escapeJson(title), escapeJson(body));

            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payload.getBytes()
            );

            pushService.send(notification);
            log.debug("Push notification sent to endpoint: {}...", sub.getEndpoint().substring(0, Math.min(50, sub.getEndpoint().length())));
        } catch (Exception e) {
            log.warn("Failed to send push to endpoint {}: {}", sub.getEndpoint(), e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("410")) {
                subscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                log.info("Removed expired subscription: {}", sub.getEndpoint());
            }
        }
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
