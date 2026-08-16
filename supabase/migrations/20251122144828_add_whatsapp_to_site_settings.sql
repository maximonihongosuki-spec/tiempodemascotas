/*
  # Add WhatsApp fields to site_settings table

  1. Changes
    - Add `whatsapp_enabled` (boolean) - Whether WhatsApp is active
    - Add `whatsapp_number` (text) - WhatsApp number in international format (e.g., 5491234567890)

  2. Security
    - Existing RLS policies apply to all columns

  3. Default Values
    - WhatsApp disabled by default
    - Empty WhatsApp number by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'whatsapp_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN whatsapp_enabled boolean DEFAULT false;
    ALTER TABLE site_settings ADD COLUMN whatsapp_number text DEFAULT '';
  END IF;
END $$;

-- Update existing row with default values
UPDATE site_settings 
SET 
  whatsapp_enabled = false,
  whatsapp_number = ''
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND whatsapp_enabled IS NULL;