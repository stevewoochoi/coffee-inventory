package com.coffee.domain.dashboard.service;

import com.coffee.domain.dashboard.dto.DashboardDto;
import com.coffee.domain.inventory.entity.AlertStatus;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.ItemExpiryAlertRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.inventory.service.LowStockService;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.ordering.dto.OrderNeedsDto;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import com.coffee.domain.ordering.service.OrderNeedsService;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import com.coffee.domain.receiving.entity.Delivery;
import com.coffee.domain.receiving.entity.DeliveryStatus;
import com.coffee.domain.receiving.repository.DeliveryRepository;
import com.coffee.domain.waste.entity.Waste;
import com.coffee.domain.waste.repository.WasteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final StockLedgerRepository stockLedgerRepository;
    private final WasteRepository wasteRepository;
    private final ItemExpiryAlertRepository expiryAlertRepository;
    private final LowStockService lowStockService;
    private final StoreRepository storeRepository;
    private final DeliveryRepository deliveryRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final ItemRepository itemRepository;
    private final OrderNeedsService orderNeedsService;
    private final OrderPlanRepository orderPlanRepository;

    public DashboardDto.StoreDashboard getStoreDashboard(Long storeId) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();

        // 오늘 입고 건수
        List<Object[]> receiveData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.RECEIVE, todayStart);
        if (receiveData == null) receiveData = List.of();
        long todayReceiveCount = receiveData.size();

        // 오늘 폐기량
        List<com.coffee.domain.waste.entity.Waste> allWastes = wasteRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        BigDecimal todayWasteQty = (allWastes != null ? allWastes : List.<Waste>of()).stream()
                .filter(w -> w.getCreatedAt() != null && w.getCreatedAt().toLocalDate().equals(today))
                .map(w -> w.getQtyBaseUnit() != null ? w.getQtyBaseUnit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 저재고 수
        int lowStockCount = lowStockService.getLowStockItems(storeId).size();

        // 유통기한 임박 수
        int expiryAlertCount = (int) expiryAlertRepository.findByStoreId(storeId).stream()
                .filter(a -> a.getAlertStatus() != AlertStatus.NORMAL)
                .count();

        // 최근 7일 일별 소비량
        LocalDateTime weekAgo = today.minusDays(7).atStartOfDay();
        List<Object[]> sellData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.SELL, weekAgo);
        if (sellData == null) sellData = List.of();
        // sellData는 아이템별 합산이므로, 전체 합산
        final List<Object[]> finalSellData = sellData;
        BigDecimal totalSellQty = sellData.stream()
                .map(row -> row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 간단히 7일 평균으로 일별 데이터 생성
        List<DashboardDto.DailyConsumption> dailyConsumption = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            dailyConsumption.add(DashboardDto.DailyConsumption.builder()
                    .date(today.minusDays(i))
                    .totalQty(totalSellQty.divide(BigDecimal.valueOf(7), 3, java.math.RoundingMode.HALF_UP))
                    .build());
        }

        // V5: Order needs counts
        int urgentOrderCount = 0;
        int recommendedOrderCount = 0;
        try {
            Store store = storeRepository.findById(storeId).orElse(null);
            if (store != null) {
                OrderNeedsDto.Response needs = orderNeedsService.getOrderNeeds(storeId, store.getBrandId());
                urgentOrderCount = needs.getUrgent() != null ? needs.getUrgent().size() : 0;
                recommendedOrderCount = needs.getRecommended() != null ? needs.getRecommended().size() : 0;
            }
        } catch (Exception ignored) {}

        // V5: Pending receiving count
        int pendingReceivingCount = (int) deliveryRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                .filter(d -> d.getStatus() == DeliveryStatus.PENDING || d.getStatus() == DeliveryStatus.IN_PROGRESS)
                .count();

        // V5: Stock status breakdown
        Map<Long, BigDecimal> stockByItem = new java.util.HashMap<>();
        List<InventorySnapshot> snapshots = snapshotRepository.findByStoreId(storeId);
        if (snapshots != null) {
            snapshots.forEach(s -> stockByItem.merge(s.getItemId(),
                    s.getQtyBaseUnit() != null ? s.getQtyBaseUnit() : BigDecimal.ZERO,
                    BigDecimal::add));
        }

        int totalItems = stockByItem.size();
        int outOfStockCount = 0;
        int normalCount = 0;
        for (Map.Entry<Long, BigDecimal> entry : stockByItem.entrySet()) {
            if (entry.getValue().compareTo(BigDecimal.ZERO) <= 0) {
                outOfStockCount++;
            } else {
                normalCount++;
            }
        }
        // Adjust: lowStockCount items are a subset of normalCount (they have stock > 0 but below minimum)
        normalCount = normalCount - lowStockCount;
        if (normalCount < 0) normalCount = 0;

        DashboardDto.StockStatus stockStatus = DashboardDto.StockStatus.builder()
                .totalItems(totalItems)
                .normalCount(normalCount)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .build();

        // V5: Top 5 consumption items
        List<DashboardDto.TopConsumption> topConsumption = finalSellData.stream()
                .sorted((a, b) -> ((BigDecimal) b[1]).compareTo((BigDecimal) a[1]))
                .limit(5)
                .map(row -> {
                    Long itemId = (Long) row[0];
                    BigDecimal qty = (BigDecimal) row[1];
                    Item item = itemRepository.findById(itemId).orElse(null);
                    return DashboardDto.TopConsumption.builder()
                            .itemId(itemId)
                            .itemName(item != null ? item.getName() : "Item #" + itemId)
                            .totalQty(qty)
                            .baseUnit(item != null ? item.getBaseUnit() : "")
                            .build();
                })
                .toList();

        // V6: Recent order/receiving dates, monthly stats, next delivery
        LocalDate recentOrderDate = null;
        LocalDate recentReceivingDate = null;
        int monthlyOrderCount = 0;
        BigDecimal monthlyOrderAmount = BigDecimal.ZERO;
        LocalDate nextDeliveryDate = null;
        LocalDate nextDeadline = null;

        try {
            List<OrderPlan> allOrders = orderPlanRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
            if (!allOrders.isEmpty()) {
                recentOrderDate = allOrders.get(0).getCreatedAt().toLocalDate();
            }
            // Monthly stats (current month)
            LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
            LocalDateTime monthEnd = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();
            for (OrderPlan op : allOrders) {
                if (op.getCreatedAt() != null && !op.getCreatedAt().isBefore(monthStart) && op.getCreatedAt().isBefore(monthEnd)) {
                    monthlyOrderCount++;
                    if (op.getTotalAmount() != null) {
                        monthlyOrderAmount = monthlyOrderAmount.add(op.getTotalAmount());
                    }
                }
            }
            // Next delivery date (future confirmed orders)
            for (OrderPlan op : allOrders) {
                if (op.getDeliveryDate() != null && !op.getDeliveryDate().isBefore(today)
                        && op.getStatus() != OrderStatus.CANCELLED) {
                    if (nextDeliveryDate == null || op.getDeliveryDate().isBefore(nextDeliveryDate)) {
                        nextDeliveryDate = op.getDeliveryDate();
                    }
                    // Next deadline (cutoff)
                    if (op.getCutoffAt() != null) {
                        LocalDate cutoffDate = op.getCutoffAt().toLocalDate();
                        if (!cutoffDate.isBefore(today) && (nextDeadline == null || cutoffDate.isBefore(nextDeadline))) {
                            nextDeadline = cutoffDate;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        try {
            List<Delivery> deliveries = deliveryRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
            if (!deliveries.isEmpty()) {
                recentReceivingDate = deliveries.get(0).getCreatedAt().toLocalDate();
            }
        } catch (Exception ignored) {}

        return DashboardDto.StoreDashboard.builder()
                .todayReceiveCount(todayReceiveCount)
                .todayWasteQty(todayWasteQty)
                .lowStockCount(lowStockCount)
                .expiryAlertCount(expiryAlertCount)
                .dailyConsumption(dailyConsumption)
                .monthOrderCost(BigDecimal.ZERO)
                .urgentOrderCount(urgentOrderCount)
                .recommendedOrderCount(recommendedOrderCount)
                .pendingReceivingCount(pendingReceivingCount)
                .stockStatus(stockStatus)
                .topConsumption(topConsumption)
                .recentOrderDate(recentOrderDate)
                .recentReceivingDate(recentReceivingDate)
                .monthlyOrderCount(monthlyOrderCount)
                .monthlyOrderAmount(monthlyOrderAmount)
                .nextDeliveryDate(nextDeliveryDate)
                .nextDeadline(nextDeadline)
                .build();
    }

    public DashboardDto.BrandDashboard getBrandDashboard(Long brandId) {
        List<Store> stores = storeRepository.findByBrandId(brandId);

        List<DashboardDto.StoreSummary> summaries = stores.stream()
                .map(store -> {
                    int lowStockCount = lowStockService.getLowStockItems(store.getId()).size();
                    int expiryAlertCount = (int) expiryAlertRepository.findByStoreId(store.getId()).stream()
                            .filter(a -> a.getAlertStatus() != AlertStatus.NORMAL)
                            .count();
                    return DashboardDto.StoreSummary.builder()
                            .storeId(store.getId())
                            .storeName(store.getName())
                            .lowStockCount(lowStockCount)
                            .expiryAlertCount(expiryAlertCount)
                            .monthOrderCost(BigDecimal.ZERO)
                            .build();
                })
                .toList();

        return DashboardDto.BrandDashboard.builder()
                .storeSummaries(summaries)
                .totalOrderCost(BigDecimal.ZERO)
                .build();
    }
}
