/*
  # Fix Products RLS Policies

  1. Changes
    - Add policy for authenticated users to view all products (for owner dashboard)
    - Add policy for authenticated users to insert products
    - Add policy for authenticated users to update products
    - Add policy for authenticated users to delete products
  
  2. Security
    - Anonymous users can only view active products
    - Authenticated users (owner) can manage all products
*/

-- Add policy for owner to view all products
CREATE POLICY "Owner can view all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for owner to insert products
CREATE POLICY "Owner can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add policy for owner to update products
CREATE POLICY "Owner can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policy for owner to delete products
CREATE POLICY "Owner can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- Add policy for owner to view all orders
CREATE POLICY "Owner can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for owner to update orders
CREATE POLICY "Owner can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policy for owner to delete orders
CREATE POLICY "Owner can delete orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (true);