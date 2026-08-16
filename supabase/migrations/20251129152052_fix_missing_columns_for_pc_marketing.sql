/*
  # Fix Missing Database Columns for PC Marketing

  1. Changes to products table
    - Add `brand` (text) - Product brand/manufacturer
    - Add `location` (text) - Physical location in store
    - Add `cost` (numeric) - Cost price
    - Add `wholesale_price` (numeric) - Wholesale price
    - Add `uploaded_image_url` (text) - Base64 encoded product image
    - Add `supplier_id` (uuid) - Reference to supplier
    - Add `delivery_time_hours` (integer) - Delivery time in hours
    - Add `external_code` (text) - External product code/SKU

  2. Changes to site_settings table
    - Add `uploaded_logo_url` (text) - Base64 encoded logo
    - Add `promo_banner_enabled` (boolean) - Enable/disable promo banner
    - Add `promo_banner_image_url` (text) - Promo banner URL
    - Add `promo_banner_uploaded_image` (text) - Base64 promo banner
    - Add `invoice_establishment_code` (text) - Invoice establishment code
    - Add `invoice_point_of_sale` (text) - Invoice point of sale
    - Add `invoice_current_number` (integer) - Current invoice number
    - Add `invoice_business_name` (text) - Business name for invoices
    - Add `invoice_business_address` (text) - Business address for invoices
    - Add `invoice_business_phone` (text) - Business phone for invoices
    - Add `invoice_business_ruc` (text) - Business RUC/tax ID

  3. Security
    - Maintain existing RLS policies
*/

-- Add columns to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'brand'
  ) THEN
    ALTER TABLE products ADD COLUMN brand text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'location'
  ) THEN
    ALTER TABLE products ADD COLUMN location text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'cost'
  ) THEN
    ALTER TABLE products ADD COLUMN cost numeric DEFAULT 0 CHECK (cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'wholesale_price'
  ) THEN
    ALTER TABLE products ADD COLUMN wholesale_price numeric DEFAULT 0 CHECK (wholesale_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'uploaded_image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN uploaded_image_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'delivery_time_hours'
  ) THEN
    ALTER TABLE products ADD COLUMN delivery_time_hours integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'external_code'
  ) THEN
    ALTER TABLE products ADD COLUMN external_code text DEFAULT '';
  END IF;
END $$;

-- Add columns to site_settings table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'uploaded_logo_url'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN uploaded_logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_image_url'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_image_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_uploaded_image'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_uploaded_image text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_establishment_code'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_establishment_code text DEFAULT '001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_point_of_sale'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_point_of_sale text DEFAULT '001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_current_number'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_current_number integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_business_name'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_business_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_business_address'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_business_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_business_phone'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_business_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_business_ruc'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_business_ruc text DEFAULT '';
  END IF;
END $$;
