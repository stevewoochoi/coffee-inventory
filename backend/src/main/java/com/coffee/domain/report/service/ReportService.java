package com.coffee.domain.report.service;

import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.ordering.entity.OrderStatus;
import com.coffee.domain.ordering.repository.OrderLineRepository;
import com.coffee.domain.ordering.repository.OrderPlanRepository;
import com.coffee.domain.report.dto.ReportDto;
import com.coffee.domain.waste.entity.Waste;
import com.coffee.domain.waste.repository.WasteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final StockLedgerRepository stockLedgerRepository;
    private final WasteRepository wasteRepository;
    private final ItemRepository itemRepository;
    private final OrderPlanRepository orderPlanRepository;
    private final OrderLineRepository orderLineRepository;
    private final SupplierItemRepository supplierItemRepository;
    private final PackagingRepository packagingRepository;

    public ReportDto.ConsumptionReport getConsumptionReport(Long storeId, LocalDate from, LocalDate to) {
        LocalDateTime since = from.atStartOfDay();
        List<Object[]> sellData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.SELL, since);
        if (sellData == null) sellData = Collections.emptyList();

        List<ReportDto.ItemConsumption> items = sellData.stream()
                .map(row -> {
                    Long itemId = (Long) row[0];
                    BigDecimal qty = (BigDecimal) row[1];
                    String itemName = itemRepository.findById(itemId)
                            .map(Item::getName).orElse("Unknown");
                    return ReportDto.ItemConsumption.builder()
                            .itemId(itemId)
                            .itemName(itemName)
                            .totalQty(qty)
                            .build();
                })
                .toList();

        BigDecimal totalQty = items.stream()
                .map(ReportDto.ItemConsumption::getTotalQty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReportDto.ConsumptionReport.builder()
                .storeId(storeId)
                .from(from)
                .to(to)
                .items(items)
                .totalQty(totalQty)
                .build();
    }

    public ReportDto.WasteReport getWasteReport(Long storeId, LocalDate from, LocalDate to) {
        List<Waste> allWastes = wasteRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        List<Waste> wastes = (allWastes != null ? allWastes : List.<Waste>of()).stream()
                .filter(w -> w.getCreatedAt() != null)
                .filter(w -> {
                    LocalDate d = w.getCreatedAt().toLocalDate();
                    return !d.isBefore(from) && !d.isAfter(to);
                })
                .toList();

        Map<Long, List<Waste>> byItem = wastes.stream()
                .collect(Collectors.groupingBy(Waste::getItemId));

        List<ReportDto.ItemWaste> items = byItem.entrySet().stream()
                .map(entry -> {
                    Long itemId = entry.getKey();
                    List<Waste> itemWastes = entry.getValue();
                    BigDecimal totalQty = itemWastes.stream()
                            .map(w -> w.getQtyBaseUnit() != null ? w.getQtyBaseUnit() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    String topReason = itemWastes.stream()
                            .filter(w -> w.getReason() != null)
                            .collect(Collectors.groupingBy(Waste::getReason, Collectors.counting()))
                            .entrySet().stream()
                            .max(Map.Entry.comparingByValue())
                            .map(Map.Entry::getKey)
                            .orElse(null);
                    String itemName = itemRepository.findById(itemId)
                            .map(Item::getName).orElse("Unknown");
                    return ReportDto.ItemWaste.builder()
                            .itemId(itemId)
                            .itemName(itemName)
                            .totalQty(totalQty)
                            .topReason(topReason)
                            .build();
                })
                .toList();

        BigDecimal totalQty = items.stream()
                .map(ReportDto.ItemWaste::getTotalQty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReportDto.WasteReport.builder()
                .storeId(storeId)
                .from(from)
                .to(to)
                .items(items)
                .totalQty(totalQty)
                .build();
    }

    public ReportDto.OrderCostReport getOrderCostReport(Long storeId, String month) {
        YearMonth ym = YearMonth.parse(month, DateTimeFormatter.ofPattern("yyyy-MM"));
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.atEndOfMonth().atTime(23, 59, 59);

        List<OrderPlan> plans = orderPlanRepository.findByStoreIdAndStatusInAndCreatedAtBetween(
                storeId, List.of(OrderStatus.CONFIRMED, OrderStatus.DISPATCHED), from, to);
        if (plans == null) plans = Collections.emptyList();

        // Aggregate: key = packagingId, value = total packQty
        Map<Long, Integer> packQtyByPackaging = new HashMap<>();
        Map<Long, Long> supplierByPackaging = new HashMap<>();

        for (OrderPlan plan : plans) {
            List<OrderLine> lines = orderLineRepository.findByOrderPlanId(plan.getId());
            if (lines == null) lines = Collections.emptyList();
            for (OrderLine line : lines) {
                packQtyByPackaging.merge(line.getPackagingId(), line.getPackQty(), Integer::sum);
                supplierByPackaging.putIfAbsent(line.getPackagingId(), plan.getSupplierId());
            }
        }

        List<ReportDto.OrderCostLine> costLines = packQtyByPackaging.entrySet().stream()
                .map(entry -> {
                    Long packagingId = entry.getKey();
                    int totalPackQty = entry.getValue();
                    Long supplierId = supplierByPackaging.get(packagingId);

                    BigDecimal price = supplierItemRepository
                            .findBySupplierIdAndPackagingId(supplierId, packagingId)
                            .map(SupplierItem::getPrice)
                            .orElse(BigDecimal.ZERO);

                    Packaging packaging = packagingRepository.findById(packagingId).orElse(null);
                    String packName = packaging != null ? packaging.getPackName() : "Unknown";
                    Long itemId = packaging != null ? packaging.getItemId() : 0L;
                    Item itemRef = itemRepository.findById(itemId).orElse(null);
                    String itemName = itemRef != null ? itemRef.getName() : "Unknown";
                    String currency = itemRef != null && itemRef.getCurrency() != null ? itemRef.getCurrency() : "JPY";

                    BigDecimal lineCost = price.multiply(BigDecimal.valueOf(totalPackQty));

                    return ReportDto.OrderCostLine.builder()
                            .itemId(itemId)
                            .itemName(itemName)
                            .packName(packName)
                            .totalPackQty(totalPackQty)
                            .unitPrice(price)
                            .lineCost(lineCost)
                            .currency(currency)
                            .build();
                })
                .sorted(Comparator.comparing(ReportDto.OrderCostLine::getLineCost).reversed())
                .toList();

        BigDecimal totalCost = costLines.stream()
                .map(ReportDto.OrderCostLine::getLineCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String reportCurrency = costLines.stream()
                .map(ReportDto.OrderCostLine::getCurrency)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse("JPY");

        return ReportDto.OrderCostReport.builder()
                .storeId(storeId)
                .month(month)
                .lines(costLines)
                .totalCost(totalCost)
                .totalOrders(plans.size())
                .currency(reportCurrency)
                .build();
    }

    public ReportDto.LossRateReport getLossRateReport(Long storeId) {
        LocalDateTime sixMonthsAgo = LocalDate.now().minusMonths(6).atStartOfDay();

        List<Object[]> receiveData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.RECEIVE, sixMonthsAgo);
        if (receiveData == null) receiveData = Collections.emptyList();
        List<Object[]> wasteData = stockLedgerRepository.sumQtyByStoreIdAndTypeSince(
                storeId, LedgerType.WASTE, sixMonthsAgo);
        if (wasteData == null) wasteData = Collections.emptyList();

        Map<Long, BigDecimal> receiveMap = receiveData.stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> r[1] != null ? (BigDecimal) r[1] : BigDecimal.ZERO));
        Map<Long, BigDecimal> wasteMap = wasteData.stream()
                .collect(Collectors.toMap(r -> (Long) r[0], r -> r[1] != null ? (BigDecimal) r[1] : BigDecimal.ZERO));

        List<ReportDto.ItemLossRate> items = receiveMap.entrySet().stream()
                .map(entry -> {
                    Long itemId = entry.getKey();
                    BigDecimal received = entry.getValue();
                    BigDecimal wasted = wasteMap.getOrDefault(itemId, BigDecimal.ZERO);
                    BigDecimal rate = received.compareTo(BigDecimal.ZERO) > 0
                            ? wasted.divide(received, 4, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    String itemName = itemRepository.findById(itemId)
                            .map(Item::getName).orElse("Unknown");
                    return ReportDto.ItemLossRate.builder()
                            .itemId(itemId)
                            .itemName(itemName)
                            .receivedQty(received)
                            .wastedQty(wasted)
                            .lossRate(rate)
                            .build();
                })
                .toList();

        return ReportDto.LossRateReport.builder()
                .storeId(storeId)
                .items(items)
                .build();
    }
}
