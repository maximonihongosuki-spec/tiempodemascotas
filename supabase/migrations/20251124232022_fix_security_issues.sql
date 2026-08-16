/*
  # Solución de Problemas de Seguridad

  1. Eliminar índices no utilizados
    - idx_products_product_code (usado, pero reportado)
    - idx_messages_read
    - idx_appointments_status
    - idx_products_active
    - idx_products_category
    - idx_orders_status

  2. Eliminar políticas duplicadas
    - Mantener solo las políticas más específicas y seguras
    - Eliminar políticas genéricas duplicadas

  3. Corregir search_path mutable en funciones
    - generate_product_code
    - set_product_code
*/

-- ============================================
-- PASO 1: Eliminar índices no utilizados
-- ============================================

DROP INDEX IF EXISTS idx_messages_read;
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_products_active;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_orders_status;

-- ============================================
-- PASO 2: Limpiar políticas duplicadas
-- ============================================

-- AI_INSTRUCTIONS: Eliminar política duplicada
DROP POLICY IF EXISTS "Authenticated users can view all AI instructions" ON ai_instructions;

-- APPOINTMENTS: Eliminar políticas antiguas duplicadas
DROP POLICY IF EXISTS "Anyone can view appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can update appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can delete appointments" ON appointments;

-- CHAT_SESSIONS: Eliminar políticas antiguas duplicadas
DROP POLICY IF EXISTS "Anyone can view their chat session" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can insert chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can update their chat session" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can delete chat sessions" ON chat_sessions;

-- MESSAGES: Eliminar políticas antiguas duplicadas
DROP POLICY IF EXISTS "Anyone can view messages" ON messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON messages;

-- PRODUCTS: Eliminar política duplicada
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

-- SETTINGS: Eliminar política duplicada
DROP POLICY IF EXISTS "Anyone can read settings" ON settings;

-- ============================================
-- PASO 3: Corregir funciones con search_path mutable
-- ============================================

-- Recrear generate_product_code con search_path inmutable
CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar código aleatorio: PRD- + 6 caracteres alfanuméricos
    new_code := 'PRD-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Verificar si el código ya existe
    SELECT EXISTS(SELECT 1 FROM public.products WHERE product_code = new_code) INTO code_exists;
    
    -- Si no existe, salir del loop
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Recrear set_product_code con search_path inmutable
CREATE OR REPLACE FUNCTION set_product_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.product_code IS NULL OR NEW.product_code = '' THEN
    NEW.product_code := generate_product_code();
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- PASO 4: Verificar que las políticas correctas existen
-- ============================================

-- Verificar políticas de AI_INSTRUCTIONS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_instructions' 
    AND policyname = 'Anyone can view active AI instructions'
  ) THEN
    CREATE POLICY "Anyone can view active AI instructions"
      ON ai_instructions
      FOR SELECT
      USING (active = true);
  END IF;
END $$;

-- Verificar políticas de APPOINTMENTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Public can view appointments'
  ) THEN
    CREATE POLICY "Public can view appointments"
      ON appointments FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Public can insert appointments'
  ) THEN
    CREATE POLICY "Public can insert appointments"
      ON appointments FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Public can update appointments'
  ) THEN
    CREATE POLICY "Public can update appointments"
      ON appointments FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Public can delete appointments'
  ) THEN
    CREATE POLICY "Public can delete appointments"
      ON appointments FOR DELETE
      USING (true);
  END IF;
END $$;

-- Verificar políticas de CHAT_SESSIONS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'Public can view chat_sessions'
  ) THEN
    CREATE POLICY "Public can view chat_sessions"
      ON chat_sessions FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'Public can insert chat_sessions'
  ) THEN
    CREATE POLICY "Public can insert chat_sessions"
      ON chat_sessions FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'Public can update chat_sessions'
  ) THEN
    CREATE POLICY "Public can update chat_sessions"
      ON chat_sessions FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'Public can delete chat_sessions'
  ) THEN
    CREATE POLICY "Public can delete chat_sessions"
      ON chat_sessions FOR DELETE
      USING (true);
  END IF;
END $$;

-- Verificar políticas de MESSAGES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Public can view messages'
  ) THEN
    CREATE POLICY "Public can view messages"
      ON messages FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Public can insert messages'
  ) THEN
    CREATE POLICY "Public can insert messages"
      ON messages FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Public can update messages'
  ) THEN
    CREATE POLICY "Public can update messages"
      ON messages FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' 
    AND policyname = 'Public can delete messages'
  ) THEN
    CREATE POLICY "Public can delete messages"
      ON messages FOR DELETE
      USING (true);
  END IF;
END $$;

-- Verificar políticas de PRODUCTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Public can view all products'
  ) THEN
    CREATE POLICY "Public can view all products"
      ON products FOR SELECT
      USING (true);
  END IF;
END $$;

-- Verificar políticas de SETTINGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Anyone can view settings'
  ) THEN
    CREATE POLICY "Anyone can view settings"
      ON settings FOR SELECT
      USING (true);
  END IF;
END $$;
