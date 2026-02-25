package com.coffee.domain.inventory.service;

import com.coffee.domain.inventory.dto.ExpiryAlertDto;
import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.ItemExpiryAlert;
import com.coffee.domain.inventory.repository.ItemExpiryAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExpiryAlertService {

    private final ItemExpiryAlertRepository alertRepository;

    public List<ExpiryAlertDto.Response> getAlertsByStore(Long storeId) {
        return alertRepository.findByStoreId(storeId).stream()
                .map(ExpiryAlertDto::fromEntity)
                .toList();
    }

    public List<ExpiryAlertDto.Response> getActiveAlertsByStore(Long storeId) {
        List<AlertStatus> activeStatuses = List.of(
                AlertStatus.WARNING, AlertStatus.CRITICAL, AlertStatus.EXPIRED);
        return alertRepository.findByStoreIdAndAlertStatusIn(storeId, activeStatuses).stream()
                .map(ExpiryAlertDto::fromEntity)
                .toList();
    }
}
