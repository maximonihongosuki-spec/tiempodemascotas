export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { nativeGenerateSeo } from '@/src/lib/native-seo';
import { logProcessing } from '@/src/lib/processing-log';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let model = 'gpt-4o-mini';
  let productsCount = 0;

  try {
    const body = await req.json();
    const productIds: string[] = body.product_ids;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'product_ids requerido (array no vacío)' }, { status: 400 });
    }
    if (productIds.length > 20) {
      return NextResponse.json({ error: 'Máximo 20 productos por lote' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, public_name, price, special_price, category_brand, category_species, category_general, description, description_ai_enhanced, url_slug')
      .in('id', productIds);

    if (fetchError || !products || products.length === 0) {
      const errorMsg = fetchError?.message || 'No se encontraron productos';
      logProcessing({
        type: 'seo',
        mode: 'native',
        status: 'error',
        duration_ms: Date.now() - startTime,
        error_message: errorMsg,
      });
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    productsCount = products.length;

    // Leer modelo configurado (mismo patrón que Módulo 2 — admin_settings.seo_ai_model)
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('seo_ai_model')
      .limit(1)
      .maybeSingle();
    model = settings?.seo_ai_model || 'gpt-4o-mini';

    const { results, error: aiError } = await nativeGenerateSeo(products, model);

    if (aiError) {
      logProcessing({
        type: 'seo',
        mode: 'native',
        status: 'error',
        duration_ms: Date.now() - startTime,
        input_summary: { product_count: productsCount, model },
        error_message: aiError,
      });
      return NextResponse.json({ error: aiError }, { status: 502 });
    }

    const previewOnly = body.preview_only === true;

    if (!previewOnly) {
      // Guardar cada resultado en product_seo como 'pending' (revisión humana antes de OK)
      const upserts = results.map(r => ({
        product_id: r.id,
        meta_title: r.meta_title,
        meta_description: r.meta_description,
        schema_description: r.schema_description,
        status: 'pending' as const,
        ai_generated: true,
        ai_model: model,
        last_generated_at: new Date().toISOString(),
        updated_by: 'ai',
      }));

      const { error: upsertError } = await supabase
        .from('product_seo')
        .upsert(upserts, { onConflict: 'product_id' });

      if (upsertError) {
        const errorMsg = 'Generado pero falló al guardar: ' + upsertError.message;
        logProcessing({
          type: 'seo',
          mode: 'native',
          status: 'error',
          duration_ms: Date.now() - startTime,
          input_summary: { product_count: productsCount, model },
          error_message: errorMsg,
        });
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }
    }

    logProcessing({
      type: 'seo',
      mode: 'native',
      status: 'success',
      duration_ms: Date.now() - startTime,
      input_summary: { product_count: productsCount, model },
      output_summary: { generated_count: results.length },
    });

    return NextResponse.json({ output: results });
  } catch (err: any) {
    logProcessing({
      type: 'seo',
      mode: 'native',
      status: 'error',
      duration_ms: Date.now() - startTime,
      input_summary: { product_count: productsCount, model },
      error_message: err.message,
    });
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
