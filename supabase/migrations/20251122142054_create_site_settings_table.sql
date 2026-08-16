/*
  # Create site settings table

  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key) - Always set to a fixed UUID to ensure single row
      - `business_name` (text) - Name of the business displayed in header
      - `logo_url` (text) - URL to the logo image displayed in center of header
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Security
    - Enable RLS on `site_settings` table
    - Add policy for anyone to read site settings (public)
    - Add policy for authenticated users to update site settings (owner only)

  3. Initial Data
    - Insert default settings with business name and logo URL
*/

CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  business_name text NOT NULL DEFAULT 'Mi Negocio',
  logo_url text NOT NULL DEFAULT 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=100&h=100',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings"
  ON site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update site settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings
INSERT INTO site_settings (id, business_name, logo_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Luminarias Artesanales',
  'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=100&h=100'
)
ON CONFLICT (id) DO NOTHING;