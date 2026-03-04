package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.bulk.entity.BulkUploadBatch;
import com.coffee.domain.bulk.repository.BulkUploadBatchRepository;
import com.coffee.domain.finance.entity.MonthlyClosing;
import com.coffee.domain.finance.repository.MonthlyClosingRepository;
import com.coffee.domain.inventory.entity.InventorySnapshot;
import com.coffee.domain.inventory.repository.InventorySnapshotRepository;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.entity.SupplierItem;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.master.repository.SupplierItemRepository;
import com.coffee.domain.master.repository.SupplierRepository;
import com.coffee.domain.ordering.entity.*;
import com.coffee.domain.ordering.repository.*;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class V6Backend2Test {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;

    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private OrderPlanRepository planRepository;
    @Autowired private OrderLineRepository lineRepository;
    @Autowired private OrderShortageLogRepository shortageLogRepository;
    @Autowired private SupplierOrderNotificationRepository notificationRepository;
    @Autowired private InventorySnapshotRepository snapshotRepository;
    @Autowired private MonthlyClosingRepository closingRepository;
    @Autowired private BulkUploadBatchRepository batchRepository;

    private Long companyId;
    private Long brandId;
    private Long storeId;
    private Long supplierId;
    private Long itemId;
    private Long packagingId;

    private String brandAdminToken;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        companyId = company.getId();
        Brand brand = brandRepository.save(Brand.builder().companyId(companyId).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("Store").build());
        storeId = store.getId();

        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("Coffee Bean").baseUnit("g")
                .price(new BigDecimal("15")).build());
        itemId = item.getId();

        Packaging packaging = packagingRepository.save(Packaging.builder()
                .itemId(itemId).packName("1kg Pack")
                .unitsPerPack(new BigDecimal("1000")).build());
        packagingId = packaging.getId();

        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brandId).name("Supplier A").email("s@t.com").build());
        supplierId = supplier.getId();

        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplierId).packagingId(packagingId)
                .leadTimeDays(2).price(new BigDecimal("10000")).build());

        brandAdminToken = jwtUtil.generateAccessToken(1L, "admin@test.com", "BRAND_ADMIN",
                companyId, brandId, null);
    }

    private String tokenFor(String role) {
        return jwtUtil.generateAccessToken(1L, "test@coffee.com", role, companyId, brandId, storeId);
    }

    // =========================================================================
    // T-24: Migration verification
    // =========================================================================

    @Nested
    @DisplayName("T-24: 마이그레이션 검증")
    class MigrationVerificationTest {

        @Test
        @DisplayName("애플리케이션 컨텍스트 로드 성공")
        void contextLoads() {
            // If we get here, context loaded successfully
            assertThat(mockMvc).isNotNull();
        }

        @Test
        @DisplayName("order_shortage_log 테이블 존재 확인")
        void orderShortageLogTableExists() {
            OrderShortageLog log = shortageLogRepository.save(OrderShortageLog.builder()
                    .orderPlanId(1L).orderLineId(1L)
                    .originalQty(10).adjustedQty(5)
                    .shortageReason("test").adjustedBy(1L)
                    .build());
            assertThat(log.getId()).isNotNull();
        }

        @Test
        @DisplayName("bulk_upload_batch 테이블 존재 확인")
        void bulkUploadBatchTableExists() {
            BulkUploadBatch batch = batchRepository.save(BulkUploadBatch.builder()
                    .uploadType("ITEM_MASTER").fileName("test.xlsx")
                    .uploadedBy(1L).build());
            assertThat(batch.getId()).isNotNull();
        }

        @Test
        @DisplayName("monthly_closing 테이블 존재 확인")
        void monthlyClosingTableExists() {
            MonthlyClosing closing = closingRepository.save(MonthlyClosing.builder()
                    .brandId(brandId).closingYear(2026).closingMonth(1).build());
            assertThat(closing.getId()).isNotNull();
        }

        @Test
        @DisplayName("supplier_order_notification 테이블 존재 확인")
        void supplierOrderNotificationTableExists() {
            // Need an OrderPlan first
            OrderPlan plan = planRepository.save(OrderPlan.builder()
                    .storeId(storeId).supplierId(supplierId)
                    .status(OrderStatus.DISPATCHED)
                    .totalAmount(BigDecimal.ZERO).build());

            SupplierOrderNotification notification = notificationRepository.save(
                    SupplierOrderNotification.builder()
                            .orderPlanId(plan.getId()).supplierId(supplierId)
                            .notificationType("ORDER_RECEIVED").message("Test")
                            .notifiedBy(1L).build());
            assertThat(notification.getId()).isNotNull();
        }

        @Test
        @DisplayName("OrderStatus에 CUTOFF_CLOSED 포함 확인")
        void orderStatusHasCutoffClosed() {
            OrderStatus status = OrderStatus.valueOf("CUTOFF_CLOSED");
            assertThat(status).isEqualTo(OrderStatus.CUTOFF_CLOSED);
        }
    }

    // =========================================================================
    // T-25: Cutoff management tests
    // =========================================================================

    @Nested
    @DisplayName("T-25: 마감 고도화 통합 테스트")
    class CutoffManagementTest {

        private LocalDate deliveryDate;

        @BeforeEach
        void setupOrders() {
            deliveryDate = LocalDate.now().plusDays(3);

            // Create CONFIRMED orders for the delivery date
            OrderPlan plan1 = planRepository.save(OrderPlan.builder()
                    .storeId(storeId).supplierId(supplierId)
                    .status(OrderStatus.CONFIRMED)
                    .deliveryDate(deliveryDate)
                    .totalAmount(new BigDecimal("50000"))
                    .build());
            lineRepository.save(OrderLine.builder()
                    .orderPlanId(plan1.getId()).packagingId(packagingId).packQty(5).build());
        }

        @Test
        @DisplayName("마감 실행 - CONFIRMED → CUTOFF_CLOSED")
        void executeCutoff_changesStatusToCutoffClosed() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));

            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.cutoffCount").value(1))
                    .andExpect(jsonPath("$.data.deliveryDate").value(deliveryDate.toString()));

            // Verify status changed
            var plans = planRepository.findByDeliveryDateAndStatus(deliveryDate, OrderStatus.CUTOFF_CLOSED);
            assertThat(plans).hasSize(1);
        }

        @Test
        @DisplayName("쇼트 체크 - 재고 부족 감지")
        void shortageCheck_detectsShortage() throws Exception {
            // Execute cutoff first
            String cutoffBody = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));
            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cutoffBody))
                    .andExpect(status().isOk());

            // Add minimal inventory (less than ordered)
            snapshotRepository.save(InventorySnapshot.builder()
                    .storeId(storeId).itemId(itemId)
                    .qtyBaseUnit(new BigDecimal("1000")).build()); // 1000g, but ordered 5 packs = 5000g

            mockMvc.perform(get("/api/v1/admin/ordering/shortage-check")
                            .param("deliveryDate", deliveryDate.toString())
                            .param("brandId", brandId.toString())
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.deliveryDate").value(deliveryDate.toString()))
                    .andExpect(jsonPath("$.data.shortageItems").isArray());
        }

        @Test
        @DisplayName("수량 감량 조정 + shortage_log 기록")
        void adjustOrderLine_createsShortageLog() throws Exception {
            // Get the plan and line
            var plans = planRepository.findByDeliveryDateAndStatus(deliveryDate, OrderStatus.CONFIRMED);
            assertThat(plans).isNotEmpty();
            Long planId = plans.get(0).getId();
            var lines = lineRepository.findByOrderPlanId(planId);
            assertThat(lines).isNotEmpty();
            Long lineId = lines.get(0).getId();

            // First execute cutoff
            String cutoffBody = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));
            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cutoffBody))
                    .andExpect(status().isOk());

            String body = objectMapper.writeValueAsString(Map.of(
                    "adjustedQty", 3,
                    "reason", "재고 부족으로 감량"));

            mockMvc.perform(put("/api/v1/admin/ordering/plans/" + planId + "/lines/" + lineId + "/adjust")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            // Verify shortage log was created
            var logs = shortageLogRepository.findByOrderPlanId(planId);
            assertThat(logs).hasSize(1);
            assertThat(logs.get(0).getOriginalQty()).isEqualTo(5);
            assertThat(logs.get(0).getAdjustedQty()).isEqualTo(3);

            // Verify line qty was updated
            OrderLine updatedLine = lineRepository.findById(lineId).orElseThrow();
            assertThat(updatedLine.getPackQty()).isEqualTo(3);
        }

        @Test
        @DisplayName("일괄 전송 - CUTOFF_CLOSED → DISPATCHED")
        void dispatchAll_changesStatusToDispatched() throws Exception {
            // First execute cutoff
            String cutoffBody = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));
            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cutoffBody))
                    .andExpect(status().isOk());

            // Dispatch all
            mockMvc.perform(post("/api/v1/admin/ordering/dispatch-all")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cutoffBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.dispatchedCount").value(1));

            // Verify status changed to DISPATCHED
            var dispatched = planRepository.findByDeliveryDateAndStatus(deliveryDate, OrderStatus.DISPATCHED);
            assertThat(dispatched).hasSize(1);
            assertThat(dispatched.get(0).getDispatchedAt()).isNotNull();
        }
    }

    // =========================================================================
    // T-26: Role-based access control tests
    // =========================================================================

    @Nested
    @DisplayName("T-26: 역할 접근 제어 테스트")
    class RoleBasedAccessControlTest {

        private LocalDate deliveryDate;

        @BeforeEach
        void setupPlan() {
            deliveryDate = LocalDate.now().plusDays(3);
            planRepository.save(OrderPlan.builder()
                    .storeId(storeId).supplierId(supplierId)
                    .status(OrderStatus.CONFIRMED)
                    .deliveryDate(deliveryDate)
                    .totalAmount(BigDecimal.ZERO).build());
        }

        @Test
        @DisplayName("KR_INVENTORY - 마감 실행 접근 성공")
        void krInventory_canAccessCutoff() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));

            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + tokenFor("KR_INVENTORY"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("KR_INVENTORY - 재무 조회 접근 거부 (403)")
        void krInventory_cannotAccessFinance() throws Exception {
            mockMvc.perform(get("/api/v1/finance/purchase-summary")
                            .param("brandId", brandId.toString())
                            .param("year", "2026")
                            .param("month", "1")
                            .header("Authorization", "Bearer " + tokenFor("KR_INVENTORY")))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("KR_FINANCE - 재무 조회 접근 성공")
        void krFinance_canAccessFinance() throws Exception {
            mockMvc.perform(get("/api/v1/finance/purchase-summary")
                            .param("brandId", brandId.toString())
                            .param("year", "2026")
                            .param("month", "1")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("KR_FINANCE - 마감 실행 접근 거부 (403)")
        void krFinance_cannotAccessCutoff() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));

            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("JP_ORDERER - 발주 조회 접근 성공")
        void jpOrderer_canAccessOrdering() throws Exception {
            mockMvc.perform(get("/api/v1/ordering/plans")
                            .param("storeId", storeId.toString())
                            .header("Authorization", "Bearer " + tokenFor("JP_ORDERER")))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("JP_ORDERER - 마감 실행 접근 거부 (403)")
        void jpOrderer_cannotAccessCutoff() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));

            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + tokenFor("JP_ORDERER"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("FULFILLMENT - 수주 포탈 접근 성공")
        void fulfillment_canAccessSupplierPortal() throws Exception {
            mockMvc.perform(get("/api/v1/supplier-portal/orders")
                            .param("supplierId", supplierId.toString())
                            .header("Authorization", "Bearer " + tokenFor("FULFILLMENT")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("FULFILLMENT - 재무 조회 접근 거부 (403)")
        void fulfillment_cannotAccessFinance() throws Exception {
            mockMvc.perform(get("/api/v1/finance/purchase-summary")
                            .param("brandId", brandId.toString())
                            .param("year", "2026")
                            .param("month", "1")
                            .header("Authorization", "Bearer " + tokenFor("FULFILLMENT")))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("BRAND_ADMIN - 전체 접근 성공")
        void brandAdmin_canAccessAll() throws Exception {
            // Cutoff
            String cutoffBody = objectMapper.writeValueAsString(Map.of(
                    "deliveryDate", deliveryDate.toString()));
            mockMvc.perform(post("/api/v1/admin/ordering/cutoff")
                            .header("Authorization", "Bearer " + brandAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cutoffBody))
                    .andExpect(status().isOk());

            // Finance
            mockMvc.perform(get("/api/v1/finance/purchase-summary")
                            .param("brandId", brandId.toString())
                            .param("year", "2026")
                            .param("month", "1")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk());

            // Supplier Portal
            mockMvc.perform(get("/api/v1/supplier-portal/orders")
                            .param("supplierId", supplierId.toString())
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk());
        }
    }

    // =========================================================================
    // T-27: Supplier notification tests
    // =========================================================================

    @Nested
    @DisplayName("T-27: 수주 알림 테스트")
    class SupplierNotificationTest {

        private Long orderPlanId;

        @BeforeEach
        void setupDispatchedOrder() {
            OrderPlan plan = planRepository.save(OrderPlan.builder()
                    .storeId(storeId).supplierId(supplierId)
                    .status(OrderStatus.DISPATCHED)
                    .fulfillmentStatus("PENDING")
                    .totalAmount(new BigDecimal("50000"))
                    .build());
            orderPlanId = plan.getId();
        }

        @Test
        @DisplayName("알림 전송 - ORDER_RECEIVED")
        void sendNotification_orderReceived() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "notificationType", "ORDER_RECEIVED",
                    "message", "주문을 확인했습니다"));

            mockMvc.perform(post("/api/v1/supplier-portal/orders/" + orderPlanId + "/notify")
                            .param("supplierId", supplierId.toString())
                            .header("Authorization", "Bearer " + tokenFor("FULFILLMENT"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.orderPlanId").value(orderPlanId))
                    .andExpect(jsonPath("$.data.notificationType").value("ORDER_RECEIVED"));

            // Verify notification saved in DB
            var notifications = notificationRepository.findByOrderPlanIdOrderByCreatedAtDesc(orderPlanId);
            assertThat(notifications).hasSize(1);
            assertThat(notifications.get(0).getNotificationType()).isEqualTo("ORDER_RECEIVED");

            // Verify fulfillment status updated
            OrderPlan updated = planRepository.findById(orderPlanId).orElseThrow();
            assertThat(updated.getFulfillmentStatus()).isEqualTo("PREPARING");
        }

        @Test
        @DisplayName("알림 전송 - SHIPPED → fulfillmentStatus SHIPPING")
        void sendNotification_shipped() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "notificationType", "SHIPPED",
                    "message", "배송 시작"));

            mockMvc.perform(post("/api/v1/supplier-portal/orders/" + orderPlanId + "/notify")
                            .param("supplierId", supplierId.toString())
                            .header("Authorization", "Bearer " + tokenFor("FULFILLMENT"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.notificationType").value("SHIPPED"));

            OrderPlan updated = planRepository.findById(orderPlanId).orElseThrow();
            assertThat(updated.getFulfillmentStatus()).isEqualTo("SHIPPING");
        }

        @Test
        @DisplayName("알림 이력 조회")
        void getNotifications_returnsList() throws Exception {
            // Create some notifications
            notificationRepository.save(SupplierOrderNotification.builder()
                    .orderPlanId(orderPlanId).supplierId(supplierId)
                    .notificationType("ORDER_RECEIVED").message("msg1").notifiedBy(1L).build());
            notificationRepository.save(SupplierOrderNotification.builder()
                    .orderPlanId(orderPlanId).supplierId(supplierId)
                    .notificationType("SHIPPED").message("msg2").notifiedBy(1L).build());

            mockMvc.perform(get("/api/v1/supplier-portal/orders/" + orderPlanId + "/notifications")
                            .header("Authorization", "Bearer " + tokenFor("FULFILLMENT")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(2)));
        }

        @Test
        @DisplayName("수주 포탈 - 주문 목록 조회")
        void getSupplierOrders() throws Exception {
            mockMvc.perform(get("/api/v1/supplier-portal/orders")
                            .param("supplierId", supplierId.toString())
                            .param("status", "DISPATCHED")
                            .header("Authorization", "Bearer " + tokenFor("FULFILLMENT")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].orderPlanId").value(orderPlanId))
                    .andExpect(jsonPath("$.data[0].status").value("DISPATCHED"));
        }
    }

    // =========================================================================
    // T-28: Finance API tests
    // =========================================================================

    @Nested
    @DisplayName("T-28: 재무 API 테스트")
    class FinanceApiTest {

        @Test
        @DisplayName("매입 요약 조회")
        void getPurchaseSummary() throws Exception {
            mockMvc.perform(get("/api/v1/finance/purchase-summary")
                            .param("brandId", brandId.toString())
                            .param("year", "2026")
                            .param("month", "3")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.year").value(2026))
                    .andExpect(jsonPath("$.data.month").value(3))
                    .andExpect(jsonPath("$.data.totalPurchaseAmount").isNumber());
        }

        @Test
        @DisplayName("재고 평가 조회")
        void getInventoryValuation() throws Exception {
            // Add some inventory
            snapshotRepository.save(InventorySnapshot.builder()
                    .storeId(storeId).itemId(itemId)
                    .qtyBaseUnit(new BigDecimal("5000")).build());

            mockMvc.perform(get("/api/v1/finance/inventory-valuation")
                            .param("brandId", brandId.toString())
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.totalValue").isNumber())
                    .andExpect(jsonPath("$.data.byStore").isArray());
        }

        @Test
        @DisplayName("월간 리포트 조회")
        void getMonthlyReport() throws Exception {
            mockMvc.perform(get("/api/v1/finance/monthly-report")
                            .param("brandId", brandId.toString())
                            .param("year", "2026")
                            .param("month", "3")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.year").value(2026))
                    .andExpect(jsonPath("$.data.month").value(3));
        }

        @Test
        @DisplayName("월마감 실행")
        void executeMonthlyClosing() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "brandId", brandId,
                    "year", 2026,
                    "month", 1));

            mockMvc.perform(post("/api/v1/finance/monthly-closing")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("CLOSED"))
                    .andExpect(jsonPath("$.data.year").value(2026))
                    .andExpect(jsonPath("$.data.month").value(1));

            // Verify in DB
            var closing = closingRepository.findByBrandIdAndClosingYearAndClosingMonth(brandId, 2026, 1);
            assertThat(closing).isPresent();
            assertThat(closing.get().getStatus()).isEqualTo("CLOSED");
        }

        @Test
        @DisplayName("월마감 후 해당 월 재마감 불가 (400)")
        void doubleClosing_fails() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "brandId", brandId,
                    "year", 2026,
                    "month", 2));

            // First closing
            mockMvc.perform(post("/api/v1/finance/monthly-closing")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());

            // Second closing → 400
            mockMvc.perform(post("/api/v1/finance/monthly-closing")
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("마감 이력 조회")
        void getClosingHistory() throws Exception {
            closingRepository.save(MonthlyClosing.builder()
                    .brandId(brandId).closingYear(2026).closingMonth(1)
                    .status("CLOSED").closedBy(1L).build());

            mockMvc.perform(get("/api/v1/finance/closing-history")
                            .param("brandId", brandId.toString())
                            .header("Authorization", "Bearer " + tokenFor("KR_FINANCE")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)));
        }
    }

    // =========================================================================
    // T-29: Bulk upload tests
    // =========================================================================

    @Nested
    @DisplayName("T-29: 벌크 업로드 테스트")
    class BulkUploadTest {

        @Test
        @DisplayName("템플릿 다운로드 - ITEM_MASTER")
        void downloadTemplate_itemMaster() throws Exception {
            mockMvc.perform(get("/api/v1/admin/bulk/template")
                            .param("type", "ITEM_MASTER")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", containsString("template_item_master.xlsx")));
        }

        @Test
        @DisplayName("템플릿 다운로드 - INVENTORY_INIT")
        void downloadTemplate_inventoryInit() throws Exception {
            mockMvc.perform(get("/api/v1/admin/bulk/template")
                            .param("type", "INVENTORY_INIT")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", containsString("template_inventory_init.xlsx")));
        }

        @Test
        @DisplayName("정상 파일 업로드 → 검증 통과")
        void upload_validFile() throws Exception {
            byte[] excelBytes = createTestExcel(new String[]{"CODE001", "Coffee Bean"},
                    new String[]{"CODE002", "Green Tea"});

            MockMultipartFile file = new MockMultipartFile(
                    "file", "test.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    excelBytes);

            mockMvc.perform(multipart("/api/v1/admin/bulk/upload")
                            .file(file)
                            .param("type", "ITEM_MASTER")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.batchId").isNumber())
                    .andExpect(jsonPath("$.data.totalRows").value(2))
                    .andExpect(jsonPath("$.data.validRows").value(2))
                    .andExpect(jsonPath("$.data.errorRows").value(0));
        }

        @Test
        @DisplayName("에러 데이터 → 행별 에러 반환")
        void upload_invalidFile_returnsErrors() throws Exception {
            byte[] excelBytes = createTestExcelWithErrors();

            MockMultipartFile file = new MockMultipartFile(
                    "file", "test_error.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    excelBytes);

            mockMvc.perform(multipart("/api/v1/admin/bulk/upload")
                            .file(file)
                            .param("type", "ITEM_MASTER")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.errorRows").value(greaterThan(0)))
                    .andExpect(jsonPath("$.data.errors").isArray())
                    .andExpect(jsonPath("$.data.errors", hasSize(greaterThan(0))));
        }

        @Test
        @DisplayName("배치 확정")
        void confirmBatch() throws Exception {
            // Create a validated batch
            BulkUploadBatch batch = batchRepository.save(BulkUploadBatch.builder()
                    .uploadType("ITEM_MASTER").fileName("test.xlsx")
                    .status("VALIDATED").totalRows(10).successCount(10).failCount(0)
                    .uploadedBy(1L).build());

            mockMvc.perform(post("/api/v1/admin/bulk/" + batch.getId() + "/confirm")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            // Verify status changed
            BulkUploadBatch updated = batchRepository.findById(batch.getId()).orElseThrow();
            assertThat(updated.getStatus()).isEqualTo("CONFIRMED");
            assertThat(updated.getConfirmedAt()).isNotNull();
        }

        @Test
        @DisplayName("VALIDATED 아닌 배치 확정 시 에러")
        void confirmBatch_notValidated_fails() throws Exception {
            BulkUploadBatch batch = batchRepository.save(BulkUploadBatch.builder()
                    .uploadType("ITEM_MASTER").fileName("test.xlsx")
                    .status("CONFIRMED").totalRows(10).successCount(10).failCount(0)
                    .uploadedBy(1L).build());

            mockMvc.perform(post("/api/v1/admin/bulk/" + batch.getId() + "/confirm")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("업로드 이력 조회")
        void getHistory() throws Exception {
            batchRepository.save(BulkUploadBatch.builder()
                    .uploadType("ITEM_MASTER").fileName("test1.xlsx")
                    .status("VALIDATED").totalRows(5).successCount(5).failCount(0)
                    .uploadedBy(1L).build());

            mockMvc.perform(get("/api/v1/admin/bulk/history")
                            .header("Authorization", "Bearer " + brandAdminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
        }

        // --- Helper methods ---

        private byte[] createTestExcel(String[]... rows) throws Exception {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet("Data");
                Row header = sheet.createRow(0);
                header.createCell(0).setCellValue("상품코드");
                header.createCell(1).setCellValue("상품명");

                for (int i = 0; i < rows.length; i++) {
                    Row row = sheet.createRow(i + 1);
                    for (int j = 0; j < rows[i].length; j++) {
                        row.createCell(j).setCellValue(rows[i][j]);
                    }
                }

                ByteArrayOutputStream out = new ByteArrayOutputStream();
                workbook.write(out);
                return out.toByteArray();
            }
        }

        private byte[] createTestExcelWithErrors() throws Exception {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet("Data");
                Row header = sheet.createRow(0);
                header.createCell(0).setCellValue("상품코드");
                header.createCell(1).setCellValue("상품명");

                // Valid row
                Row row1 = sheet.createRow(1);
                row1.createCell(0).setCellValue("CODE001");
                row1.createCell(1).setCellValue("Coffee");

                // Invalid row - empty first cell
                Row row2 = sheet.createRow(2);
                row2.createCell(0).setCellValue(""); // Empty → error
                row2.createCell(1).setCellValue("Tea");

                ByteArrayOutputStream out = new ByteArrayOutputStream();
                workbook.write(out);
                return out.toByteArray();
            }
        }
    }
}
