import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import ProductPageClient from '../../src/components/ProductPageClient';
import { ProductSchema } from '../../src/components/ProductSchema';
import { Breadcrumbs } from '../../src/components/Breadcrumbs';
import { categoryToSlug } from '../../src/lib/categoryUtils';
import { formatProductName } from '../../src/lib/textFormat';
import { resolveParentData } from '../../src/lib/parentFallback';
import { pgOverlaps } from '../../src/lib/pgArrayFilter';

export const revalidate = 300;

const BASE_URL = 'https://tiempodemascotas.com.py';

const RESERVED_SLUGS = [
  'admin', 'owner', 'productos', 'privacidad',
  'instrucciones', 'proveedores', 'panel-proveedor',
  'seguimiento', 'promo', 'miembros', 'categorias',
  'convertir-webp', 'image-ai-generator', 'api',
  'favicon.ico', 'favicon.svg', 'favicon.png',
  'apple-touch-icon.png', 'apple-touch-icon-precomposed.png',
  'robots.txt', 'sitemap.xml', 'sitemap-0.xml', 'sitemap-index.xml',
  'manifest.json', 'manifest.webmanifest',
  'browserconfig.xml', 'sw.js', 'workbox',
  'ads.txt', 'security.txt', '.well-known',
];

function isAssetSlug(slug: string): boolean {
  return slug.includes('.') || slug.startsWith('_') || slug.startsWith('.');
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

// Unified, cache-memoized fetch function for metadata and render
const getProduct = cache(async (slug: string) => {
  if (RESERVED_SLUGS.includes(slug) || isAssetSlug(slug)) {
    return null;
  }
  const supabase = getSupabase();
  
  // Explicit columns list for principal and child products
  const productCols = 'id, name, public_name, description, description_ai_enhanced, image_url, uploaded_image_url, additional_images, seo_title, seo_description, tags, url_slug, product_code, price, special_price, differentiated_price, active, is_parent, parent_product_id, stock, requires_prescription, category_general, category_specific, category_sub_specific, category_detail, category_species, category_brand, is_bulk, is_featured, variant_label, category, review_count, avg_rating';

  const { data: product } = await supabase
    .from('products')
    .select(productCols)
    .or(`url_slug.eq.${slug},product_code.eq.${slug}`)
    .eq('active', true)
    .maybeSingle();
    
  if (!product) return null;

  // Let's perform parallel fetches for children, related, pageContent, siteSettings and reviews
  let firstChildPromise = Promise.resolve<any>(null);
  let variantsPromise = Promise.resolve<any[]>([]);
  
  if (product.is_parent) {
    firstChildPromise = (async () => {
      const { data } = await supabase
        .from('products')
        .select(productCols)
        .eq('parent_product_id', product.id)
        .eq('active', true)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    })();

    variantsPromise = (async () => {
      const { data } = await supabase
        .from('products')
        .select(productCols)
        .eq('parent_product_id', product.id)
        .eq('active', true)
        .order('price', { ascending: true });
      return data || [];
    })();
  }

  // Related products query
  const cgArray = Array.isArray(product.category_general) 
    ? product.category_general 
    : (product.category_general ? [product.category_general] : []);
  
  let relatedPromise = Promise.resolve<any[]>([]);
  if (cgArray.length > 0) {
    relatedPromise = (async () => {
      const { data } = await pgOverlaps(
        supabase
          .from('products')
          .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, category_general, is_bulk'),
        'category_general',
        cgArray
      )
        .eq('active', true)
        .is('parent_product_id', null)
        .neq('id', product.id)
        .limit(4);
      return data || [];
    })();
  }

  // Site settings and page content
  const siteSettingsPromise = (async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('whatsapp_enabled, whatsapp_number')
      .single();
    return data;
  })();

  const pageContentPromise = (async () => {
    const { data } = await supabase
      .from('product_page_content')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    return data;
  })();

  const reviewsPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('id, author_name, rating, comment, created_at')
        .eq('product_id', product.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Error fetching product reviews:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Catch fetching product reviews:', err);
      return [];
    }
  })();

  const productSeoPromise = (async () => {
    try {
      const { data } = await supabase
        .from('product_seo')
        .select('meta_title, meta_description, og_image_url, schema_description, status')
        .eq('product_id', product.id)
        .maybeSingle();
      return data || null;
    } catch {
      return null;
    }
  })();

  const [firstChild, variants, relatedProducts, siteSettings, pageContent, reviews, productSeo] = await Promise.all([
    firstChildPromise,
    variantsPromise,
    relatedPromise,
    siteSettingsPromise,
    pageContentPromise,
    reviewsPromise,
    productSeoPromise
  ]);

  return {
    product,
    firstChild,
    variants,
    relatedProducts,
    siteSettings,
    pageContent,
    reviews,
    productSeo
  };
});

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  if (RESERVED_SLUGS.includes(params.slug) || isAssetSlug(params.slug)) {
    return { robots: { index: false, follow: false } };
  }

  const result = await getProduct(params.slug);

  if (!result || !result.product) {
    return {
      title: 'Producto no encontrado | Tiempo de Mascotas',
      robots: { index: false, follow: true },
    };
  }

  const { product, firstChild, productSeo } = result;
  const displayName = product.public_name || toTitleCase(product.name);
  const productUrl = `${BASE_URL}/${product.url_slug || product.product_code}`;
  
  // Extraer SEO custom si existe y está OK
  const customSeo = productSeo;
  const hasCustomSeo = customSeo && customSeo.status === 'ok';

  // Título: custom si está OK, sino fallback
  const title = hasCustomSeo && customSeo.meta_title
    ? customSeo.meta_title
    : buildFallbackTitle(product, displayName);

  // Descripción: idem
  const description = hasCustomSeo && customSeo.meta_description
    ? customSeo.meta_description
    : buildFallbackDescription(product, displayName);

  // OG image: custom > imagen de producto > fallback OG del sitio
  const ogImage = (hasCustomSeo && customSeo.og_image_url)
    || product.uploaded_image_url || product.image_url 
    || firstChild?.uploaded_image_url || firstChild?.image_url 
    || 'https://acvsdhysykaybcoctdhc.supabase.co/storage/v1/object/public/product-images/site-assets/og-image-1200x630.webp';

  return {
    title,
    description,
    alternates: { canonical: productUrl },
    robots: product.active === false
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: productUrl,
      siteName: 'Tiempo de Mascotas',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 1200, alt: displayName }]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage]
    }
  };
}

function buildFallbackTitle(product: any, displayName: string) {
  const brand = product.category_brand && product.category_brand !== 'Otros' ? ` ${product.category_brand}` : '';
  return truncarLimpio(`${displayName}${brand} | Tiempo de Mascotas`, 60);
}

function buildFallbackDescription(product: any, displayName: string) {
  const species = product.category_species?.[0];
  const speciesPhrase = species ? `para ${species.toLowerCase()}` : '';
  const brand = product.category_brand && product.category_brand !== 'Otros' ? ` de ${product.category_brand}` : '';
  const desc = `${displayName}${brand} ${speciesPhrase} en Tiempo de Mascotas. Envíos en Asunción y Gran Asunción. Consultá por WhatsApp.`;
  return truncarLimpio(desc, 155);
}

function truncarLimpio(texto: string, maxLen: number): string {
  if (texto.length <= maxLen) return texto;
  const cortado = texto.substring(0, maxLen);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return (ultimoEspacio > 0 ? cortado.substring(0, ultimoEspacio) : cortado) + '…';
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default async function DynamicProductPage({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.includes(params.slug) || isAssetSlug(params.slug)) {
    notFound();
  }

  const result = await getProduct(params.slug);
  if (!result || !result.product) {
    notFound();
  }

  const product = result.product;
  const displayName = product.public_name || toTitleCase(product.name);
  const firstCategory = Array.isArray(product.category_general) && product.category_general[0]
    ? product.category_general[0]
    : (product.category || null);

  const breadcrumbsItems = [
    { name: 'Inicio', url: 'https://tiempodemascotas.com.py/' },
    { name: 'Productos', url: 'https://tiempodemascotas.com.py/productos' },
    ...(firstCategory
      ? [{
          name: firstCategory,
          url: `https://tiempodemascotas.com.py/categoria/${categoryToSlug(firstCategory)}`
        }]
      : []),
    { name: displayName }
  ];

  return (
    <>
      <ProductSchema 
        product={result.product as any} 
        reviews={result.reviews} 
        schemaDescriptionOverride={result.productSeo?.status === 'ok' ? result.productSeo?.schema_description : undefined}
      />
      <ProductPageClient
        product={result.product as any}
        firstChild={result.firstChild as any}
        variants={result.variants as any}
        relatedProducts={result.relatedProducts as any}
        siteSettings={result.siteSettings}
        pageContent={result.pageContent}
        breadcrumbs={<Breadcrumbs items={breadcrumbsItems} />}
        reviews={result.reviews}
      />
    </>
  );
}
