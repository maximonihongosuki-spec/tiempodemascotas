/*
  # Add Contact Information to Site Settings

  1. Changes
    - Add `business_phone` column to store business phone number
    - Add `business_address` column to store business physical address
  
  2. Purpose
    - Allow dynamic contact information management from the admin panel
    - Display contact info in the technical service page automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'business_phone'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN business_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'business_address'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN business_address text DEFAULT '';
  END IF;
END $$;