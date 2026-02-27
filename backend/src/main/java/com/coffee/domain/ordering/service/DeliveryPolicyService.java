package com.coffee.domain.ordering.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.ordering.dto.DeliveryPolicyDto;
import com.coffee.domain.ordering.entity.DeliveryHoliday;
import com.coffee.domain.ordering.entity.DeliveryPolicy;
import com.coffee.domain.ordering.entity.StoreDeliveryPolicy;
import com.coffee.domain.ordering.repository.DeliveryHolidayRepository;
import com.coffee.domain.ordering.repository.DeliveryPolicyRepository;
import com.coffee.domain.ordering.repository.StoreDeliveryPolicyRepository;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryPolicyService {

    private static final int MAX_DISPLAY_DAYS = 14;

    private final DeliveryPolicyRepository policyRepository;
    private final StoreDeliveryPolicyRepository storePolicyRepository;
    private final DeliveryHolidayRepository holidayRepository;
    private final StoreRepository storeRepository;
    private final ItemRepository itemRepository;

    public DeliveryPolicy getStorePolicy(Long storeId) {
        StoreDeliveryPolicy storePolicy = storePolicyRepository.findByStoreIdAndIsDefaultTrue(storeId)
                .orElse(null);

        if (storePolicy == null) {
            // Fallback: find any policy for this store
            List<StoreDeliveryPolicy> policies = storePolicyRepository.findByStoreId(storeId);
            if (!policies.isEmpty()) {
                storePolicy = policies.get(0);
            }
        }

        if (storePolicy == null) {
            // Fallback: get brand's first active policy
            Store store = storeRepository.findById(storeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Store", storeId));
            List<DeliveryPolicy> brandPolicies = policyRepository.findByBrandIdAndIsActiveTrue(store.getBrandId());
            if (!brandPolicies.isEmpty()) {
                return brandPolicies.get(0);
            }
            return null;
        }

        return policyRepository.findById(storePolicy.getDeliveryPolicyId()).orElse(null);
    }

    public DeliveryPolicyDto.AvailableDateResponse getAvailableDates(Long storeId, int maxDays) {
        if (maxDays <= 0) {
            maxDays = MAX_DISPLAY_DAYS;
        }

        DeliveryPolicy policy = getStorePolicy(storeId);
        if (policy == null) {
            return DeliveryPolicyDto.AvailableDateResponse.builder()
                    .availableDates(Collections.emptyList())
                    .storeDeliveryType("NONE")
                    .cutoffTime("09:00")
                    .maxDisplayDays(maxDays)
                    .build();
        }

        Set<DayOfWeek> deliveryDays = parseDeliveryDays(policy.getDeliveryDays());
        Set<LocalDate> holidays = getHolidayDates(policy.getBrandId(), maxDays);

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime cutoffTime = policy.getCutoffTime();

        // Determine minimum lead days based on current time vs cutoff
        int leadDays = now.isBefore(cutoffTime)
                ? policy.getCutoffLeadDaysBefore()
                : policy.getCutoffLeadDaysAfter();

        List<DeliveryPolicyDto.AvailableDate> availableDates = new ArrayList<>();
        boolean firstRecommended = false;

        for (int d = leadDays; d <= maxDays; d++) {
            LocalDate candidateDate = today.plusDays(d);

            // Skip Sundays
            if (candidateDate.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }

            // Skip if not a delivery day
            if (!deliveryDays.contains(candidateDate.getDayOfWeek())) {
                continue;
            }

            // Skip holidays
            if (holidays.contains(candidateDate)) {
                continue;
            }

            // Calculate cutoff/deadline for this delivery date
            LocalDateTime deadline = calculateCutoff(candidateDate, policy);

            // Only include if deadline is in the future
            if (deadline.isAfter(LocalDateTime.now())) {
                boolean isRecommended = !firstRecommended;
                if (isRecommended) {
                    firstRecommended = true;
                }

                availableDates.add(DeliveryPolicyDto.AvailableDate.builder()
                        .date(candidateDate)
                        .dayOfWeek(candidateDate.getDayOfWeek()
                                .getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase())
                        .isRecommended(isRecommended)
                        .orderDeadline(deadline)
                        .build());
            }
        }

        return DeliveryPolicyDto.AvailableDateResponse.builder()
                .availableDates(availableDates)
                .storeDeliveryType(policy.getDeliveryDays())
                .cutoffTime(cutoffTime.toString())
                .maxDisplayDays(maxDays)
                .build();
    }

    public boolean isItemOrderableForDate(Long itemId, LocalDate deliveryDate, Long storeId) {
        Item item = itemRepository.findById(itemId).orElse(null);
        if (item == null || !Boolean.TRUE.equals(item.getIsOrderable())) {
            return false;
        }

        DeliveryPolicy policy = getStorePolicy(storeId);
        if (policy == null) {
            return false;
        }

        // Check if delivery date is valid
        Set<DayOfWeek> deliveryDays = parseDeliveryDays(policy.getDeliveryDays());
        if (!deliveryDays.contains(deliveryDate.getDayOfWeek())) {
            return false;
        }
        if (deliveryDate.getDayOfWeek() == DayOfWeek.SUNDAY) {
            return false;
        }

        Set<LocalDate> holidays = getHolidayDates(policy.getBrandId(), MAX_DISPLAY_DAYS);
        if (holidays.contains(deliveryDate)) {
            return false;
        }

        // Check item-specific lead time
        int itemLeadTime = item.getLeadTimeDays() != null ? item.getLeadTimeDays() : 2;
        LocalDate today = LocalDate.now();
        long daysUntilDelivery = java.time.temporal.ChronoUnit.DAYS.between(today, deliveryDate);

        if (daysUntilDelivery < itemLeadTime) {
            return false;
        }

        // Check cutoff deadline is still in future
        LocalDateTime deadline = calculateCutoff(deliveryDate, policy);
        return deadline.isAfter(LocalDateTime.now());
    }

    public LocalDateTime calculateCutoff(LocalDate deliveryDate, DeliveryPolicy policy) {
        // Cutoff is: deliveryDate minus lead days, at cutoff_time
        // Use the "before" lead days (the shorter one) for the deadline
        int leadDays = policy.getCutoffLeadDaysBefore();
        LocalDate cutoffDate = deliveryDate.minusDays(leadDays);
        return LocalDateTime.of(cutoffDate, policy.getCutoffTime());
    }

    public DeliveryPolicyDto.OrderAvailability checkOrderAvailability(Long storeId, LocalDate deliveryDate) {
        DeliveryPolicy policy = getStorePolicy(storeId);
        if (policy == null) {
            return DeliveryPolicyDto.OrderAvailability.builder()
                    .available(false)
                    .deadline(null)
                    .remainingMinutes(0)
                    .build();
        }

        // Validate the delivery date
        Set<DayOfWeek> deliveryDays = parseDeliveryDays(policy.getDeliveryDays());
        boolean validDay = deliveryDays.contains(deliveryDate.getDayOfWeek())
                && deliveryDate.getDayOfWeek() != DayOfWeek.SUNDAY;

        Set<LocalDate> holidays = getHolidayDates(policy.getBrandId(), MAX_DISPLAY_DAYS);
        boolean notHoliday = !holidays.contains(deliveryDate);

        LocalDateTime deadline = calculateCutoff(deliveryDate, policy);
        LocalDateTime now = LocalDateTime.now();
        boolean beforeDeadline = deadline.isAfter(now);

        boolean available = validDay && notHoliday && beforeDeadline;
        long remainingMinutes = available
                ? Duration.between(now, deadline).toMinutes()
                : 0;

        return DeliveryPolicyDto.OrderAvailability.builder()
                .available(available)
                .deadline(deadline)
                .remainingMinutes(remainingMinutes)
                .build();
    }

    private Set<DayOfWeek> parseDeliveryDays(String deliveryDaysStr) {
        if (deliveryDaysStr == null || deliveryDaysStr.isEmpty()) {
            return Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        }

        if ("EVERYDAY".equalsIgnoreCase(deliveryDaysStr)) {
            return EnumSet.of(
                    DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                    DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY);
        }

        Set<DayOfWeek> days = new HashSet<>();
        for (String part : deliveryDaysStr.split("_")) {
            switch (part.toUpperCase()) {
                case "MON" -> days.add(DayOfWeek.MONDAY);
                case "TUE" -> days.add(DayOfWeek.TUESDAY);
                case "WED" -> days.add(DayOfWeek.WEDNESDAY);
                case "THU" -> days.add(DayOfWeek.THURSDAY);
                case "FRI" -> days.add(DayOfWeek.FRIDAY);
                case "SAT" -> days.add(DayOfWeek.SATURDAY);
            }
        }
        return days;
    }

    private Set<LocalDate> getHolidayDates(Long brandId, int maxDays) {
        LocalDate from = LocalDate.now();
        LocalDate to = from.plusDays(maxDays);
        return holidayRepository.findByBrandIdAndHolidayDateBetween(brandId, from, to).stream()
                .map(DeliveryHoliday::getHolidayDate)
                .collect(Collectors.toSet());
    }
}
