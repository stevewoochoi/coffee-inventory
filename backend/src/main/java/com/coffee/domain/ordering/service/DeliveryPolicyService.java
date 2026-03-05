package com.coffee.domain.ordering.service;

import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.ItemDeliverySchedule;
import com.coffee.domain.master.repository.ItemDeliveryScheduleRepository;
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
    private final ItemDeliveryScheduleRepository scheduleRepository;

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

        // リードタイム計算 (ポリシーがあれば使用、なければデフォルト2日)
        int leadDays = 2;
        LocalTime cutoffTime = LocalTime.of(9, 0);
        if (policy != null) {
            cutoffTime = policy.getCutoffTime();
            leadDays = LocalTime.now().isBefore(cutoffTime)
                    ? policy.getCutoffLeadDaysBefore()
                    : policy.getCutoffLeadDaysAfter();
        }

        LocalDate today = LocalDate.now();
        List<DeliveryPolicyDto.AvailableDate> availableDates = new ArrayList<>();
        boolean firstRecommended = false;

        // 365일 운영 — 일요일/공휴일/정책요일 자동 제외 없음
        for (int d = leadDays; d <= maxDays; d++) {
            LocalDate candidateDate = today.plusDays(d);

            LocalDateTime deadline = (policy != null)
                    ? calculateCutoff(candidateDate, policy)
                    : candidateDate.minusDays(2).atTime(9, 0);

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
                .storeDeliveryType("ALL")
                .cutoffTime(cutoffTime.toString())
                .maxDisplayDays(maxDays)
                .build();
    }

    public boolean isItemOrderableForDate(Long itemId, LocalDate deliveryDate, Long storeId) {
        Item item = itemRepository.findById(itemId).orElse(null);
        if (item == null || !Boolean.TRUE.equals(item.getIsOrderable())) {
            return false;
        }

        DayOfWeek dow = deliveryDate.getDayOfWeek();

        // 상품별 배송스케줄 체크 (유일한 요일 필터)
        Long brandId = item.getBrandId();
        Optional<ItemDeliverySchedule> schedule =
                scheduleRepository.findByItemIdAndBrandId(itemId, brandId);

        if (schedule.isPresent() && Boolean.TRUE.equals(schedule.get().getIsActive())
                && schedule.get().hasAnyDay()) {
            // 스케줄이 있고 하루라도 지정 → 해당 요일만 가능
            if (!schedule.get().isAvailable(dow)) {
                return false;
            }
        }
        // 스케줄 없거나 아무 요일도 체크 안 했으면 → 365일 전체 가능

        // 리드타임 체크
        int itemLeadTime = item.getLeadTimeDays() != null ? item.getLeadTimeDays() : 2;
        DeliveryPolicy policy = getStorePolicy(storeId);
        int policyLeadDays = 2;
        if (policy != null) {
            policyLeadDays = LocalTime.now().isBefore(policy.getCutoffTime())
                    ? policy.getCutoffLeadDaysBefore()
                    : policy.getCutoffLeadDaysAfter();
        }
        int effectiveLeadDays = Math.max(itemLeadTime, policyLeadDays);
        return !deliveryDate.isBefore(LocalDate.now().plusDays(effectiveLeadDays));
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

        // 365일 운영 — 일요일/공휴일 체크 삭제, 마감시간만 확인
        LocalDateTime deadline = calculateCutoff(deliveryDate, policy);
        LocalDateTime now = LocalDateTime.now();
        boolean beforeDeadline = deadline.isAfter(now);

        long remainingMinutes = beforeDeadline
                ? Duration.between(now, deadline).toMinutes()
                : 0;

        return DeliveryPolicyDto.OrderAvailability.builder()
                .available(beforeDeadline)
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
