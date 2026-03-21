-- V36: Aoyama pilot store seed data (72 items + categories)
-- Brand ID: 1, existing categories: 1=원두, 2=유제품, 3=시럽/소스, 4=컵/리드, 5=기타소모품

-- Add missing categories
INSERT IGNORE INTO item_category (brand_id, name, parent_id, display_order, created_at)
VALUES
  (1, '냉동', NULL, 15, NOW()),
  (1, '파우더/티', NULL, 25, NOW()),
  (1, '퓨레/청', NULL, 35, NOW());

-- Get category IDs (use variables for clarity)
SET @CAT_DAIRY = 2;        -- 유제품 (냉장/신선)
SET @CAT_BEAN = 1;         -- 원두
SET @CAT_SYRUP = 3;        -- 시럽/소스
SET @CAT_CUP = 4;          -- 컵/리드
SET @CAT_SUPPLY = 5;       -- 기타소모품
SET @CAT_FROZEN = (SELECT id FROM item_category WHERE brand_id = 1 AND name = '냉동' LIMIT 1);
SET @CAT_POWDER = (SELECT id FROM item_category WHERE brand_id = 1 AND name = '파우더/티' LIMIT 1);
SET @CAT_PUREE = (SELECT id FROM item_category WHERE brand_id = 1 AND name = '퓨레/청' LIMIT 1);

-- Insert 72 items (INSERT IGNORE to avoid duplicates on re-run)
-- Fields: brand_id, name, name_ko, name_ja, base_unit, category_id, temperature_zone,
--         stock_unit, order_unit, conversion_qty, min_order_qty, par_level, count_cycle,
--         storage_zone, item_grade, lot_tracking, is_pos_tracked, is_active, is_orderable

-- === 냉장/신선 (REFRIGERATED) ===
INSERT IGNORE INTO item (brand_id, name, name_ko, name_ja, base_unit, category_id, temperature_zone, stock_unit, order_unit, conversion_qty, min_order_qty, par_level, count_cycle, storage_zone, item_grade, lot_tracking, is_pos_tracked, is_active, is_orderable, created_at)
VALUES
(1, '우유', '우유', '牛乳', 'ml', @CAT_DAIRY, 'COLD', 'ml', 'pack', 1000.000, 1, 0, 'DAILY', 'REFRIGERATED', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '생크림', '생크림', '生クリーム', 'ml', @CAT_DAIRY, 'COLD', 'ml', 'pack', 200.000, 1, 0, 'DAILY', 'REFRIGERATED', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '탄산수', '탄산수', '炭酸水', 'ml', @CAT_DAIRY, 'COLD', 'ml', 'bottle', 500.000, 1, 0, 'DAILY', 'REFRIGERATED', 'A', 'NONE', true, true, true, NOW()),
(1, '오렌지주스', '오렌지주스', 'オレンジジュース', 'ml', @CAT_DAIRY, 'COLD', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '레몬즙', '레몬즙', 'レモン汁', 'ml', @CAT_DAIRY, 'COLD', 'ml', 'bottle', 500.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '연유', '연유', '練乳', 'g', @CAT_DAIRY, 'COLD', 'g', 'tube', 150.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '레몬', '레몬', 'レモン', 'ea', @CAT_DAIRY, 'COLD', 'ea', 'ea', 1.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', false, true, true, NOW()),

-- === 냉동 (FROZEN) ===
(1, '냉동딸기', '냉동딸기', '冷凍イチゴ', 'g', @CAT_FROZEN, 'FROZEN', 'g', 'bag', 1000.000, 1, 0, 'DAILY', 'FROZEN', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '냉동딸기 다이스', '냉동딸기 다이스', '冷凍イチゴダイス', 'g', @CAT_FROZEN, 'FROZEN', 'g', 'bag', 1000.000, 1, 0, 'DAILY', 'FROZEN', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '믹스베리 다이스', '믹스베리 다이스', 'ミックスベリーダイス', 'g', @CAT_FROZEN, 'FROZEN', 'g', 'bag', 1000.000, 1, 0, 'DAILY', 'FROZEN', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '와플냉동생지', '와플냉동생지', 'ワッフル冷凍生地', 'ea', @CAT_FROZEN, 'FROZEN', 'ea', 'bag', 20.000, 1, 0, 'DAILY', 'FROZEN', 'A', 'EXP_ONLY', true, true, true, NOW()),

-- === 원두 (AMBIENT) ===
(1, '다크원두', '다크원두', 'ダーク豆', 'g', @CAT_BEAN, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'DAILY', 'AMBIENT', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '프루티원두', '프루티원두', 'フルーティー豆', 'g', @CAT_BEAN, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'DAILY', 'AMBIENT', 'A', 'EXP_ONLY', true, true, true, NOW()),
(1, '설탕', '설탕', 'グラニュー糖', 'g', @CAT_SUPPLY, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'WEEKLY', 'AMBIENT', 'C', 'NONE', false, true, true, NOW()),
(1, '소금', '소금', '塩', 'g', @CAT_SUPPLY, 'AMBIENT', 'g', 'bag', 500.000, 1, 0, 'WEEKLY', 'AMBIENT', 'C', 'NONE', false, true, true, NOW()),

-- === 파우더/티 ===
(1, '가당말차라떼파우더', '가당말차라떼파우더', '抹茶ラテパウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '무당말차파우더', '무당말차파우더', '無糖抹茶パウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 500.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '코코아 파우더', '코코아 파우더', 'ココアパウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '무당코코아파우더', '무당코코아파우더', '無糖ココアパウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '블랙코코아파우더', '블랙코코아파우더', 'ブラックココアパウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 500.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '요거트파우더', '요거트파우더', 'ヨーグルトパウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '율무차파우더', '율무차파우더', 'ユルムパウダー', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '얼그레이', '얼그레이', 'アールグレイ', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 500.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '잉글리쉬블랙퍼스트', '잉글리쉬블랙퍼스트', 'イングリッシュブラックファースト', 'g', @CAT_POWDER, 'AMBIENT', 'g', 'bag', 500.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '얼그레이티백', '얼그레이티백', 'アールグレイティーバッグ', 'ea', @CAT_POWDER, 'AMBIENT', 'ea', 'box', 25.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '다즐링티백', '다즐링티백', 'ダージリンティーバッグ', 'ea', @CAT_POWDER, 'AMBIENT', 'ea', 'box', 25.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '히비스커스티백', '히비스커스티백', 'ハイビスカスティーバッグ', 'ea', @CAT_POWDER, 'AMBIENT', 'ea', 'box', 25.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '캐모마일티백', '캐모마일티백', 'カモミールティーバッグ', 'ea', @CAT_POWDER, 'AMBIENT', 'ea', 'box', 25.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),

-- === 시럽/소스 ===
(1, '초코소스', '초코소스', 'チョコソース', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '카라멜소스', '카라멜소스', 'キャラメルソース', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '캬라멜시럽', '캬라멜시럽', 'キャラメルシロップ', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '바닐라시럽', '바닐라시럽', 'バニラシロップ', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '마카다미아시럽', '마카다미아시럽', 'マカダミアシロップ', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '헤이즐넛시럽', '헤이즐넛시럽', 'ヘーゼルナッツシロップ', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '로즈시럽', '로즈시럽', 'ローズシロップ', 'ml', @CAT_SYRUP, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', true, true, true, NOW()),

-- === 퓨레/청 ===
(1, '블루베리퓨레', '블루베리퓨레', 'ブルーベリーピューレ', 'ml', @CAT_PUREE, 'COLD', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '딸기퓨레', '딸기퓨레', 'イチゴピューレ', 'ml', @CAT_PUREE, 'COLD', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '리치퓨레', '리치퓨레', 'ライチピューレ', 'ml', @CAT_PUREE, 'COLD', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '오렌지퓨레', '오렌지퓨레', 'オレンジピューレ', 'ml', @CAT_PUREE, 'COLD', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '라즈베리퓨레', '라즈베리퓨레', 'ラズベリーピューレ', 'ml', @CAT_PUREE, 'COLD', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '사과베이스', '사과베이스', 'アップルベース', 'ml', @CAT_PUREE, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', false, true, true, NOW()),
(1, '배베이스', '배베이스', '梨ベース', 'ml', @CAT_PUREE, 'AMBIENT', 'ml', 'bottle', 1000.000, 1, 0, 'TWICE_WEEKLY', 'AMBIENT', 'B', 'EXP_ONLY', false, true, true, NOW()),
(1, '유자청', '유자청', 'ユズジャム', 'g', @CAT_PUREE, 'COLD', 'g', 'jar', 500.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),
(1, '자몽청', '자몽청', 'グレープフルーツジャム', 'g', @CAT_PUREE, 'COLD', 'g', 'jar', 500.000, 1, 0, 'TWICE_WEEKLY', 'REFRIGERATED', 'B', 'EXP_ONLY', true, true, true, NOW()),

-- === 기타 식자재 ===
(1, '나타드코코', '나타드코코', 'ナタデココ', 'g', @CAT_SUPPLY, 'AMBIENT', 'g', 'can', 500.000, 1, 0, 'WEEKLY', 'AMBIENT', 'C', 'EXP_ONLY', false, true, true, NOW()),
(1, '검시럽포션', '검시럽포션', 'ガムシロップポーション', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'box', 50.000, 1, 0, 'WEEKLY', 'AMBIENT', 'C', 'NONE', false, true, true, NOW()),
(1, '프림포션', '프림포션', 'グリムポーション', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'box', 50.000, 1, 0, 'WEEKLY', 'AMBIENT', 'C', 'NONE', false, true, true, NOW()),

-- === 컵/용기 (SUPPLIES) ===
(1, '핫컵 12온즈', '핫컵 12온즈', 'ホットカップ 12オンス', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 50.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '핫컵 16온즈', '핫컵 16온즈', 'ホットカップ 16オンス', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 50.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '핫컵 뚜껑', '핫컵 뚜껑', 'ホットカップの蓋', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 100.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '아이스컵 14온즈', '아이스컵 14온즈', 'アイスカップ 14オンス', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 50.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '아이스컵 14온즈 뚜껑', '아이스컵 14온즈 뚜껑', 'アイスカップ 14オンス 蓋', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 100.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '아이스컵 22온즈', '아이스컵 22온즈', 'アイスカップ 22オンス', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 50.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '아이스컵 22온즈 뚜껑', '아이스컵 22온즈 뚜껑', 'アイスカップ 22オンス 蓋', 'ea', @CAT_CUP, 'AMBIENT', 'ea', 'sleeve', 100.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),

-- === 소모품 (SUPPLIES) ===
(1, '컵홀더', '컵홀더', 'カップホルダー', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 100.000, 1, 0, 'TWICE_WEEKLY', 'SUPPLIES', 'B', 'NONE', false, true, true, NOW()),
(1, '캐리어', '캐리어', 'キャリア', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 50.000, 1, 0, 'TWICE_WEEKLY', 'SUPPLIES', 'B', 'NONE', false, true, true, NOW()),
(1, '빨대', '빨대', 'ストロー', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 200.000, 1, 0, 'DAILY', 'SUPPLIES', 'A', 'NONE', false, true, true, NOW()),
(1, '두꺼운 빨대', '두꺼운 빨대', '太いストロー', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 200.000, 1, 0, 'TWICE_WEEKLY', 'SUPPLIES', 'B', 'NONE', false, true, true, NOW()),
(1, '포크', '포크', 'フォーク', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '나이프', '나이프', 'ナイフ', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '핫용 머들러', '핫용 머들러', 'マドラー', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 200.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '물티슈', '물티슈', 'ウェットティッシュ', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'box', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '냅킨', '냅킨', 'ナプキン', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 300.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '로고스티커', '로고스티커', 'ロゴシール', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'roll', 500.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '와플 봉투', '와플 봉투', 'ワッフル袋', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 200.000, 1, 0, 'TWICE_WEEKLY', 'SUPPLIES', 'B', 'NONE', false, true, true, NOW()),
(1, '손잡이봉투 (소)', '손잡이봉투 (소)', '手提げ袋（小）', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '손잡이봉투 (중)', '손잡이봉투 (중)', '手提げ袋（中）', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '쓰레기봉투', '쓰레기봉투', 'ゴミ袋', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'roll', 30.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '니트릴장갑 S', '니트릴장갑 S', 'ニトリル手袋 S', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'box', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '니트릴장갑 M', '니트릴장갑 M', 'ニトリル手袋 M', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'box', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '니트릴장갑 L', '니트릴장갑 L', 'ニトリル手袋 L', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'box', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW()),
(1, '차백', '차백', '茶バック', 'ea', @CAT_SUPPLY, 'AMBIENT', 'ea', 'pack', 100.000, 1, 0, 'WEEKLY', 'SUPPLIES', 'C', 'NONE', false, true, true, NOW());
