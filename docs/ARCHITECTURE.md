# 커피 재고관리 시스템 - ARCHITECTURE.md

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 백엔드 | Java 17 + Spring Boot 3.x |
| 프론트엔드 | React 18 + Tailwind CSS + shadcn/ui |
| DB | MySQL 8.0 (AWS RDS) |
| 인프라 | AWS Lightsail + RDS + S3 + SES |
| 컨테이너 | Docker Compose |
| 웹서버 | Nginx (리버스 프록시 + TLS) |
| 인증 | JWT (Company/Brand/Store 스코프 기반) |

---

## 도메인 구조

```
Company (법인/그룹)
  └── Brand (브랜드)
        └── Store (매장)
```

---

## 프로젝트 폴더 구조

```
/home/ubuntu/coffee-inventory/
├── backend/                          # Spring Boot
│   ├── src/main/java/com/coffee/
│   │   ├── CoffeeInventoryApplication.java
│   │   ├── config/                   # DB, Security, JWT, S3 설정
│   │   ├── domain/
│   │   │   ├── org/                  # Company / Brand / Store
│   │   │   ├── master/               # Item / Packaging / Supplier / SupplierItem
│   │   │   ├── inventory/            # StockLedger / InventorySnapshot
│   │   │   ├── receiving/            # Delivery / DeliveryScan
│   │   │   ├── waste/                # Waste
│   │   │   ├── recipe/               # Menu / MenuOption / RecipeComponent
│   │   │   ├── pos/                  # PosSales
│   │   │   └── ordering/             # OrderPlan / OrderLine / OrderDispatchLog
│   │   └── common/                   # exception, response, util
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/             # Flyway SQL 마이그레이션
│   └── src/test/
├── frontend/                         # React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/                # 관리자 페이지 (/admin)
│   │   │   └── store/                # 태블릿 매장 페이지 (/store)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/                      # axios API 클라이언트
│   │   └── store/                    # 상태관리 (Zustand)
│   └── public/
├── docs/
│   ├── ARCHITECTURE.md               # 이 파일
│   ├── TASKS.md                      # Claude Code 태스크 목록
│   └── DESIGN_SYSTEM.md              # 디자인 가이드
├── infra/
│   ├── docker-compose.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── deploy.sh
└── scripts/
    └── auto_dev.sh                   # 자동화 스크립트
```

---

## DB 스키마 (MySQL)

### Org

```sql
CREATE TABLE company (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE brand (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES company(id)
);

CREATE TABLE store (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brand(id)
);
```

### Master

```sql
CREATE TABLE item (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  base_unit VARCHAR(20) NOT NULL,  -- EA, ml, g
  loss_rate DECIMAL(5,4) DEFAULT 0.0000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brand(id)
);

CREATE TABLE packaging (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT NOT NULL,
  pack_name VARCHAR(100) NOT NULL,
  units_per_pack DECIMAL(10,3) NOT NULL,
  pack_barcode VARCHAR(100),
  status ENUM('ACTIVE','DEPRECATED') DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES item(id)
);

CREATE TABLE supplier (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  order_method ENUM('EMAIL','PORTAL','EDI') DEFAULT 'EMAIL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brand(id)
);

CREATE TABLE supplier_item (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT NOT NULL,
  packaging_id BIGINT NOT NULL,
  supplier_sku VARCHAR(100),
  lead_time_days INT DEFAULT 1,
  price DECIMAL(12,2),
  FOREIGN KEY (supplier_id) REFERENCES supplier(id),
  FOREIGN KEY (packaging_id) REFERENCES packaging(id)
);
```

### Stock

```sql
CREATE TABLE stock_ledger (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  qty_base_unit DECIMAL(12,3) NOT NULL,  -- +입고, -사용/폐기
  type ENUM('RECEIVE','SELL','WASTE','DAMAGE_RECEIVE','ADJUST') NOT NULL,
  ref_type VARCHAR(50),   -- 'DELIVERY','POS_SALES','WASTE' 등
  ref_id BIGINT,
  memo TEXT,
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (item_id) REFERENCES item(id)
);

CREATE TABLE inventory_snapshot (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  qty_base_unit DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_item (store_id, item_id),
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (item_id) REFERENCES item(id)
);
```

### Receiving

```sql
CREATE TABLE delivery (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  expected_at DATE,
  status ENUM('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(id)
);

CREATE TABLE delivery_scan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  delivery_id BIGINT NOT NULL,
  packaging_id BIGINT NOT NULL,
  lot_no VARCHAR(100),
  exp_date DATE,
  pack_count_scanned INT NOT NULL DEFAULT 1,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES delivery(id),
  FOREIGN KEY (packaging_id) REFERENCES packaging(id)
);
```

### Waste / Damage

```sql
CREATE TABLE waste (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  qty_base_unit DECIMAL(10,3) NOT NULL,
  reason VARCHAR(200),
  waste_type ENUM('OPERATION','DAMAGE_RECEIVE') DEFAULT 'OPERATION',
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (item_id) REFERENCES item(id)
);
```

### Recipe & POS

```sql
CREATE TABLE menu (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  pos_menu_id VARCHAR(100),  -- POS 연동용
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (brand_id) REFERENCES brand(id)
);

CREATE TABLE menu_option (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (menu_id) REFERENCES menu(id)
);

CREATE TABLE recipe_component (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT,
  option_id BIGINT,
  item_id BIGINT NOT NULL,
  qty_base_unit DECIMAL(10,3) NOT NULL,
  FOREIGN KEY (item_id) REFERENCES item(id)
);

CREATE TABLE pos_sales (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  business_date DATE NOT NULL,
  menu_id BIGINT NOT NULL,
  option_json JSON,
  qty INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (menu_id) REFERENCES menu(id)
);
```

### Ordering

```sql
CREATE TABLE order_plan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id BIGINT NOT NULL,
  supplier_id BIGINT NOT NULL,
  status ENUM('DRAFT','CONFIRMED','DISPATCHED','CANCELLED') DEFAULT 'DRAFT',
  recommended_by_ai BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES store(id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(id)
);

CREATE TABLE order_line (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_plan_id BIGINT NOT NULL,
  packaging_id BIGINT NOT NULL,
  pack_qty INT NOT NULL,
  FOREIGN KEY (order_plan_id) REFERENCES order_plan(id),
  FOREIGN KEY (packaging_id) REFERENCES packaging(id)
);

CREATE TABLE order_dispatch_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_plan_id BIGINT NOT NULL,
  method ENUM('EMAIL','PORTAL','EDI') NOT NULL,
  status ENUM('SUCCESS','FAILED') NOT NULL,
  response_body TEXT,
  dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_plan_id) REFERENCES order_plan(id)
);
```

### Users / Auth

```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPER_ADMIN','BRAND_ADMIN','STORE_MANAGER') NOT NULL,
  company_id BIGINT,
  brand_id BIGINT,
  store_id BIGINT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API 엔드포인트 구조

```
/api/v1/
├── auth/
│   ├── POST /login
│   └── POST /refresh
├── org/
│   ├── companies/
│   ├── brands/
│   └── stores/
├── master/
│   ├── items/
│   ├── packagings/
│   ├── suppliers/
│   └── supplier-items/
├── inventory/
│   ├── ledger/
│   └── snapshot/
├── receiving/
│   ├── deliveries/
│   └── deliveries/{id}/scans/
├── waste/
├── recipe/
│   ├── menus/
│   └── components/
├── pos/
│   └── sales/
└── ordering/
    ├── plans/
    └── plans/{id}/dispatch/
```

---

## Docker Compose 구성

```yaml
# infra/docker-compose.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
    depends_on:
      - api
      - web

  api:
    build: ../backend
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://${DB_HOST}:3306/${DB_NAME}
      - SPRING_DATASOURCE_USERNAME=${DB_USER}
      - SPRING_DATASOURCE_PASSWORD=${DB_PASS}
      - JWT_SECRET=${JWT_SECRET}
      - AWS_S3_BUCKET=${S3_BUCKET}
    ports:
      - "8080:8080"

  web:
    build: ../frontend
    ports:
      - "3000:3000"
```

---

## 환경변수 (.env)

```bash
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306
DB_NAME=coffee_inventory
DB_USER=admin
DB_PASS=yourpassword
JWT_SECRET=your-jwt-secret-min-32chars
S3_BUCKET=coffee-inventory-files
SES_FROM_EMAIL=no-reply@yourdomain.com
ANTHROPIC_API_KEY=your-claude-api-key
```

---

## 권한 매트릭스

| 기능 | SUPER_ADMIN | BRAND_ADMIN | STORE_MANAGER |
|------|-------------|-------------|---------------|
| Company/Brand/Store 관리 | ✅ | ❌ | ❌ |
| Item/Packaging/Supplier 관리 | ✅ | ✅ | ❌ |
| 입고/폐기 처리 | ✅ | ✅ | ✅ |
| 발주 확정 | ✅ | ✅ | ✅ |
| 재고 조회 | ✅ | ✅ (자기 브랜드) | ✅ (자기 매장) |
