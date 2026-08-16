/*
  # Add social media fields to site_settings table

  1. Changes
    - Add `facebook_enabled` (boolean) - Whether Facebook is active
    - Add `facebook_url` (text) - Facebook page URL
    - Add `instagram_enabled` (boolean) - Whether Instagram is active
    - Add `instagram_url` (text) - Instagram profile URL
    - Add `tiktok_enabled` (boolean) - Whether TikTok is active
    - Add `tiktok_url` (text) - TikTok profile URL
    - Add `x_enabled` (boolean) - Whether X (Twitter) is active
    - Add `x_url` (text) - X profile URL

  2. Security
    - Existing RLS policies apply to all columns

  3. Default Values
    - All social media disabled by default
    - Empty URLs by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'facebook_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN facebook_enabled boolean DEFAULT false;
    ALTER TABLE site_settings ADD COLUMN facebook_url text DEFAULT '';
    ALTER TABLE site_settings ADD COLUMN instagram_enabled boolean DEFAULT false;
    ALTER TABLE site_settings ADD COLUMN instagram_url text DEFAULT '';
    ALTER TABLE site_settings ADD COLUMN tiktok_enabled boolean DEFAULT false;
    ALTER TABLE site_settings ADD COLUMN tiktok_url text DEFAULT '';
    ALTER TABLE site_settings ADD COLUMN x_enabled boolean DEFAULT false;
    ALTER TABLE site_settings ADD COLUMN x_url text DEFAULT '';
  END IF;
END $$;

-- Update existing row with default values
UPDATE site_settings 
SET 
  facebook_enabled = false,
  facebook_url = '',
  instagram_enabled = false,
  instagram_url = '',
  tiktok_enabled = false,
  tiktok_url = '',
  x_enabled = false,
  x_url = ''
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND facebook_enabled IS NULL;