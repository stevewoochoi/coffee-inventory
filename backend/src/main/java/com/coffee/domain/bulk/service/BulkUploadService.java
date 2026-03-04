package com.coffee.domain.bulk.service;

import com.coffee.common.exception.BusinessException;
import com.coffee.common.exception.ResourceNotFoundException;
import com.coffee.domain.bulk.dto.BulkUploadDto;
import com.coffee.domain.bulk.entity.BulkUploadBatch;
import com.coffee.domain.bulk.repository.BulkUploadBatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BulkUploadService {

    private final BulkUploadBatchRepository batchRepository;

    public byte[] generateTemplate(String type) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Data");
            Row headerRow = sheet.createRow(0);

            String[] headers = switch (type) {
                case "ITEM_MASTER" -> new String[]{"상품코드", "상품명", "대분류", "중분류", "소분류",
                        "기본단위", "규격", "포장명", "포장수량", "발주단위", "바코드",
                        "공급사", "공급가", "월", "화", "수", "목", "금", "토",
                        "리드타임", "최대주문수량", "온도대"};
                case "INVENTORY_INIT" -> new String[]{"매장명", "상품코드", "현재수량", "유통기한", "LOT번호"};
                case "PURCHASE_IMPORT" -> new String[]{"매입일", "거래처", "상품코드", "품목명",
                        "규격", "입수량", "수량", "공급가", "부가세", "입고일"};
                default -> new String[]{"Column1"};
            };

            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 4000);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Transactional
    public BulkUploadDto.UploadResult upload(MultipartFile file, String type, Long userId) throws IOException {
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);

        int totalRows = sheet.getLastRowNum(); // Excluding header
        List<BulkUploadDto.RowError> errors = new ArrayList<>();
        int validCount = 0;

        for (int i = 1; i <= totalRows; i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            // Basic validation - check first cell is not empty
            Cell firstCell = row.getCell(0);
            if (firstCell == null || firstCell.toString().trim().isEmpty()) {
                errors.add(BulkUploadDto.RowError.builder()
                        .row(i)
                        .column("A")
                        .message("필수 항목이 비어있습니다")
                        .build());
            } else {
                validCount++;
            }
        }

        workbook.close();

        BulkUploadBatch batch = BulkUploadBatch.builder()
                .uploadType(type)
                .fileName(file.getOriginalFilename())
                .status("VALIDATED")
                .totalRows(totalRows)
                .successCount(validCount)
                .failCount(errors.size())
                .uploadedBy(userId)
                .build();
        batchRepository.save(batch);

        return BulkUploadDto.UploadResult.builder()
                .batchId(batch.getId())
                .totalRows(totalRows)
                .validRows(validCount)
                .errorRows(errors.size())
                .errors(errors)
                .build();
    }

    @Transactional
    public void confirm(Long batchId, Long userId) {
        BulkUploadBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch", batchId));

        if (!"VALIDATED".equals(batch.getStatus())) {
            throw new BusinessException("Batch is not in VALIDATED status", HttpStatus.BAD_REQUEST);
        }

        batch.setStatus("CONFIRMED");
        batch.setConfirmedBy(userId);
        batch.setConfirmedAt(LocalDateTime.now());
        batchRepository.save(batch);
    }

    public List<BulkUploadDto.BatchResponse> getHistory() {
        return batchRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(b -> BulkUploadDto.BatchResponse.builder()
                        .id(b.getId())
                        .uploadType(b.getUploadType())
                        .fileName(b.getFileName())
                        .status(b.getStatus())
                        .totalRows(b.getTotalRows())
                        .successCount(b.getSuccessCount())
                        .failCount(b.getFailCount())
                        .createdAt(b.getCreatedAt())
                        .confirmedAt(b.getConfirmedAt())
                        .build())
                .toList();
    }
}
