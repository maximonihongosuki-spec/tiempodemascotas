/*
  # Add Featured, Slug and Hero Fields to Products

  1. Changes
    - Add `url_slug` column: URL-friendly slug for product pages
    - Add `is_featured` column: Mark products as featured for homepage
    - Add `show_in_hero` column: Show product image in hero slider
    - Add unique constraint on url_slug
    - Auto-generate url_slug for existing products

  2. Purpose
    - Enable SEO-friendly URLs for products
    - Allow featured products section on homepage
    - Enable hero slider with product images
*/

DO $$
BEGIN
  -- Add url_slug column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'url_slug'
  ) THEN
    ALTER TABLE products ADD COLUMN url_slug text;
  END IF;

  -- Add is_featured column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE products ADD COLUMN is_featured boolean DEFAULT false;
  END IF;

  -- Add show_in_hero column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'show_in_hero'
  ) THEN
    ALTER TABLE products ADD COLUMN show_in_hero boolean DEFAULT false;
  END IF;
END $$;

-- Generate url_slug for existing products based on their names
UPDATE products
SET url_slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[áàäâ]', 'a', 'gi'),
      '[éèëê]', 'e', 'gi'
    ),
    '[^a-z0-9]+', '-', 'gi'
  )
)
WHERE url_slug IS NULL;

-- Add unique constraint to url_slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_url_slug_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_url_slug_key UNIQUE (url_slug);
  END IF;
END $$;