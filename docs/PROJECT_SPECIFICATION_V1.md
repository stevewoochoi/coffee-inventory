# Coffee Inventory System - 프로젝트 전체 명세서 V1

> 최종 업데이트: 2026-03-21
> 이 문서는 다음 버전 개발을 위한 현재 시스템의 완전한 참조 문서입니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [백엔드 상세](#4-백엔드-상세)
   - 4.1 [의존성](#41-의존성)
   - 4.2 [설정 파일](#42-설정-파일)
   - 4.3 [데이터 모델 (Entity)](#43-데이터-모델-entity)
   - 4.4 [API 엔드포인트 전체 목록](#44-api-엔드포인트-전체-목록)
   - 4.5 [서비스 계층](#45-서비스-계층)
   - 4.6 [보안 (JWT/RBAC)](#46-보안-jwtrbac)
   - 4.7 [DB 마이그레이션 (Flyway)](#47-db-마이그레이션-flyway)
   - 4.8 [테스트](#48-테스트)
5. [프론트엔드 상세](#5-프론트엔드-상세)
   - 5.1 [의존성](#51-의존성)
   - 5.2 [라우팅 & 페이지 목록](#52-라우팅--페이지-목록)
   - 5.3 [API 모듈](#53-api-모듈)
   - 5.4 [상태 관리 (Zustand)](#54-상태-관리-zustand)
   - 5.5 [컴포넌트 라이브러리](#55-컴포넌트-라이브러리)
   - 5.6 [다국어 (i18n)](#56-다국어-i18n)
   - 5.7 [테마 시스템](#57-테마-시스템)
   - 5.8 [PWA & 오프라인](#58-pwa--오프라인)
   - 5.9 [네비게이션 구조](#59-네비게이션-구조)
6. [인프라 & 배포](#6-인프라--배포)
   - 6.1 [Docker Compose](#61-docker-compose)
   - 6.2 [Nginx 설정](#62-nginx-설정)
   - 6.3 [배포 스크립트](#63-배포-스크립트)
   - 6.4 [환경 변수](#64-환경-변수)
7. [데이터 관계도](#7-데이터-관계도)
8. [완료된 기능 요약](#8-완료된-기능-요약)
9. [알려진 제약사항 & 개선점](#9-알려진-제약사항--개선점)

---

## 1. 프로젝트 개요

일본 시장 대상 커피 전문점 재고 관리 시스템. 멀티테넌트(회사→브랜드→매장) 구조로 본사/매장 모두 지원.

| 항목 | 내용 |
|------|------|
| 대상 시장 | 일본 (Tokyo) |
| 사용자 | 본사 관리자, 매장 매니저, 공급업체 |
| 언어 지원 | 영어, 한국어, 일본어 |
| 운영 환경 | AWS Lightsail + Docker Compose |
| DB | AWS RDS MySQL 8.0 (ap-northeast-1) |
| 도메인 | inv.tokyoplatz.com |

---

## 2. 기술 스택

### 백엔드
| 기술 | 버전 |
|------|------|
| Java | 17 |
| Spring Boot | 3.2.5 |
| Spring Data JPA | Hibernate |
| Spring Security | JWT 기반 |
| Flyway | DB 마이그레이션 |
| JJWT | 0.12.5 |
| MySQL Connector | 런타임 |
| Apache PDFBox | 3.0.2 |
| Apache POI | 5.2.5 |
| AWS SDK v2 S3 | 2.25.60 |
| Web Push (VAPID) | 5.1.1 |
| Maven | 빌드 도구 |

### 프론트엔드
| 기술 | 버전 |
|------|------|
| React | 19.2.0 |
| Vite | 7.3.1 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 3.4.19 |
| shadcn/ui | Radix 기반 |
| Zustand | 5.0.11 |
| Axios | 1.13.5 |
| React Router | 7.13.1 |
| i18next | 25.8.13 |
| Recharts | 3.7.0 |
| TanStack Query | 5.90.21 |
| Lucide React | 아이콘 |
| @zxing/library | 0.21.3 (바코드) |
| Vite PWA | 1.2.0 |

### 인프라
| 기술 | 버전/서비스 |
|------|------------|
| Docker Compose | 3.8 |
| Nginx | 1.25-alpine |
| AWS Lightsail | 호스팅 |
| AWS RDS | MySQL 8.0 |
| AWS S3 | 파일 저장소 |
| eclipse-temurin | 17-jre (Docker) |
| Node | 20-alpine (빌드) |

---

## 3. 프로젝트 구조

```
/home/ubuntu/coffee-inventory/
├── backend/                    # Spring Boot 백엔드
│   ├── src/main/java/com/coffee/
│   │   ├── config/            # Security, CORS, Web 설정
│   │   ├── controller/        # REST 컨트롤러 (38개)
│   │   ├── dto/               # Request/Response DTO
│   │   ├── entity/            # JPA 엔티티 (35개+)
│   │   ├── exception/         # 예외 처리
│   │   ├── repository/        # Spring Data JPA
│   │   ├── security/          # JWT, UserDetails
│   │   └── service/           # 비즈니스 로직
│   ├── src/main/resources/
│   │   ├── application.yml    # 메인 설정
│   │   └── db/migration/      # Flyway (V1~V34)
│   ├── src/test/              # 테스트 (53개)
│   ├── pom.xml
│   └── Dockerfile
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── api/               # API 클라이언트 (21개 모듈)
│   │   ├── components/        # 공용 컴포넌트 (25개)
│   │   ├── config/            # 네비게이션 설정
│   │   ├── hooks/             # 커스텀 훅
│   │   ├── lib/               # 유틸리티
│   │   ├── locales/           # 번역 파일 (en/ko/ja)
│   │   ├── pages/             # 페이지 컴포넌트 (44개)
│   │   │   ├── admin/         # 본사 관리 페이지
│   │   │   ├── store/         # 매장 페이지
│   │   │   └── supplier/      # 공급업체 포탈
│   │   ├── store/             # Zustand 상태 관리
│   │   ├── App.tsx            # 라우터 설정
│   │   ├── i18n.ts            # 다국어 설정
│   │   └── main.tsx           # 엔트리포인트
│   ├── public/
│   │   ├── manifest.json      # PWA 매니페스트
│   │   └── custom-sw.js       # 서비스 워커
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── infra/                      # 인프라 설정
│   ├── docker-compose.yml
│   ├── deploy.sh
│   └── nginx/nginx.conf
├── docs/                       # 문서
├── .env                        # 환경 변수
├── .gitignore
└── CLAUDE.md                   # 개발 규칙
```

---

## 4. 백엔드 상세

### 4.1 의존성

```xml
<!-- 핵심 -->
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation
spring-boot-starter-actuator

<!-- DB -->
mysql-connector-j (runtime)
flyway-core + flyway-mysql

<!-- JWT -->
jjwt-api / jjwt-impl / jjwt-jackson (0.12.5)

<!-- AWS -->
aws-sdk-v2-s3 (2.25.60)

<!-- 문서 생성 -->
pdfbox (3.0.2)
poi-ooxml (5.2.5)

<!-- 푸시 알림 -->
webpush (5.1.1)
bcprov-jdk18on (1.78.1)

<!-- 테스트 -->
spring-boot-starter-test
spring-security-test
h2 (test scope)
```

### 4.2 설정 파일

**application.yml 주요 설정:**
```yaml
spring:
  datasource:
    url: ${DB_URL}
    hikari: minimum-idle=5, maximum-pool-size=10
  jpa:
    hibernate.ddl-auto: validate
    dialect: MySQL8Dialect
  flyway:
    enabled: true
    repair-on-migrate: true

jwt:
  secret: ${JWT_SECRET}
  access-token-expiry: 3600      # 1시간
  refresh-token-expiry: 604800   # 7일

aws:
  region: ap-northeast-1
  s3.bucket: coffee-inventory-files

management:
  endpoints.web.exposure.include: health,info,metrics,loggers
```

### 4.3 데이터 모델 (Entity)

#### 조직 (Organization)

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **Company** | id, name, createdAt | 최상위 테넌트 |
| **Brand** | id, companyId, name, createdAt | 회사 하위 브랜드 |
| **Store** | id, brandId, name, timezone(Asia/Tokyo), status(ACTIVE), address, phone, openDate, memo, createdAt | 매장 |
| **User** | id, email, name, passwordHash, role, companyId, brandId, storeId, isActive, accountStatus(PENDING_APPROVAL), approvedBy, approvedAt, rejectedReason, registeredAt, createdAt | 사용자 |
| **UserStore** | id, userId, storeId | 다중 매장 접근 (junction) |

#### 마스터 데이터 (Master)

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **Item** | id, brandId, name, nameEn, nameJa, nameKo, categoryId, baseUnit, price(12,2), vatInclusive(true), supplierId, minStockQty, leadTimeDays(2), lossRate, maxOrderQty, temperatureZone(AMBIENT), isOrderable(true), itemCode, spec, description, imageUrl, isActive(true), createdAt | 상품 마스터 |
| **ItemCategory** | id, brandId, name, parentId, displayOrder, createdAt | 카테고리 (트리 구조) |
| **Packaging** | id, itemId, packName, unitsPerPack(10,3), packBarcode, status(ACTIVE/DEPRECATED), imageUrl, createdAt | 포장 단위 |
| **Supplier** | id, brandId, name, email, bizNo, representative, phone, address, orderMethod(EMAIL/PORTAL/EDI), memo, createdAt | 공급업체 |
| **SupplierItem** | id, supplierId, packagingId, supplierSku, leadTimeDays, price(12,2) | 공급업체별 상품 가격 |
| **ItemDeliverySchedule** | id, itemId, supplierId, dayOfWeek, cutoffTime, leadDays, createdAt | 배송 스케줄 |

#### 재고 (Inventory)

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **InventorySnapshot** | id, storeId, itemId, expDate, lotNo, qtyBaseUnit(12,3), updatedAt | 현재 재고 (FIFO 로트 추적) |
| **StockLedger** | id, storeId, itemId, qtyBaseUnit(12,3), expDate, lotNo, type(RECEIVE/SELL/WASTE/DAMAGE_RECEIVE/ADJUST), refType, refId, memo, createdBy, createdAt | 입출고 원장 |
| **ItemExpiryAlert** | id, storeId, itemId, expDate, alertStatus(NEW/CLEARED), quantity, createdAt | 유통기한 알림 |
| **LowStockAlert** | id, storeId, itemId, currentQty, minQty, alertStatus(NEW/CLEARED), createdAt | 재고 부족 알림 |

#### 입고 & 폐기

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **Delivery** | id, storeId, supplierId, expectedAt, orderPlanId, refType, refId, status(PENDING/IN_PROGRESS/COMPLETED/CANCELLED), createdAt | 입고 |
| **DeliveryScan** | id, deliveryId, packagingId, lotNo, expDate, packCountScanned, scannedAt | 바코드 스캔 |
| **Waste** | id, storeId, itemId, qtyBaseUnit(10,3), reason, wasteType(OPERATION/DAMAGE_RECEIVE), createdBy, createdAt | 폐기/로스 |

#### 레시피 & POS

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **Menu** | id, brandId, name, posMenuId, isActive(true) | 메뉴 |
| **MenuOption** | id, menuId, name | 메뉴 옵션 |
| **RecipeComponent** | id, menuId, optionId, itemId, qtyBaseUnit(10,3) | 레시피 원재료 |
| **PosSales** | id, storeId, businessDate, menuId, optionJson(JSON), qty(1), createdAt | POS 판매 기록 |

#### 발주 (Ordering)

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **OrderPlan** | id, storeId, supplierId, status(DRAFT/CONFIRMED/DISPATCHED/RECEIVED/CANCELLED), recommendedByAi(false), deliveryDate, cutoffAt, autoConfirmedAt, fulfillmentStatus(PENDING), deliveryPolicyId, totalAmount(12,2), vatAmount(12,2), confirmedAt, dispatchedAt, receivedAt, createdAt | 발주서 |
| **OrderLine** | id, orderPlanId, packagingId, packQty | 발주 품목 |
| **OrderCart** | id, storeId, userId, deliveryDate, status(ACTIVE/CONFIRMED), createdAt | 장바구니 |
| **OrderCartItem** | id, orderCartId, packagingId, packQty | 장바구니 품목 |
| **OrderDispatchLog** | id, orderPlanId, dispatchStatus(PENDING/SENT/FAILED), dispatchMethod(EMAIL/PORTAL/EDI), dispatchedAt, pdfUrl, createdAt | 발주 전송 로그 |
| **DeliveryPolicy** | id, brandId, supplierId, deliveryDay, cutoffTime, leadDays, createdAt | 배송 정책 |
| **DeliveryHoliday** | id, deliveryPolicyId, holidayDate, createdAt | 배송 휴일 |
| **OrderShortageLog** | id, orderPlanId, packagingId, shortageQty, memo, createdAt | 부족분 로그 |
| **SupplierOrderNotification** | id, supplierId, orderPlanId, notificationStatus, sentAt, createdAt | 공급업체 알림 |

#### 실사 & 감사

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **PhysicalCount** | id, storeId, countDate, status(IN_PROGRESS/COMPLETED), countedBy, completedAt, createdAt | 재고실사 |
| **PhysicalCountLine** | id, countId, itemId, systemQty, countedQty, varianceQty, status, createdAt | 실사 품목 |
| **DailyPhysicalCount** | id, storeId, countDate, itemId, countedQty, systemQty, createdAt | 일별 실사 |
| **InventoryAudit** | id, storeId, auditDate, status(IN_PROGRESS/COMPLETED), createdBy, completedAt, createdAt | 재고 감사 |
| **InventoryAuditLine** | id, auditId, itemId, systemQty, auditQty, variance, status, createdAt | 감사 품목 |

#### 클레임 & 기타

| 엔티티 | 필드 | 비고 |
|--------|------|------|
| **Claim** | id, storeId, supplierId, itemId, qty(10,3), claimType(QUALITY/SHORTAGE/DAMAGE), claimStatus(OPEN/RESOLVED/REJECTED), resolution, memo, createdBy, createdAt | 품질 클레임 |
| **ClaimLine** | id, claimId, itemId, qty | 클레임 품목 |
| **ClaimImage** | id, claimId, imageUrl, uploadedAt | 증빙 사진 |
| **MonthlyClosing** | id, brandId, storeId, year, month, status(DRAFT/FINALIZED), createdAt | 월 마감 |
| **PushSubscription** | id, userId, endpoint, p256dh, auth, userAgent, createdAt | 푸시 구독 |
| **BulkUploadBatch** | id, brandId, batchType, status, totalRows, successCount, errorCount, createdAt | 일괄 업로드 |

### 4.4 API 엔드포인트 전체 목록

> 총 **150+ 엔드포인트**, 38개 컨트롤러

#### 인증 - `/api/v1/auth`
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/login` | 로그인 → JWT 토큰 발급 | 불필요 |
| POST | `/register` | 회원가입 (승인 대기) | 불필요 |
| GET | `/check-email` | 이메일 중복 확인 | 불필요 |
| POST | `/refresh` | 토큰 갱신 | 불필요 |

#### 조직 관리 - `/api/v1/org`
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET/POST | `/companies` | 회사 목록/생성 | SUPER_ADMIN |
| GET/PUT/DELETE | `/companies/{id}` | 회사 조회/수정/삭제 | SUPER_ADMIN |
| GET/POST | `/brands` | 브랜드 목록/생성 | SUPER_ADMIN |
| GET/PUT/DELETE | `/brands/{id}` | 브랜드 조회/수정/삭제 | SUPER_ADMIN |
| GET/POST | `/stores` | 매장 목록/생성 | SUPER_ADMIN, BRAND_ADMIN |
| GET/PUT/DELETE | `/stores/{id}` | 매장 조회/수정/삭제 | SUPER_ADMIN, BRAND_ADMIN |

#### 사용자 관리 - `/api/v1/admin/users`
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/` | 사용자 목록 (필터: status, role, search, 페이징) | SUPER_ADMIN, BRAND_ADMIN |
| GET | `/{id}` | 사용자 상세 | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}/approve` | 사용자 승인 (역할 지정) | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}/reject` | 사용자 거부 | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}` | 사용자 수정 | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}/suspend` | 사용자 정지 | SUPER_ADMIN, BRAND_ADMIN |
| DELETE | `/{id}` | 사용자 삭제 (soft) | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}/stores` | 사용자 매장 할당 | SUPER_ADMIN, BRAND_ADMIN |

#### 마스터 상품 - `/api/v1/master/items`
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/` | 상품 목록 (?brandId, 페이징) | SUPER_ADMIN, BRAND_ADMIN |
| GET | `/{id}` | 상품 상세 | SUPER_ADMIN, BRAND_ADMIN |
| POST | `/` | 상품 등록 | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}` | 상품 수정 | SUPER_ADMIN, BRAND_ADMIN |
| PUT | `/{id}/min-stock` | 최소 재고 설정 | SUPER_ADMIN, BRAND_ADMIN |
| POST | `/{id}/image` | 이미지 URL 설정 | SUPER_ADMIN, BRAND_ADMIN |
| DELETE | `/{id}` | 상품 비활성화 (soft) | SUPER_ADMIN, BRAND_ADMIN |
| GET | `/excel/sample` | 엑셀 템플릿 다운로드 | SUPER_ADMIN, BRAND_ADMIN |
| POST | `/excel/upload` | 엑셀 일괄 업로드 | SUPER_ADMIN, BRAND_ADMIN |

#### 포장 단위 - `/api/v1/master/packagings`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/?itemId` | 상품별 포장 목록 |
| GET | `/all` | 전체 포장 목록 (?brandId, ?status) |
| GET | `/{id}` | 포장 상세 |
| POST | `/` | 포장 등록 |
| PUT | `/{id}` | 포장 수정 |
| POST | `/{id}/image` | 이미지 URL 설정 |
| DELETE | `/{id}` | 포장 폐기 (DEPRECATED) |

#### 공급업체 - `/api/v1/master/suppliers`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/` | 공급업체 목록 (?brandId) |
| GET | `/{id}` | 공급업체 상세 |
| POST | `/` | 공급업체 등록 |
| PUT | `/{id}` | 공급업체 수정 |
| DELETE | `/{id}` | 공급업체 삭제 (soft) |
| GET | `/{supplierId}/items` | 공급업체 취급 상품 |
| POST | `/{supplierId}/items` | 공급업체에 상품 추가 |
| DELETE | `/{supplierId}/items/{itemId}` | 공급업체에서 상품 제거 |

#### 카테고리 - `/api/v1/master/item-categories`
- CRUD (트리 구조)

#### 배송 스케줄 - `/api/v1/master/item-delivery-schedules`
- CRUD (요일별 마감/리드타임 설정)

#### 재고 - `/api/v1/inventory`
| Method | Path | 설명 | 파라미터 |
|--------|------|------|---------|
| GET | `/snapshot` | 현재 재고 스냅샷 | ?storeId |
| GET | `/snapshot/lots` | 로트별 재고 | ?storeId, ?itemId |
| GET | `/ledger` | 입출고 원장 (페이징) | ?storeId, ?itemId, ?page, ?size |
| GET | `/expiry-alerts` | 유통기한 임박 알림 | ?storeId |
| GET | `/low-stock` | 재고 부족 알림 | ?storeId |
| GET | `/forecast` | 수요 예측 | ?storeId, ?brandId |
| POST | `/adjust` | 재고 수동 조정 | AdjustDto.Request |

#### 일별 재고실사 - `/api/v1/daily-counts`
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/monthly` | 월간 실사 데이터 (캘린더) | STORE_MANAGER+ |
| PUT | `/` | 일별 실사 저장 | STORE_MANAGER+ |

#### 입고 - `/api/v1/receiving/deliveries`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/` | 입고 목록 (?storeId) |
| GET | `/history` | 입고 이력 (?storeId, ?from, ?to, ?status) |
| GET | `/{id}` | 입고 상세 |
| POST | `/` | 입고 생성 |
| POST | `/{id}/scans` | 바코드 스캔 추가 |
| GET | `/{id}/scans` | 스캔 목록 |
| PUT | `/{id}/confirm` | 입고 확정 → 재고 반영 |

#### 폐기 - `/api/v1/waste`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/` | 폐기 목록 (?storeId) |
| POST | `/` | 폐기 기록 (type: OPERATION/DAMAGE_RECEIVE) |

#### 메뉴/레시피 - `/api/v1/recipe/menus`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/` | 메뉴 목록 (?brandId) |
| GET | `/{id}` | 메뉴 상세 (레시피 포함) |
| POST | `/` | 메뉴 등록 |
| PUT | `/{id}` | 메뉴 수정 |
| DELETE | `/{id}` | 메뉴 비활성화 |
| GET | `/{menuId}/components` | 레시피 원재료 목록 |
| POST | `/{menuId}/components` | 원재료 추가 |
| DELETE | `/{menuId}/components/{id}` | 원재료 제거 |

#### POS 판매 - `/api/v1/pos/sales`
| Method | Path | 설명 |
|--------|------|------|
| POST | `/` | 판매 기록 → 자동 재고 차감 |
| GET | `/summary` | 일별 판매 요약 (?storeId, ?date) |

#### 발주 - `/api/v1/ordering`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/plans/all` | 전체 발주 목록 (?brandId, ?supplierId, ?storeId, ?status) |
| GET | `/summary` | 공급업체별 발주 요약 (?brandId) |
| GET | `/plans` | 매장 발주 목록 (?storeId, ?status) |
| GET | `/plans/{id}` | 발주 조회 |
| GET | `/plans/{id}/detail` | 발주 상세 (품목 포함) |
| POST | `/plans` | 발주 생성 |
| PUT | `/plans/{id}/confirm` | 발주 확정 (DRAFT→CONFIRMED) |
| POST | `/plans/{id}/dispatch` | 발주 전송 (CONFIRMED→DISPATCHED) |
| POST | `/plans/{id}/cancel` | 발주 취소 |
| PUT | `/plans/{id}` | 발주 수정 |
| GET | `/plans/{id}/pdf` | 발주서 PDF 다운로드 |
| GET | `/needs` | 발주 필요 분석 (?storeId, ?brandId) |
| GET | `/suggestion` | AI 발주 추천 (?storeId, ?supplierId) |
| GET | `/history` | 과거 발주 이력 (?storeId, ?limit) |
| POST | `/reorder/{orderId}` | 재발주 (과거 발주 복사) |
| GET | `/catalog` | 상품 카탈로그 (?storeId, ?deliveryDate, ?categoryId, ?keyword, ?lowStockOnly, 페이징) |
| GET | `/categories` | 카테고리 트리 (?brandId) |
| GET | `/delivery-dates` | 가용 배송일 (?storeId) |

#### 장바구니 - `/api/v1/ordering/cart`
| Method | Path | 설명 |
|--------|------|------|
| POST | `/` | 장바구니 생성/추가 |
| GET | `/active` | 활성 장바구니 (?storeId) |
| PUT | `/items/{id}` | 수량 변경 |
| DELETE | `/items/{id}` | 품목 제거 |
| DELETE | `/{cartId}` | 장바구니 삭제 |
| GET | `/` | 장바구니 조회 (?storeId, ?userId) |
| POST | `/items` | 품목 추가 |
| POST | `/confirm` | 장바구니 확정 → 발주 생성 |

#### 관리자 발주 - `/api/v1/admin/ordering`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/plans` | 관리자 발주 목록 (?status, ?fulfillmentStatus) |
| GET | `/plans/{id}` | 관리자 발주 상세 |
| PUT | `/plans/{id}/fulfillment` | 이행 상태 업데이트 |

#### 재고실사 (전통) - `/api/v1/physical-count`
| Method | Path | 설명 |
|--------|------|------|
| POST | `/start` | 실사 시작 |
| PUT | `/{id}/lines/{lineId}` | 실사 수량 입력 |
| POST | `/{id}/complete` | 실사 완료 → 조정 기록 |
| GET | `/history` | 실사 이력 (?storeId) |
| GET | `/{id}` | 실사 상세 |

#### 재고 감사 - `/api/v1/audit`
| Method | Path | 설명 |
|--------|------|------|
| POST | `/` | 감사 생성 |
| GET | `/` | 감사 목록 (?storeId, ?status) |
| GET | `/{id}` | 감사 상세 (라인 포함) |
| PUT | `/lines/{lineId}` | 감사 수량 입력 |
| PUT | `/{id}/complete` | 감사 완료 → 차이 기록 |
| POST | `/{id}/cancel` | 감사 취소 |
| GET | `/summary` | 감사 KPI (?storeId) |

#### 클레임 - `/api/v1/claims`
| Method | Path | 설명 |
|--------|------|------|
| POST | `/` | 클레임 생성 (type: QUALITY/SHORTAGE/DAMAGE) |
| GET | `/` | 클레임 목록 (?storeId, ?status) |
| GET | `/{id}` | 클레임 상세 |
| PUT | `/{id}/resolve` | 클레임 해결 |
| POST | `/{id}/images` | 증빙 사진 추가 |
| GET | `/categories` | 클레임 유형 목록 |
| GET | `/summary` | 클레임 KPI (?storeId) |

#### 대시보드 - `/api/v1/dashboard`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/store/{storeId}` | 매장 대시보드 KPI |
| GET | `/brand/{brandId}` | 브랜드 대시보드 KPI |

#### 재무 - `/api/v1/finance`
- 월별 매입 요약, 재고 평가, 월간 리포트, 월 마감

#### 파일 업로드 - `/api/v1/upload`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/presigned-url` | S3 업로드용 서명 URL (?fileName, ?contentType) |

#### 웹 푸시 - `/api/v1/push`
| Method | Path | 설명 |
|--------|------|------|
| GET | `/vapid-public-key` | VAPID 공개키 |
| POST | `/subscribe` | 푸시 구독 등록 |

### 4.5 서비스 계층

| 서비스 | 주요 메서드 | 설명 |
|--------|-----------|------|
| **InventoryService** | `recordStockChange(storeId, itemId, qty, type, ref, memo, user)` | 재고 변동 기록 (원장 + 스냅샷 동시 갱신, FIFO 로트 추적) |
| **DeliveryService** | `create()`, `addScan()`, `confirm()` | 입고 처리 → 입고 확정 시 재고 자동 반영 |
| **OrderingService** | `create()`, `confirm()`, `dispatch()` | 발주 라이프사이클 관리 |
| **OrderCartService** | `createOrAddToCart()`, `confirmCart()` | 장바구니 → 발주 변환 |
| **OrderSuggestionService** | `suggest()` | 규칙 기반 발주 수량 추천 |
| **PosSalesService** | `recordSale()` | 판매 기록 → 레시피 기반 재고 차감 |
| **RecipeService** | `createMenu()`, `addComponent()` | 메뉴/레시피 관리 |
| **WebPushService** | `sendPush()` | VAPID 웹 푸시 알림 전송 |
| **ExpiryAlertScheduler** | 스케줄러 | 유통기한 임박 알림 자동 생성 |
| **LowStockScheduler** | 스케줄러 | 재고 부족 알림 자동 생성 |

### 4.6 보안 (JWT/RBAC)

**JWT 토큰 구조:**
```json
{
  "sub": "userId",
  "email": "user@example.com",
  "role": "STORE_MANAGER",
  "type": "ACCESS",
  "companyId": 1,
  "brandId": 1,
  "storeId": 1,
  "iat": 1711000000,
  "exp": 1711003600
}
```

**역할 (Roles):**
| 역할 | 설명 | 접근 범위 |
|------|------|----------|
| SUPER_ADMIN | 시스템 관리자 | 전체 |
| BRAND_ADMIN | 브랜드 관리자 | 해당 브랜드 하위 |
| STORE_MANAGER | 매장 매니저 | 해당 매장 |
| KR_INVENTORY | 재고 담당 | 재고/상품 관리 |
| KR_FINANCE | 재무 담당 | 재무 리포트 |
| FULFILLMENT | 이행 담당 | 발주 처리 |
| SUPPLIER | 공급업체 | 공급업체 포탈 |

**SecurityConfig:**
- CORS 허용 (설정 가능)
- CSRF 비활성화 (Stateless JWT)
- 세션: STATELESS
- 공개 엔드포인트: `/api/v1/auth/**`, `/actuator/health`
- 나머지: JWT 인증 필수

**비밀번호:** BCrypt 해싱

### 4.7 DB 마이그레이션 (Flyway)

| 버전 | 내용 |
|------|------|
| V1 | 초기 스키마 (company, brand, store, users, item, packaging, supplier, stock_ledger, inventory_snapshot, delivery, waste, menu, recipe, pos_sales, order_plan, order_line) |
| V2 | item.is_active 추가 |
| V3 | 테스트 시드 데이터 |
| V4 | expiry_alert, low_stock_alert 테이블 |
| V5 | physical_count, physical_count_line |
| V6 | min_stock_qty on items |
| V7 | low_stock_alert 테이블 |
| V8 | image_url 필드 추가 |
| V9 | pdf_url on dispatch_log |
| V10 | push_subscription |
| V11 | 사용자 등록/승인 필드 (account_status, approved_at 등) |
| V12~V34 | ordering, claims, audit, finance, daily physical count, 카테고리, 배송 정책, 다국어 이름 등 |

### 4.8 테스트

| 테스트 파일 | 건수 | 내용 |
|------------|------|------|
| JwtUtilTest | 8 | 토큰 생성/파싱/검증 |
| AuthControllerTest | 8 | 로그인, 회원가입, 토큰 갱신 |
| RbacTest | 11 | 역할별 접근 제어 |
| OrgControllerTest | 8 | 조직 CRUD |
| ItemControllerTest | 4 | 상품 관리 |
| PackagingControllerTest | 1 | 포장 관리 |
| SupplierControllerTest | 1 | 공급업체 관리 |
| InventoryServiceTest | 5 | 재고 추적 |
| DeliveryFlowTest | 2 | E2E 입고 흐름 |
| PosSalesFlowTest | 1 | 판매 기록 |
| OrderingFlowTest | 3 | 발주 라이프사이클 |
| ContextLoadsTest | 1 | 앱 기동 테스트 |
| **합계** | **53** | **모두 통과** |

- 프레임워크: JUnit 5 + @SpringBootTest
- DB: H2 인메모리 (@ActiveProfiles("test"))

---

## 5. 프론트엔드 상세

### 5.1 의존성

```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-router-dom": "7.13.1",
  "typescript": "5.9.3",
  "vite": "7.3.1",
  "tailwindcss": "3.4.19",
  "zustand": "5.0.11",
  "axios": "1.13.5",
  "@tanstack/react-query": "5.90.21",
  "i18next": "25.8.13",
  "react-i18next": "16.5",
  "recharts": "3.7.0",
  "lucide-react": "0.575",
  "@zxing/library": "0.21.3",
  "sonner": "2.0.7",
  "date-fns": "4.1",
  "@radix-ui/*": "다수",
  "clsx": "2.1",
  "tailwind-merge": "3.5",
  "vite-plugin-pwa": "1.2.0"
}
```

### 5.2 라우팅 & 페이지 목록

#### 인증 (2 페이지)
| 경로 | 컴포넌트 | 설명 |
|------|---------|------|
| `/login` | LoginPage | 로그인 |
| `/register` | RegisterPage | 회원가입 |

#### 관리자 - Admin (20+ 페이지)
| 경로 | 컴포넌트 | 설명 | 권한 |
|------|---------|------|------|
| `/admin/dashboard` | DashboardPage | 브랜드 대시보드 (매장 비교 차트) | 전체 |
| `/admin/items` | ItemsPage | 상품 관리 | BRAND_ADMIN |
| `/admin/master-items` | MasterItemsPage | 마스터 상품 관리 | SUPER_ADMIN |
| `/admin/brand-items` | BrandItemsPage | 브랜드 상품 할당/가격 | BRAND_ADMIN |
| `/admin/packagings` | PackagingsPage | 포장 단위 관리 | BRAND_ADMIN |
| `/admin/suppliers` | SuppliersPage | 공급업체 관리 | BRAND_ADMIN |
| `/admin/categories` | CategoriesPage | 카테고리 트리 관리 | BRAND_ADMIN |
| `/admin/ordering` | OrderingAdminPage | 발주 관리/승인 | BRAND_ADMIN |
| `/admin/ordering/calendar` | OrderCalendarPage | 배송 캘린더 | KR_INVENTORY |
| `/admin/ordering/cutoff` | CutoffPage | 발주 마감 관리 | KR_INVENTORY |
| `/admin/inventory` | InventoryAdminPage | 다중 매장 재고 뷰 | KR_INVENTORY |
| `/admin/expiry` | ExpiryPage | 유통기한 알림 관리 | KR_INVENTORY |
| `/admin/bulk-upload` | BulkUploadPage | 엑셀 일괄 업로드 | KR_INVENTORY |
| `/admin/finance/dashboard` | FinanceDashboardPage | 재무 대시보드 | KR_FINANCE |
| `/admin/finance/purchase` | PurchasePage | 매입 분석 | KR_FINANCE |
| `/admin/finance/inventory-value` | InventoryValuePage | 재고 가치 평가 | KR_FINANCE |
| `/admin/finance/closing` | ClosingPage | 월 마감 | KR_FINANCE |
| `/admin/settings/users` | UsersPage | 사용자 승인/관리 | SUPER_ADMIN, BRAND_ADMIN |
| `/admin/settings/stores` | StoresPage | 매장 설정 | SUPER_ADMIN, BRAND_ADMIN |
| `/admin/settings/theme` | ThemeSettingsPage | 테마 커스터마이징 | 전체 |
| `/admin/settings/delivery-policy` | DeliveryPolicyPage | 배송 휴일 설정 | BRAND_ADMIN |

#### 공급업체 포탈 (2 페이지)
| 경로 | 컴포넌트 | 설명 |
|------|---------|------|
| `/supplier-portal/orders` | SupplierOrdersPage | 주문 목록 |
| `/supplier-portal/orders/:id` | SupplierOrderDetailPage | 주문 상세/이행 |

#### 매장 - Store (20 페이지)
| 경로 | 컴포넌트 | 설명 |
|------|---------|------|
| `/store/dashboard` | DashboardPage | 매장 대시보드 (KPI, 차트) |
| `/store/inventory` | InventoryPage | 실시간 재고 (예측 포함) |
| `/store/inventory/daily` | DailyInventoryPage | 일별 실사 (캘린더 뷰) |
| `/store/inventory/audit` | AuditListPage | 감사 세션 목록 |
| `/store/inventory/audit/:id` | AuditDetailPage | 감사 상세/조정 |
| `/store/receiving` | ReceivingPage | 바코드 기반 입고 |
| `/store/waste` | WastePage | 폐기/로스 기록 |
| `/store/ordering` | OrderingPage | 발주 이력/상태 |
| `/store/ordering/new` | NewOrderPage | 신규 발주 (3단계 위저드) |
| `/store/ordering/history` | OrderHistoryPage | 과거 발주 목록 |
| `/store/ordering/:id` | OrderDetailPage | 발주 상세 |
| `/store/expiry` | ExpiryPage | 유통기한 알림 |
| `/store/reports` | ReportsPage | 소비/폐기/로스율 리포트 |
| `/store/claims` | ClaimsPage | 클레임 목록 |
| `/store/claims/new` | NewClaimPage | 클레임 생성 (사진 증빙) |
| `/store/claims/:id` | ClaimDetailPage | 클레임 상세/해결 |
| `/store/physical-count` | PhysicalCountPage | 재고실사 |
| `/store/physical-count/:id` | PhysicalCountDetailPage | 실사 상세/조정 |
| `/store/menu` | StoreMenuPage | 전체 기능 메뉴 (모바일 그리드) |

### 5.3 API 모듈

`src/api/` 디렉토리에 21개 모듈:

| 모듈 | 파일 | 주요 기능 |
|------|------|---------|
| `client.ts` | HTTP 클라이언트 | Axios 인스턴스, JWT 인터셉터, 토큰 갱신 |
| `auth.ts` | 인증 | login, register, checkEmail, refresh |
| `master.ts` | 마스터 데이터 | 상품/포장/공급업체 CRUD, 엑셀 업로드 |
| `inventory.ts` | 재고 | 스냅샷, 원장, 입고, 폐기, 유통기한, 예측 |
| `ordering.ts` | 발주 (최대) | 발주 CRUD, 카탈로그, 장바구니, 추천, 배송일 |
| `dashboard.ts` | 대시보드 | 매장/브랜드 KPI |
| `audit.ts` | 감사 | 감사 CRUD, 라인 업데이트 |
| `physicalCount.ts` | 재고실사 | 실사 시작/완료, 수량 입력 |
| `dailyCount.ts` | 일별 실사 | 월간 데이터, 일별 저장 |
| `claims.ts` | 클레임 | 생성, 해결, 사진 추가 |
| `report.ts` | 리포트 | 소비, 폐기, 로스율, 발주비용 |
| `finance.ts` | 재무 | 매입 요약, 재고 평가, 월 마감 |
| `adminUser.ts` | 사용자 관리 | 목록, 승인/거부, 매장 할당 |
| `category.ts` | 카테고리 | 트리/플랫 목록, CRUD |
| `store.ts` | 매장/조직 | 브랜드/매장 CRUD |
| `deliveryPolicy.ts` | 배송 정책 | 배송 휴일 관리 |
| `cutoff.ts` | 마감 관리 | 마감 실행, 부족분 확인, 일괄 전송 |
| `supplierPortal.ts` | 공급업체 포탈 | 주문 조회, 알림 |
| `push.ts` | 푸시 알림 | VAPID 키, 구독 등록 |
| `bulkUpload.ts` | 일괄 업로드 | 엑셀 업로드/확인/이력 |
| `upload.ts` | 파일 업로드 | S3 서명 URL |

### 5.4 상태 관리 (Zustand)

**authStore:**
```typescript
interface AuthState {
  user: LoginResponse | null;      // JWT 디코딩된 사용자 정보
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  login(data): Promise<void>;      // 로그인 → localStorage 저장
  logout(): void;                  // 토큰 삭제 → /login 리다이렉트
  initialize(): void;             // 앱 시작 시 localStorage 복원
}
```

**themeStore:**
```typescript
interface ThemeState {
  themeId: string;
  theme: ThemePreset;
  setTheme(id: string): void;     // CSS 변수 적용 + localStorage 저장
  initTheme(): void;              // 앱 시작 시 복원
}
```

### 5.5 컴포넌트 라이브러리

#### 레이아웃
| 컴포넌트 | 설명 |
|---------|------|
| `AdminLayout` | 관리자용: 헤더 + 사이드바 (데스크탑), 헤더 + 햄버거 (모바일) |
| `StoreLayout` | 매장용: 헤더 + 하단 탭 4개 (모바일), 헤더 드롭다운 (데스크탑) |
| `ProtectedRoute` | 역할 기반 라우트 가드 |
| `NotificationBanner` | 인앱 알림 배너 |

#### 네비게이션
| 컴포넌트 | 설명 |
|---------|------|
| `nav/NavDropdown` | 관리자 데스크탑 헤더 드롭다운 |
| `nav/MobileNavGroup` | 모바일 사이드바 메뉴 그룹 |
| `nav/StoreDesktopDropdown` | 매장 데스크탑 헤더 |

#### 기능 컴포넌트
| 컴포넌트 | 설명 |
|---------|------|
| `BarcodeScanner` | @zxing 바코드 스캐너 UI |
| `ImageUpload` | S3 서명 URL 기반 이미지 업로드 + 미리보기 |
| `SwipeableCard` | 모바일 스와이프 카드 |
| `store/OrderTimeline` | 발주 상태 타임라인 시각화 |

#### shadcn/ui (Radix 기반)
`button`, `card`, `input`, `label`, `badge`, `separator`, `dialog`, `alert-dialog`, `select`, `table`, `tabs`, `sheet`, `progress`, `calendar`

### 5.6 다국어 (i18n)

- **지원 언어:** 영어(en), 한국어(ko), 일본어(ja)
- **감지 순서:** localStorage → navigator → fallback(en)
- **번역 키:** 각 언어 ~1,065줄

**주요 네임스페이스:**
```
common: save, cancel, delete, edit, loading, error, success, logout, ...
nav: dashboard, inventory, ordering, suppliers, users, ...
auth: email, password, login, register, ...
store: dashboard, inventory, waste, ordering, ...
dashboard: lowStock, expiryAlerts, todayReceive, monthOrderCost, ...
inventory: currentQty, minStock, daysLeft, reorder, ...
ordering: newOrder, cart, delivery, cost, status, steps.*, catalog.*, ...
claims: claimType, description, resolution, images, ...
admin: masterItems, brandItems, users, suppliers, ...
finance: purchaseSummary, inventoryValue, monthlyClosing, ...
```

### 5.7 테마 시스템

5개 프리셋 테마:
| ID | 이름 | 특징 |
|----|------|------|
| bauhaus-steel | Bauhaus Steel | 슬레이트 쿨톤 (현재 기본) |
| coffee-classic | Coffee Classic | 따뜻한 갈색 톤 |
| forest-green | Forest Green | 자연 녹색 |
| sunset-orange | Sunset Orange | 주황/따뜻한 톤 |
| minimal-gray | Minimal Gray | 미니멀 회색 |

각 테마는 HSL CSS 변수로 `document.documentElement`에 적용:
- `--primary`, `--primary-foreground`
- `--secondary`, `--accent`, `--muted`
- `--background`, `--foreground`
- `--border`, `--ring`
- `--destructive`

### 5.8 PWA & 오프라인

**manifest.json:**
```json
{
  "name": "Coffee Inventory",
  "short_name": "CoffeeInv",
  "display": "fullscreen",
  "start_url": "/",
  "theme_color": "#1e3a5f"
}
```

**서비스 워커 (custom-sw.js):**
- 푸시 알림 수신/표시
- 클릭 시 앱 네비게이션
- Workbox 캐싱: API 호출 NetworkFirst (5분 캐시, 50개 항목)

### 5.9 네비게이션 구조

#### 관리자 네비게이션 (`adminNavigation.ts`)
```
Dashboard
├── 상품 [SUPER_ADMIN, BRAND_ADMIN, KR_INVENTORY]
│   ├── 마스터 상품 (SUPER_ADMIN)
│   ├── 브랜드 상품 (BRAND_ADMIN)
│   ├── 상품 관리 (BRAND_ADMIN, KR_INVENTORY)
│   ├── 포장 단위
│   ├── 카테고리
│   └── 공급업체
├── 발주 [SUPER_ADMIN, BRAND_ADMIN, KR_INVENTORY, FULFILLMENT]
│   ├── 발주 관리
│   ├── 배송 캘린더
│   ├── 마감 관리
│   └── 공급업체 주문 (FULFILLMENT)
├── 재고 [SUPER_ADMIN, BRAND_ADMIN, KR_INVENTORY]
│   ├── 재고 관리
│   ├── 유통기한 알림
│   └── 일괄 업로드
├── 재무 [SUPER_ADMIN, BRAND_ADMIN, KR_FINANCE]
│   ├── 재무 대시보드
│   ├── 매입 분석
│   ├── 재고 가치
│   └── 월 마감
└── 설정 [SUPER_ADMIN, BRAND_ADMIN]
    ├── 사용자 관리
    ├── 매장 관리
    ├── 테마
    └── 배송 정책
```

#### 매장 네비게이션 (`storeNavigation.ts`)
```
모바일 하단 탭 (4개):
├── 홈 (Dashboard)
├── 발주 (New Order)
├── 이력 (Order List)
└── 더보기 (Menu Grid)

더보기 메뉴 그리드:
├── 발주 관리 (4항목): 신규발주, 발주목록, 발주이력, 입고
├── 재고 관리 (5항목): 재고현황, 유통기한, 실사, 일별실사, 폐기
└── 리포트 (1항목): 분석 리포트
```

---

## 6. 인프라 & 배포

### 6.1 Docker Compose

```yaml
services:
  backend:
    build: ../backend
    container_name: coffee-backend
    port: 8080
    health: /actuator/health (30s간격, 10s타임아웃)
    restart: unless-stopped

  frontend:
    build: ../frontend
    container_name: coffee-frontend
    restart: unless-stopped

  nginx:
    image: nginx:1.25-alpine
    container_name: coffee-nginx
    port: 80
    depends_on: backend(healthy), frontend(started)
    volume: nginx.conf

network: coffee-net (bridge)
```

### 6.2 Nginx 설정

**리버스 프록시 (infra/nginx/nginx.conf):**
```
/api/*       → backend:8080
/actuator/*  → backend:8080
/*           → frontend:80
```
- DNS resolver: 127.0.0.11 (Docker 내부)
- Max body: 10M
- 프록시 헤더: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto

**프론트엔드 Nginx (frontend/nginx.conf):**
```
listen 80
root: /usr/share/nginx/html
SPA: try_files $uri $uri/ /index.html
```

### 6.3 배포 스크립트

`infra/deploy.sh` 4단계:
1. 환경변수 검증 (DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET)
2. `git pull --ff-only`
3. `docker compose down → build --no-cache → up -d`
4. 헬스체크 (`/actuator/health`, 최대 150초 대기)

### 6.4 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| DB_URL | MySQL JDBC URL | Y |
| DB_USERNAME | DB 사용자명 | Y |
| DB_PASSWORD | DB 비밀번호 | Y |
| JWT_SECRET | JWT 서명 키 | Y |
| AWS_REGION | AWS 리전 (ap-northeast-1) | N |
| AWS_ACCESS_KEY_ID | AWS 액세스 키 | N |
| AWS_SECRET_ACCESS_KEY | AWS 시크릿 키 | N |
| S3_BUCKET | S3 버킷명 | N |
| VAPID_PUBLIC_KEY | 웹 푸시 공개키 | N |
| VAPID_PRIVATE_KEY | 웹 푸시 비밀키 | N |
| VAPID_SUBJECT | 웹 푸시 주체 | N |

---

## 7. 데이터 관계도

```
Company (1) ──→ (N) Brand
Brand (1) ──→ (N) Store
Brand (1) ──→ (N) Item
Brand (1) ──→ (N) Supplier
Brand (1) ──→ (N) Menu
Brand (1) ──→ (N) ItemCategory
Brand (1) ──→ (N) DeliveryPolicy

User [companyId, brandId, storeId] ─ 계층적 할당
UserStore [userId, storeId] ─ 다중 매장 접근 (junction)

Item (1) ──→ (N) Packaging
Item (1) ──→ (N) RecipeComponent
ItemCategory (1) ──→ (N) Item
ItemCategory (1) ──→ (N) ItemCategory (self, parentId)

Supplier (1) ──→ (N) SupplierItem
SupplierItem ──→ Packaging (N:1)

Store (1) ──→ (N) InventorySnapshot
Store (1) ──→ (N) StockLedger
Store (1) ──→ (N) Delivery ──→ (N) DeliveryScan
Store (1) ──→ (N) Waste
Store (1) ──→ (N) PosSales
Store (1) ──→ (N) OrderPlan ──→ (N) OrderLine
Store (1) ──→ (N) OrderCart ──→ (N) OrderCartItem
Store (1) ──→ (N) PhysicalCount ──→ (N) PhysicalCountLine
Store (1) ──→ (N) InventoryAudit ──→ (N) InventoryAuditLine
Store (1) ──→ (N) Claim ──→ (N) ClaimImage / ClaimLine
Store (1) ──→ (N) DailyPhysicalCount

Menu (1) ──→ (N) RecipeComponent ──→ Item (N:1)
Menu (1) ──→ (N) MenuOption
PosSales ──→ Menu (N:1)

OrderPlan ──→ Supplier (N:1)
OrderPlan ──→ Delivery (1:1, optional)
OrderLine ──→ Packaging (N:1)
OrderCartItem ──→ Packaging (N:1)

OrderPlan (1) ──→ (N) OrderDispatchLog
OrderPlan (1) ──→ (N) OrderShortageLog
OrderPlan (1) ──→ (N) SupplierOrderNotification

DeliveryPolicy (1) ──→ (N) DeliveryHoliday
```

---

## 8. 완료된 기능 요약

### Phase 1-7: 25개 태스크 모두 완료

| 기능 영역 | 구현 내용 |
|-----------|---------|
| **인증/RBAC** | JWT 로그인, 회원가입 (승인 워크플로), 7개 역할, 토큰 갱신 |
| **조직 관리** | 회사→브랜드→매장 계층, 사용자 승인/거부, 다중 매장 할당 |
| **마스터 데이터** | 상품 (다국어명), 포장 단위, 공급업체, 카테고리 (트리), 배송 스케줄 |
| **재고 관리** | FIFO 로트 추적, 입출고 원장, 스냅샷, 예측, 수동 조정 |
| **입고** | 바코드 스캔, 스캔 기록, 입고 확정 → 재고 자동 반영 |
| **폐기** | 운영 폐기/입고 불량, 사유 기록 |
| **레시피/POS** | 메뉴 등록, 레시피 원재료, 판매 기록 → 자동 재고 차감 |
| **발주** | 3단계 위저드 (배송일 선택→카탈로그→확인), 장바구니, AI 추천, PDF, 재발주 |
| **발주 관리** | DRAFT→CONFIRMED→DISPATCHED→RECEIVED 라이프사이클, 관리자 이행 |
| **재고실사** | 전통 실사, 일별 실사 (캘린더), 감사 (Audit), 자동 차이 계산 |
| **클레임** | 품질/부족/파손 클레임, 사진 증빙, 해결 추적 |
| **대시보드** | 매장 KPI (재고/판매/발주/알림), 브랜드 비교 차트 |
| **리포트** | 소비 분석, 폐기 분석, 로스율, 발주 비용 |
| **재무** | 매입 요약, 재고 가치 평가, 월 마감 |
| **일괄 작업** | 엑셀 상품 업로드, S3 이미지 업로드 |
| **알림** | 유통기한 알림, 재고 부족 알림, 웹 푸시 (VAPID) |
| **PWA** | 홈화면 설치, 전체화면 모드, 오프라인 캐시 |
| **다국어** | 영어/한국어/일본어, 상품명 다국어 지원 |
| **테마** | 5개 프리셋, HSL CSS 변수, 실시간 전환 |
| **공급업체 포탈** | 주문 조회, 이행 상태, 알림 |
| **인프라** | Docker Compose (3 컨테이너), Nginx 리버스 프록시, 배포 스크립트, Actuator 모니터링 |

---

## 9. 알려진 제약사항 & 개선점

### 현재 제약사항
1. **CI/CD 없음** - 수동 배포 (deploy.sh)
2. **SSL/HTTPS 미설정** - 현재 HTTP 80포트만 사용
3. **로그 관리** - 파일 기반 로그, 중앙 집중 로그 시스템 없음
4. **모니터링** - Actuator 기본 엔드포인트만 노출, APM 미연동
5. **캐싱** - Redis 등 외부 캐시 미사용
6. **비밀번호 찾기** - 미구현
7. **이메일 전송** - SES 설정은 있으나 발주 이메일 전송 미완성
8. **테스트 커버리지** - 53개 테스트, 일부 서비스 테스트 부족
9. **API 버전 관리** - v1만 존재
10. **Rate Limiting** - 미설정

### 다음 버전 개선 후보
1. HTTPS (Let's Encrypt / ALB)
2. CI/CD 파이프라인 (GitHub Actions)
3. Redis 캐싱 (세션, 카탈로그)
4. 이메일 발주 전송 (SES)
5. 모바일 앱 (React Native / Flutter)
6. 실시간 알림 (WebSocket / SSE)
7. 리포트 대시보드 고도화 (Grafana 연동)
8. 멀티 브랜드 관리 고도화
9. API Rate Limiting
10. 테스트 커버리지 강화

---

> 이 문서는 Coffee Inventory System V1의 전체 명세서입니다.
> 다음 버전 개발 시 이 문서를 기반으로 변경사항을 추적하고 확장해 나갈 수 있습니다.
