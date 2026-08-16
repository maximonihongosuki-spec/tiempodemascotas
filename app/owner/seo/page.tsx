import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import SeoClient from './SeoClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}

// Mismo patrón de loop que app/owner/productos/page.tsx — trae TODO, no solo una página
async function fetchAll<T>(
  supabase: ReturnType<typeof getSupabase>,
  table: string,
  select: string,
  applyFilters: (q: any) => any
): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  let keep = true;
  while (keep) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    q = applyFilters(q);
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    all = all.concat(data as T[]);
    from += PAGE;
    keep = data.length === PAGE;
  }
  return all;
}

export default async function OwnerSeoPage() {
  noStore();
  const supabase = getSupabase();

  const [
    totalProductsRes,
    seoOkRes,
    pagesRes,
    allOkNoOg,
    allOkWithOg,
    allPending,
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true).eq('archived', false),
    supabase.from('product_seo').select('*', { count: 'exact', head: true }).eq('status', 'ok'),
    supabase.from('page_seo').select('*').order('page_key'),
    fetchAll(
      supabase,
      'product_seo',
      `id, meta_title, meta_description, updated_at, ai_generated, products!inner(id, name, url_slug, uploaded_image_url, category_general, category_brand)`,
      (q) => q.eq('status', 'ok').is('og_image_url', null).order('updated_at', { ascending: false })
    ),
    fetchAll(
      supabase,
      'product_seo',
      `id, meta_title, meta_description, updated_at, ai_generated, og_image_url, products!inner(id, name, url_slug, uploaded_image_url, category_general, category_brand)`,
      (q) => q.eq('status', 'ok').not('og_image_url', 'is', null).order('updated_at', { ascending: false })
    ),
    fetchAll(
      supabase,
      'products',
      `id, name, url_slug, uploaded_image_url, category_general, category_brand, price`,
      (q) => q.eq('active', true).eq('archived', false).order('updated_at', { ascending: false, nullsFirst: false })
    ),
  ]);

  const totalProducts = totalProductsRes.count || 0;
  const seoOk = seoOkRes.count || 0;

  // Filtrar pendientes: productos activos que NO tienen fila product_seo con status='ok'
  const { data: okProductIdsRaw } = await supabase.from('product_seo').select('product_id').eq('status', 'ok');
  const okProductIds = new Set((okProductIdsRaw || []).map((r: any) => r.product_id));
  const pendingProducts = (allPending as any[]).filter(p => !okProductIds.has(p.id));

  const transformedRecentOkNoOg = (allOkNoOg as any[]).map(item => ({
    id: item.id, meta_title: item.meta_title, meta_description: item.meta_description,
    updated_at: item.updated_at, ai_generated: item.ai_generated, product: item.products
  }));

  const transformedRecentOkWithOg = (allOkWithOg as any[]).map(item => ({
    id: item.id, meta_title: item.meta_title, meta_description: item.meta_description,
    updated_at: item.updated_at, ai_generated: item.ai_generated, og_image_url: item.og_image_url, product: item.products
  }));

  return (
    <SeoClient
      pages={(pagesRes.data as any[]) || []}
      recentOkNoOg={transformedRecentOkNoOg}
      recentOkWithOg={transformedRecentOkWithOg}
      allPending={pendingProducts}
      counts={{
        totalProducts,
        seoOk,
        pending: pendingProducts.length,
        okNoOg: transformedRecentOkNoOg.length,
        okWithOg: transformedRecentOkWithOg.length,
      }}
    />
  );
}
