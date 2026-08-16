import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { categoryToSlug, slugToCategory } from '../../../src/lib/categoryUtils';
import CategoryPageClient from '../../../src/components/CategoryPageClient';
import { pgOverlaps } from '../../../src/lib/pgArrayFilter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600;

type Props = {
  params: { slug: string };
};

async function getCategoryData(slug: string) {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('type', 'general')
    .order('name');

  if (!categories) return null;

  const category = categories.find(
    cat => categoryToSlug(cat.name) === slug
  );

  if (!category) return null;

  // Obtener subcategorías específicas
  const { data: specifics } = await supabase
    .from('categories')
    .select('*')
    .eq('type', 'specific')
    .eq('parent_id', category.id)
    .order('name');

  // Obtener productos de esta categoría general
  // Los productos están vinculados por category_specific → parent_id → general
  const specificNames = (specifics || []).map(s => s.name);

  let products: any[] = [];
  if (specificNames.length > 0) {
    const { data: settings } = await supabase.from('site_settings').select('show_out_of_stock').single();
    const showOutOfStock = settings?.show_out_of_stock ?? false;

    let query = supabase
      .from('products')
      .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, requires_prescription, category_brand, category_specific, category_species, tags, category_detail')
      .eq('active', true)
      .eq('is_parent', false);

    if (!showOutOfStock) {
      query = query.gt('stock', 0);
    }

    const { data } = await pgOverlaps(query, 'category_specific', specificNames)
      .order('created_at', { ascending: false })
      .limit(48);
    products = data || [];
  }

  return { category, specifics: specifics || [], products };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCategoryData(params.slug);

  if (!data) {
    return { title: 'Categoría no encontrada' };
  }

  const { category } = data;
  const baseUrl = 'https://tiempodemascotas.com.py';

  return {
    title: `${category.name} para Mascotas | Tiempo de Mascotas Paraguay`,
    description: `Encontrá los mejores productos de ${category.name} para tu mascota en Tiempo de Mascotas. Envíos a todo Paraguay.`,
    openGraph: {
      title: `${category.name} | Tiempo de Mascotas`,
      description: `Productos de ${category.name} para mascotas en Paraguay`,
      url: `${baseUrl}/categoria/${params.slug}`,
      images: category.image_url ? [{ url: category.image_url }] : [],
    },
    alternates: {
      canonical: `${baseUrl}/categoria/${params.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const data = await getCategoryData(params.slug);

  if (!data) {
    notFound();
  }

  const { category, specifics, products } = data;

  return (
    <CategoryPageClient
      category={category}
      specifics={specifics}
      products={products}
      slug={params.slug}
    />
  );
}
