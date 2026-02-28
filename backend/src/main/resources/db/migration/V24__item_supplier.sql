ALTER TABLE item ADD COLUMN supplier_id BIGINT DEFAULT NULL AFTER vat_inclusive;

-- Backfill: set item.supplier_id from the most common supplier in supplier_item via packaging
UPDATE item i
INNER JOIN (
    SELECT p.item_id, si.supplier_id,
           ROW_NUMBER() OVER (PARTITION BY p.item_id ORDER BY COUNT(*) DESC, si.supplier_id) AS rn
    FROM supplier_item si
    INNER JOIN packaging p ON si.packaging_id = p.id
    GROUP BY p.item_id, si.supplier_id
) ranked ON i.id = ranked.item_id AND ranked.rn = 1
SET i.supplier_id = ranked.supplier_id;
