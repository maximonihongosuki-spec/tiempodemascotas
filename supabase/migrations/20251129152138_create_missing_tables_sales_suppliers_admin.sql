/*
  # Create Missing Tables for Sales, Suppliers and Admin

  1. New Tables
    - `sales` - Store completed sales/invoices
    - `sale_items` - Line items for each sale
    - `suppliers` - Supplier information
    - `credit_payments` - Credit payment tracking
    - `admin_settings` - Admin panel settings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create sales table if it doesn't exist
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
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

-- Create sale_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
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

-- Create suppliers table if it doesn't exist
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

-- Create credit_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  payment_date timestamptz DEFAULT now(),
  amount numeric DEFAULT 0 CHECK (amount >= 0),
  payment_method text DEFAULT 'cash',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

-- Create admin_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002'::uuid,
  chat_enabled boolean DEFAULT true,
  footer_credit_image_url text DEFAULT '',
  footer_credit_uploaded_image text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Insert default admin settings if not exists
INSERT INTO admin_settings (id, chat_enabled, footer_credit_image_url, footer_credit_uploaded_image)
VALUES ('00000000-0000-0000-0000-000000000002', true, '', '')
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for sales table
DROP POLICY IF EXISTS "Allow public read access to sales" ON sales;
CREATE POLICY "Allow public read access to sales"
  ON sales FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to sales" ON sales;
CREATE POLICY "Allow public insert access to sales"
  ON sales FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to sales" ON sales;
CREATE POLICY "Allow public update access to sales"
  ON sales FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to sales" ON sales;
CREATE POLICY "Allow public delete access to sales"
  ON sales FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for sale_items table
DROP POLICY IF EXISTS "Allow public read access to sale_items" ON sale_items;
CREATE POLICY "Allow public read access to sale_items"
  ON sale_items FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to sale_items" ON sale_items;
CREATE POLICY "Allow public insert access to sale_items"
  ON sale_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for suppliers table
DROP POLICY IF EXISTS "Allow public read access to suppliers" ON suppliers;
CREATE POLICY "Allow public read access to suppliers"
  ON suppliers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to suppliers" ON suppliers;
CREATE POLICY "Allow public insert access to suppliers"
  ON suppliers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to suppliers" ON suppliers;
CREATE POLICY "Allow public update access to suppliers"
  ON suppliers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for credit_payments table
DROP POLICY IF EXISTS "Allow public read access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public read access to credit_payments"
  ON credit_payments FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public insert access to credit_payments"
  ON credit_payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to credit_payments" ON credit_payments;
CREATE POLICY "Allow public update access to credit_payments"
  ON credit_payments FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for admin_settings table
DROP POLICY IF EXISTS "Allow public read access to admin_settings" ON admin_settings;
CREATE POLICY "Allow public read access to admin_settings"
  ON admin_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public update access to admin_settings" ON admin_settings;
CREATE POLICY "Allow public update access to admin_settings"
  ON admin_settings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
