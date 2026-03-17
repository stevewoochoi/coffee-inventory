package com.coffee.domain.master.service;

import com.coffee.domain.master.dto.ItemDto;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.org.repository.BrandRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemExcelService {

    private final ItemRepository itemRepository;
    private final BrandRepository brandRepository;

    private static final String[] HEADERS = {
            "상품명*", "English Name", "日本語名", "한국어명",
            "상품코드", "카테고리", "기본단위*", "규격",
            "단가", "부가세포함(Y/N)", "로스율(%)", "최소재고수량",
            "공급업체ID", "설명"
    };

    private static final String[] SAMPLE_DATA_1 = {
            "에티오피아 예가체프", "Ethiopia Yirgacheffe", "エチオピア イルガチェフェ", "에티오피아 예가체프",
            "ETH-YRG-001", "원두", "g", "1kg",
            "25000", "Y", "2.0", "5000",
            "", "싱글오리진 스페셜티"
    };

    private static final String[] SAMPLE_DATA_2 = {
            "우유 1L", "Milk 1L", "牛乳 1L", "우유 1L",
            "MILK-001", "유제품", "EA", "1L 팩",
            "2500", "Y", "5.0", "20",
            "", "냉장 보관"
    };

    public byte[] generateSampleExcel() throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("상품 일괄등록");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 5000);
            }

            createSampleRow(sheet, 1, SAMPLE_DATA_1);
            createSampleRow(sheet, 2, SAMPLE_DATA_2);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void createSampleRow(Sheet sheet, int rowNum, String[] data) {
        Row row = sheet.createRow(rowNum);
        for (int i = 0; i < data.length; i++) {
            row.createCell(i).setCellValue(data[i]);
        }
    }

    @Transactional
    public BatchUploadResult batchUpload(Long brandId, MultipartFile file) throws IOException {
        if (brandId != null) {
            brandRepository.findById(brandId)
                    .orElseThrow(() -> new IllegalArgumentException("Brand not found: " + brandId));
        }

        List<ItemDto.Response> successItems = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();

            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isEmptyRow(row)) continue;

                try {
                    Item item = parseRow(row, brandId, i + 1);
                    Item saved = itemRepository.save(item);
                    successItems.add(toSimpleResponse(saved));
                } catch (Exception e) {
                    errors.add(RowError.builder()
                            .row(i + 1)
                            .message(e.getMessage())
                            .build());
                }
            }
        }

        return BatchUploadResult.builder()
                .totalRows(successItems.size() + errors.size())
                .successCount(successItems.size())
                .errorCount(errors.size())
                .items(successItems)
                .errors(errors)
                .build();
    }

    private Item parseRow(Row row, Long brandId, int rowNum) {
        String name = getStringValue(row, 0);
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("행 " + rowNum + ": 상품명은 필수입니다");
        }

        String nameEn = getStringValue(row, 1);
        String nameJa = getStringValue(row, 2);
        String nameKo = getStringValue(row, 3);

        String baseUnit = getStringValue(row, 6);
        if (baseUnit == null || baseUnit.isBlank()) {
            throw new IllegalArgumentException("행 " + rowNum + ": 기본단위는 필수입니다");
        }

        String itemCode = getStringValue(row, 4);
        String category = getStringValue(row, 5);
        String spec = getStringValue(row, 7);
        BigDecimal price = getNumericValue(row, 8);
        String vatStr = getStringValue(row, 9);
        boolean vatInclusive = vatStr == null || vatStr.isBlank() || vatStr.equalsIgnoreCase("Y");
        BigDecimal lossRate = getNumericValue(row, 10);
        if (lossRate != null) {
            lossRate = lossRate.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP);
        }
        BigDecimal minStockQty = getNumericValue(row, 11);
        Long supplierId = getLongValue(row, 12);
        String description = getStringValue(row, 13);

        return Item.builder()
                .brandId(brandId)
                .name(name)
                .nameEn(nameEn)
                .nameJa(nameJa)
                .nameKo(nameKo)
                .itemCode(itemCode)
                .category(category)
                .baseUnit(baseUnit)
                .spec(spec)
                .price(price)
                .vatInclusive(vatInclusive)
                .lossRate(lossRate != null ? lossRate : BigDecimal.ZERO)
                .minStockQty(minStockQty)
                .supplierId(supplierId)
                .description(description)
                .build();
    }

    private boolean isEmptyRow(Row row) {
        for (int i = 0; i < HEADERS.length; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getStringValue(row, i);
                if (val != null && !val.isBlank()) return false;
            }
        }
        return true;
    }

    private String getStringValue(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) {
                    yield String.valueOf((long) d);
                }
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private BigDecimal getNumericValue(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue());
            case STRING -> {
                String s = cell.getStringCellValue().trim();
                if (s.isEmpty()) yield null;
                try {
                    yield new BigDecimal(s);
                } catch (NumberFormatException e) {
                    yield null;
                }
            }
            default -> null;
        };
    }

    private Long getLongValue(Row row, int col) {
        BigDecimal val = getNumericValue(row, col);
        return val != null ? val.longValue() : null;
    }

    private ItemDto.Response toSimpleResponse(Item item) {
        return ItemDto.Response.builder()
                .id(item.getId())
                .brandId(item.getBrandId())
                .name(item.getName())
                .nameEn(item.getNameEn())
                .nameJa(item.getNameJa())
                .nameKo(item.getNameKo())
                .category(item.getCategory())
                .baseUnit(item.getBaseUnit())
                .lossRate(item.getLossRate())
                .price(item.getPrice())
                .vatInclusive(item.getVatInclusive())
                .itemCode(item.getItemCode())
                .spec(item.getSpec())
                .description(item.getDescription())
                .isActive(item.getIsActive())
                .createdAt(item.getCreatedAt())
                .build();
    }

    @Getter
    @Builder
    public static class BatchUploadResult {
        private int totalRows;
        private int successCount;
        private int errorCount;
        private List<ItemDto.Response> items;
        private List<RowError> errors;
    }

    @Getter
    @Builder
    public static class RowError {
        private int row;
        private String message;
    }
}
