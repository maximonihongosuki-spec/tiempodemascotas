-- ==============================================
-- 1. Tabla product_seo (metadata por producto)
-- ==============================================
CREATE TABLE IF NOT EXISTS product_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  meta_title text,
  meta_description text,
  og_image_url text,
  schema_description text,  -- descripción para JSON-LD Product si difiere de meta
  keywords_internal text[],  -- para uso interno / búsqueda del panel
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'needs_review')),
  ai_generated boolean NOT NULL DEFAULT false,
  ai_prompt_used text,
  ai_model text,  -- 'gpt-4o-mini' u otro
  ai_credits_used numeric(6,4),  -- si aplica
  last_generated_at timestamptz,
  updated_by text,  -- 'ai' | 'manual' | email del usuario del panel
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_seo_product_id ON product_seo(product_id);
CREATE INDEX IF NOT EXISTS idx_product_seo_status ON product_seo(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_product_seo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_seo_updated_at_trigger ON product_seo;
CREATE TRIGGER product_seo_updated_at_trigger
BEFORE UPDATE ON product_seo
FOR EACH ROW EXECUTE FUNCTION update_product_seo_updated_at();

-- ==============================================
-- 2. Tabla page_seo (metadata para páginas fijas)
-- ==============================================
CREATE TABLE IF NOT EXISTS page_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,  -- 'home', 'productos', 'categoria-accesorios', 'nosotros', 'contacto', etc.
  page_label text NOT NULL,  -- para mostrar en el panel: 'Página de inicio', 'Catálogo de productos', etc.
  page_url text,  -- '/', '/productos', '/categoria/accesorios' — para el preview y sitemap
  meta_title text,
  meta_description text,
  og_image_url text,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_prompt_used text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS page_seo_updated_at_trigger ON page_seo;
CREATE TRIGGER page_seo_updated_at_trigger
BEFORE UPDATE ON page_seo
FOR EACH ROW EXECUTE FUNCTION update_product_seo_updated_at();  -- reusa la misma función

-- ==============================================
-- 3. Seed inicial de page_seo con las páginas fijas
-- ==============================================
INSERT INTO page_seo (page_key, page_label, page_url, meta_title, meta_description) VALUES
  ('home', 'Página de inicio', '/', 'Petshop y Veterinaria en Asunción | Tiempo de Mascotas', 'Petshop online con delivery en Asunción y Gran Asunción. Alimentos balanceados, medicamentos y accesorios para perros, gatos, aves y más. Atención veterinaria.'),
  ('productos', 'Catálogo de productos', '/productos', 'Catálogo de productos para mascotas | Tiempo de Mascotas Paraguay', 'Alimentos balanceados, medicamentos veterinarios y accesorios. Delivery en Asunción y Gran Asunción. Ordená online por WhatsApp.'),
  ('nosotros', 'Nosotros', '/nosotros', 'Sobre nosotros | Tiempo de Mascotas', 'Petshop y veterinaria en Asunción con años de experiencia atendiendo a las mascotas del Gran Asunción.'),
  ('promo-forma-de-pago', 'Formas de pago', '/promo/forma-de-pago', 'Formas de pago | Tiempo de Mascotas', 'Todas las formas de pago aceptadas: tarjetas de crédito, débito, transferencia, Pagopar y más.'),
  ('promo-costo-de-envio', 'Costo de envío', '/promo/costo-de-envio', 'Costo de envío y delivery | Tiempo de Mascotas', 'Delivery en Asunción y Gran Asunción. Consultá zonas, tarifas y tiempos de entrega.'),
  ('promo-horario-de-atencion', 'Horario de atención', '/promo/horario-de-atencion', 'Horario de atención | Tiempo de Mascotas', 'Horarios de atención de nuestro petshop y clínica veterinaria en Asunción.'),
  ('categoria-alimentos', 'Categoría: Alimentos', '/productos?cat_gen=Alimentos%20Balanceados%20y%20H%C3%BAmedos', 'Alimentos balanceados y húmedos para perros y gatos | Tiempo de Mascotas', 'Amplia variedad de alimentos balanceados y húmedos para perros, gatos y más mascotas. Marcas líderes con envío en Asunción.'),
  ('categoria-accesorios', 'Categoría: Accesorios', '/productos?cat_gen=Accesorios', 'Accesorios para mascotas | Tiempo de Mascotas Paraguay', 'Juguetes, camas, collares, correas, comederos y más. Envío a todo Paraguay.'),
  ('categoria-salud', 'Categoría: Salud y Farmacia', '/productos?cat_gen=Salud%20y%20Farmacia%20Veterinaria', 'Salud y farmacia veterinaria | Tiempo de Mascotas', 'Medicamentos veterinarios, antipulgas, vitaminas y suplementos para tu mascota.'),
  ('categoria-cuidado', 'Categoría: Cuidado e Higiene', '/productos?cat_gen=Cuidado%2C%20Higiene%20y%20Bienestar', 'Cuidado e higiene para mascotas | Tiempo de Mascotas', 'Shampoos, jabones, arenas sanitarias y productos de higiene para tu mascota.')
ON CONFLICT (page_key) DO NOTHING;

-- ==============================================
-- 4. RPC para obtener productos con SEO pendiente
-- ==============================================
CREATE OR REPLACE FUNCTION get_products_with_pending_seo(limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  name text,
  url_slug text,
  uploaded_image_url text,
  category_general text[],
  category_brand text,
  price numeric,
  seo_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.url_slug, p.uploaded_image_url, p.category_general, p.category_brand, p.price::numeric,
         COALESCE(ps.status, 'pending') AS seo_status
  FROM products p
  LEFT JOIN product_seo ps ON ps.product_id = p.id
  WHERE p.active = true 
    AND p.archived = false
    AND (ps.status IS NULL OR ps.status = 'pending')
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 5. RLS Policies
-- ==============================================
ALTER TABLE product_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;

-- Público puede leer todo (necesario para SSR)
DROP POLICY IF EXISTS "public_read_product_seo" ON product_seo;
CREATE POLICY "public_read_product_seo" ON product_seo FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_page_seo" ON page_seo;
CREATE POLICY "public_read_page_seo" ON page_seo FOR SELECT USING (true);

-- Solo service_role puede modificar
DROP POLICY IF EXISTS "service_role_write_product_seo" ON product_seo;
CREATE POLICY "service_role_write_product_seo" ON product_seo FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_write_page_seo" ON page_seo;
CREATE POLICY "service_role_write_page_seo" ON page_seo FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
