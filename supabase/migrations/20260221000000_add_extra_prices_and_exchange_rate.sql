-- Add new price fields to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS special_price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS differentiated_price NUMERIC DEFAULT 0;

-- Add dollar exchange rate to site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS dollar_exchange_rate NUMERIC DEFAULT 7500;
