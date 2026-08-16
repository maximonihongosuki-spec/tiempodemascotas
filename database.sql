-- SCRIPT DE REPARACIÓN DE ESQUEMA PARA TABLA ORDERS (VERSIÓN INTEGRAL V4)

DO $$ 
BEGIN 
  -- 1. RENOMBRAR COLUMNAS LEGADAS SI EXISTEN (Solo si el origen existe y el destino NO existe)
  
  -- productos -> items
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='productos') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='items') THEN
    ALTER TABLE public.orders RENAME COLUMN productos TO items;
  END IF;

  -- monto_total -> total
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='monto_total') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') THEN
    ALTER TABLE public.orders RENAME COLUMN monto_total TO total;
  END IF;

  -- 2. ASEGURAR COLUMNAS REQUERIDAS POR EL FRONTEND ACTUAL (Cart.tsx)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='items') THEN
    ALTER TABLE public.orders ADD COLUMN items jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') THEN
    ALTER TABLE public.orders ADD COLUMN total numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_name') THEN
    ALTER TABLE public.orders ADD COLUMN customer_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN
    ALTER TABLE public.orders ADD COLUMN customer_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_email') THEN
    ALTER TABLE public.orders ADD COLUMN customer_email text DEFAULT '';
  END IF;

END $$;

-- 3. ELIMINAR RESTRICCIONES "NOT NULL" DE COLUMNAS QUE BLOQUEAN LA INSERCIÓN
-- Primero las columnas que usa el frontend
ALTER TABLE public.orders ALTER COLUMN items DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN total DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_name DROP NOT NULL;

-- Limpieza exhaustiva de columnas legadas/antiguas que suelen tener NOT NULL
DO $$ 
BEGIN 
  -- metodo_pago (El error actual reportado)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='metodo_pago') THEN
    ALTER TABLE public.orders ALTER COLUMN metodo_pago DROP NOT NULL;
  END IF;
  
  -- Otras columnas comunes que causan conflictos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='productos') THEN
    ALTER TABLE public.orders ALTER COLUMN productos DROP NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='telefono') THEN
    ALTER TABLE public.orders ALTER COLUMN telefono DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='monto_total') THEN
    ALTER TABLE public.orders ALTER COLUMN monto_total DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='nombre_cliente') THEN
    ALTER TABLE public.orders ALTER COLUMN nombre_cliente DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ruc') THEN
    ALTER TABLE public.orders ALTER COLUMN ruc DROP NOT NULL;
  END IF;
END $$;

-- 4. RE-ESTABLECER PERMISOS Y POLÍTICAS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Orders Access Master" ON public.orders;
CREATE POLICY "Public Orders Access Master" ON public.orders
FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- 5. RECARGAR ESQUEMA
NOTIFY pgrst, 'reload schema';