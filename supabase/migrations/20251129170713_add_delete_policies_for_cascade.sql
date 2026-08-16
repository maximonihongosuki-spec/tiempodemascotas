/*
  # Add DELETE policies for cascade deletion

  1. Changes
    - Add DELETE policy for `credit_payments` table
    - Add DELETE policy for `sale_items` table
    
  2. Security
    - Allow authenticated and anonymous users to delete records
    - Required for cascade deletion when removing sales and orders
*/

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public delete access to credit_payments" ON credit_payments;
DROP POLICY IF EXISTS "Allow public delete access to sale_items" ON sale_items;

-- Add DELETE policy for credit_payments
CREATE POLICY "Allow public delete access to credit_payments"
  ON credit_payments
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Add DELETE policy for sale_items
CREATE POLICY "Allow public delete access to sale_items"
  ON sale_items
  FOR DELETE
  TO anon, authenticated
  USING (true);
