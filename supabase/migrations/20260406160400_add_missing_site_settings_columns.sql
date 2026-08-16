DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'favicon_url') THEN
    ALTER TABLE site_settings ADD COLUMN favicon_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'whatsapp_24_7') THEN
    ALTER TABLE site_settings ADD COLUMN whatsapp_24_7 text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'uploaded_logo_url') THEN
    ALTER TABLE site_settings ADD COLUMN uploaded_logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'business_address') THEN
    ALTER TABLE site_settings ADD COLUMN business_address text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'business_email') THEN
    ALTER TABLE site_settings ADD COLUMN business_email text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'facebook_enabled') THEN
    ALTER TABLE site_settings ADD COLUMN facebook_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'instagram_enabled') THEN
    ALTER TABLE site_settings ADD COLUMN instagram_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'tiktok_enabled') THEN
    ALTER TABLE site_settings ADD COLUMN tiktok_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_settings' AND column_name = 'x_enabled') THEN
    ALTER TABLE site_settings ADD COLUMN x_enabled boolean DEFAULT false;
  END IF;
END $$;
