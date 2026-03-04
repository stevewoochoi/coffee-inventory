package com.coffee.domain.finance.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.domain.finance.dto.FinanceDto;
import com.coffee.domain.finance.entity.MonthlyClosing;
import com.coffee.domain.finance.repository.MonthlyClosingRepository;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinanceService {

    private final StockLedgerRepository ledgerRepository;
    private final InventorySnapshotRepository snapshotRepository;
    private final MonthlyClosingRepository closingRepository;
    private final StoreRepository storeRepository;
    private final ItemRepository itemRepository;

    public FinanceDto.PurchaseSummary getPurchaseSummary(Long brandId, int year, int month) {
        List<Store> stores = storeRepository.findByBrandId(brandId);
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime to = from.plusMonths(1);

        BigDecimal total = BigDecimal.ZERO;
        for (Store store : stores) {
            List<Object[]> sums = ledgerRepository.sumQtyByStoreIdAndTypeSince(store.getId(), LedgerType.RECEIVE, from);
            for (Object[] row : sums) {
                BigDecimal qty = (BigDecimal) row[1];
                Long itemId = (Long) row[0];
                Item item = itemRepository.findById(itemId).orElse(null);
                if (item != null && item.getPrice() != null) {
                    total = total.add(item.getPrice().multiply(qty));
                }
            }
        }

        return FinanceDto.PurchaseSummary.builder()
                .year(year)
                .month(month)
                .totalPurchaseAmount(total)
                .bySupplier(Collections.emptyList())
                .build();
    }

    public FinanceDto.InventoryValuation getInventoryValuation(Long brandId) {
        List<Store> stores = storeRepository.findByBrandId(brandId);
        BigDecimal totalValue = BigDecimal.ZERO;
        List<FinanceDto.StoreValuation> storeVals = new ArrayList<>();

        for (Store store : stores) {
            List<InventorySnapshot> snapshots = snapshotRepository.findByStoreId(store.getId());
            BigDecimal storeValue = BigDecimal.ZERO;
            Set<Long> itemIds = new HashSet<>();

            for (InventorySnapshot snap : snapshots) {
                if (snap.getQtyBaseUnit().compareTo(BigDecimal.ZERO) > 0) {
                    Item item = itemRepository.findById(snap.getItemId()).orElse(null);
                    if (item != null && item.getPrice() != null) {
                        storeValue = storeValue.add(item.getPrice().multiply(snap.getQtyBaseUnit()));
                        itemIds.add(snap.getItemId());
                    }
                }
            }

            totalValue = totalValue.add(storeValue);
            storeVals.add(FinanceDto.StoreValuation.builder()
                    .storeId(store.getId())
                    .storeName(store.getName())
                    .valuationAmount(storeValue)
                    .itemCount(itemIds.size())
                    .build());
        }

        return FinanceDto.InventoryValuation.builder()
                .totalValue(totalValue)
                .byStore(storeVals)
                .build();
    }

    public FinanceDto.MonthlyReport getMonthlyReport(Long brandId, int year, int month) {
        List<Store> stores = storeRepository.findByBrandId(brandId);
        LocalDateTime from = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime to = from.plusMonths(1);

        BigDecimal purchases = BigDecimal.ZERO;
        BigDecimal sales = BigDecimal.ZERO;
        BigDecimal waste = BigDecimal.ZERO;

        for (Store store : stores) {
            List<Object[]> receives = ledgerRepository.sumQtyByStoreIdAndTypeSince(store.getId(), LedgerType.RECEIVE, from);
            for (Object[] row : receives) {
                BigDecimal qty = (BigDecimal) row[1];
                Long itemId = (Long) row[0];
                Item item = itemRepository.findById(itemId).orElse(null);
                if (item != null && item.getPrice() != null) {
                    purchases = purchases.add(item.getPrice().multiply(qty));
                }
            }

            List<Object[]> sells = ledgerRepository.sumQtyByStoreIdAndTypeSince(store.getId(), LedgerType.SELL, from);
            for (Object[] row : sells) {
                BigDecimal qty = (BigDecimal) row[1];
                Long itemId = (Long) row[0];
                Item item = itemRepository.findById(itemId).orElse(null);
                if (item != null && item.getPrice() != null) {
                    sales = sales.add(item.getPrice().multiply(qty));
                }
            }

            List<Object[]> wastes = ledgerRepository.sumQtyByStoreIdAndTypeSince(store.getId(), LedgerType.WASTE, from);
            for (Object[] row : wastes) {
                BigDecimal qty = (BigDecimal) row[1];
                Long itemId = (Long) row[0];
                Item item = itemRepository.findById(itemId).orElse(null);
                if (item != null && item.getPrice() != null) {
                    waste = waste.add(item.getPrice().multiply(qty));
                }
            }
        }

        return FinanceDto.MonthlyReport.builder()
                .year(year)
                .month(month)
                .openingInventory(BigDecimal.ZERO)
                .purchases(purchases)
                .sales(sales)
                .waste(waste)
                .closingInventory(BigDecimal.ZERO)
                .build();
    }

    @Transactional
    public FinanceDto.ClosingResponse executeMonthlyClosing(Long brandId, int year, int month, Long closedBy) {
        Optional<MonthlyClosing> existing = closingRepository.findByBrandIdAndClosingYearAndClosingMonth(brandId, year, month);
        if (existing.isPresent() && "CLOSED".equals(existing.get().getStatus())) {
            throw new BusinessException("Month already closed", HttpStatus.BAD_REQUEST);
        }

        FinanceDto.PurchaseSummary purchase = getPurchaseSummary(brandId, year, month);
        FinanceDto.InventoryValuation valuation = getInventoryValuation(brandId);

        MonthlyClosing closing = existing.orElse(MonthlyClosing.builder()
                .brandId(brandId)
                .closingYear(year)
                .closingMonth(month)
                .build());

        closing.setStatus("CLOSED");
        closing.setTotalPurchaseAmount(purchase.getTotalPurchaseAmount());
        closing.setTotalInventoryValue(valuation.getTotalValue());
        closing.setClosedBy(closedBy);
        closing.setClosedAt(LocalDateTime.now());
        closingRepository.save(closing);

        return FinanceDto.ClosingResponse.builder()
                .id(closing.getId())
                .brandId(brandId)
                .year(year)
                .month(month)
                .status("CLOSED")
                .totalPurchaseAmount(closing.getTotalPurchaseAmount())
                .totalSalesAmount(closing.getTotalSalesAmount())
                .totalInventoryValue(closing.getTotalInventoryValue())
                .closedAt(closing.getClosedAt())
                .build();
    }

    public List<FinanceDto.ClosingResponse> getClosingHistory(Long brandId) {
        return closingRepository.findByBrandIdOrderByClosingYearDescClosingMonthDesc(brandId).stream()
                .map(c -> FinanceDto.ClosingResponse.builder()
                        .id(c.getId())
                        .brandId(c.getBrandId())
                        .year(c.getClosingYear())
                        .month(c.getClosingMonth())
                        .status(c.getStatus())
                        .totalPurchaseAmount(c.getTotalPurchaseAmount())
                        .totalSalesAmount(c.getTotalSalesAmount())
                        .totalInventoryValue(c.getTotalInventoryValue())
                        .closedAt(c.getClosedAt())
                        .build())
                .toList();
    }
}
