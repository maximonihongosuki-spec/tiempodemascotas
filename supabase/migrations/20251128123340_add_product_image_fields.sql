/*
  # Add product image fields

  1. Changes
    - Add `uploaded_image_url` column to products table for storing uploaded images
    - Add `use_uploaded_image` boolean to track which image source to use (default false = use image_url)
    - Add `location` column to track product location (SHOW ROOM, DEPOSITO, GUARDA PROVEEDOR)
    - Add `brand` column for product brand
    - Add `cost` column for product cost
    - Add `wholesale_price` column for wholesale pricing
  
  2. Notes
    - By default, products will use image_url (link-based images)
    - When use_uploaded_image is true, the uploaded_image_url will be displayed
    - Location values should be: 'SHOW ROOM', 'DEPOSITO', or 'GUARDA PROVEEDOR'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'uploaded_image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN uploaded_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'use_uploaded_image'
  ) THEN
    ALTER TABLE products ADD COLUMN use_uploaded_image boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'location'
  ) THEN
    ALTER TABLE products ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'brand'
  ) THEN
    ALTER TABLE products ADD COLUMN brand text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'cost'
  ) THEN
    ALTER TABLE products ADD COLUMN cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'wholesale_price'
  ) THEN
    ALTER TABLE products ADD COLUMN wholesale_price numeric;
  END IF;
END $$;