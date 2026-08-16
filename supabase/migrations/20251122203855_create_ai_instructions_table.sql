/*
  # Create AI Instructions Table

  1. New Tables
    - `ai_instructions`
      - `id` (uuid, primary key) - Unique identifier
      - `instruction_key` (text, unique) - Key to identify the instruction type (e.g., 'chat_assistant', 'product_recommendations')
      - `instruction_text` (text) - The actual instruction text for the AI
      - `is_active` (boolean) - Whether this instruction is currently active
      - `created_at` (timestamptz) - When the instruction was created
      - `updated_at` (timestamptz) - When the instruction was last updated

  2. Security
    - Enable RLS on `ai_instructions` table
    - Add policy for anonymous users to read active instructions
    - Add policy for authenticated users (owners) to manage all instructions

  3. Initial Data
    - Insert default instruction for chat assistant
*/

CREATE TABLE IF NOT EXISTS ai_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_key text UNIQUE NOT NULL,
  instruction_text text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active AI instructions"
  ON ai_instructions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all AI instructions"
  ON ai_instructions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert AI instructions"
  ON ai_instructions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update AI instructions"
  ON ai_instructions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete AI instructions"
  ON ai_instructions
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default instruction
INSERT INTO ai_instructions (instruction_key, instruction_text, is_active)
VALUES (
  'chat_assistant',
  'Eres un asistente virtual para una tienda de artesanías rústicas. Tu objetivo es ayudar a los clientes a encontrar productos, responder preguntas sobre materiales (karanday, mimbre, madera, yute) y proporcionar información sobre los artículos disponibles. Siempre sé amable, profesional y útil. Cuando menciones productos, incluye los enlaces para que los clientes puedan verlos fácilmente.',
  true
)
ON CONFLICT (instruction_key) DO NOTHING;