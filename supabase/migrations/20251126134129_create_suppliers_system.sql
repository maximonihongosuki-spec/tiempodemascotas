/*
  # Create Suppliers System

  ## New Tables
  - `suppliers`
    - `id` (uuid, primary key)
    - `name` (text) - Supplier company name
    - `contact_name` (text) - Contact person name
    - `email` (text) - Contact email
    - `phone` (text) - Contact phone
    - `password_hash` (text) - Hashed password for login
    - `active` (boolean) - Whether supplier can login
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Changes to Existing Tables
  - Add `supplier_id` to products table (nullable)
  - Add `delivery_time_hours` to products table for supplier products
  
  ## Security
  - Enable RLS on suppliers table
  - Add policies for anon access (local authentication)
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text DEFAULT '',
  password_hash text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add supplier_id to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add delivery_time_hours to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'delivery_time_hours'
  ) THEN
    ALTER TABLE products ADD COLUMN delivery_time_hours int DEFAULT 0;
  END IF;
END $$;

-- Add comment to help identify product source
COMMENT ON COLUMN products.supplier_id IS 'If NULL, product is owned by Don Negro (in store). If set, product is from supplier (indirect sale)';
COMMENT ON COLUMN products.delivery_time_hours IS 'Delivery time in hours. 0 = immediate (in store), 24 = next day delivery';

-- Enable RLS on suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers (allow anon access since we use local auth)
CREATE POLICY "Allow anon to view active suppliers"
  ON suppliers FOR SELECT
  USING (active = true);

CREATE POLICY "Allow anon to insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon to update suppliers"
  ON suppliers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete suppliers"
  ON suppliers FOR DELETE
  USING (true);

-- Create index for faster supplier lookups
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
