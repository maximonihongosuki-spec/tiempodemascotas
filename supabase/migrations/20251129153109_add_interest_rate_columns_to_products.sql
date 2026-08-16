/*
  # Add Interest Rate Columns to Products

  1. Changes to products table
    - Add `interest_rate_6` (numeric) - Interest rate for 6 months financing
    - Add `interest_rate_12` (numeric) - Interest rate for 12 months financing
    - Add `interest_rate_18` (numeric) - Interest rate for 18 months financing
    - Add `interest_rate_24` (numeric) - Interest rate for 24 months financing

  2. Notes
    - These fields allow configuring financing options per product
    - Default values are common interest rates for consumer financing
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
