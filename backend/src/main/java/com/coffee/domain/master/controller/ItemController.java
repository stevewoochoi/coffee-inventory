package com.coffee.domain.master.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.domain.master.dto.ItemDto;
import com.coffee.domain.master.dto.ItemOperationalRequest;
import com.coffee.domain.master.service.ItemExcelService;
import com.coffee.domain.master.service.ItemService;
import com.coffee.domain.upload.dto.UploadDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/master/items")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN')")
public class ItemController {

    private final ItemService itemService;
    private final ItemExcelService itemExcelService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ItemDto.Response>>> findAll(
            @RequestParam(required = false) Long brandId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.findAll(brandId, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemDto.Response>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ItemDto.Response>> create(@Valid @RequestBody ItemDto.Request request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(itemService.create(request), "Item created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemDto.Response>> update(
            @PathVariable Long id, @Valid @RequestBody ItemDto.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.update(id, request), "Item updated"));
    }

    @PutMapping("/{id}/min-stock")
    public ResponseEntity<ApiResponse<ItemDto.Response>> updateMinStock(
            @PathVariable Long id, @Valid @RequestBody ItemDto.MinStockRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.updateMinStock(id, request), "Min stock updated"));
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<ApiResponse<ItemDto.Response>> updateImage(
            @PathVariable Long id, @RequestBody UploadDto.ImageRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.updateImage(id, request.getImageUrl()), "Image updated"));
    }

    @PatchMapping("/{id}/operational")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'BRAND_ADMIN', 'KR_INVENTORY')")
    public ResponseEntity<ApiResponse<ItemDto.Response>> updateItemOperational(
            @PathVariable Long id,
            @RequestBody ItemOperationalRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.updateItemOperational(id, request), "Operational fields updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        itemService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Item deactivated"));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<ItemDto.Response>> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(itemService.toggleActive(id)));
    }

    @DeleteMapping("/batch")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> batchDelete(@RequestParam Long brandId) {
        int count = itemService.deleteAllByBrandId(brandId);
        return ResponseEntity.ok(ApiResponse.ok(count, count + " items deleted"));
    }

    @GetMapping("/excel/sample")
    public ResponseEntity<byte[]> downloadSampleExcel() throws Exception {
        byte[] bytes = itemExcelService.generateSampleExcel();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "item_upload_sample.xlsx");
        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    @PostMapping("/excel/upload")
    public ResponseEntity<ApiResponse<ItemExcelService.BatchUploadResult>> uploadExcel(
            @RequestParam Long brandId,
            @RequestPart("file") MultipartFile file) throws Exception {
        ItemExcelService.BatchUploadResult result = itemExcelService.batchUpload(brandId, file);
        String message = String.format("총 %d건 중 %d건 성공, %d건 실패",
                result.getTotalRows(), result.getSuccessCount(), result.getErrorCount());
        return ResponseEntity.ok(ApiResponse.ok(result, message));
    }
}
