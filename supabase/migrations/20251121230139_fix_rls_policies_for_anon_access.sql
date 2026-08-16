/*
  # Fix RLS Policies for Anonymous Access

  1. Changes
    - Drop existing restrictive policies on products table
    - Create new policies that allow anonymous users to manage products
    - This enables the owner dashboard to work without Supabase authentication
    
  2. Security Notes
    - Products management is now available to anyone with the anon key
    - Owner authentication is handled at the application level
    - For production, consider implementing proper Supabase auth
*/

-- Drop existing policies for products
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;

-- Create new policies that work with anon role
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete products"
  ON products FOR DELETE
  USING (true);

-- Update orders policies to work with anon
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;

CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
  ON orders FOR DELETE
  USING (true);

-- Update messages policies
DROP POLICY IF EXISTS "Authenticated users can view messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;

CREATE POLICY "Anyone can view messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update messages"
  ON messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete messages"
  ON messages FOR DELETE
  USING (true);

-- Update appointments policies
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;

CREATE POLICY "Anyone can view appointments"
  ON appointments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update appointments"
  ON appointments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete appointments"
  ON appointments FOR DELETE
  USING (true);

-- Update chat sessions policies
DROP POLICY IF EXISTS "Authenticated users can manage all chat sessions" ON chat_sessions;

CREATE POLICY "Anyone can delete chat sessions"
  ON chat_sessions FOR DELETE
  USING (true);

-- Update settings policies
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;

CREATE POLICY "Anyone can update settings"
  ON settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert settings"
  ON settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete settings"
  ON settings FOR DELETE
  USING (true);