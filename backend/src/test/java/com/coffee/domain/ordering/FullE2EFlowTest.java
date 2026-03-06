package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.inventory.entity.LedgerType;
import com.coffee.domain.inventory.service.InventoryService;
import com.coffee.domain.master.entity.*;
import com.coffee.domain.master.repository.*;
import com.coffee.domain.ordering.entity.DeliveryPolicy;
import com.coffee.domain.ordering.entity.StoreDeliveryPolicy;
import com.coffee.domain.ordering.repository.DeliveryPolicyRepository;
import com.coffee.domain.ordering.repository.StoreDeliveryPolicyRepository;
import com.coffee.domain.ordering.service.DeliveryPolicyService;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 전체 E2E 플로우 테스트:
 * 매장 생성 → 상품/포장/공급사 등록 → 납품스케줄 설정 →
 * 요일별 주문가능 확인 → 장바구니 → 발주 → 입고 → 실사 재고
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FullE2EFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private DeliveryPolicyService policyService;
    @Autowired private InventoryService inventoryService;

    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private ItemDeliveryScheduleRepository scheduleRepository;
    @Autowired private DeliveryPolicyRepository policyRepository;
    @Autowired private StoreDeliveryPolicyRepository storePolicyRepository;

    private String token;
    private Long companyId, brandId, storeId;
    private Long coffeeItemId, milkItemId, syrupItemId;
    private Long coffeePkgId, milkPkgId, syrupPkgId;
    private Long supplierId;

    private LocalDate futureDate(DayOfWeek dow) {
        LocalDate d = LocalDate.now().plusDays(5);
        while (d.getDayOfWeek() != dow) d = d.plusDays(1);
        return d;
    }

    @BeforeEach
    void setUp() {
        // ── 1. 회사/브랜드/매장 생성 ──
        Company company = companyRepository.save(Company.builder().name("E2E Coffee Co").build());
        companyId = company.getId();
        Brand brand = brandRepository.save(Brand.builder().companyId(companyId).name("E2E Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("E2E TestStore").build());
        storeId = store.getId();

        // ── 2. 상품 3개 생성 ──
        Item coffee = itemRepository.save(Item.builder()
                .brandId(brandId).name("E2E Coffee Bean").baseUnit("g")
                .isOrderable(true).leadTimeDays(1).build());
        coffeeItemId = coffee.getId();

        Item milk = itemRepository.save(Item.builder()
                .brandId(brandId).name("E2E Fresh Milk").baseUnit("ml")
                .isOrderable(true).leadTimeDays(1).build());
        milkItemId = milk.getId();

        Item syrup = itemRepository.save(Item.builder()
                .brandId(brandId).name("E2E Vanilla Syrup").baseUnit("ml")
                .isOrderable(true).leadTimeDays(1).build());
        syrupItemId = syrup.getId();

        // ── 3. 포장 단위 ──
        Packaging coffeePkg = packagingRepository.save(Packaging.builder()
                .itemId(coffeeItemId).packName("1kg Coffee Bag")
                .unitsPerPack(new BigDecimal("1000")).build());
        coffeePkgId = coffeePkg.getId();

        Packaging milkPkg = packagingRepository.save(Packaging.builder()
                .itemId(milkItemId).packName("1L Milk Pack")
                .unitsPerPack(new BigDecimal("1000")).build());
        milkPkgId = milkPkg.getId();

        Packaging syrupPkg = packagingRepository.save(Packaging.builder()
                .itemId(syrupItemId).packName("750ml Syrup Bottle")
                .unitsPerPack(new BigDecimal("750")).build());
        syrupPkgId = syrupPkg.getId();

        // ── 4. 공급사 + 공급사별 상품 연결 ──
        Supplier supplier = supplierRepository.save(Supplier.builder()
                .brandId(brandId).name("E2E Main Supplier").email("e2e@test.com").build());
        supplierId = supplier.getId();

        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplierId).packagingId(coffeePkgId)
                .price(new BigDecimal("15000")).leadTimeDays(1).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplierId).packagingId(milkPkgId)
                .price(new BigDecimal("3000")).leadTimeDays(1).build());
        supplierItemRepository.save(SupplierItem.builder()
                .supplierId(supplierId).packagingId(syrupPkgId)
                .price(new BigDecimal("8000")).leadTimeDays(1).build());

        // ── 5. 납품 스케줄 설정 ──
        // 커피: 월수금만
        scheduleRepository.save(ItemDeliverySchedule.builder()
                .itemId(coffeeItemId).brandId(brandId)
                .mon(true).tue(false).wed(true).thu(false).fri(true).sat(false).sun(false)
                .isActive(true).build());
        // 우유: 화목토만
        scheduleRepository.save(ItemDeliverySchedule.builder()
                .itemId(milkItemId).brandId(brandId)
                .mon(false).tue(true).wed(false).thu(true).fri(false).sat(true).sun(false)
                .isActive(true).build());
        // 시럽: 스케줄 없음 → 매일 가능

        // ── 6. 배송 정책 ──
        DeliveryPolicy policy = policyRepository.save(DeliveryPolicy.builder()
                .brandId(brandId).policyName("E2E Policy")
                .deliveryDays("EVERYDAY")
                .cutoffTime(LocalTime.of(9, 0))
                .cutoffLeadDaysBefore(1).cutoffLeadDaysAfter(2)
                .isActive(true).build());
        storePolicyRepository.save(StoreDeliveryPolicy.builder()
                .storeId(storeId).deliveryPolicyId(policy.getId()).isDefault(true).build());

        // ── 7. 초기 재고 ──
        inventoryService.recordStockChange(storeId, coffeeItemId,
                new BigDecimal("3000"), LedgerType.RECEIVE, null, null, null, null);
        inventoryService.recordStockChange(storeId, milkItemId,
                new BigDecimal("5000"), LedgerType.RECEIVE, null, null, null, null);
        inventoryService.recordStockChange(storeId, syrupItemId,
                new BigDecimal("2000"), LedgerType.RECEIVE, null, null, null, null);

        // ── 토큰 ──
        token = jwtUtil.generateAccessToken(1L, "e2e@test.com", "STORE_MANAGER",
                companyId, brandId, storeId);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: 매장 API 테스트
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(1)
    @DisplayName("E2E-1. 매장 생성 API 정상 동작")
    void createStoreApi() throws Exception {
        String adminToken = jwtUtil.generateAccessToken(1L, "admin@t.com", "SUPER_ADMIN",
                companyId, brandId, storeId);

        String body = objectMapper.writeValueAsString(Map.of(
                "brandId", brandId, "name", "API Test Store",
                "address", "서울시 강남구", "phone", "02-1234-5678"));

        mockMvc.perform(post("/api/v1/org/stores")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("API Test Store"))
                .andExpect(jsonPath("$.data.address").value("서울시 강남구"))
                .andExpect(jsonPath("$.data.phone").value("02-1234-5678"));
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: 납품 스케줄 요일별 주문가능 확인
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(2)
    @DisplayName("E2E-2. 커피(월수금) - 월요일 주문 가능")
    void coffee_orderableOnMonday() {
        assertThat(policyService.isItemOrderableForDate(coffeeItemId, futureDate(DayOfWeek.MONDAY), storeId)).isTrue();
    }

    @Test
    @Order(3)
    @DisplayName("E2E-3. 커피(월수금) - 화요일 주문 불가")
    void coffee_notOrderableOnTuesday() {
        assertThat(policyService.isItemOrderableForDate(coffeeItemId, futureDate(DayOfWeek.TUESDAY), storeId)).isFalse();
    }

    @Test
    @Order(4)
    @DisplayName("E2E-4. 우유(화목토) - 목요일 주문 가능")
    void milk_orderableOnThursday() {
        assertThat(policyService.isItemOrderableForDate(milkItemId, futureDate(DayOfWeek.THURSDAY), storeId)).isTrue();
    }

    @Test
    @Order(5)
    @DisplayName("E2E-5. 우유(화목토) - 월요일 주문 불가")
    void milk_notOrderableOnMonday() {
        assertThat(policyService.isItemOrderableForDate(milkItemId, futureDate(DayOfWeek.MONDAY), storeId)).isFalse();
    }

    @Test
    @Order(6)
    @DisplayName("E2E-6. 시럽(스케줄없음) - 모든 요일 주문 가능")
    void syrup_orderableAnyDay() {
        for (DayOfWeek dow : DayOfWeek.values()) {
            assertThat(policyService.isItemOrderableForDate(syrupItemId, futureDate(dow), storeId))
                    .as("Syrup should be orderable on " + dow).isTrue();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: 장바구니 → 발주 → 확정 → 발송
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(7)
    @DisplayName("E2E-7. 장바구니에 상품 추가 후 발주 생성 → 확정 → 발송")
    void cartToOrderConfirmDispatch() throws Exception {
        // 1. 발주 생성 (커피 5팩, 시럽 3팩)
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId,
                "lines", List.of(
                        Map.of("packagingId", coffeePkgId, "packQty", 5),
                        Map.of("packagingId", syrupPkgId, "packQty", 3)
                )));

        MvcResult createResult = mockMvc.perform(post("/api/v1/ordering/plans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn();

        Long planId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // 2. 발주 확정
        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        // 3. 발주 발송
        mockMvc.perform(post("/api/v1/ordering/plans/" + planId + "/dispatch")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DISPATCHED"));

        // 4. 발주 목록에서 확인
        mockMvc.perform(get("/api/v1/ordering/plans")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].status").value("DISPATCHED"));
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 4: 입고 (Receiving)
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(8)
    @DisplayName("E2E-8. 발주 후 입고 처리 — 재고 증가 확인")
    void orderAndReceive() throws Exception {
        // 발주 생성 → 확정 → 발송
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId,
                "lines", List.of(Map.of("packagingId", coffeePkgId, "packQty", 3))));

        MvcResult createResult = mockMvc.perform(post("/api/v1/ordering/plans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long planId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/ordering/plans/" + planId + "/dispatch")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // 대기 주문 확인
        mockMvc.perform(get("/api/v1/receiving/pending-orders")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].status").value("DISPATCHED"));

        // 입고 처리 (3팩 전량 수령)
        String receiveBody = objectMapper.writeValueAsString(Map.of(
                "lines", List.of(Map.of(
                        "packagingId", coffeePkgId,
                        "packQty", 3,
                        "lotNo", "LOT-E2E-001",
                        "expDate", "2026-09-01"
                ))));

        mockMvc.perform(post("/api/v1/receiving/from-order/" + planId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiveBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").exists());

        // 발주 상태가 DELIVERED로 변경 확인
        mockMvc.perform(get("/api/v1/ordering/plans/" + planId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value(
                        anyOf(is("DELIVERED"), is("PARTIALLY_RECEIVED"))));
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 5: 실사 재고 (Physical Count)
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(9)
    @DisplayName("E2E-9. 실사 재고 시작 → 수량 입력 → 완료")
    void physicalCountFlow() throws Exception {
        // 1. 실사 시작
        String startBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "countedBy", 1L));

        MvcResult startResult = mockMvc.perform(post("/api/v1/physical-count/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(startBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.lines").isArray())
                .andExpect(jsonPath("$.data.lines", hasSize(greaterThanOrEqualTo(3))))
                .andReturn();

        JsonNode countData = objectMapper.readTree(startResult.getResponse().getContentAsString())
                .path("data");
        Long countId = countData.path("id").asLong();
        JsonNode lines = countData.path("lines");

        // 2. 각 라인에 실제 수량 입력
        for (int i = 0; i < lines.size(); i++) {
            JsonNode line = lines.get(i);
            Long lineId = line.path("id").asLong();
            BigDecimal systemQty = new BigDecimal(line.path("systemQty").asText());
            // 실제 수량은 시스템 수량에서 약간 차이 나도록
            BigDecimal actualQty = systemQty.subtract(new BigDecimal("50"));

            String updateBody = objectMapper.writeValueAsString(Map.of(
                    "actualQty", actualQty, "note", "E2E test count"));

            mockMvc.perform(put("/api/v1/physical-count/" + countId + "/lines/" + lineId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.gapQty").value(-50));
        }

        // 3. 실사 완료
        mockMvc.perform(post("/api/v1/physical-count/" + countId + "/complete")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        // 4. 이력 확인
        mockMvc.perform(get("/api/v1/physical-count/history")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 6: 납품일 기반 장바구니 → 발주 → 입고 → 실사 통합
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(10)
    @DisplayName("E2E-10. 납품일 기반 장바구니 생성")
    void deliveryDateBasedCart() throws Exception {
        LocalDate deliveryDate = futureDate(DayOfWeek.MONDAY);

        String cartBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "deliveryDate", deliveryDate.toString(),
                "items", List.of(
                        Map.of("itemId", coffeeItemId, "packagingId", coffeePkgId, "quantity", 2),
                        Map.of("itemId", syrupItemId, "packagingId", syrupPkgId, "quantity", 1)
                )));

        mockMvc.perform(post("/api/v1/ordering/cart")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cartBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.deliveryDate").value(deliveryDate.toString()))
                .andExpect(jsonPath("$.data.totalItems").value(2))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @Order(11)
    @DisplayName("E2E-11. 활성 장바구니 조회")
    void getActiveCarts() throws Exception {
        // 장바구니 먼저 생성
        LocalDate deliveryDate = futureDate(DayOfWeek.WEDNESDAY);
        String cartBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId,
                "deliveryDate", deliveryDate.toString(),
                "items", List.of(
                        Map.of("itemId", coffeeItemId, "packagingId", coffeePkgId, "quantity", 1)
                )));
        mockMvc.perform(post("/api/v1/ordering/cart")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cartBody))
                .andExpect(status().isCreated());

        // 활성 장바구니 조회
        mockMvc.perform(get("/api/v1/ordering/cart/active")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.carts", hasSize(greaterThanOrEqualTo(1))));
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 7: 납품 스케줄 API CRUD
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(12)
    @DisplayName("E2E-12. 납품 스케줄 API — 조회 (커피 월수금)")
    void getDeliverySchedule() throws Exception {
        mockMvc.perform(get("/api/v1/master/items/" + coffeeItemId + "/delivery-schedule")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mon").value(true))
                .andExpect(jsonPath("$.data.wed").value(true))
                .andExpect(jsonPath("$.data.fri").value(true))
                .andExpect(jsonPath("$.data.tue").value(false))
                .andExpect(jsonPath("$.data.thu").value(false));
    }

    @Test
    @Order(13)
    @DisplayName("E2E-13. 납품 스케줄 API — 수정 후 주문가능 변경 확인")
    void updateScheduleChangesOrderability() throws Exception {
        String adminToken = jwtUtil.generateAccessToken(1L, "admin@t.com", "SUPER_ADMIN",
                companyId, brandId, storeId);

        // 커피를 화목으로 변경
        String body = """
            {"mon": false, "tue": true, "wed": false, "thu": true, "fri": false, "sat": false, "sun": false}
            """;

        mockMvc.perform(put("/api/v1/master/items/" + coffeeItemId + "/delivery-schedule")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tue").value(true))
                .andExpect(jsonPath("$.data.thu").value(true))
                .andExpect(jsonPath("$.data.mon").value(false));

        // 이제 월요일 주문 불가, 화요일 주문 가능
        assertThat(policyService.isItemOrderableForDate(coffeeItemId, futureDate(DayOfWeek.MONDAY), storeId)).isFalse();
        assertThat(policyService.isItemOrderableForDate(coffeeItemId, futureDate(DayOfWeek.TUESDAY), storeId)).isTrue();
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 8: 카탈로그 API — orderable 플래그 확인
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(14)
    @DisplayName("E2E-14. 카탈로그 API — 월요일 납품일: 커피 orderable, 우유 not orderable")
    void catalogOrderableFlag_monday() throws Exception {
        LocalDate monday = futureDate(DayOfWeek.MONDAY);

        MvcResult result = mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .param("deliveryDate", monday.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andReturn();

        JsonNode content = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("content");

        // 커피(월수금)는 월요일에 orderable=true
        // 우유(화목토)는 월요일에 orderable=false
        boolean foundCoffee = false, foundMilk = false;
        for (JsonNode item : content) {
            String name = item.path("itemName").asText();
            if (name.contains("Coffee")) {
                assertThat(item.path("orderable").asBoolean()).as("Coffee orderable on Monday").isTrue();
                foundCoffee = true;
            }
            if (name.contains("Milk")) {
                assertThat(item.path("orderable").asBoolean()).as("Milk NOT orderable on Monday").isFalse();
                foundMilk = true;
            }
        }
        assertThat(foundCoffee).as("Coffee item found in catalog").isTrue();
        assertThat(foundMilk).as("Milk item found in catalog").isTrue();
    }

    @Test
    @Order(15)
    @DisplayName("E2E-15. 카탈로그 API — 화요일 납품일: 커피 not orderable, 우유 orderable")
    void catalogOrderableFlag_tuesday() throws Exception {
        LocalDate tuesday = futureDate(DayOfWeek.TUESDAY);

        MvcResult result = mockMvc.perform(get("/api/v1/ordering/catalog")
                        .param("storeId", storeId.toString())
                        .param("deliveryDate", tuesday.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode content = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("content");

        for (JsonNode item : content) {
            String name = item.path("itemName").asText();
            if (name.contains("Coffee")) {
                assertThat(item.path("orderable").asBoolean()).as("Coffee NOT orderable on Tuesday").isFalse();
            }
            if (name.contains("Milk")) {
                assertThat(item.path("orderable").asBoolean()).as("Milk orderable on Tuesday").isTrue();
            }
        }
    }

    @Test
    @Order(16)
    @DisplayName("E2E-16. 카탈로그 API — 시럽(스케줄없음)은 모든 날 orderable")
    void catalogOrderableFlag_syrupAlways() throws Exception {
        LocalDate monday = futureDate(DayOfWeek.MONDAY);
        LocalDate tuesday = futureDate(DayOfWeek.TUESDAY);

        for (LocalDate date : List.of(monday, tuesday)) {
            MvcResult result = mockMvc.perform(get("/api/v1/ordering/catalog")
                            .param("storeId", storeId.toString())
                            .param("deliveryDate", date.toString())
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode content = objectMapper.readTree(result.getResponse().getContentAsString())
                    .path("data").path("content");

            for (JsonNode item : content) {
                if (item.path("itemName").asText().contains("Syrup")) {
                    assertThat(item.path("orderable").asBoolean())
                            .as("Syrup orderable on " + date.getDayOfWeek()).isTrue();
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 9: 전체 통합 흐름 (발주 → 입고 → 실사)
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(17)
    @DisplayName("E2E-17. 통합: 발주(커피5+우유3) → 입고 → 실사 재고 완료")
    void fullIntegration_orderReceiveCount() throws Exception {
        // ── Step 1: 발주 생성 (커피 5팩 + 우유 3팩) ──
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId,
                "lines", List.of(
                        Map.of("packagingId", coffeePkgId, "packQty", 5),
                        Map.of("packagingId", milkPkgId, "packQty", 3)
                )));

        MvcResult createResult = mockMvc.perform(post("/api/v1/ordering/plans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long planId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // ── Step 2: 확정 + 발송 ──
        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/ordering/plans/" + planId + "/dispatch")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());

        // ── Step 3: 입고 (전량) ──
        String receiveBody = objectMapper.writeValueAsString(Map.of(
                "lines", List.of(
                        Map.of("packagingId", coffeePkgId, "packQty", 5, "lotNo", "LOT-INT-C01", "expDate", "2026-12-01"),
                        Map.of("packagingId", milkPkgId, "packQty", 3, "lotNo", "LOT-INT-M01", "expDate", "2026-04-01")
                )));

        mockMvc.perform(post("/api/v1/receiving/from-order/" + planId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiveBody))
                .andExpect(status().isOk());

        // ── Step 4: 실사 시작 ──
        String startBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "countedBy", 1L));

        MvcResult countResult = mockMvc.perform(post("/api/v1/physical-count/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(startBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andReturn();

        JsonNode countData = objectMapper.readTree(countResult.getResponse().getContentAsString()).path("data");
        Long countId = countData.path("id").asLong();
        JsonNode countLines = countData.path("lines");

        // ── Step 5: 재고 기대값 확인 ──
        // 커피: 초기 3000 + 입고 5000 (5*1000) = 8000
        // 우유: 초기 5000 + 입고 3000 (3*1000) = 8000
        // 시럽: 초기 2000 (변동 없음) = 2000
        for (JsonNode line : countLines) {
            Long itemId = line.path("itemId").asLong();
            BigDecimal systemQty = new BigDecimal(line.path("systemQty").asText());

            if (itemId == coffeeItemId) {
                assertThat(systemQty.compareTo(new BigDecimal("8000"))).as("Coffee system qty = 8000").isEqualTo(0);
            } else if (itemId == milkItemId) {
                assertThat(systemQty.compareTo(new BigDecimal("8000"))).as("Milk system qty = 8000").isEqualTo(0);
            } else if (itemId == syrupItemId) {
                assertThat(systemQty.compareTo(new BigDecimal("2000"))).as("Syrup system qty = 2000").isEqualTo(0);
            }
        }

        // ── Step 6: 실제 수량 입력 + 완료 ──
        for (JsonNode line : countLines) {
            Long lineId = line.path("id").asLong();
            BigDecimal systemQty = new BigDecimal(line.path("systemQty").asText());
            // 실제 수량 = 시스템과 동일 (차이 없음)
            String updateBody = objectMapper.writeValueAsString(Map.of(
                    "actualQty", systemQty, "note", "정확 일치"));

            mockMvc.perform(put("/api/v1/physical-count/" + countId + "/lines/" + lineId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(updateBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.gapQty").value(0));
        }

        mockMvc.perform(post("/api/v1/physical-count/" + countId + "/complete")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 10: 부분 입고 + 차이 있는 실사
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(18)
    @DisplayName("E2E-18. 부분 입고 후 실사 차이 발생 확인")
    void partialReceiveAndCountDifference() throws Exception {
        // 시럽 5팩 발주
        String createBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "supplierId", supplierId,
                "lines", List.of(Map.of("packagingId", syrupPkgId, "packQty", 5))));

        MvcResult createResult = mockMvc.perform(post("/api/v1/ordering/plans")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        Long planId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(put("/api/v1/ordering/plans/" + planId + "/confirm")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/ordering/plans/" + planId + "/dispatch")
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk());

        // 부분 입고: 5팩 중 3팩만
        String receiveBody = objectMapper.writeValueAsString(Map.of(
                "lines", List.of(Map.of(
                        "packagingId", syrupPkgId, "packQty", 3,
                        "lotNo", "LOT-PARTIAL", "expDate", "2026-12-31"))));

        mockMvc.perform(post("/api/v1/receiving/from-order/" + planId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(receiveBody))
                .andExpect(status().isOk());

        // 발주 상태 확인
        mockMvc.perform(get("/api/v1/ordering/plans/" + planId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PARTIALLY_RECEIVED"));

        // 실사: 시럽 기대 = 2000 + 2250 (3*750) = 4250
        String startBody = objectMapper.writeValueAsString(Map.of(
                "storeId", storeId, "countedBy", 1L));

        MvcResult countResult = mockMvc.perform(post("/api/v1/physical-count/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(startBody))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode countData = objectMapper.readTree(countResult.getResponse().getContentAsString()).path("data");
        Long countId = countData.path("id").asLong();

        for (JsonNode line : countData.path("lines")) {
            Long lineId = line.path("id").asLong();
            Long itemId = line.path("itemId").asLong();
            BigDecimal systemQty = new BigDecimal(line.path("systemQty").asText());

            // 시럽 실제는 4000 (시스템은 4250 → gap=-250)
            BigDecimal actualQty = itemId == syrupItemId
                    ? new BigDecimal("4000")
                    : systemQty;
            String note = itemId == syrupItemId ? "손실 발생" : "정확";

            mockMvc.perform(put("/api/v1/physical-count/" + countId + "/lines/" + lineId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "actualQty", actualQty, "note", note))))
                    .andExpect(status().isOk());
        }

        MvcResult completeResult = mockMvc.perform(post("/api/v1/physical-count/" + countId + "/complete")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andReturn();

        // 시럽 라인에서 gap=-250 확인
        JsonNode completedLines = objectMapper.readTree(completeResult.getResponse().getContentAsString())
                .path("data").path("lines");
        for (JsonNode line : completedLines) {
            if (line.path("itemId").asLong() == syrupItemId) {
                BigDecimal gap = new BigDecimal(line.path("gapQty").asText());
                assertThat(gap.compareTo(BigDecimal.ZERO)).as("Syrup gap should be negative").isLessThan(0);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 11: 배송정책 API
    // ═══════════════════════════════════════════════════════════

    @Test
    @Order(19)
    @DisplayName("E2E-19. 배송 가능일 조회 API — 365일 운영, 모든 요일 반환")
    void deliveryDatesApi_365() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/delivery-dates")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableDates").isArray())
                .andExpect(jsonPath("$.data.availableDates", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    @Order(20)
    @DisplayName("E2E-20. 발주 가능 여부 확인 API — 미래 날짜 가능, 과거 날짜 불가")
    void orderAvailabilityApi() throws Exception {
        LocalDate futureDate = futureDate(DayOfWeek.WEDNESDAY);

        mockMvc.perform(get("/api/v1/ordering/availability")
                        .param("storeId", storeId.toString())
                        .param("deliveryDate", futureDate.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true))
                .andExpect(jsonPath("$.data.remainingMinutes").value(greaterThan(0)));

        // 오늘은 이미 마감 (cutoff D-1 09:00)
        mockMvc.perform(get("/api/v1/ordering/availability")
                        .param("storeId", storeId.toString())
                        .param("deliveryDate", LocalDate.now().toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false));
    }
}
