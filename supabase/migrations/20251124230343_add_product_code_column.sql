/*
  # Añadir código de producto único

  1. Cambios en la tabla products
    - Añade columna `product_code` (text, único, no nulo)
    - Genera códigos únicos para productos existentes
    - Crea índice único para product_code
  
  2. Función
    - Crea función para generar códigos de producto automáticamente
    - Formato: PRD-XXXXXX (6 dígitos alfanuméricos)
  
  3. Trigger
    - Trigger que genera código automáticamente al insertar producto
*/

-- Añadir columna product_code (inicialmente nullable para migración)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_code'
  ) THEN
    ALTER TABLE products ADD COLUMN product_code text;
  END IF;
END $$;

-- Función para generar código único de producto
CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar código aleatorio: PRD- + 6 caracteres alfanuméricos
    new_code := 'PRD-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Verificar si el código ya existe
    SELECT EXISTS(SELECT 1 FROM products WHERE product_code = new_code) INTO code_exists;
    
    -- Si no existe, salir del loop
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Generar códigos para productos existentes que no tienen código
UPDATE products 
SET product_code = generate_product_code() 
WHERE product_code IS NULL;

-- Hacer la columna NOT NULL y UNIQUE después de llenar los valores
ALTER TABLE products 
  ALTER COLUMN product_code SET NOT NULL,
  ADD CONSTRAINT products_product_code_unique UNIQUE (product_code);

-- Crear índice para búsquedas rápidas por código
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

-- Función trigger para asignar código automáticamente
CREATE OR REPLACE FUNCTION set_product_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_code IS NULL OR NEW.product_code = '' THEN
    NEW.product_code := generate_product_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_set_product_code ON products;
CREATE TRIGGER trigger_set_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_code();
