/*
  # Add financing fields to products table

  1. Changes
    - Add `interest_rate_6` column for 6-month financing interest rate (default 10%)
    - Add `interest_rate_12` column for 12-month financing interest rate (default 15%)
    - Add `interest_rate_18` column for 18-month financing interest rate (default 20%)
    - Add `interest_rate_24` column for 24-month financing interest rate (default 25%)
  
  2. Notes
    - Interest rates are stored as percentages (e.g., 10 means 10%)
    - Default values match the requested rates
    - These can be customized per product via bulk editing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'interest_rate_6'
  ) THEN
    ALTER TABLE products ADD COLUMN interest_rate_6 numeric DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'interest_rate_12'
  ) THEN
    ALTER TABLE products ADD COLUMN interest_rate_12 numeric DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'interest_rate_18'
  ) THEN
    ALTER TABLE products ADD COLUMN interest_rate_18 numeric DEFAULT 20;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'interest_rate_24'
  ) THEN
    ALTER TABLE products ADD COLUMN interest_rate_24 numeric DEFAULT 25;
  END IF;
END $$;