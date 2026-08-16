import { createClient } from '@supabase/supabase-js';
import ProductosClient from './ProductosClient';

// Columnas que ProductManagement consume. Nunca usar select=* acá.
const PRODUCT_LIST_COLUMNS = [
  'id', 'name', 'public_name', 'product_code', 'url_slug',
  'price', 'special_price', 'differentiated_price',
  'stock', 'active', 'archived',
  'image_url', 'uploaded_image_url',
  'is_parent', 'parent_product_id', 'variant_label',
  'category_general', 'category_specific', 'category_species', 'category_brand',
  'category_age', 'category_detail',
  'requires_prescription', 'is_bulk',
  'ai_categorized_at',
  'created_at', 'updated_at',
  'category_sub_specific',
  'category_condition',
  'is_prescription',
  'local_only',
  'requires_refrigeration',
].join(',');

async function getInitialProducts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const PAGE = 1000;
  let all: any[] = [];
  let from = 0;
  let keep = true;
  while (keep) {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    from += PAGE;
    keep = data.length === PAGE;
  }
  return all;
}

export const revalidate = 0; // El panel es dinámico, no cacheable
export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const initial = await getInitialProducts();
  return <ProductosClient initialProducts={initial} />;
}
