import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getMemberSession } from '../../../../src/lib/memberSession';
import { redirect } from 'next/navigation';
import CatalogoMayoristaClient from './CatalogoMayoristaClient';

export const dynamic = 'force-dynamic';

// Esta función SÍ se cachea 1 hora y se COMPARTE entre todos los mayoristas —
// nunca depende de cookies ni de quién la pide, por eso puede usar unstable_cache
// aunque el resto de la página sea dinámica.
const getCatalogoProducts = unstable_cache(
  async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: settings } = await supabase.from('site_settings').select('show_out_of_stock').single();
    const showOutOfStock = settings?.show_out_of_stock ?? false;

    let query = supabase
      .from('products')
      .select('id, name, public_name, price, special_price, wholesale_price, differentiated_price, wholesale_factor, image_url, uploaded_image_url, category_specific, category_general, url_slug, product_code, stock, active, requires_prescription, is_parent')
      .eq('active', true)
      .is('parent_product_id', null);

    if (!showOutOfStock) query = query.gt('stock', 0);

    const { data } = await query.order('name');
    return data || [];
  },
  ['catalogo-mayorista-productos'], // cache key
  { revalidate: 120, tags: ['catalogo-mayorista'] }
);

export default async function CatalogoMayoristaPage() {
  const session = await getMemberSession(); // dinámico, por-usuario, NO cacheado
  if (!session) {
    redirect('/miembros/login');
  }
  const isWholesale = session.profile.role === 'mayorista';
  const products = await getCatalogoProducts(); // cacheado 1h, compartido

  const categories = Array.from(new Set(
    products.flatMap((p: any) =>
      Array.isArray(p.category_general) ? p.category_general : (p.category_general ? [p.category_general] : [])
    ).filter(Boolean)
  )).sort() as string[];

  return (
    <CatalogoMayoristaClient
      initialProducts={products}
      categories={categories}
      userId={session.userId}
      isWholesale={isWholesale}
    />
  );
}
