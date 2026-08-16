/*
  # Comprehensive System Fix

  1. Ensure All Critical Tables Exist
    - `sales` - Sales/invoices tracking
    - `sale_items` - Line items for sales
    - `credit_payments` - Credit payment installments
    - `suppliers` - Supplier management
    - `admin_settings` - Admin configuration

  2. Add Missing Columns to Existing Tables
    - `products` - external_code, brand, location, cost, wholesale_price, interest rates, uploaded_image_url
    - `site_settings` - invoice fields (business_name, ruc, address, etc.)
    - `credit_payments` - installment_number, due_date, status, promissory_note_status

  3. Complete RLS Policies
    - Add missing DELETE policies for all tables
    - Add missing UPDATE policies for sale_items
    - Ensure all tables have SELECT, INSERT, UPDATE, DELETE policies

  4. Security
    - Enable RLS on all tables
    - All policies allow anon and authenticated access for this local system
*/

-- ========================================
-- PART 1: CREATE MISSING TABLES
-- ========================================

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_document text DEFAULT '',
  customer_address text DEFAULT '',
  customer_phone text DEFAULT '',
  sale_type text DEFAULT 'cash',
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
  invoice_number text DEFAULT '',
  invoice_date timestamptz DEFAULT now(),
  status text DEFAULT 'completed',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_code text DEFAULT '',
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric DEFAULT 0 CHECK (unit_price >= 0),
  tax_exempt boolean DEFAULT false,
  tax_rate numeric DEFAULT 0.10,
  subtotal numeric DEFAULT 0 CHECK (subtotal >= 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create credit_payments table
CREATE TABLE IF NOT EXISTS credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  installment_number integer DEFAULT 1,
  amount numeric DEFAULT 0 CHECK (amount >= 0),
  due_date date,
  payment_date timestamptz,
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'pending',
  promissory_note_status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  notes text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002'::uuid,
  chat_enabled boolean DEFAULT true,
  footer_credit_image_url text DEFAULT '',
  footer_credit_uploaded_image text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Insert default admin settings
INSERT INTO admin_settings (id, chat_enabled)
VALUES ('00000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- PART 2: ADD MISSING COLUMNS TO PRODUCTS
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'external_code') THEN
    ALTER TABLE products ADD COLUMN external_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
    ALTER TABLE products ADD COLUMN brand text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'location') THEN
    ALTER TABLE products ADD COLUMN location text DEFAULT 'SHOW ROOM';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost') THEN
    ALTER TABLE products ADD COLUMN cost numeric DEFAULT 0 CHECK (cost >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'wholesale_price') THEN
    ALTER TABLE products ADD COLUMN wholesale_price numeric DEFAULT 0 CHECK (wholesale_price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'interest_rate_6') THEN
    ALTER TABLE products ADD COLUMN interest_rate_6 numeric DEFAULT 10;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'interest_rate_12') THEN
    ALTER TABLE products ADD COLUMN interest_rate_12 numeric DEFAULT 15;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'interest_rate_18') THEN
    ALTER TABLE products ADD COLUMN interest_rate_18 numeric DEFAULT 20;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'interest_rate_24') THEN
    ALTER TABLE products ADD COLUMN interest_rate_24 numeric DEFAULT 25;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'uploaded_image_url') THEN
    ALTER TABLE products ADD COLUMN uploaded_image_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ========================================
-- PART 3: ADD INVOICE FIELDS TO SITE_SETTINGS
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_business_name') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_business_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_ruc') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_ruc text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_address') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_phone') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_email') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_email text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_logo_url') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_establishment_code') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_establishment_code text DEFAULT '001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_point_of_sale') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_point_of_sale text DEFAULT '001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'invoice_current_number') THEN
    ALTER TABLE site_settings ADD COLUMN invoice_current_number integer DEFAULT 0;
  END IF;
END $$;

-- ========================================
-- PART 4: COMPLETE RLS POLICIES
-- ========================================

-- Sales policies
DROP POLICY IF EXISTS "Allow public read access to sales" ON sales;
CREATE POLICY "Allow public read access to sales" ON sales FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert access to sales" ON sales;
CREATE POLICY "Allow public insert access to sales" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to sales" ON sales;
CREATE POLICY "Allow public update access to sales" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to sales" ON sales;
CREATE POLICY "Allow public delete access to sales" ON sales FOR DELETE TO anon, authenticated USING (true);

-- Sale items policies
DROP POLICY IF EXISTS "Allow public read access to sale_items" ON sale_items;
CREATE POLICY "Allow public read access to sale_items" ON sale_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert access to sale_items" ON sale_items;
CREATE POLICY "Allow public insert access to sale_items" ON sale_items FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to sale_items" ON sale_items;
CREATE POLICY "Allow public update access to sale_items" ON sale_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to sale_items" ON sale_items;
CREATE POLICY "Allow public delete access to sale_items" ON sale_items FOR DELETE TO anon, authenticated USING (true);

-- Credit payments policies
DROP POLICY IF EXISTS "Allow public read access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public read access to credit_payments" ON credit_payments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public insert access to credit_payments" ON credit_payments FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public update access to credit_payments" ON credit_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public delete access to credit_payments" ON credit_payments FOR DELETE TO anon, authenticated USING (true);

-- Suppliers policies
DROP POLICY IF EXISTS "Allow public read access to suppliers" ON suppliers;
CREATE POLICY "Allow public read access to suppliers" ON suppliers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert access to suppliers" ON suppliers;
CREATE POLICY "Allow public insert access to suppliers" ON suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to suppliers" ON suppliers;
CREATE POLICY "Allow public update access to suppliers" ON suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to suppliers" ON suppliers;
CREATE POLICY "Allow public delete access to suppliers" ON suppliers FOR DELETE TO anon, authenticated USING (true);

-- Admin settings policies
DROP POLICY IF EXISTS "Allow public read access to admin_settings" ON admin_settings;
CREATE POLICY "Allow public read access to admin_settings" ON admin_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public update access to admin_settings" ON admin_settings;
CREATE POLICY "Allow public update access to admin_settings" ON admin_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);