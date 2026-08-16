/*
  # Add Invoice Fields to Orders Table

  ## Changes
  - Add customer_document field for RUC/CI
  - Add customer_address field for invoice address
  
  These fields are optional so existing orders won't be affected.
  If not provided, invoices will be generated as "innominada" (unnamed).
*/

-- Add customer_document column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_document'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_document text DEFAULT '';
  END IF;
END $$;

-- Add customer_address column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_address text DEFAULT '';
  END IF;
END $$;
