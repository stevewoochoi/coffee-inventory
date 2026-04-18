package com.coffee;

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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class V6Backend1Test {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private DeliveryPolicyService deliveryPolicyService;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemCategoryRepository categoryRepository;
    @Autowired private PackagingRepository packagingRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private SupplierItemRepository supplierItemRepository;
    @Autowired private ItemDeliveryScheduleRepository scheduleRepository;
    @Autowired private DeliveryPolicyRepository policyRepository;
    @Autowired private StoreDeliveryPolicyRepository storePolicyRepository;
    @Autowired private InventoryService inventoryService;

    private String superAdminToken;
    private String storeManagerToken;
    private Long companyId;
    private Long brandId;
    private Long storeId;
    private DeliveryPolicy policy;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("V6 Test Co").build());
        companyId = company.getId();
        Brand brand = brandRepository.save(Brand.builder().companyId(companyId).name("V6 Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("V6 Store").build());
        storeId = store.getId();

        policy = policyRepository.save(DeliveryPolicy.builder()
                .brandId(brandId)
                .policyName("MWF Policy")
                .deliveryDays("MON_WED_FRI")
                .cutoffTime(LocalTime.of(9, 0))
                .cutoffLeadDaysBefore(2)
                .cutoffLeadDaysAfter(3)
                .temperatureZone("AMBIENT")
                .isActive(true)
                .build());

        storePolicyRepository.save(StoreDeliveryPolicy.builder()
                .storeId(storeId)
                .deliveryPolicyId(policy.getId())
                .isDefault(true)
                .build());

        superAdminToken = jwtUtil.generateAccessToken(1L, "super@test.com", "SUPER_ADMIN",
                companyId, null, null);
        storeManagerToken = jwtUtil.generateAccessToken(2L, "store@test.com", "STORE_MANAGER",
                companyId, brandId, storeId);
    }

    // =====================================================================
    // T-20: Migration verification
    // =====================================================================
    @Nested
    @DisplayName("T-20: 마이그레이션 검증")
    class T20_MigrationVerification {

        @Test
        @DisplayName("ApplicationContext 정상 로드 (스키마 검증)")
        void contextLoads() {
            // If we get here, SpringBootTest context loaded successfully,
            // meaning JPA schema (including new entities) is valid
            assertThat(scheduleRepository).isNotNull();
            assertThat(itemRepository).isNotNull();
        }

        @Test
        @DisplayName("item_delivery_schedule 테이블 - CRUD 가능")
        void itemDeliveryScheduleTableExists() {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Migration Test Item").baseUnit("g")
                    .isOrderable(true).build());

            ItemDeliverySchedule schedule = scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId())
                    .brandId(brandId)
                    .mon(true).wed(true).fri(true)
                    .build());

            assertThat(schedule.getId()).isNotNull();
            assertThat(scheduleRepository.findByItemIdAndBrandId(item.getId(), brandId)).isPresent();
        }

        @Test
        @DisplayName("item 테이블 - itemCode, spec, description 컬럼 존재")
        void itemExtendedColumns() {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Extended Item").baseUnit("g")
                    .itemCode("ITEM-001")
                    .spec("500g/pack")
                    .description("Test description for migration check")
                    .isOrderable(true).build());

            Item saved = itemRepository.findById(item.getId()).orElseThrow();
            assertThat(saved.getItemCode()).isEqualTo("ITEM-001");
            assertThat(saved.getSpec()).isEqualTo("500g/pack");
            assertThat(saved.getDescription()).isEqualTo("Test description for migration check");
        }

        @Test
        @DisplayName("packaging 테이블 - orderUnitName 컬럼 존재")
        void packagingOrderUnitNameColumn() {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Pkg Test Item").baseUnit("g")
                    .isOrderable(true).build());

            Packaging pkg = packagingRepository.save(Packaging.builder()
                    .itemId(item.getId())
                    .packName("10kg bag")
                    .unitsPerPack(new BigDecimal("10000"))
                    .orderUnitName("BAG")
                    .build());

            Packaging saved = packagingRepository.findById(pkg.getId()).orElseThrow();
            assertThat(saved.getOrderUnitName()).isEqualTo("BAG");
        }
    }

    // =====================================================================
    // T-21: DeliveryPolicyService tests
    // =====================================================================
    @Nested
    @DisplayName("T-21: DeliveryPolicyService 단위 테스트")
    class T21_DeliveryPolicyService {

        private Item createOrderableItem(String name, int leadTimeDays) {
            return itemRepository.save(Item.builder()
                    .brandId(brandId).name(name).baseUnit("g")
                    .isOrderable(true).leadTimeDays(leadTimeDays).build());
        }

        private LocalDate findNextDayOfWeek(DayOfWeek dow, int minDaysAhead) {
            LocalDate date = LocalDate.now().plusDays(minDaysAhead);
            while (date.getDayOfWeek() != dow) {
                date = date.plusDays(1);
            }
            return date;
        }

        @Test
        @DisplayName("상품에 schedule 있는 경우 - schedule 기반 요일 체크")
        void isItemOrderableForDate_withSchedule_usesSchedule() {
            Item item = createOrderableItem("Scheduled Item", 1);

            // Schedule: only MON and WED
            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).wed(true)
                    .fri(false).tue(false).thu(false).sat(false).sun(false)
                    .build());

            // Monday should be orderable (schedule says yes)
            LocalDate monday = findNextDayOfWeek(DayOfWeek.MONDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), monday, storeId))
                    .isTrue();

            // Wednesday should be orderable (schedule says yes)
            LocalDate wednesday = findNextDayOfWeek(DayOfWeek.WEDNESDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), wednesday, storeId))
                    .isTrue();
        }

        @Test
        @DisplayName("상품에 schedule 없는 경우 - delivery_policy fallback")
        void isItemOrderableForDate_noSchedule_fallsBackToPolicy() {
            Item item = createOrderableItem("No Schedule Item", 1);
            // No schedule created - should use policy (MON_WED_FRI)

            LocalDate monday = findNextDayOfWeek(DayOfWeek.MONDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), monday, storeId))
                    .isTrue();

            // Tuesday should NOT be orderable (not in MON_WED_FRI)
            LocalDate tuesday = findNextDayOfWeek(DayOfWeek.TUESDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), tuesday, storeId))
                    .isFalse();
        }

        @Test
        @DisplayName("schedule.fri=0 + 정책=MON_WED_FRI → 금요일 불가 (상품 스케줄 우선)")
        void scheduleOverridesPolicy_fridayBlocked() {
            Item item = createOrderableItem("Friday Blocked Item", 1);

            // Schedule explicitly blocks Friday even though policy allows it
            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).wed(true).fri(false)
                    .tue(false).thu(false).sat(false).sun(false)
                    .build());

            LocalDate friday = findNextDayOfWeek(DayOfWeek.FRIDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), friday, storeId))
                    .isFalse();
        }

        @Test
        @DisplayName("schedule.tue=1 + 정책=MON_WED_FRI → 화요일 가능 (상품 스케줄 우선)")
        void scheduleOverridesPolicy_tuesdayAllowed() {
            Item item = createOrderableItem("Tuesday Allowed Item", 1);

            // Schedule allows Tuesday even though policy does NOT
            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).tue(true).wed(true).fri(true)
                    .thu(false).sat(false).sun(false)
                    .build());

            LocalDate tuesday = findNextDayOfWeek(DayOfWeek.TUESDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), tuesday, storeId))
                    .isTrue();
        }

        @Test
        @DisplayName("일요일 무조건 불가")
        void sundayAlwaysUnavailable() {
            Item item = createOrderableItem("Sunday Test Item", 1);

            // Even with schedule that allows Sunday
            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).tue(true).wed(true).thu(true)
                    .fri(true).sat(true).sun(true)
                    .build());

            LocalDate sunday = findNextDayOfWeek(DayOfWeek.SUNDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), sunday, storeId))
                    .isFalse();
        }

        @Test
        @DisplayName("리드타임 체크 - 리드타임보다 가까운 배송일은 불가")
        void leadTimeCheck_tooClose() {
            // Item with 10-day lead time
            Item item = createOrderableItem("Long Lead Item", 10);

            // A delivery date only 5 days out
            LocalDate nearDate = LocalDate.now().plusDays(5);
            while (nearDate.getDayOfWeek() != DayOfWeek.MONDAY
                    && nearDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                    && nearDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
                nearDate = nearDate.plusDays(1);
            }

            // Should be false if nearDate is less than 10 days away
            if (java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), nearDate) < 10) {
                assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), nearDate, storeId))
                        .isFalse();
            }
        }

        @Test
        @DisplayName("리드타임 체크 - 충분한 리드타임이면 발주 가능")
        void leadTimeCheck_sufficient() {
            Item item = createOrderableItem("Normal Lead Item", 2);

            LocalDate farDate = findNextDayOfWeek(DayOfWeek.MONDAY, 14);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), farDate, storeId))
                    .isTrue();
        }

        @Test
        @DisplayName("비발주 아이템은 항상 불가")
        void nonOrderableItem_alwaysFalse() {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Not Orderable").baseUnit("g")
                    .isOrderable(false).build());

            LocalDate monday = findNextDayOfWeek(DayOfWeek.MONDAY, 7);
            assertThat(deliveryPolicyService.isItemOrderableForDate(item.getId(), monday, storeId))
                    .isFalse();
        }
    }

    // =====================================================================
    // T-22: Catalog filtering tests
    // =====================================================================
    @Nested
    @DisplayName("T-22: 카탈로그 필터링 테스트")
    class T22_CatalogFiltering {

        private Item fridayItem;
        private Item noScheduleItem;

        @BeforeEach
        void setUpCatalogData() {
            ItemCategory cat = categoryRepository.save(ItemCategory.builder()
                    .brandId(brandId).name("Coffee").level(1).displayOrder(1).build());

            // Item with delivery schedule: fri=1
            fridayItem = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Friday Coffee").baseUnit("g")
                    .categoryId(cat.getId()).isOrderable(true)
                    .itemCode("FC-001").spec("1kg/bag")
                    .minStockQty(new BigDecimal("500")).leadTimeDays(1).build());

            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(fridayItem.getId()).brandId(brandId)
                    .mon(false).tue(false).wed(false).thu(false)
                    .fri(true).sat(false).sun(false)
                    .build());

            Packaging fridayPkg = packagingRepository.save(Packaging.builder()
                    .itemId(fridayItem.getId()).packName("1kg Coffee Bag")
                    .unitsPerPack(new BigDecimal("1000"))
                    .orderUnitName("BAG").build());

            Supplier supplier = supplierRepository.save(Supplier.builder()
                    .brandId(brandId).name("Main Supplier").email("main@test.com").build());
            supplierItemRepository.save(SupplierItem.builder()
                    .supplierId(supplier.getId()).packagingId(fridayPkg.getId())
                    .price(new BigDecimal("15000")).leadTimeDays(1).build());

            inventoryService.recordStockChange(storeId, fridayItem.getId(),
                    new BigDecimal("300"), LedgerType.RECEIVE, null, null, null, null);

            // Item without delivery schedule (falls back to policy MON_WED_FRI)
            noScheduleItem = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Regular Milk").baseUnit("ml")
                    .categoryId(cat.getId()).isOrderable(true)
                    .spec("1L pack")
                    .minStockQty(new BigDecimal("2000")).leadTimeDays(1).build());

            Packaging milkPkg = packagingRepository.save(Packaging.builder()
                    .itemId(noScheduleItem.getId()).packName("1L Milk")
                    .unitsPerPack(new BigDecimal("1000"))
                    .orderUnitName("PACK").build());

            supplierItemRepository.save(SupplierItem.builder()
                    .supplierId(supplier.getId()).packagingId(milkPkg.getId())
                    .price(new BigDecimal("3000")).leadTimeDays(1).build());

            inventoryService.recordStockChange(storeId, noScheduleItem.getId(),
                    new BigDecimal("5000"), LedgerType.RECEIVE, null, null, null, null);
        }

        @Test
        @DisplayName("금요일 납품 - fri=1인 상품과 정책 기반 상품 반환")
        void catalogFiltersByDeliveryDate_friday() throws Exception {
            // Find a Friday far enough in the future
            LocalDate friday = LocalDate.now().plusDays(7);
            while (friday.getDayOfWeek() != DayOfWeek.FRIDAY) {
                friday = friday.plusDays(1);
            }

            MvcResult result = mockMvc.perform(get("/api/v1/ordering/catalog")
                            .param("storeId", storeId.toString())
                            .param("deliveryDate", friday.toString())
                            .header("Authorization", "Bearer " + storeManagerToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            // Friday Coffee (has schedule fri=1) should be included
            assertThat(responseBody).contains("Friday Coffee");
            // Regular Milk (no schedule, policy=MON_WED_FRI, fri is in policy) should also be included
            assertThat(responseBody).contains("Regular Milk");
        }

        @Test
        @DisplayName("화요일 납품 - fri-only 스케줄 상품 제외, 정책 상품도 제외")
        void catalogFiltersByDeliveryDate_tuesday() throws Exception {
            // Find a Tuesday far enough in the future
            LocalDate tuesday = LocalDate.now().plusDays(7);
            while (tuesday.getDayOfWeek() != DayOfWeek.TUESDAY) {
                tuesday = tuesday.plusDays(1);
            }

            MvcResult result = mockMvc.perform(get("/api/v1/ordering/catalog")
                            .param("storeId", storeId.toString())
                            .param("deliveryDate", tuesday.toString())
                            .header("Authorization", "Bearer " + storeManagerToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            // Friday Coffee (schedule: only fri) should NOT be included
            assertThat(responseBody).doesNotContain("Friday Coffee");
            // Regular Milk (policy: MON_WED_FRI, tue not in policy) should NOT be included
            assertThat(responseBody).doesNotContain("Regular Milk");
        }

        @Test
        @DisplayName("카탈로그 응답에 deliveryDays, spec, orderUnitName 포함")
        void catalogResponseIncludesNewFields() throws Exception {
            // Without deliveryDate filter - show all items
            MvcResult result = mockMvc.perform(get("/api/v1/ordering/catalog")
                            .param("storeId", storeId.toString())
                            .header("Authorization", "Bearer " + storeManagerToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();

            // Check new V6 fields are present in response
            // fridayItem has itemCode, spec, and delivery schedule (deliveryDays)
            assertThat(responseBody).contains("\"spec\"");
            assertThat(responseBody).contains("\"deliveryDays\"");
            assertThat(responseBody).contains("\"orderUnitName\"");

            // Verify spec value
            assertThat(responseBody).contains("1kg/bag");
            // Verify orderUnitName value
            assertThat(responseBody).contains("BAG");
        }
    }

    // =====================================================================
    // T-23: Item master extension tests
    // =====================================================================
    @Nested
    @DisplayName("T-23: 상품 마스터 확장 테스트")
    class T23_ItemMasterExtension {

        @Test
        @DisplayName("item 생성 시 itemCode, spec 저장 확인")
        void createItemWithItemCodeAndSpec() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "brandId", brandId,
                    "name", "V6 Test Coffee",
                    "baseUnit", "g",
                    "itemCode", "V6-COFFEE-001",
                    "spec", "500g premium blend"));

            mockMvc.perform(post("/api/v1/master/items")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.name").value("V6 Test Coffee"))
                    .andExpect(jsonPath("$.data.itemCode").value("V6-COFFEE-001"))
                    .andExpect(jsonPath("$.data.spec").value("500g premium blend"));
        }

        @Test
        @DisplayName("packaging 생성 시 orderUnitName 저장 확인 (엔티티 레벨)")
        void createPackagingWithOrderUnitName() {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Pkg Test Item").baseUnit("g")
                    .isOrderable(true).build());

            Packaging pkg = packagingRepository.save(Packaging.builder()
                    .itemId(item.getId())
                    .packName("10kg Bag")
                    .unitsPerPack(new BigDecimal("10000"))
                    .orderUnitName("BAG")
                    .build());

            Packaging saved = packagingRepository.findById(pkg.getId()).orElseThrow();
            assertThat(saved.getPackName()).isEqualTo("10kg Bag");
            assertThat(saved.getOrderUnitName()).isEqualTo("BAG");
        }

        @Test
        @DisplayName("packaging 기본 orderUnitName = BOX")
        void packagingDefaultOrderUnitName() {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Default Pkg Item").baseUnit("g")
                    .isOrderable(true).build());

            Packaging pkg = packagingRepository.save(Packaging.builder()
                    .itemId(item.getId())
                    .packName("Standard Pack")
                    .unitsPerPack(new BigDecimal("1000"))
                    .build());

            Packaging saved = packagingRepository.findById(pkg.getId()).orElseThrow();
            assertThat(saved.getOrderUnitName()).isEqualTo("BOX");
        }

        @Test
        @DisplayName("delivery-schedule CRUD - 생성")
        void deliveryScheduleCrud_create() throws Exception {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Schedule CRUD Item").baseUnit("g")
                    .isOrderable(true).build());

            String body = objectMapper.writeValueAsString(Map.of(
                    "mon", true, "wed", true, "fri", true,
                    "tue", false, "thu", false, "sat", false, "sun", false));

            mockMvc.perform(post("/api/v1/master/items/" + item.getId() + "/delivery-schedule")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.itemId").value(item.getId()))
                    .andExpect(jsonPath("$.data.mon").value(true))
                    .andExpect(jsonPath("$.data.wed").value(true))
                    .andExpect(jsonPath("$.data.fri").value(true))
                    .andExpect(jsonPath("$.data.tue").value(false))
                    .andExpect(jsonPath("$.data.displayDays").value("월수금"));
        }

        @Test
        @DisplayName("delivery-schedule CRUD - 조회")
        void deliveryScheduleCrud_read() throws Exception {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Schedule Read Item").baseUnit("g")
                    .isOrderable(true).build());

            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).tue(false).wed(true).thu(false)
                    .fri(true).sat(false).sun(false)
                    .build());

            mockMvc.perform(get("/api/v1/master/items/" + item.getId() + "/delivery-schedule")
                            .header("Authorization", "Bearer " + storeManagerToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.itemId").value(item.getId()))
                    .andExpect(jsonPath("$.data.mon").value(true))
                    .andExpect(jsonPath("$.data.wed").value(true))
                    .andExpect(jsonPath("$.data.fri").value(true))
                    .andExpect(jsonPath("$.data.isActive").value(true));
        }

        @Test
        @DisplayName("delivery-schedule CRUD - 수정")
        void deliveryScheduleCrud_update() throws Exception {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Schedule Update Item").baseUnit("g")
                    .isOrderable(true).build());

            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).wed(true).fri(true)
                    .tue(false).thu(false).sat(false).sun(false)
                    .build());

            // Update: change to TUE_THU_SAT
            String body = objectMapper.writeValueAsString(Map.of(
                    "mon", false, "tue", true, "wed", false,
                    "thu", true, "fri", false, "sat", true, "sun", false));

            mockMvc.perform(put("/api/v1/master/items/" + item.getId() + "/delivery-schedule")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.mon").value(false))
                    .andExpect(jsonPath("$.data.tue").value(true))
                    .andExpect(jsonPath("$.data.thu").value(true))
                    .andExpect(jsonPath("$.data.sat").value(true))
                    .andExpect(jsonPath("$.data.displayDays").value("화목토"));
        }

        @Test
        @DisplayName("delivery-schedule CRUD - 삭제 (soft delete)")
        void deliveryScheduleCrud_delete() throws Exception {
            Item item = itemRepository.save(Item.builder()
                    .brandId(brandId).name("Schedule Delete Item").baseUnit("g")
                    .isOrderable(true).build());

            scheduleRepository.save(ItemDeliverySchedule.builder()
                    .itemId(item.getId()).brandId(brandId)
                    .mon(true).wed(true).fri(true)
                    .tue(false).thu(false).sat(false).sun(false)
                    .build());

            mockMvc.perform(delete("/api/v1/master/items/" + item.getId() + "/delivery-schedule")
                            .header("Authorization", "Bearer " + superAdminToken))
                    .andExpect(status().isOk());

            // After soft delete, schedule should exist but isActive=false
            ItemDeliverySchedule deleted = scheduleRepository
                    .findByItemIdAndBrandId(item.getId(), brandId).orElseThrow();
            assertThat(deleted.getIsActive()).isFalse();
        }

        @Test
        @DisplayName("item 생성 - itemCode, spec 없이도 정상 동작")
        void createItemWithoutNewFields() throws Exception {
            String body = objectMapper.writeValueAsString(Map.of(
                    "brandId", brandId,
                    "name", "Basic Item",
                    "baseUnit", "ea"));

            mockMvc.perform(post("/api/v1/master/items")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.name").value("Basic Item"));
        }
    }
}
