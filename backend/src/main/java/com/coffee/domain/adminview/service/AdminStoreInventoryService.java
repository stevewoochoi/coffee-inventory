package com.coffee.domain.adminview.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.inventory.dto.ForecastDto;
import com.coffee.domain.inventory.entity.StockLedger;
import com.coffee.domain.inventory.repository.StockLedgerRepository;
import com.coffee.domain.inventory.service.ForecastService;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminStoreInventoryService {

    private final StoreRepository storeRepository;
    private final ForecastService forecastService;
    private final StockLedgerRepository ledgerRepository;

    @Transactional(readOnly = true)
    public List<Store> listStores(Long brandId) {
        // STORE type only — exclude WAREHOUSE
        return storeRepository.findByBrandIdAndStoreTypeAndStatus(brandId, "STORE", "ACTIVE");
    }

    private Store assertStoreAccess(Long storeId, Long brandId) {
        Store s = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Store", storeId));
        if (!s.getBrandId().equals(brandId)) {
            throw new BusinessException("Forbidden: store belongs to another brand", HttpStatus.FORBIDDEN);
        }
        if ("WAREHOUSE".equals(s.getStoreType())) {
            throw new BusinessException(
                    "이 API는 STORE 전용입니다. 창고는 /api/v1/admin/warehouses 사용",
                    HttpStatus.BAD_REQUEST);
        }
        return s;
    }

    @Transactional(readOnly = true)
    public ForecastDto.Response getInventory(Long storeId, Long brandId) {
        assertStoreAccess(storeId, brandId);
        return forecastService.getForecast(storeId, brandId);
    }

    @Transactional(readOnly = true)
    public Page<StockLedger> getLedger(Long storeId, Long brandId, Long itemId, Pageable pageable) {
        assertStoreAccess(storeId, brandId);
        if (itemId != null) {
            return ledgerRepository.findByStoreIdAndItemIdOrderByCreatedAtDesc(storeId, itemId, pageable);
        }
        return ledgerRepository.findByStoreIdOrderByCreatedAtDesc(storeId, pageable);
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(Long storeId, Long brandId) {
        Store store = assertStoreAccess(storeId, brandId);
        ForecastDto.Response forecast = forecastService.getForecast(storeId, brandId);

        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Inventory");
            String[] headers = {"품목ID", "품목명", "카테고리", "기준단위",
                    "현재고", "최소재고", "일일평균사용", "소진예상일",
                    "충족률(%)", "트렌드"};

            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = wb.createCellStyle();
            Font bold = wb.createFont(); bold.setBold(true);
            headerStyle.setFont(bold);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            int row = 1;
            if (forecast != null && forecast.getItems() != null) {
                for (ForecastDto.ItemForecast item : forecast.getItems()) {
                    Row r = sheet.createRow(row++);
                    r.createCell(0).setCellValue(item.getItemId() != null ? item.getItemId() : 0);
                    r.createCell(1).setCellValue(item.getItemName() != null ? item.getItemName() : "");
                    r.createCell(2).setCellValue(item.getCategory() != null ? item.getCategory() : "");
                    r.createCell(3).setCellValue(item.getBaseUnit() != null ? item.getBaseUnit() : "");
                    r.createCell(4).setCellValue(item.getCurrentStock() != null ? item.getCurrentStock().doubleValue() : 0);
                    r.createCell(5).setCellValue(item.getMinStock() != null ? item.getMinStock().doubleValue() : 0);
                    r.createCell(6).setCellValue(item.getAvgDailyUsage() != null ? item.getAvgDailyUsage().doubleValue() : 0);
                    r.createCell(7).setCellValue(item.getDaysUntilEmpty() != null ? item.getDaysUntilEmpty().doubleValue() : 0);
                    r.createCell(8).setCellValue(item.getFillPercentage() != null ? item.getFillPercentage().doubleValue() : 0);
                    r.createCell(9).setCellValue(item.getTrend() != null ? item.getTrend() : "");
                }
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("Excel 생성 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
