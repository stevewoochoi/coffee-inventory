package com.coffee.domain.ordering;

import com.coffee.common.util.JwtUtil;
import com.coffee.domain.master.entity.Item;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.ordering.dto.DeliveryPolicyDto;
import com.coffee.domain.ordering.entity.DeliveryHoliday;
import com.coffee.domain.ordering.entity.DeliveryPolicy;
import com.coffee.domain.ordering.entity.StoreDeliveryPolicy;
import com.coffee.domain.ordering.repository.DeliveryHolidayRepository;
import com.coffee.domain.ordering.repository.DeliveryPolicyRepository;
import com.coffee.domain.ordering.repository.StoreDeliveryPolicyRepository;
import com.coffee.domain.ordering.service.DeliveryPolicyService;
import com.coffee.domain.org.entity.Brand;
import com.coffee.domain.org.entity.Company;
import com.coffee.domain.org.entity.Store;
import com.coffee.domain.org.repository.BrandRepository;
import com.coffee.domain.org.repository.CompanyRepository;
import com.coffee.domain.org.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DeliveryPolicyServiceTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private DeliveryPolicyService deliveryPolicyService;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private DeliveryPolicyRepository policyRepository;
    @Autowired private StoreDeliveryPolicyRepository storePolicyRepository;
    @Autowired private DeliveryHolidayRepository holidayRepository;

    private String token;
    private Long storeId;
    private Long brandId;
    private Long companyId;
    private DeliveryPolicy policy;

    @BeforeEach
    void setUp() {
        Company company = companyRepository.save(Company.builder().name("Co").build());
        companyId = company.getId();
        Brand brand = brandRepository.save(Brand.builder().companyId(companyId).name("Brand").build());
        brandId = brand.getId();
        Store store = storeRepository.save(Store.builder().brandId(brandId).name("Store").build());
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

        token = jwtUtil.generateAccessToken(1L, "a@t.com", "STORE_MANAGER",
                companyId, brandId, storeId);
    }

    @Test
    @DisplayName("매장 배송정책 조회 - 기본 정책 반환")
    void getStorePolicy_returnsDefaultPolicy() {
        DeliveryPolicy result = deliveryPolicyService.getStorePolicy(storeId);

        assertThat(result).isNotNull();
        assertThat(result.getPolicyName()).isEqualTo("MWF Policy");
        assertThat(result.getDeliveryDays()).isEqualTo("MON_WED_FRI");
        assertThat(result.getCutoffTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(result.getCutoffLeadDaysBefore()).isEqualTo(2);
        assertThat(result.getCutoffLeadDaysAfter()).isEqualTo(3);
    }

    @Test
    @DisplayName("배송 가능일 조회 - MON/WED/FRI만 포함")
    void getAvailableDates_returnsOnlyDeliveryDays() {
        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(storeId, 14);

        assertThat(response.getAvailableDates()).isNotEmpty();
        assertThat(response.getStoreDeliveryType()).isEqualTo("MON_WED_FRI");
        assertThat(response.getCutoffTime()).isEqualTo("09:00");

        Set<DayOfWeek> returnedDays = response.getAvailableDates().stream()
                .map(d -> d.getDate().getDayOfWeek())
                .collect(Collectors.toSet());

        // Should only contain Monday, Wednesday, Friday
        assertThat(returnedDays).isSubsetOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
    }

    @Test
    @DisplayName("배송 가능일 조회 - 일요일 제외")
    void getAvailableDates_excludesSundays() {
        // Change policy to EVERYDAY
        policy.setDeliveryDays("EVERYDAY");
        policyRepository.save(policy);

        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(storeId, 14);

        Set<DayOfWeek> returnedDays = response.getAvailableDates().stream()
                .map(d -> d.getDate().getDayOfWeek())
                .collect(Collectors.toSet());

        assertThat(returnedDays).doesNotContain(DayOfWeek.SUNDAY);
    }

    @Test
    @DisplayName("배송 가능일 조회 - 공휴일 제외")
    void getAvailableDates_excludesHolidays() {
        // Find the next Monday that should be a delivery day
        LocalDate nextMonday = LocalDate.now().plusDays(5);
        while (nextMonday.getDayOfWeek() != DayOfWeek.MONDAY) {
            nextMonday = nextMonday.plusDays(1);
        }

        // Register it as a holiday
        final LocalDate holidayDate = nextMonday;
        holidayRepository.save(DeliveryHoliday.builder()
                .brandId(brandId)
                .holidayDate(holidayDate)
                .description("Test Holiday")
                .build());

        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(storeId, 14);

        List<LocalDate> returnedDates = response.getAvailableDates().stream()
                .map(DeliveryPolicyDto.AvailableDate::getDate)
                .collect(Collectors.toList());

        assertThat(returnedDates).doesNotContain(holidayDate);
    }

    @Test
    @DisplayName("배송 가능일 조회 - 첫 번째 날짜가 추천일")
    void getAvailableDates_firstDateIsRecommended() {
        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(storeId, 14);

        if (!response.getAvailableDates().isEmpty()) {
            assertThat(response.getAvailableDates().get(0).isRecommended()).isTrue();

            // Non-first dates should not be recommended
            for (int i = 1; i < response.getAvailableDates().size(); i++) {
                assertThat(response.getAvailableDates().get(i).isRecommended()).isFalse();
            }
        }
    }

    @Test
    @DisplayName("cutoff 계산 - deliveryDate 기준 D-2 09:00")
    void calculateCutoff_returnsCorrectDeadline() {
        LocalDate deliveryDate = LocalDate.of(2026, 3, 6); // Friday
        LocalDateTime cutoff = deliveryPolicyService.calculateCutoff(deliveryDate, policy);

        // D-2 at 09:00 => March 4 (Wednesday) at 09:00
        assertThat(cutoff).isEqualTo(LocalDateTime.of(2026, 3, 4, 9, 0));
    }

    @Test
    @DisplayName("TUE_THU_SAT 정책 - 해당 요일만 배송")
    void getAvailableDates_tueThuSatPolicy() {
        policy.setDeliveryDays("TUE_THU_SAT");
        policyRepository.save(policy);

        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(storeId, 14);

        Set<DayOfWeek> returnedDays = response.getAvailableDates().stream()
                .map(d -> d.getDate().getDayOfWeek())
                .collect(Collectors.toSet());

        assertThat(returnedDays).isSubsetOf(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY);
    }

    @Test
    @DisplayName("EVERYDAY 정책 - 월~토 배송 (일요일 제외)")
    void getAvailableDates_everydayPolicy() {
        policy.setDeliveryDays("EVERYDAY");
        policyRepository.save(policy);

        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(storeId, 14);

        Set<DayOfWeek> returnedDays = response.getAvailableDates().stream()
                .map(d -> d.getDate().getDayOfWeek())
                .collect(Collectors.toSet());

        assertThat(returnedDays).doesNotContain(DayOfWeek.SUNDAY);
        // EVERYDAY should have more unique days than MON_WED_FRI
        assertThat(returnedDays.size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    @DisplayName("발주 가능 여부 확인 - 유효한 날짜")
    void checkOrderAvailability_validDate_returnsAvailable() {
        // Find a valid delivery date far enough in the future
        LocalDate futureDate = LocalDate.now().plusDays(7);
        while (futureDate.getDayOfWeek() != DayOfWeek.MONDAY
                && futureDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                && futureDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
            futureDate = futureDate.plusDays(1);
        }

        DeliveryPolicyDto.OrderAvailability availability =
                deliveryPolicyService.checkOrderAvailability(storeId, futureDate);

        assertThat(availability.isAvailable()).isTrue();
        assertThat(availability.getDeadline()).isNotNull();
        assertThat(availability.getRemainingMinutes()).isGreaterThan(0);
    }

    @Test
    @DisplayName("발주 가능 여부 확인 - 배송 불가 요일")
    void checkOrderAvailability_invalidDay_returnsUnavailable() {
        // Find a Tuesday (not in MON_WED_FRI)
        LocalDate tuesday = LocalDate.now().plusDays(5);
        while (tuesday.getDayOfWeek() != DayOfWeek.TUESDAY) {
            tuesday = tuesday.plusDays(1);
        }

        DeliveryPolicyDto.OrderAvailability availability =
                deliveryPolicyService.checkOrderAvailability(storeId, tuesday);

        assertThat(availability.isAvailable()).isFalse();
    }

    @Test
    @DisplayName("발주 가능 여부 확인 - 마감 시간 지난 날짜")
    void checkOrderAvailability_pastDeadline_returnsUnavailable() {
        // Use a date that's already past (today or yesterday) - cutoff is D-2 09:00
        LocalDate pastDate = LocalDate.now();
        // Find nearest Mon/Wed/Fri
        while (pastDate.getDayOfWeek() != DayOfWeek.MONDAY
                && pastDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                && pastDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
            pastDate = pastDate.plusDays(1);
        }

        // If the delivery date is today or tomorrow, the cutoff (D-2) is already past
        DeliveryPolicyDto.OrderAvailability availability =
                deliveryPolicyService.checkOrderAvailability(storeId, LocalDate.now());

        // Today's cutoff would be 2 days ago at 09:00, definitely past
        assertThat(availability.isAvailable()).isFalse();
    }

    @Test
    @DisplayName("아이템 발주 가능 여부 - orderable 아이템")
    void isItemOrderableForDate_orderableItem() {
        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("Coffee").baseUnit("g")
                .isOrderable(true).leadTimeDays(2).build());

        // Find a valid future delivery date
        LocalDate futureDate = LocalDate.now().plusDays(7);
        while (futureDate.getDayOfWeek() != DayOfWeek.MONDAY
                && futureDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                && futureDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
            futureDate = futureDate.plusDays(1);
        }

        boolean orderable = deliveryPolicyService.isItemOrderableForDate(
                item.getId(), futureDate, storeId);

        assertThat(orderable).isTrue();
    }

    @Test
    @DisplayName("아이템 발주 가능 여부 - 비발주 아이템 거부")
    void isItemOrderableForDate_nonOrderableItem() {
        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("Non-orderable").baseUnit("g")
                .isOrderable(false).build());

        LocalDate futureDate = LocalDate.now().plusDays(7);
        while (futureDate.getDayOfWeek() != DayOfWeek.MONDAY) {
            futureDate = futureDate.plusDays(1);
        }

        boolean orderable = deliveryPolicyService.isItemOrderableForDate(
                item.getId(), futureDate, storeId);

        assertThat(orderable).isFalse();
    }

    @Test
    @DisplayName("아이템별 리드타임이 긴 경우 발주 불가")
    void isItemOrderableForDate_longLeadTimeItem() {
        Item item = itemRepository.save(Item.builder()
                .brandId(brandId).name("Long Lead Item").baseUnit("g")
                .isOrderable(true).leadTimeDays(10).build());

        // Find a delivery date only 5 days out - less than 10 day lead time
        LocalDate nearDate = LocalDate.now().plusDays(5);
        while (nearDate.getDayOfWeek() != DayOfWeek.MONDAY
                && nearDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                && nearDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
            nearDate = nearDate.plusDays(1);
        }
        // If the date ended up being > 10 days out, push it closer
        if (java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), nearDate) >= 10) {
            // Use a date that's only 3 days out
            nearDate = LocalDate.now().plusDays(3);
            while (nearDate.getDayOfWeek() != DayOfWeek.MONDAY
                    && nearDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                    && nearDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
                nearDate = nearDate.plusDays(1);
            }
        }

        boolean orderable = deliveryPolicyService.isItemOrderableForDate(
                item.getId(), nearDate, storeId);

        // Lead time is 10 days but delivery is < 10 days out, so not orderable
        if (java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), nearDate) < 10) {
            assertThat(orderable).isFalse();
        }
    }

    @Test
    @DisplayName("배송정책이 없는 매장 - 빈 결과 반환")
    void getAvailableDates_noPolicyStore_returnsEmpty() {
        // Create store without policy
        Store store2 = storeRepository.save(Store.builder().brandId(brandId).name("Store2").build());

        // Remove brand policies to prevent fallback
        policyRepository.deleteAll();

        DeliveryPolicyDto.AvailableDateResponse response =
                deliveryPolicyService.getAvailableDates(store2.getId(), 14);

        assertThat(response.getAvailableDates()).isEmpty();
        assertThat(response.getStoreDeliveryType()).isEqualTo("NONE");
    }

    @Test
    @DisplayName("API: /delivery-dates 엔드포인트 정상 응답")
    void deliveryDatesApi_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/ordering/delivery-dates")
                        .param("storeId", storeId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.storeDeliveryType").value("MON_WED_FRI"))
                .andExpect(jsonPath("$.data.cutoffTime").value("09:00"))
                .andExpect(jsonPath("$.data.availableDates").isArray());
    }

    @Test
    @DisplayName("API: /availability 엔드포인트 정상 응답")
    void availabilityApi_returnsOk() throws Exception {
        LocalDate futureDate = LocalDate.now().plusDays(7);
        while (futureDate.getDayOfWeek() != DayOfWeek.MONDAY
                && futureDate.getDayOfWeek() != DayOfWeek.WEDNESDAY
                && futureDate.getDayOfWeek() != DayOfWeek.FRIDAY) {
            futureDate = futureDate.plusDays(1);
        }

        mockMvc.perform(get("/api/v1/ordering/availability")
                        .param("storeId", storeId.toString())
                        .param("deliveryDate", futureDate.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.available").value(true))
                .andExpect(jsonPath("$.data.deadline").isNotEmpty())
                .andExpect(jsonPath("$.data.remainingMinutes").isNumber());
    }
}
