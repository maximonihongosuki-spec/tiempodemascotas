import { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const BASE = 'https://tiempodemascotas.com.py';

const CATEGORIAS_GENERALES = [
  'Accesorios',
  'Alimentos Balanceados y Húmedos',
  'Cuidado, Higiene y Bienestar',
  'Salud y Farmacia Veterinaria',
  'Medicina y Cuidado',
  'Varios',
  'Accesorios Varios',
];

const SPECIES = ['Perros', 'Gatos', 'Aves', 'Roedores', 'Tortugas', 'Peces'];

function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

function escapeXml(url: string): string {
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const now = new Date();

  // 1. Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/productos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/nosotros`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/promo/forma-de-pago`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/promo/costo-de-envio`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/promo/politica-de-privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/promo/horario-de-atencion`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // 2. Landing pages por categoría general (indexables desde PROMPT 6)
  const categoriaGeneralPages: MetadataRoute.Sitemap = CATEGORIAS_GENERALES.map(cat => ({
    url: `${BASE}/productos?cat_gen=${encodeURIComponent(cat)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // 3. Landing pages por species
  const speciesPages: MetadataRoute.Sitemap = SPECIES.map(sp => ({
    url: `${BASE}/productos?species=${encodeURIComponent(sp)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // 4. Combinaciones cat_gen × species (las más buscadas)
  const combos: MetadataRoute.Sitemap = [];
  for (const cat of CATEGORIAS_GENERALES) {
    for (const sp of ['Perros', 'Gatos']) { // solo las 2 grandes para no explotar
      combos.push({
        url: `${BASE}/productos?cat_gen=${encodeURIComponent(cat)}&species=${sp}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.75,
      });
    }
  }

  // 5. Todos los productos activos con lastmod real
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const { data: products } = await supabase
      .from('products')
      .select('url_slug, updated_at')
      .eq('active', true)
      .eq('archived', false)
      .not('url_slug', 'is', null);

    if (products) {
      productPages = (products || []).map(p => ({
        url: `${BASE}/${p.url_slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Error in sitemap products fetch:', error);
  }

  const allEntries = [
    ...staticPages,
    ...categoriaGeneralPages,
    ...speciesPages,
    ...combos,
    ...productPages,
  ];

  return allEntries.map(entry => ({
    ...entry,
    url: escapeXml(entry.url),
  }));
}
