/*
  # Add Missing Columns to Orders and Site Settings

  1. Changes to orders table
    - Add `customer_address` (text) - Customer address
    - Add `customer_document` (text) - Customer RUC/CI
    - Add `customer_document_type` (text) - Document type (RUC/CI)

  2. Changes to site_settings table (if missing)
    - Add `invoice_business_ruc` (text) - Business RUC
    - Add `invoice_business_stamp` (text) - Timbrado number
    - Add `invoice_control_code` (text) - Invoice control code

  3. Security
    - Maintain existing RLS policies
*/

-- Add columns to orders table if they don't exist
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_document_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_document_type text DEFAULT 'CI';
  END IF;
END $$;

-- Add additional invoice columns to site_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_business_stamp'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_business_stamp text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'invoice_control_code'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN invoice_control_code text DEFAULT '';
  END IF;
END $$;
