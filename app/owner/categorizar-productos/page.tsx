import { createClient } from '@supabase/supabase-js';
import CategorizarProductosClient from './CategorizarProductosClient';

// Columnas específicas que la UI de categorización realmente consume. Nunca usar select=*
const PRODUCT_CATEGORIZE_COLUMNS = [
  'id', 'name', 'public_name', 'product_code', 'external_code', 'price',
  'active', 'archived', 'stock', 'image_url', 'uploaded_image_url',
  'category_general', 'category_specific', 'category_sub_specific',
  'category_species', 'category_brand', 'category_age', 'category_detail', 'category_condition',
  'is_bulk', 'is_prescription', 'requires_prescription', 'local_only', 'requires_refrigeration',
  'ai_categorized_at', 'description', 'tags', 'url_slug',
  'is_parent', 'parent_product_id', 'created_at'
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
      .select(PRODUCT_CATEGORIZE_COLUMNS)
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    from += PAGE;
    keep = data.length === PAGE;
  }
  return all;
}

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function CategorizarProductosPage() {
  const initial = await getInitialProducts();
  return <CategorizarProductosClient initialProducts={initial} />;
}
