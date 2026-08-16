/*
  # Add external_code field to products table

  1. Changes
    - Add `external_code` column to store external product codes from CSV imports
    - This will store codes like "5.649.525.348.102" from CSV files
    - The existing `product_code` field will continue to be used for web URLs (e.g., "PRD-6A093D")
  
  2. Notes
    - external_code is optional and only used for CSV imports
    - product_code remains the unique identifier for web pages
    - Both codes can coexist and be displayed in the owner panel
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'external_code'
  ) THEN
    ALTER TABLE products ADD COLUMN external_code text;
  END IF;
END $$;