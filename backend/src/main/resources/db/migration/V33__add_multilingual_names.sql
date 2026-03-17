-- Add multilingual name columns to item table
ALTER TABLE item ADD COLUMN name_en VARCHAR(200) AFTER name;
ALTER TABLE item ADD COLUMN name_ja VARCHAR(200) AFTER name_en;
ALTER TABLE item ADD COLUMN name_ko VARCHAR(200) AFTER name_ja;

-- Copy existing name to name_ko (current data is Korean)
UPDATE item SET name_ko = name WHERE name_ko IS NULL;
