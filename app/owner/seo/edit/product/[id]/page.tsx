import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import SeoEditorProduct from './SeoEditorProduct';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function EditProductSeoPage({ params }: { params: { id: string } }) {
  const supabase = getSupabase();

  const [{ data: product }, { data: seo }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, public_name, url_slug, price, special_price, uploaded_image_url, image_url, category_brand, category_general, category_specific, category_species, category_age, category_condition, tags, description, description_ai_enhanced')
      .eq('id', params.id)
      .single(),
    supabase
      .from('product_seo')
      .select('*')
      .eq('product_id', params.id)
      .maybeSingle()
  ]);

  if (!product) notFound();

  return <SeoEditorProduct product={product} initialSeo={seo} />;
}
