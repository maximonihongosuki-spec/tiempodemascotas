/*
  # Add Missing Chat Sessions Policies

  1. Changes
    - Add SELECT policy for chat_sessions to allow anonymous users to read sessions
    - Add INSERT policy for chat_sessions to allow anonymous users to create sessions
    - Add UPDATE policy for chat_sessions to allow anonymous users to update sessions
    
  2. Security Notes
    - Allows anonymous users to manage chat sessions
    - Required for the chat widget to work properly
*/

-- Add missing policies for chat_sessions
CREATE POLICY "Anyone can view chat sessions"
  ON chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update chat sessions"
  ON chat_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add missing policies for orders (INSERT was missing)
CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Add missing policies for messages (INSERT was missing)
CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

-- Add missing policies for appointments (INSERT and DELETE were missing)
CREATE POLICY "Anyone can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

-- Add missing policy for settings (SELECT was missing)
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  USING (true);
