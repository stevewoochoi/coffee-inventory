ALTER TABLE item ADD COLUMN price DECIMAL(12,2) DEFAULT NULL AFTER loss_rate;

-- Backfill item.price from supplier_item: item.price = AVG(si.price / p.units_per_pack)
UPDATE item i
INNER JOIN (
    SELECT p.item_id, AVG(si.price / p.units_per_pack) AS avg_unit_price
    FROM supplier_item si
    INNER JOIN packaging p ON si.packaging_id = p.id
    WHERE si.price IS NOT NULL AND p.units_per_pack > 0
    GROUP BY p.item_id
) calc ON i.id = calc.item_id
SET i.price = ROUND(calc.avg_unit_price, 2);
