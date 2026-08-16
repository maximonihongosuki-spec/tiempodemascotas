import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { Product } from '../../src/lib/supabase';
import Header from '../../src/components/Header';
import NavTicker from '../../src/components/NavTicker';
import Footer from '../../src/components/Footer';
import FooterCredit from '../../src/components/FooterCredit';
import AllProductsClient from '../../src/components/AllProductsClient';
import { CartProvider } from '../../src/components/CartProvider';

export const revalidate = 1800; // 30 min, igual que /categoria/[slug]

const SELECT_FIELDS = 'id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, category_general, category_specific, category_sub_specific, category_species, category_brand, url_slug, product_code, is_parent, is_featured, requires_prescription, parent_product_id, tags, category_age, is_bulk';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getSiteSettings() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('site_settings')
    .select('logo_url, uploaded_logo_url, brand_seal_url, og_image_url')
    .maybeSingle();
  return data;
}

function pickOgImageUrl(settings: any) {
  return (
    settings?.og_image_url ||
    settings?.uploaded_logo_url ||
    settings?.logo_url ||
    'https://acvsdhysykaybcoctdhc.supabase.co/storage/v1/object/public/product-images/site-assets/og-image-1200x630.webp'
  );
}

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | undefined }> | any
}): Promise<Metadata> {
  const resolvedParams = (await searchParams) || {};
  
  const species = resolvedParams.species;
  const catGen = resolvedParams.cat_gen;
  const page = resolvedParams.page;

  const nonIndexableKeys = ['cat_spec', 'cat_sub_spec', 'brand', 'age', 'condition', 'bulk', 'prescription', 'q'];
  const hasNonIndexableFilters = nonIndexableKeys.some(k => resolvedParams[k] !== undefined);
  const isIndexable = !hasNonIndexableFilters;

  const settings = await getSiteSettings();
  const ogImage = pickOgImageUrl(settings);

  let title = 'Catálogo de productos para mascotas | Tiempo de Mascotas Paraguay';
  let description = 'Alimentos balanceados, medicamentos veterinarios y accesorios para perros, gatos y más. Delivery en Asunción y Gran Asunción. Ordená online por WhatsApp.';

  // Override manual SOLO para el caso base (sin species ni catGen ni page)
  if (!species && !catGen && !page) {
    const supabase = getSupabase();
    const { data: seo } = await supabase
      .from('page_seo')
      .select('meta_title, meta_description')
      .eq('page_key', 'productos')
      .maybeSingle();
    if (seo?.meta_title) title = seo.meta_title;
    if (seo?.meta_description) description = seo.meta_description;
  }

  if (species && catGen) {
    title = `${catGen} para ${species} | Tiempo de Mascotas`;
    description = `Comprá ${catGen} para ${species} al mejor precio en Asunción. Delivery rápido, marcas premium y excelente atención en Tiempo de Mascotas.`;
  } else if (species) {
    title = `Productos para ${species} | Alimentos y Accesorios | Tiempo de Mascotas`;
    description = `Encontrá los mejores productos para ${species} en Paraguay. Alimentos, farmacia, juguetes y accesorios con delivery en Asunción. Tiempo de Mascotas.`;
  } else if (catGen) {
    title = `${catGen} para Mascotas | Tiempo de Mascotas Paraguay`;
    description = `Todo en ${catGen} para tu mascota. Variedad de opciones, marcas líderes y delivery a domicilio en Asunción. Tiempo de Mascotas.`;
  }

  if (page) {
    title += ` - Página ${page}`;
  }

  // Canonical points to the cleanest indexable parent page
  let canonical = 'https://tiempodemascotas.com.py/productos';
  const cleanParams: string[] = [];
  if (species) cleanParams.push(`species=${encodeURIComponent(species)}`);
  if (catGen) cleanParams.push(`cat_gen=${encodeURIComponent(catGen)}`);
  if (page) cleanParams.push(`page=${encodeURIComponent(page)}`);
  if (cleanParams.length > 0) {
    canonical += '?' + cleanParams.join('&');
  }

  return {
    title,
    description,
    alternates: { canonical },
    robots: isIndexable
      ? { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 }
      : { index: false, follow: true },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: canonical,
      siteName: 'Tiempo de Mascotas',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

async function getInitialData(page: number) {
  const supabase = getSupabase();

  const [{ data: settings }, { data: categories }, { count }] = await Promise.all([
    supabase.from('site_settings').select('show_out_of_stock').maybeSingle(),
    supabase.from('categories').select('id, name, type, parent_id').order('name'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true).is('parent_product_id', null)
  ]);

  const showOutOfStock = settings?.show_out_of_stock ?? false;
  const totalCount = count || 0;

  const { data: rawProducts } = await supabase
    .from('products')
    .select(SELECT_FIELDS)
    .eq('active', true)
    .is('parent_product_id', null)
    .order('in_stock', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .range((page - 1) * 48, page * 48 - 1);

  const data = (rawProducts || []) as Product[];

  // Ocultar grupos (padres) que no tienen ningún hijo con stock,
  // igual regla que loadProducts CASO B en AllProductsClient.tsx
  const parentIds = data.filter(p => p.is_parent).map(p => p.id);
  let validParentIds = new Set<string>();
  if (parentIds.length > 0) {
    let childrenQuery = supabase
      .from('products')
      .select('parent_product_id')
      .in('parent_product_id', parentIds)
      .eq('active', true);
    if (!showOutOfStock) {
      childrenQuery = childrenQuery.gt('stock', 0);
    }
    const { data: childrenWithStock } = await childrenQuery;
    validParentIds = new Set(
      (childrenWithStock || []).map(c => c.parent_product_id).filter(Boolean) as string[]
    );
  }

  const filtered = data.filter(p => {
    if (p.is_parent) return validParentIds.has(p.id);
    return showOutOfStock || (p.stock || 0) > 0;
  });

  const productIds = filtered.map((p: any) => p.id);
  let volumePricesByProduct: Record<string, any[]> = {};
  if (productIds.length > 0) {
    const { data: vp } = await supabase
      .from('volume_prices')
      .select('id, product_id, price_level, min_qty, max_qty, price')
      .in('product_id', productIds);
    (vp || []).forEach((row: any) => {
      if (!volumePricesByProduct[row.product_id]) volumePricesByProduct[row.product_id] = [];
      volumePricesByProduct[row.product_id].push(row);
    });
  }
  const filteredWithVP = filtered.map((p: any) => ({ ...p, volume_prices: volumePricesByProduct[p.id] || [] }));

  return {
    products: filteredWithVP,
    categories: categories || [],
    showOutOfStock,
    totalCount,
  };
}

export default async function ProductosPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> | any }) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt((resolvedParams?.page as string) || '1', 10));
  const { products, categories, showOutOfStock, totalCount } = await getInitialData(page);

  const totalPages = Math.ceil(totalCount / 48);

  return (
    <CartProvider>
      <NavTicker />
      <Header />
      <AllProductsClient
        initialProducts={products}
        initialCategories={categories}
        showOutOfStock={showOutOfStock}
        currentPage={page}
        totalCount={totalCount}
      />
      
      {/* SSR Paginación real */}
      <div className="flex justify-center items-center gap-4 mt-8 pb-12" id="ssr-pagination">
        {page > 1 && (
          <a
            href={`/productos?page=${page - 1}`}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold text-[#1E1B4B]"
            id="prev-page-link"
          >
            Anterior
          </a>
        )}
        <span className="text-sm font-semibold text-[#1E1B4B]" id="current-page-indicator">
          Página {page} de {totalPages || 1}
        </span>
        {page < totalPages && (
          <a
            href={`/productos?page=${page + 1}`}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold text-[#1E1B4B]"
            id="next-page-link"
          >
            Siguiente
          </a>
        )}
      </div>

      <Footer />
      <FooterCredit />
    </CartProvider>
  );
}
