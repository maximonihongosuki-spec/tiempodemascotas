/*
  # Fix All Tables Policies for Local Authentication

  1. Changes
    - Update policies for orders, messages, appointments, and chat_sessions
    - Make them publicly accessible since app uses localStorage auth
    - Keep RLS enabled for future proper auth implementation

  2. Tables Updated
    - orders: Full CRUD for public
    - messages: Full CRUD for public
    - appointments: Full CRUD for public
    - chat_sessions: Full CRUD for public
*/

-- ORDERS TABLE
DROP POLICY IF EXISTS "Owner can view all orders" ON orders;
DROP POLICY IF EXISTS "Owner can insert orders" ON orders;
DROP POLICY IF EXISTS "Owner can update orders" ON orders;
DROP POLICY IF EXISTS "Owner can delete orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

CREATE POLICY "Public can view orders"
  ON orders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert orders"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update orders"
  ON orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete orders"
  ON orders FOR DELETE
  TO public
  USING (true);

-- MESSAGES TABLE
DROP POLICY IF EXISTS "Owner can view messages" ON messages;
DROP POLICY IF EXISTS "Owner can update messages" ON messages;
DROP POLICY IF EXISTS "Owner can delete messages" ON messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON messages;

CREATE POLICY "Public can view messages"
  ON messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert messages"
  ON messages FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update messages"
  ON messages FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete messages"
  ON messages FOR DELETE
  TO public
  USING (true);

-- APPOINTMENTS TABLE
DROP POLICY IF EXISTS "Owner can view appointments" ON appointments;
DROP POLICY IF EXISTS "Owner can update appointments" ON appointments;
DROP POLICY IF EXISTS "Owner can delete appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;

CREATE POLICY "Public can view appointments"
  ON appointments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert appointments"
  ON appointments FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update appointments"
  ON appointments FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete appointments"
  ON appointments FOR DELETE
  TO public
  USING (true);

-- CHAT_SESSIONS TABLE
DROP POLICY IF EXISTS "Anyone can view chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can create chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Anyone can update chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Owner can delete chat sessions" ON chat_sessions;

CREATE POLICY "Public can view chat_sessions"
  ON chat_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert chat_sessions"
  ON chat_sessions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update chat_sessions"
  ON chat_sessions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete chat_sessions"
  ON chat_sessions FOR DELETE
  TO public
  USING (true);