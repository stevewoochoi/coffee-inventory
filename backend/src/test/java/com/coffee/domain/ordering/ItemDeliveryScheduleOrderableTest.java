package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.entity.ItemDeliverySchedule;
import com.coffee.domain.master.repository.ItemDeliveryScheduleRepository;
import com.coffee.domain.master.repository.ItemRepository;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 납품가능일(ItemDeliverySchedule) 기반 발주 가능 여부 테스트 20건
 *
 * 핵심 로직: DeliveryPolicyService.isItemOrderableForDate()
 *   - 스케줄이 있고 하루라도 지정되면 → 해당 요일만 주문 가능
 *   - 스케줄이 없거나 요일이 하나도 체크 안 되었으면 → 365일 전체 가능
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ItemDeliveryScheduleOrderableTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private DeliveryPolicyService policyService;

    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemDeliveryScheduleRepository scheduleRepository;
    @Autowired private DeliveryPolicyRepository policyRepository;
    @Autowired private StoreDeliveryPolicyRepository storePolicyRepository;

    private Long brandId;
    private Long storeId;
    private String token;

    /** 특정 요일의 미래 날짜를 구함 (리드타임 넘어서) */
    private LocalDate futureDate(DayOfWeek dow) {
        LocalDate d = LocalDate.now().plusDays(5);
        while (d.getDayOfWeek() != dow) d = d.plusDays(1);
        return d;
    }

    /** 테스트용 아이템 생성 (orderable=true, leadTime=1) */
    private Item createItem(String name) {
        return itemRepository.save(Item.builder()
                .brandId(brandId).name(name).baseUnit("g")
                .isOrderable(true).leadTimeDays(1).build());
    }

    /** 아이템에 납품 스케줄 설정 */
    private ItemDeliverySchedule createSchedule(Long itemId,
            boolean mon, boolean tue, boolean wed, boolean thu,
            boolean fri, boolean sat, boolean sun) {
        return scheduleRepository.save(ItemDeliverySchedule.builder()
                .itemId(itemId).brandId(brandId)
                .mon(mon).tue(tue).wed(wed).thu(thu)
                .fri(fri).sat(sat).sun(sun)
                .isActive(true).build());
    }

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("TestCo").build());
        Brand brand = brandRepository.save(Brand.builder().companyId(company.getId()).name("TestBrand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("TestStore").build());
        storeId = store.getId();

        // 정책: cutoff 09:00, leadDaysBefore=1, leadDaysAfter=2
        DeliveryPolicy policy = policyRepository.save(DeliveryPolicy.builder()
                .brandId(brandId).policyName("TestPolicy")
                .deliveryDays("EVERYDAY")
                .cutoffTime(LocalTime.of(9, 0))
                .cutoffLeadDaysBefore(1).cutoffLeadDaysAfter(2)
                .isActive(true).build());

        storePolicyRepository.save(StoreDeliveryPolicy.builder()
                .storeId(storeId).deliveryPolicyId(policy.getId()).isDefault(true).build());

        token = jwtUtil.generateAccessToken(1L, "test@test.com", "SUPER_ADMIN",
                company.getId(), brandId, storeId);
    }

    // ─── 1~7: 월화수목금토일 개별 스케줄 → 해당 요일만 주문 가능 ───

    @Test
    @DisplayName("1. 월요일만 납품 → 월요일 주문 가능")
    void monOnly_orderableOnMonday() {
        Item item = createItem("MondayItem");
        createSchedule(item.getId(), true, false, false, false, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.MONDAY), storeId)).isTrue();
    }

    @Test
    @DisplayName("2. 월요일만 납품 → 화요일 주문 불가")
    void monOnly_notOrderableOnTuesday() {
        Item item = createItem("MondayItem2");
        createSchedule(item.getId(), true, false, false, false, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.TUESDAY), storeId)).isFalse();
    }

    @Test
    @DisplayName("3. 월요일만 납품 → 수요일 주문 불가")
    void monOnly_notOrderableOnWednesday() {
        Item item = createItem("MondayItem3");
        createSchedule(item.getId(), true, false, false, false, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.WEDNESDAY), storeId)).isFalse();
    }

    @Test
    @DisplayName("4. 화목 납품 → 화요일 주문 가능")
    void tueThu_orderableOnTuesday() {
        Item item = createItem("TueThItem");
        createSchedule(item.getId(), false, true, false, true, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.TUESDAY), storeId)).isTrue();
    }

    @Test
    @DisplayName("5. 화목 납품 → 목요일 주문 가능")
    void tueThu_orderableOnThursday() {
        Item item = createItem("TueThItem2");
        createSchedule(item.getId(), false, true, false, true, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.THURSDAY), storeId)).isTrue();
    }

    @Test
    @DisplayName("6. 화목 납품 → 월요일 주문 불가")
    void tueThu_notOrderableOnMonday() {
        Item item = createItem("TueThItem3");
        createSchedule(item.getId(), false, true, false, true, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.MONDAY), storeId)).isFalse();
    }

    @Test
    @DisplayName("7. 화목 납품 → 금요일 주문 불가")
    void tueThu_notOrderableOnFriday() {
        Item item = createItem("TueThItem4");
        createSchedule(item.getId(), false, true, false, true, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.FRIDAY), storeId)).isFalse();
    }

    // ─── 8~10: 월수금 스케줄 ───

    @Test
    @DisplayName("8. 월수금 납품 → 수요일 주문 가능")
    void monWedFri_orderableOnWednesday() {
        Item item = createItem("MWFItem");
        createSchedule(item.getId(), true, false, true, false, true, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.WEDNESDAY), storeId)).isTrue();
    }

    @Test
    @DisplayName("9. 월수금 납품 → 금요일 주문 가능")
    void monWedFri_orderableOnFriday() {
        Item item = createItem("MWFItem2");
        createSchedule(item.getId(), true, false, true, false, true, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.FRIDAY), storeId)).isTrue();
    }

    @Test
    @DisplayName("10. 월수금 납품 → 토요일 주문 불가")
    void monWedFri_notOrderableOnSaturday() {
        Item item = createItem("MWFItem3");
        createSchedule(item.getId(), true, false, true, false, true, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.SATURDAY), storeId)).isFalse();
    }

    // ─── 11~12: 스케줄 없으면 모든 요일 주문 가능 ───

    @Test
    @DisplayName("11. 스케줄 없음 → 월요일 주문 가능")
    void noSchedule_orderableOnMonday() {
        Item item = createItem("NoSchedItem");
        // 스케줄 설정 안 함

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.MONDAY), storeId)).isTrue();
    }

    @Test
    @DisplayName("12. 스케줄 없음 → 일요일도 주문 가능")
    void noSchedule_orderableOnSunday() {
        Item item = createItem("NoSchedItem2");

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.SUNDAY), storeId)).isTrue();
    }

    // ─── 13: 모든 요일 false(체크 안 함) → 365일 가능 ───

    @Test
    @DisplayName("13. 모든 요일 false → 365일 주문 가능 (스케줄 없는 것과 동일)")
    void allDaysFalse_orderableAnyday() {
        Item item = createItem("AllFalseItem");
        createSchedule(item.getId(), false, false, false, false, false, false, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.WEDNESDAY), storeId)).isTrue();
        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.SUNDAY), storeId)).isTrue();
    }

    // ─── 14: 토요일만 납품 ───

    @Test
    @DisplayName("14. 토요일만 납품 → 토요일만 주문 가능, 평일 불가")
    void satOnly_orderableOnlySaturday() {
        Item item = createItem("SatItem");
        createSchedule(item.getId(), false, false, false, false, false, true, false);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.SATURDAY), storeId)).isTrue();
        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.MONDAY), storeId)).isFalse();
        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.FRIDAY), storeId)).isFalse();
    }

    // ─── 15: 일요일만 납품 ───

    @Test
    @DisplayName("15. 일요일만 납품 → 일요일만 주문 가능")
    void sunOnly_orderableOnlySunday() {
        Item item = createItem("SunItem");
        createSchedule(item.getId(), false, false, false, false, false, false, true);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.SUNDAY), storeId)).isTrue();
        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.WEDNESDAY), storeId)).isFalse();
    }

    // ─── 16: 비활성 스케줄(isActive=false) → 무시 → 365일 가능 ───

    @Test
    @DisplayName("16. 비활성 스케줄(isActive=false) → 스케줄 무시, 365일 가능")
    void inactiveSchedule_ignoredAllDaysOrderable() {
        Item item = createItem("InactiveSchedItem");
        ItemDeliverySchedule sched = createSchedule(item.getId(), true, false, false, false, false, false, false);
        sched.setIsActive(false);
        scheduleRepository.save(sched);

        // 화요일은 원래 불가이지만, 스케줄이 비활성이므로 가능
        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.TUESDAY), storeId)).isTrue();
    }

    // ─── 17: isOrderable=false인 아이템 → 스케줄 무관하게 항상 불가 ───

    @Test
    @DisplayName("17. isOrderable=false → 스케줄에 관계없이 항상 주문 불가")
    void nonOrderableItem_alwaysUnorderable() {
        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("NotOrderable").baseUnit("g")
                .isOrderable(false).leadTimeDays(1).build());
        createSchedule(item.getId(), true, true, true, true, true, true, true);

        assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(DayOfWeek.MONDAY), storeId)).isFalse();
    }

    // ─── 18: 전체 요일 true(매일) → 매일 주문 가능 ───

    @Test
    @DisplayName("18. 모든 요일 true(매일 납품) → 매일 주문 가능")
    void allDaysTrue_orderableEveryday() {
        Item item = createItem("EverydayItem");
        createSchedule(item.getId(), true, true, true, true, true, true, true);

        for (DayOfWeek dow : DayOfWeek.values()) {
            assertThat(policyService.isItemOrderableForDate(item.getId(), futureDate(dow), storeId))
                    .as("Should be orderable on " + dow)
                    .isTrue();
        }
    }

    // ─── 19: API 엔드포인트 — 스케줄 생성 후 조회 ───

    @Test
    @DisplayName("19. API: 납품 스케줄 생성 → 조회 시 요일 반환 확인")
    void api_createAndGetSchedule() throws Exception {
        Item item = createItem("ApiItem");

        String body = """
            {"mon": true, "tue": false, "wed": true, "thu": false, "fri": true, "sat": false, "sun": false}
            """;

        mockMvc.perform(post("/api/v1/master/items/{itemId}/delivery-schedule", item.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mon").value(true))
                .andExpect(jsonPath("$.data.wed").value(true))
                .andExpect(jsonPath("$.data.fri").value(true))
                .andExpect(jsonPath("$.data.tue").value(false))
                .andExpect(jsonPath("$.data.sat").value(false));

        // 조회
        mockMvc.perform(get("/api/v1/master/items/{itemId}/delivery-schedule", item.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mon").value(true))
                .andExpect(jsonPath("$.data.wed").value(true))
                .andExpect(jsonPath("$.data.fri").value(true));
    }

    // ─── 20: 두 상품, 서로 다른 스케줄 → 같은 날짜에 하나만 주문 가능 ───

    @Test
    @DisplayName("20. 상품A(월수금), 상품B(화목) → 수요일: A 가능, B 불가")
    void twoItems_differentSchedules_sameDate() {
        Item itemA = createItem("ItemA_MWF");
        Item itemB = createItem("ItemB_TT");
        createSchedule(itemA.getId(), true, false, true, false, true, false, false);
        createSchedule(itemB.getId(), false, true, false, true, false, false, false);

        LocalDate wednesday = futureDate(DayOfWeek.WEDNESDAY);

        assertThat(policyService.isItemOrderableForDate(itemA.getId(), wednesday, storeId))
                .as("ItemA(월수금) should be orderable on Wednesday").isTrue();
        assertThat(policyService.isItemOrderableForDate(itemB.getId(), wednesday, storeId))
                .as("ItemB(화목) should NOT be orderable on Wednesday").isFalse();

        LocalDate thursday = futureDate(DayOfWeek.THURSDAY);

        assertThat(policyService.isItemOrderableForDate(itemA.getId(), thursday, storeId))
                .as("ItemA(월수금) should NOT be orderable on Thursday").isFalse();
        assertThat(policyService.isItemOrderableForDate(itemB.getId(), thursday, storeId))
                .as("ItemB(화목) should be orderable on Thursday").isTrue();
    }
}
