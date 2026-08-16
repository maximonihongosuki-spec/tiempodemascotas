/*
  # Add Correct Promotional Banner Columns

  1. Add Missing Columns to Site Settings
    - `promo_banner_image_url` (text) - URL for promotional banner image
    - `promo_banner_uploaded_image` (text) - Base64 uploaded banner image
    - `uploaded_logo_url` (text) - Base64 uploaded logo
    
  2. Notes
    - These columns are used by OwnerDashboard.tsx for banner configuration
    - All columns have appropriate defaults
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_image_url'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_image_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_uploaded_image'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_uploaded_image text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'uploaded_logo_url'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN uploaded_logo_url text DEFAULT '';
  END IF;
END $$;