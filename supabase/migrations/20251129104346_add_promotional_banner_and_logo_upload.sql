/*
  # Add promotional banner and logo upload fields

  1. Changes to site_settings table
    - Add `uploaded_logo_url` (text) - For base64 encoded logo image
    - Add `promo_banner_enabled` (boolean) - Enable/disable promotional banner
    - Add `promo_banner_image_url` (text) - URL for promotional banner
    - Add `promo_banner_uploaded_image` (text) - Base64 encoded promotional banner
    
  2. Notes
    - These fields allow owner to upload images from PC or use URLs
    - Promotional banner will show as popup when enabled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'uploaded_logo_url'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN uploaded_logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = 'promo_banner_enabled'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN promo_banner_enabled boolean DEFAULT false;
  END IF;

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
END $$;