import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import Header from '../src/components/Header';
import { pgOverlaps } from '../src/lib/pgArrayFilter';
import { sortAlphabeticalStockLast } from '../src/lib/productSort';
import NavTicker from '../src/components/NavTicker';
import HeroClient from '../src/components/HeroClient';
import HomeBannersClient from '../src/components/HomeBannersClient';
import PetCategoryCardsClient from '../src/components/PetCategoryCardsClient';
import ProductGridClient from '../src/components/ProductGridClient';
import CategoryCards from '../src/components/CategoryCards';
import ProductSliderClient from '../src/components/ProductSliderClient';
import PromoBentoClient from '../src/components/PromoBentoClient';
import PaymentTickerClient from '../src/components/PaymentTickerClient';
import RibbonCards from '../src/components/RibbonCards';
import CategorySlidersSectionClient from '../src/components/CategorySlidersSectionClient';
import About from '../src/components/About';
import Contact from '../src/components/Contact';
import SocialMedia from '../src/components/SocialMedia';
import Footer from '../src/components/Footer';
import FooterCredit from '../src/components/FooterCredit';
import MetadataUpdater from '../src/components/MetadataUpdater';
import InlineTicker from '../src/components/InlineTicker';
import { CartProvider } from '../src/components/CartProvider';
import HomeClientWrapper from '../src/components/HomeClientWrapper';

export const revalidate = 3600;

const HOME_CONTENT_ID = '00000000-0000-0000-0000-000000000001';

async function getSiteSettings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const ogImage = pickOgImageUrl(settings);

  return {
    title: 'Petshop y Veterinaria en Asunción | Tiempo de Mascotas',
    description: 'Petshop online con delivery en Asunción and Gran Asunción. Alimentos balanceados, medicamentos y accesorios para perros, gatos, aves y más. Atención veterinaria.',
    alternates: { canonical: 'https://tiempodemascotas.com.py/' },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: 'https://tiempodemascotas.com.py/',
      siteName: 'Tiempo de Mascotas',
      title: 'Petshop y Veterinaria en Asunción | Tiempo de Mascotas',
      description: 'Petshop online con delivery en Asunción y Gran Asunción. Alimentos, medicamentos y accesorios para perros, gatos y más.',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Tiempo de Mascotas' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Petshop y Veterinaria en Asunción | Tiempo de Mascotas',
      description: 'Petshop online con delivery en Asunción y Gran Asunción.',
      images: [ogImage],
    },
  };
}

async function getHomeData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Parallel fetch of basic lists
  const [
    { data: homeContent },
    { data: homeBanners },
    { data: promoBanners },
    { data: siteSettings },
  ] = await Promise.all([
    supabase.from('home_content').select('*').eq('id', HOME_CONTENT_ID).maybeSingle(),
    supabase.from('home_banners').select('*').eq('is_active', true).order('order_index', { ascending: true }),
    supabase.from('promo_banners').select('*').eq('is_active', true).order('order_index', { ascending: true }),
    supabase.from('site_settings').select('show_out_of_stock').maybeSingle(),
  ]);

  const showOutOfStock = siteSettings?.show_out_of_stock ?? false;

  // 1. Fetch newest products
  let newestQuery = supabase
    .from('products')
    .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, is_featured, requires_prescription, category_brand, category_specific, category_species, is_bulk')
    .eq('active', true)
    .eq('is_parent', false);

  if (!showOutOfStock) {
    newestQuery = newestQuery.gt('stock', 0);
  }

  const newestPromise = newestQuery
    .order('created_at', { ascending: false })
    .limit(16);

  // 2. Fetch featured products (ProductGrid)
  let featuredQuery = supabase
    .from('products')
    .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, is_parent, is_featured, category, parent_product_id, category_general, category_detail, category_species, is_bulk')
    .eq('active', true)
    .is('parent_product_id', null)
    .eq('is_featured', true);

  const featuredPromise = featuredQuery
    .order('created_at', { ascending: false })
    .limit(12);

  // 3. Fetch active category sliders
  const slidersPromise = supabase
    .from('home_category_sliders')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  const [
    { data: newestProducts },
    { data: rawFeatured },
    { data: sliders },
  ] = await Promise.all([
    newestPromise,
    featuredPromise,
    slidersPromise,
  ]);

  // Process featured products logic
  let filteredFeatured: any[] = [];
  if (rawFeatured) {
    const parentIds = rawFeatured.filter(p => p.is_parent).map(p => p.id);
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

    filteredFeatured = sortAlphabeticalStockLast(rawFeatured.filter(p => {
      if (p.is_parent) return validParentIds.has(p.id);
      return showOutOfStock || (p.stock || 0) > 0;
    }));
  }

  // Fetch products for each slider
  const slidersWithProducts = await Promise.all(
    (sliders || []).map(async (slider) => {
      try {
        if (!slider.category_name) return { slider, products: [] };
        
        const { data: generalCat } = await supabase
          .from('categories')
          .select('id')
          .eq('type', 'general')
          .eq('name', slider.category_name)
          .single();

        if (!generalCat) return { slider, products: [] };

        const { data: cats } = await supabase
          .from('categories')
          .select('name')
          .eq('type', 'specific')
          .eq('parent_id', generalCat.id);

        const specificNames = (cats || []).map(c => c.name);
        if (specificNames.length === 0) return { slider, products: [] };

        let query = supabase
          .from('products')
          .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, requires_prescription, category_brand, category_specific, category_species, is_bulk')
          .eq('active', true)
          .eq('is_parent', false);

        if (!showOutOfStock) {
          query = query.gt('stock', 0);
        }

        const { data: products } = await pgOverlaps(query, 'category_specific', specificNames)
          .order('created_at', { ascending: false })
          .limit(16);

        return { slider, products: sortAlphabeticalStockLast(products || []) };
      } catch (e) {
        console.error('Error fetching slider products', e);
        return { slider, products: [] };
      }
    })
  );

  // Batch de volume_prices para todos los productos ya traídos (sin fetch en cliente)
  const sortedNewest = sortAlphabeticalStockLast(newestProducts || []);

  const allProductIds = Array.from(new Set([
    ...sortedNewest.map((p: any) => p.id),
    ...filteredFeatured.map((p: any) => p.id),
    ...slidersWithProducts.flatMap((s: any) => s.products.map((p: any) => p.id)),
  ]));

  let volumePricesByProduct: Record<string, any[]> = {};
  if (allProductIds.length > 0) {
    const { data: vp } = await supabase
      .from('volume_prices')
      .select('id, product_id, price_level, min_qty, max_qty, price')
      .in('product_id', allProductIds);
    (vp || []).forEach((row: any) => {
      if (!volumePricesByProduct[row.product_id]) volumePricesByProduct[row.product_id] = [];
      volumePricesByProduct[row.product_id].push(row);
    });
  }

  const attachVolumePrices = (list: any[]) =>
    list.map((p: any) => ({ ...p, volume_prices: volumePricesByProduct[p.id] || [] }));

  const newestWithVP = attachVolumePrices(sortedNewest);
  const featuredWithVP = attachVolumePrices(filteredFeatured);
  const slidersWithVP = slidersWithProducts.map((s: any) => ({
    ...s,
    products: attachVolumePrices(s.products),
  }));

  return {
    homeContent,
    homeBanners: (homeBanners || []) as any,
    promoBanners: (promoBanners || []) as any,
    newestProducts: newestWithVP as any,
    featuredProducts: featuredWithVP as any,
    slidersWithProducts: slidersWithVP as any,
  };
}

export default async function Home() {
  const data = await getHomeData();

  return (
    <CartProvider>
      <div className="min-h-screen bg-white">
        <MetadataUpdater />
        <NavTicker />
        <Header />

        <main>
          <h1 className="sr-only">Tiempo de Mascotas: petshop online, veterinaria y clínica en Asunción, Paraguay</h1>
          <section id="home">
            {/* 1. Hero banners 3:1 */}
            <HeroClient initialBanners={data.homeBanners} />

            {/* 2. ¿Qué estás buscando? — Category cards */}
            <CategoryCards />

            {/* 3. Cinta de tarjetas */}
            <RibbonCards />

            {/* 4. Banners promocionales 8:1 */}
            <HomeBannersClient initialBanners={data.promoBanners} />

            {/* 5. Novedades */}
            <InlineTicker />
            <ProductSliderClient
              title="Novedades"
              badge="Recién llegados"
              subtitle="Los últimos productos en nuestro catálogo"
              mode="newest"
              initialProducts={data.newestProducts}
            />

            {/* 6. Bento promocional */}
            <PromoBentoClient initialData={data.homeContent} />

            {/* 7. Bentobox por especie */}
            <PetCategoryCardsClient initialData={data.homeContent} />

            {/* 8. Sliders de categoría configurables */}
            <CategorySlidersSectionClient initialSliders={data.slidersWithProducts} />

            {/* 10. Productos destacados */}
            <ProductGridClient initialProducts={data.featuredProducts} />
          </section>

          <section id="about">
            <About />
          </section>

          <section id="contact">
            <Contact />
          </section>

          <SocialMedia />
          <PaymentTickerClient initialData={data.homeContent} />
        </main>

        <Footer />
        <FooterCredit />

        <HomeClientWrapper />
      </div>
    </CartProvider>
  );
}
