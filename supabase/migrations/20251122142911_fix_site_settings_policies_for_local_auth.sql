/*
  # Fix site_settings RLS policies for local authentication

  1. Changes
    - Drop existing authenticated-only UPDATE policy
    - Create new UPDATE policy that allows anyone to update (for local auth compatibility)
    
  2. Security Note
    - In production, this should be restricted to admin users only
    - For local development with email/password auth, this allows updates
*/

DROP POLICY IF EXISTS "Authenticated users can update site settings" ON site_settings;

CREATE POLICY "Allow updates to site settings"
  ON site_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);