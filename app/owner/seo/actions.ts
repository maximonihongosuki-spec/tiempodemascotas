'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export async function generateProductSeoWithAi(productId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tiempodemascotas.com.py';
    const response = await fetch(`${baseUrl}/api/generar-seo-producto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: [productId] }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return { success: false, error: data.error || `Error ${response.status}` };
    }

    const result = data.output?.[0];
    if (!result) return { success: false, error: 'Respuesta vacía' };

    return {
      success: true,
      data: {
        meta_title: result.meta_title,
        meta_description: result.meta_description,
        schema_description: result.schema_description,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red' };
  }
}

export async function generateSeoForBatch(productIds: string[]) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tiempodemascotas.com.py';
    const response = await fetch(`${baseUrl}/api/generar-seo-producto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: productIds, preview_only: true }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return { output: [], errors: [data.error || `Error ${response.status}`] };
    }

    return { output: data.output || [], errors: [] };
  } catch (err: any) {
    return { output: [], errors: [err.message || 'Error de red'] };
  }
}

export async function saveBatchSeo(items: { productId: string; metaTitle: string; metaDescription: string; schemaDescription?: string }[]) {
  const supabase = createClient();
  const upserts = items.map(i => ({
    product_id: i.productId,
    meta_title: i.metaTitle,
    meta_description: i.metaDescription,
    schema_description: i.schemaDescription || null,
    status: 'ok' as const,
    ai_generated: true,
    updated_by: 'ai-reviewed',
  }));
  const { error } = await supabase.from('product_seo').upsert(upserts, { onConflict: 'product_id' });
  if (error) return { success: false, error: error.message };
  revalidatePath('/owner/seo');
  return { success: true };
}

export async function saveProductSeo(data: {
  productId: string;
  metaTitle: string;
  metaDescription: string;
  schemaDescription?: string;
  ogImageUrl?: string;
  status: 'pending' | 'ok';
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from('product_seo')
    .upsert({
      product_id: data.productId,
      meta_title: data.metaTitle,
      meta_description: data.metaDescription,
      schema_description: data.schemaDescription || null,
      og_image_url: data.ogImageUrl || null,
      status: data.status,
      updated_by: 'manual',
    }, { onConflict: 'product_id' });

  if (error) return { success: false, error: error.message };

  const { data: product } = await supabase
    .from('products')
    .select('url_slug')
    .eq('id', data.productId)
    .single();

  if (product?.url_slug) revalidatePath(`/${product.url_slug}`);
  revalidatePath('/owner/seo');

  return { success: true };
}

export async function savePageSeo(data: {
  pageKey: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from('page_seo')
    .update({
      meta_title: data.metaTitle,
      meta_description: data.metaDescription,
      og_image_url: data.ogImageUrl || null,
      updated_by: 'manual',
    })
    .eq('page_key', data.pageKey);

  if (error) return { success: false, error: error.message };

  const pathMap: Record<string, string> = {
    'home': '/',
    'productos': '/productos',
    'nosotros': '/nosotros',
  };
  if (pathMap[data.pageKey]) revalidatePath(pathMap[data.pageKey]);
  revalidatePath('/owner/seo');

  return { success: true };
}
