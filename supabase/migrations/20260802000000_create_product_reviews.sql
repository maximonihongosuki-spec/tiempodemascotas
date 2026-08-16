-- ==============================================
-- 1. Extensión de products con campos calculados
-- ==============================================
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) NOT NULL DEFAULT 0;

-- ==============================================
-- 2. Tabla product_reviews
-- ==============================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL CHECK (char_length(comment) >= 20),
  verified_purchase boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderator_notes text,
  ip_address text,  -- para anti-spam
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created ON product_reviews(created_at DESC);

-- ==============================================
-- 3. Trigger que recalcula review_count y avg_rating
-- ==============================================
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id uuid;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);
  
  UPDATE products
  SET 
    review_count = (
      SELECT COUNT(*) 
      FROM product_reviews 
      WHERE product_id = target_product_id AND status = 'approved'
    ),
    avg_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM product_reviews 
      WHERE product_id = target_product_id AND status = 'approved'
    ), 0)
  WHERE id = target_product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_review_stats_trigger ON product_reviews;
CREATE TRIGGER product_review_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_review_stats();

-- ==============================================
-- 4. RLS Policies
-- ==============================================
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Público: solo puede leer las aprobadas
DROP POLICY IF EXISTS "public_can_read_approved" ON product_reviews;
CREATE POLICY "public_can_read_approved" ON product_reviews
FOR SELECT USING (status = 'approved');

-- Público: puede insertar (queda pending para moderación)
DROP POLICY IF EXISTS "public_can_insert_pending" ON product_reviews;
CREATE POLICY "public_can_insert_pending" ON product_reviews
FOR INSERT WITH CHECK (status = 'pending');

-- Owner/service_role: acceso total
DROP POLICY IF EXISTS "service_role_full_access" ON product_reviews;
CREATE POLICY "service_role_full_access" ON product_reviews
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS review_updated_at_trigger ON product_reviews;
CREATE TRIGGER review_updated_at_trigger
BEFORE UPDATE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_review_updated_at();
