/*
  # Add Invoice Fiscal Columns to Site Settings

  1. Changes to site_settings table
    - Add `ruc` (text) - Business RUC (tax ID)
    - Add `timbrado` (text) - Invoice stamp number
    - Add `business_address` (text) - Business address
    - Add `business_email` (text) - Business email
    - Add `business_phones` (text) - Business phone numbers
    - Add `timbrado_start_date` (date) - Stamp validity start date

  2. Notes
    - These fields are required for Paraguayan invoice generation
    - RUC and Timbrado are fiscal requirements in Paraguay
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'ruc'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN ruc text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'timbrado'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN timbrado text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'business_address'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN business_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'business_email'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN business_email text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'business_phones'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN business_phones text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'timbrado_start_date'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN timbrado_start_date date;
  END IF;
END $$;
