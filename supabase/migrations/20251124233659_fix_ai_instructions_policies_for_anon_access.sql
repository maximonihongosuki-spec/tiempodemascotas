/*
  # Fix AI Instructions Policies for Anonymous Access

  1. Changes
    - Drop existing restrictive policies for ai_instructions table
    - Add new policies allowing anonymous (anon) users to:
      - View all instructions (active and inactive)
      - Insert new instructions
      - Update existing instructions
      - Delete instructions
    
  2. Security Note
    - This allows the owner dashboard to work without authentication
    - In a production environment, you would want to add proper authentication
    - For now, this matches the pattern used in other tables (products, orders, etc.)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active AI instructions" ON ai_instructions;
DROP POLICY IF EXISTS "Authenticated users can view all AI instructions" ON ai_instructions;
DROP POLICY IF EXISTS "Authenticated users can insert AI instructions" ON ai_instructions;
DROP POLICY IF EXISTS "Authenticated users can update AI instructions" ON ai_instructions;
DROP POLICY IF EXISTS "Authenticated users can delete AI instructions" ON ai_instructions;

-- Create new policies for anonymous access
CREATE POLICY "Allow anon to view all AI instructions"
  ON ai_instructions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to insert AI instructions"
  ON ai_instructions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update AI instructions"
  ON ai_instructions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to delete AI instructions"
  ON ai_instructions
  FOR DELETE
  TO anon
  USING (true);
