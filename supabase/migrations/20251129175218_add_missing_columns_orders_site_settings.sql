/*
  # Add Missing Columns to Orders and Site Settings Tables

  1. Add Missing Columns to Orders Table
    - `customer_address` (text) - Customer address for orders
    - `customer_document` (text) - Customer RUC/CI for orders

  2. Add Missing Columns to Site Settings Table
    - `promo_banner_enabled` (boolean) - Enable/disable promotional banner
    - `promo_banner_text` (text) - Promotional banner text
    - `promo_banner_link` (text) - Promotional banner link
    - `promo_banner_bg_color` (text) - Banner background color
    - `promo_banner_text_color` (text) - Banner text color

  3. Security
    - No changes to RLS policies needed
    - All columns have appropriate defaults
*/

-- Add missing columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_document'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_document text DEFAULT '';
  END IF;
END $$;

-- Add missing columns to site_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_text'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_text text DEFAULT '¡Descuentos especiales esta semana!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_link'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_link text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_bg_color'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_bg_color text DEFAULT '#E91E8C';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_text_color'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_text_color text DEFAULT '#FFFFFF';
  END IF;
END $$;