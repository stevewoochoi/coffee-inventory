# ☕ Coffee Inventory Management System - 프로젝트 정리 문서

> **문서 작성일**: 2026-03-20
> **버전**: v1.0 (전체 25개 태스크 완료)
> **대상**: 클라이언트 / 프로젝트 관계자

---

## 1. 프로젝트 개요

### 1.1 시스템 목적
일본 시장을 대상으로 한 **커피 전문점 재고 관리 시스템**입니다.
본사(Company) → 브랜드(Brand) → 매장(Store)의 다계층 조직 구조를 지원하며,
원자재 입고부터 POS 판매, 발주, 폐기, 정산까지 **커피 전문점 운영의 전 과정**을 관리합니다.

### 1.2 주요 사용자
| 역할 | 설명 | 주요 기능 |
|------|------|----------|
| **SUPER_ADMIN** | 시스템 전체 관리자 | 회사/브랜드/매장 관리, 사용자 승인, 마스터 데이터 |
| **BRAND_ADMIN** | 브랜드 관리자 | 브랜드 내 상품/매장/발주 관리 |
| **STORE_MANAGER** | 매장 관리자 | 재고, 입고, 판매, 발주, 폐기 |
| **JP_ORDERER** | 일본 발주 담당 | 발주 생성 및 관리 |
| **KR_INVENTORY** | 한국 재고 담당 | 재고 관리 및 배치 업로드 |
| **KR_FINANCE** | 한국 재무 담당 | 재무 리포트 및 월 마감 |
| **FULFILLMENT** | 주문 처리 담당 | 발주 처리 및 출하 |

### 1.3 다국어 지원
- **영어 (EN)**, **한국어 (KO)**, **일본어 (JA)** 3개 언어 지원
- 상품명 다국어 등록 (nameEn, nameJa, nameKo)
- 브라우저 언어 자동 감지 + 수동 전환

---

## 2. 기술 스택

### 2.1 백엔드
| 항목 | 기술 |
|------|------|
| 언어 | Java 17 |
| 프레임워크 | Spring Boot 3.2.5 |
| 빌드 | Maven |
| ORM | Spring Data JPA + Hibernate |
| 인증 | JWT (jjwt 0.12.5) |
| DB 마이그레이션 | Flyway (V1~V33, 33개 버전) |
| 모니터링 | Spring Boot Actuator |
| 파일 처리 | Apache POI (Excel), Apache PDFBox (PDF) |
| 푸시 알림 | Web Push API (VAPID) |

### 2.2 프론트엔드
| 항목 | 기술 |
|------|------|
| 프레임워크 | React 19 + TypeScript |
| 빌드 | Vite 7 |
| 스타일링 | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| 상태관리 | Zustand 5 |
| 서버 상태 | TanStack React Query 5 |
| 라우팅 | React Router 7 |
| HTTP 클라이언트 | Axios (JWT 자동 갱신) |
| 차트 | Recharts 3 |
| 바코드 | @zxing/library |
| 다국어 | i18next + react-i18next |
| PWA | vite-plugin-pwa (Workbox) |

### 2.3 인프라
| 항목 | 기술 |
|------|------|
| 서버 | AWS Lightsail |
| 데이터베이스 | AWS RDS MySQL 8.0 (ap-northeast-1) |
| 파일 스토리지 | AWS S3 |
| 이메일 | AWS SES |
| 컨테이너 | Docker Compose (3개 서비스) |
| 리버스 프록시 | Nginx 1.25 |
| SSL/TLS | AWS Lightsail Load Balancer |

---

## 3. 시스템 아키텍처

### 3.1 전체 구성도
```
[클라이언트 브라우저]
       │
       ▼ HTTPS (443)
[AWS Lightsail LB] ─── SSL/TLS 종료
       │
       ▼ HTTP (80)
[Nginx 리버스 프록시]
       │
       ├── /api/*  ──→ [Spring Boot Backend :8080]
       │                        │
       │                        ├── AWS RDS MySQL 8.0
       │                        ├── AWS S3 (파일)
       │                        └── AWS SES (이메일)
       │
       └── /*     ──→ [React Frontend (Nginx)]
```

### 3.2 데이터 흐름
```
[마스터 등록] → [발주 생성] → [입고 스캔] → [재고 반영] → [POS 판매] → [재고 차감]
                    ↑                                              │
                    └──── [발주 추천 AI] ←── [수요 예측] ←─────────┘
```

### 3.3 조직 계층 구조
```
Company (본사)
  └── Brand (브랜드)
        └── Store (매장)
              └── User (사용자) ← 역할(Role)별 권한 분리
```

---

## 4. 핵심 기능 상세

### 4.1 인증 및 권한 관리

#### JWT 기반 인증
- **Access Token**: 1시간 유효 (자동 갱신)
- **Refresh Token**: 7일 유효
- 로그인 시 JWT에 사용자 정보 포함 (role, companyId, brandId, storeId)
- 401 응답 시 자동 토큰 갱신 (프론트엔드 인터셉터)

#### 역할 기반 접근 제어 (RBAC)
- 7개 역할별 API 접근 제한 (@PreAuthorize)
- 브랜드/매장 단위 데이터 격리 (타 브랜드 데이터 접근 불가)
- 사용자 가입 → 관리자 승인 → 활성화 워크플로우

#### 사용자 관리
- 가입 요청 → 관리자 승인/거절
- 사용자 정지(Suspend) 기능
- 다중 매장 접근 권한 설정

---

### 4.2 마스터 데이터 관리

#### 상품 (Item)
- 상품 등록/수정/비활성화 (Soft Delete)
- **다국어 상품명**: 기본명 + 영어/일본어/한국어
- 카테고리 분류 (계층형 트리 구조)
- 이미지 업로드 (AWS S3)
- 기본 단위(base_unit), 로스율(loss_rate), 가격, 부가세 설정
- 온도대 관리 (상온/냉장/냉동)
- 최소 재고량(min_stock_qty) 알림 설정
- **엑셀 배치 업로드**: 샘플 다운로드 → 엑셀 작성 → 일괄 등록

#### 포장 단위 (Packaging)
- 상품별 포장 규격 관리 (BOX, CASE 등)
- 포장당 수량(units_per_pack) 설정
- 바코드 등록 (입고 스캔용)
- 포장 이미지 업로드

#### 공급업체 (Supplier)
- 공급업체 정보 관리 (사업자번호, 연락처 등)
- 공급업체별 취급 상품 연결
- 발주 방식 설정 (이메일/포털/EDI)
- 공급업체별 리드타임, 가격 관리

#### 브랜드-상품 연결 (BrandItem)
- 마스터 상품을 브랜드에 할당
- 브랜드별 가격/명칭 오버라이드
- 상품 활성/비활성 관리

#### 카테고리 (ItemCategory)
- 계층형 카테고리 (부모-자식 구조)
- 브랜드별 카테고리 관리
- 표시 순서 설정

---

### 4.3 재고 관리

#### 재고 원장 (Stock Ledger)
- **불변(Immutable) 트랜잭션 로그** - 모든 재고 변동 기록
- 입고(RECEIVE), 판매(SELL), 폐기(WASTE), 불량입고(DAMAGE_RECEIVE), 조정(ADJUST)
- 참조 타입 추적 (어떤 입고/주문에서 발생했는지)

#### 재고 스냅샷 (Inventory Snapshot)
- 현재 재고 상태 실시간 조회 (비정규화된 현재 수량)
- 매장 × 상품 × 유통기한 × 로트번호 단위 관리
- **FIFO 재고 관리**: 유통기한/로트별 선입선출

#### 알림 시스템
- **부족 재고 알림**: 최소 재고량 이하 시 자동 알림 (스케줄러 자동 실행)
- **유통기한 알림**: 만료 임박 상품 자동 감지
- 알림 상태 관리 (ACTIVE → RESOLVED)

#### 수요 예측 (Forecast)
- POS 판매 이력 기반 수요 예측
- 매장/브랜드 단위 예측
- 발주 추천에 활용

#### 재고 조정 (Manual Adjust)
- 수동 재고 조정 (증/감)
- 조정 사유 기록
- 원장에 자동 기록

---

### 4.4 입고 관리

#### 입고 프로세스
```
[입고 생성] → [바코드 스캔] → [수량/유통기한 입력] → [입고 확정] → [재고 반영]
```

- 입고 생성 (공급업체, 예상 도착일)
- **바코드 스캐너**: 카메라 기반 바코드 인식 (포장 단위 자동 매칭)
- 스캔별 로트번호, 유통기한 입력
- 입고 확정 시 재고 원장 자동 반영
- 입고 이력 조회 (날짜/상태별 필터)

#### 발주 기반 입고
- 발주서 연결 입고 (order_plan_id)
- 발주 대비 실제 입고 수량 비교

---

### 4.5 발주 관리

#### 발주 프로세스 (전체 흐름)
```
[발주 필요량 계산] → [카탈로그 조회] → [장바구니 추가] → [발주서 생성]
     → [발주 확정] → [공급업체 발송] → [입고 처리] → [완료]
```

#### 발주 추천 (AI)
- **발주 필요량 계산**: (수요 예측 - 현재 재고 + 안전 재고)
- **공급업체별 추천 수량**: AI 기반 발주량 제안
- 과거 발주 이력 기반 패턴 분석

#### 장바구니 (Order Cart)
- 매장별 장바구니 (발주 전 임시 저장)
- 상품 추가/수량 변경/삭제
- 장바구니 → 발주서 변환

#### 발주서 관리
- 상태 관리: DRAFT → CONFIRMED → DISPATCHED → CANCELLED
- 이행 상태: PENDING → IN_PROGRESS → FULFILLED / PARTIAL / FAILED
- **PDF 발주서 생성** 및 다운로드
- 이메일/포털/EDI 발송

#### 카탈로그
- 검색 가능한 상품 카탈로그
- 배송일/카테고리/키워드/부족재고 필터
- 페이지네이션

#### 마감 시간 (Cutoff)
- 공급업체별 발주 마감 시간 관리
- 배송 요일/리드타임 설정
- 배송 휴일 관리

#### 과거 발주 재주문
- 이전 발주를 기반으로 새 장바구니 자동 생성

---

### 4.6 POS 판매 관리

#### 메뉴/레시피
- 브랜드별 메뉴 등록
- 메뉴 옵션 관리 (사이즈, 온도 등)
- **레시피 컴포넌트**: 메뉴별 원자재 사용량 설정 (재고 차감에 활용)

#### 판매 기록
- POS 판매 등록 (메뉴 × 수량)
- 판매 시 레시피 기반 **자동 재고 차감**
- 일별 판매 요약 조회

#### 품절 관리
- 품절 상품 등록/해제
- 품절 상태 실시간 반영

---

### 4.7 폐기 관리
- 폐기 유형: **영업 폐기(OPERATION)**, **불량 입고(DAMAGE_RECEIVE)**
- 폐기 사유 기록
- 폐기 시 재고 원장 자동 차감
- 폐기 이력 조회

---

### 4.8 실사(Physical Count)
```
[실사 시작] → [상품별 실제 수량 입력] → [시스템 수량 대비 차이 확인] → [실사 완료]
```
- 매장 내 전체 활성 상품에 대한 라인 아이템 자동 생성
- 시스템 수량 vs 실사 수량 **차이(Variance) 자동 계산**
- 실사 완료 시 재고 조정 반영
- 실사 이력 조회

---

### 4.9 클레임 관리 (공급업체 불만)
- **클레임 유형**: 품질 불량(QUALITY), 파손(DAMAGE), 수량 부족(SHORTAGE)
- **상태 관리**: CREATED → INVESTIGATING → RESOLVED / REJECTED
- 이미지 증거 첨부 (S3 업로드)
- 해결 내용 기록
- 매장별/상태별 조회

---

### 4.10 재고 감사 (Audit)
- 감사 유형: 위치 기반(LOCATION), 상품 기반(ITEM_BASED)
- 감사 라인별 시스템 수량 vs 감사 수량 비교
- 불일치(Discrepancy) 자동 계산
- 메모 첨부
- 감사 요약 조회

---

### 4.11 대시보드 및 리포트

#### 매장 대시보드
- 긴급 발주 알림, 유통기한 임박 알림
- 재고 현황 차트 (Bar/Line Chart)
- 소비 트렌드
- 최근 발주 현황
- 빠른 실행 버튼

#### 브랜드 대시보드
- 소속 매장 전체 요약
- 매장별 비교 분석

#### 리포트
- 재고 리포트, 매출 리포트, 발주 리포트
- 기간별/매장별 필터

#### 재무 관리
- 매입 분석
- 재고 자산 평가
- **월 마감 처리**: 월별 재무 데이터 확정

---

### 4.12 배치 업로드
- **엑셀 템플릿 다운로드** → 데이터 입력 → **일괄 업로드**
- 업로드 검증 → 오류 표시 → 확인 후 반영
- 업로드 이력 관리

---

### 4.13 공급업체 포털
- 공급업체 측에서 발주 확인
- 발주 수령 확인(Acknowledge)

---

### 4.14 푸시 알림
- Web Push API 기반 브라우저 알림
- 디바이스별 구독 관리
- 알림 발송 (재고 부족, 발주 마감 등)

---

## 5. 화면 구성

### 5.1 매장용 화면 (태블릿 최적화)
| 화면 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/store/dashboard` | 매장 현황 한눈에 보기 |
| 재고 관리 | `/store/inventory` | 예측 기반 재고 모니터링, 조정 |
| 입고 처리 | `/store/receiving` | 바코드 스캔 입고 |
| 폐기 등록 | `/store/waste` | 폐기 기록 |
| 실사 | `/store/physical-count` | 재고 실사 |
| 발주 | `/store/ordering` | 발주 생성/이력/상세 |
| 유통기한 | `/store/expiry` | 만료 임박 상품 관리 |
| 클레임 | `/store/claims` | 공급업체 클레임 |
| 감사 | `/store/inventory/audit` | 재고 감사 |
| 리포트 | `/store/reports` | 매장 분석 |
| 메뉴 | `/store/menu` | 기능 바로가기 |

**특징**: 모바일 퍼스트, 큰 버튼(44px+), 터치 친화적, 하단 탭 네비게이션

### 5.2 관리자용 화면 (데스크톱 최적화)
| 화면 | 경로 | 설명 |
|------|------|------|
| 마스터 상품 | `/admin/master-items` | 전체 상품 관리 |
| 브랜드 상품 | `/admin/brand-items` | 브랜드별 상품 |
| 상품 관리 | `/admin/items` | 상품 CRUD (다국어) |
| 포장 관리 | `/admin/packagings` | 포장 규격 |
| 카테고리 | `/admin/categories` | 카테고리 트리 |
| 공급업체 | `/admin/suppliers` | 공급업체 관리 |
| 발주 관리 | `/admin/ordering` | 발주 현황/달력 |
| 마감 관리 | `/admin/ordering/cutoff` | 발주 마감 시간 |
| 재고 관리 | `/admin/inventory` | 전체 재고 현황 |
| 배치 업로드 | `/admin/bulk-upload` | 엑셀 일괄 등록 |
| 재무 대시보드 | `/admin/finance/dashboard` | 재무 개요 |
| 매입 분석 | `/admin/finance/purchase` | 매입 데이터 |
| 재고 자산 | `/admin/finance/inventory-value` | 자산 평가 |
| 월 마감 | `/admin/finance/closing` | 월별 마감 |
| 사용자 관리 | `/admin/settings/users` | 사용자 승인/관리 |
| 매장 설정 | `/admin/settings/stores` | 매장 정보 |
| 테마 설정 | `/admin/settings/theme` | 색상 테마 |
| 배송 정책 | `/admin/settings/delivery-policy` | 배송 일정 |

### 5.3 공급업체 포털
| 화면 | 경로 | 설명 |
|------|------|------|
| 발주 목록 | `/supplier-portal/orders` | 수신 발주 확인 |
| 발주 상세 | `/supplier-portal/orders/:id` | 발주 내역 확인/수령 |

---

## 6. 데이터베이스 설계

### 6.1 테이블 목록 (33개 마이그레이션, 30+ 테이블)

#### 조직 관리
| 테이블 | 설명 |
|--------|------|
| company | 본사 |
| brand | 브랜드 |
| store | 매장 (주소, 전화, 개점일, 타임존) |
| users | 사용자 (이메일, 역할, 승인상태) |
| user_store | 사용자-매장 매핑 (다대다) |

#### 마스터 데이터
| 테이블 | 설명 |
|--------|------|
| item | 상품 (다국어명, 카테고리, 온도대, 가격) |
| item_category | 카테고리 (계층형) |
| packaging | 포장 단위 (바코드, 수량/팩) |
| supplier | 공급업체 |
| supplier_item | 공급업체-포장 연결 (가격, 리드타임) |
| brand_item | 브랜드-상품 연결 (가격 오버라이드) |
| item_delivery_schedule | 상품 배송 스케줄 |

#### 재고 관리
| 테이블 | 설명 |
|--------|------|
| stock_ledger | 재고 원장 (불변 트랜잭션 로그) |
| inventory_snapshot | 재고 스냅샷 (현재 수량) |
| low_stock_alert | 부족 재고 알림 |
| item_expiry_alert | 유통기한 알림 |

#### 발주/입고
| 테이블 | 설명 |
|--------|------|
| order_plan | 발주서 |
| order_line | 발주 상세 라인 |
| order_cart | 발주 장바구니 |
| order_cart_item | 장바구니 상품 |
| order_dispatch_log | 발주 발송 로그 |
| delivery_policy | 배송 정책 |
| delivery_holiday | 배송 휴일 |
| delivery | 입고 |
| delivery_scan | 입고 스캔 |

#### 운영
| 테이블 | 설명 |
|--------|------|
| menu | 메뉴 |
| menu_option | 메뉴 옵션 |
| recipe_component | 레시피 원자재 |
| pos_sales | POS 판매 |
| waste | 폐기 |
| physical_count | 실사 |
| physical_count_line | 실사 라인 |
| claim / claim_line / claim_image | 클레임 |
| inventory_audit / inventory_audit_line | 재고 감사 |

#### 기타
| 테이블 | 설명 |
|--------|------|
| bulk_upload_batch | 배치 업로드 |
| monthly_closing | 월 마감 |
| soldout_item | 품절 상품 |
| push_subscription | 푸시 구독 |

### 6.2 설계 원칙
- **Soft Delete**: 모든 삭제는 `is_active=false` 처리 (데이터 영구 삭제 없음)
- **불변 원장**: stock_ledger는 수정/삭제 불가 (감사 추적)
- **FIFO 관리**: 유통기한 + 로트번호 기반 선입선출
- **복합 유니크**: inventory_snapshot(store_id, item_id, exp_date, lot_no)

---

## 7. API 설계

### 7.1 API 규약
- **Base URL**: `/api/v1/`
- **응답 형식**: 모든 응답은 `ApiResponse<T>` 래퍼
```json
{
  "success": true,
  "data": { ... },
  "message": "처리 완료"
}
```
- **인증**: `Authorization: Bearer {JWT_TOKEN}` 헤더
- **페이지네이션**: `page`, `size` 파라미터 (Spring Pageable)

### 7.2 API 엔드포인트 요약 (100+ 엔드포인트)

| 도메인 | Base Path | 주요 기능 |
|--------|-----------|----------|
| 인증 | `/api/v1/auth` | 로그인, 회원가입, 토큰 갱신 |
| 조직 | `/api/v1/org/companies, brands, stores` | 회사/브랜드/매장 CRUD |
| 사용자 | `/api/v1/admin/users` | 사용자 관리/승인 |
| 상품 | `/api/v1/master/items` | 상품 CRUD, 엑셀 업로드 |
| 포장 | `/api/v1/master/packagings` | 포장 CRUD |
| 공급업체 | `/api/v1/master/suppliers` | 공급업체 CRUD |
| 브랜드상품 | `/api/v1/master/brand-items` | 브랜드-상품 연결 |
| 카테고리 | `/api/v1/master/item-categories` | 카테고리 CRUD |
| 재고 | `/api/v1/inventory` | 스냅샷, 원장, 예측, 알림 |
| 입고 | `/api/v1/receiving/deliveries` | 입고/스캔/확정 |
| 발주 | `/api/v1/ordering` | 발주/장바구니/카탈로그/추천 |
| 발주(관리) | `/api/v1/admin/ordering` | 발주 현황/이행 관리 |
| POS | `/api/v1/pos/sales` | 판매 기록/요약 |
| 메뉴/레시피 | `/api/v1/recipe/menus` | 메뉴/레시피 관리 |
| 폐기 | `/api/v1/waste` | 폐기 기록 |
| 실사 | `/api/v1/physical-count` | 실사 관리 |
| 클레임 | `/api/v1/claims` | 공급업체 클레임 |
| 감사 | `/api/v1/audit` | 재고 감사 |
| 대시보드 | `/api/v1/dashboard` | 매장/브랜드 대시보드 |
| 리포트 | `/api/v1/reports` | 재고/매출/발주 리포트 |
| 재무 | `/api/v1/finance` | 월 마감 |
| 배치 | `/api/v1/admin/bulk` | 엑셀 배치 처리 |
| 업로드 | `/api/v1/upload` | 파일/이미지 업로드 |
| 푸시 | `/api/v1/push` | 푸시 구독 |
| 품절 | `/api/v1/soldout` | 품절 관리 |
| 공급업체포털 | `/api/v1/supplier-portal` | 공급업체 발주 확인 |

---

## 8. 보안

### 8.1 인증 보안
- JWT 기반 무상태(Stateless) 인증
- Access Token 1시간, Refresh Token 7일
- HMAC SHA 알고리즘 서명
- BCrypt 비밀번호 해싱

### 8.2 권한 보안
- 메서드 레벨 @PreAuthorize 권한 검사
- 브랜드/매장 단위 데이터 격리
- 사용자 가입 → 관리자 승인 필수

### 8.3 인프라 보안
- SSL/TLS (Lightsail LB에서 종료)
- Docker 네트워크 격리 (coffee-net)
- 환경변수로 민감정보 관리 (.env)
- Soft Delete로 데이터 보존

---

## 9. 배포 및 운영

### 9.1 Docker 구성 (3개 서비스)
```yaml
services:
  backend:   Spring Boot (Multi-stage: Maven → JRE 17)
  frontend:  React Vite (Multi-stage: Node 20 → Nginx)
  nginx:     Nginx 1.25 (리버스 프록시)
```

### 9.2 배포 프로세스
```bash
./infra/deploy.sh
```
1. 환경변수 검증 (DB_URL, JWT_SECRET 등)
2. Git pull (최신 코드)
3. Docker 이미지 빌드 (--no-cache)
4. 컨테이너 시작
5. 헬스체크 (Actuator /health, 최대 150초 대기)

### 9.3 모니터링
- **Spring Boot Actuator**: `/actuator/health`, `/actuator/metrics`, `/actuator/info`, `/actuator/loggers`
- Docker 컨테이너 헬스체크 (30초 간격)
- 자동 재시작 정책 (unless-stopped)

### 9.4 PWA 지원
- Service Worker 기반 오프라인 캐싱
- API 응답 캐시 (NetworkFirst, 5분 TTL)
- 코드 스플리팅 (vendor, charts, scanner 청크 분리)

---

## 10. 테스트

### 10.1 테스트 현황
- **총 53개 테스트, 전체 통과**
- 테스트 환경: H2 인메모리 DB (@ActiveProfiles("test"))
- 테스트 유형: 통합 테스트 (@SpringBootTest)

### 10.2 테스트 커버리지

| 영역 | 테스트 클래스 | 테스트 수 |
|------|-------------|----------|
| 인증/보안 | JwtUtilTest, AuthControllerTest, RbacTest | 27 |
| 조직 관리 | OrgControllerTest, AdminUserControllerTest | 16 |
| 마스터 데이터 | Item, BrandItem, Packaging, Supplier, Category, Schedule | 18 |
| 재고 관리 | InventoryService, FifoStock, LowStock, ExpiryAlert, Forecast | 16 |
| 입고/실사 | DeliveryFlow, OrderReceiving, PhysicalCount | 6 |
| 발주 | OrderingFlow, Cart, Confirm, Needs, Policy, Catalog, Fulfillment | 15 |
| POS/품질 | PosSalesFlow, ClaimApi, Soldout | 5 |
| 고급 기능 | Audit, Dashboard, QuickAdjust | 7 |
| E2E | FullE2EFlow, V6Backend | 3+ |

---

## 11. 개발 이력 (7개 Phase, 25개 태스크)

### Phase 1: 프로젝트 기반 (TASK 001~003)
- 프로젝트 구조 생성
- Spring Boot 설정 (MySQL, JPA, Flyway)
- 초기 DB 마이그레이션

### Phase 2: 인증/권한 (TASK 004~006)
- JWT 인증 구현
- RBAC 역할 기반 접근 제어
- React 로그인 화면

### Phase 3: 마스터 데이터 (TASK 007~011)
- 조직 관리 API (Company/Brand/Store)
- 상품/포장/공급업체 API
- React 관리자 화면

### Phase 4: 재고/입고 (TASK 012~016)
- 재고 원장 + 스냅샷 시스템
- 입고 스캔 프로세스
- 폐기 관리
- React 매장 화면

### Phase 5: 메뉴/POS (TASK 017~019)
- 메뉴/레시피 관리
- POS 판매 + 재고 자동 차감
- React POS 화면

### Phase 6: 발주 시스템 (TASK 020~022)
- 발주 추천 AI
- 발주 관리 (장바구니 → 확정 → 발송)
- React 발주 화면

### Phase 7: 배포/운영 (TASK 023~025)
- Docker Compose 구성
- 자동 배포 스크립트
- Actuator 모니터링

### 추가 개발 (Phase 7 이후)
- Bauhaus Steel 디자인 테마 적용 (6가지 테마)
- 상품 엑셀 배치 업로드 기능
- 다국어 상품명 지원 (EN/JA/KO)
- 발주 수량 단위 개선 (박스 단위)
- 재무 관리, 클레임, 감사, 대시보드, 리포트 기능 추가

---

## 12. 프로젝트 디렉터리 구조

```
coffee-inventory/
├── backend/                          # Spring Boot 백엔드
│   ├── src/main/java/com/coffee/
│   │   ├── common/                   # 공통 (예외처리, 응답 래퍼)
│   │   ├── config/                   # 설정 (Security, JWT, S3, CORS)
│   │   └── domain/                   # 도메인별 패키지
│   │       ├── org/                  # 조직 (회사/브랜드/매장/사용자)
│   │       ├── master/               # 마스터 (상품/포장/공급업체)
│   │       ├── inventory/            # 재고 (원장/스냅샷/예측)
│   │       ├── receiving/            # 입고 (배송/스캔)
│   │       ├── ordering/             # 발주 (계획/장바구니/카탈로그)
│   │       ├── pos/                  # POS (판매)
│   │       ├── recipe/               # 레시피 (메뉴/컴포넌트)
│   │       ├── waste/                # 폐기
│   │       ├── claim/                # 클레임
│   │       ├── physicalcount/        # 실사
│   │       ├── audit/                # 감사
│   │       ├── dashboard/            # 대시보드
│   │       ├── report/               # 리포트
│   │       ├── finance/              # 재무
│   │       └── ...                   # 기타 (업로드, 푸시, 배치 등)
│   ├── src/main/resources/
│   │   ├── application.yml           # 메인 설정
│   │   └── db/migration/             # Flyway SQL (V1~V33)
│   ├── src/test/                     # 테스트 (53개)
│   ├── Dockerfile                    # 멀티스테이지 빌드
│   └── pom.xml                       # Maven 의존성
│
├── frontend/                         # React 프론트엔드
│   ├── src/
│   │   ├── api/                      # API 클라이언트 (19개 모듈)
│   │   ├── components/               # UI 컴포넌트 (shadcn/ui + 커스텀)
│   │   ├── pages/
│   │   │   ├── admin/                # 관리자 화면 (14개)
│   │   │   ├── store/                # 매장 화면 (13개)
│   │   │   └── supplier/             # 공급업체 포털 (2개)
│   │   ├── store/                    # Zustand 상태관리
│   │   ├── hooks/                    # 커스텀 훅
│   │   ├── locales/                  # 다국어 (en/ko/ja)
│   │   └── lib/                      # 유틸리티
│   ├── Dockerfile                    # 멀티스테이지 빌드
│   ├── vite.config.ts                # Vite + PWA 설정
│   └── package.json                  # 의존성
│
├── infra/                            # 인프라
│   ├── docker-compose.yml            # 3개 서비스
│   ├── nginx/nginx.conf              # 리버스 프록시
│   └── deploy.sh                     # 배포 스크립트
│
├── docs/                             # 문서
│   ├── ARCHITECTURE.md               # 아키텍처 설계
│   ├── TASKS.md                      # 25개 태스크 목록
│   ├── DESIGN_SYSTEM.md              # 디자인 시스템
│   ├── QA_REPORT.md                  # QA 보고서
│   └── PROJECT_SUMMARY.md            # 본 문서
│
├── CLAUDE.md                         # 개발 규칙
└── .env                              # 환경변수
```

---

## 13. 향후 확장 가능 영역

| 영역 | 설명 |
|------|------|
| CI/CD | GitHub Actions 기반 자동 빌드/배포 파이프라인 |
| HTTPS | Let's Encrypt 또는 ACM 인증서 적용 |
| 스케일링 | AWS ECS/EKS 전환 (멀티 인스턴스) |
| 캐시 | Redis 도입 (세션, 자주 조회 데이터) |
| 검색 | Elasticsearch 도입 (상품/발주 검색) |
| 알림 | Slack/LINE 연동 (재고 부족, 발주 알림) |
| 앱 | React Native 모바일 앱 (현재 PWA) |
| BI | 데이터 웨어하우스 + BI 대시보드 (Metabase 등) |
| API 문서 | Swagger/OpenAPI 자동 문서화 |
| 로깅 | ELK 스택 (중앙 로그 관리) |

---

> **본 문서는 Coffee Inventory Management System의 전체 프로젝트 현황을 정리한 것입니다.**
> **추가 문의사항이 있으시면 개발팀에 연락해 주세요.**
