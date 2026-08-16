/*
  # Fix Products Policies for Local Authentication

  1. Changes
    - Drop existing authenticated-only policies for products
    - Add public policies that allow anyone to manage products
    - This is necessary because the app uses localStorage authentication instead of Supabase auth

  2. Security Note
    - Products table becomes publicly writable
    - Frontend uses password protection via localStorage
    - Consider implementing proper Supabase auth in production
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Owner can view all products" ON products;
DROP POLICY IF EXISTS "Owner can insert products" ON products;
DROP POLICY IF EXISTS "Owner can update products" ON products;
DROP POLICY IF EXISTS "Owner can delete products" ON products;

-- Create new public policies for management
CREATE POLICY "Public can view all products"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert products"
  ON products FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update products"
  ON products FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete products"
  ON products FOR DELETE
  TO public
  USING (true);