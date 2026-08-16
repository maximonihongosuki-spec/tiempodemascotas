import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nativeCategorization } from '@/src/lib/native-categorization';
import { logProcessing } from '@/src/lib/processing-log';

export const runtime = 'nodejs';

const N8N_WEBHOOK_URL = 'https://etereasprojects.app.n8n.cloud/webhook/categorizar-productos-tm';

async function getAdminSettings(): Promise<{ useNative: boolean; model: string }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from('admin_settings')
      .select('use_native_categorization, native_ai_model')
      .maybeSingle();
    return {
      useNative: data?.use_native_categorization ?? false,
      model: data?.native_ai_model || 'gpt-4o-mini',
    };
  } catch {
    return { useNative: false, model: 'gpt-4o-mini' };
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { useNative, model } = await getAdminSettings();
  const inputSummary = {
    product_count: body?.productos?.length || 0,
    product_names: (body?.productos || []).slice(0, 5).map((p: any) => p.nombre),
    has_categorias_generales: Array.isArray(body?.categorias_generales),
    has_marcas: Array.isArray(body?.marcas),
  };

  try {
    if (useNative) {
      const result = await nativeCategorization({ ...body, model });
      const duration = Date.now() - startedAt;
      
      if (!result.ok) {
        await logProcessing({
          type: 'categorization', mode: 'native', status: 'error',
          duration_ms: duration,
          stages: result.stages,
          input_summary: inputSummary,
          error_message: result.error,
          metadata: { model },
        });
        return NextResponse.json({ error: result.error, stages: result.stages }, { status: 500 });
      }

      await logProcessing({
        type: 'categorization', mode: 'native', status: 'success',
        duration_ms: duration,
        stages: result.stages,   // stages ya incluye systemPrompt, productList, rawText, merged en sus .data
        input_summary: {
          product_count: body?.productos?.length || 0,
          product_names: (body?.productos || []).map((p: any) => p.nombre),
          categorias_generales: body?.categorias_generales || [],
          categorias_especificas: body?.categorias_especificas || [],
          especies: body?.especies || [],
          edades: body?.edades || [],
          condiciones: body?.condiciones || [],
          marcas_count: (body?.marcas || []).length,
          marcas: body?.marcas || [],
          productos: body?.productos || [],
        },
        output_summary: {
          result_count: result.results?.length || 0,
          full_output: result.results || [],
        },
        metadata: { model },
      });
      return NextResponse.json({ output: result.results });
    } else {
      // Modo n8n proxy
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const duration = Date.now() - startedAt;

      if (!response.ok) {
        const errorText = await response.text();
        await logProcessing({
          type: 'categorization', mode: 'n8n', status: 'error',
          duration_ms: duration,
          input_summary: inputSummary,
          error_message: `n8n HTTP ${response.status}: ${errorText.slice(0, 300)}`,
        });
        return NextResponse.json(
          { error: 'Error al conectar con el servicio de IA', detail: errorText },
          { status: 502 }
        );
      }
      
      const data = await response.json();
      const resultArray = Array.isArray(data) ? data : (data.output || []);
      await logProcessing({
        type: 'categorization', mode: 'n8n', status: 'success',
        duration_ms: duration,
        stages: [
          {
            stage: 'Envío a n8n webhook',
            status: 'ok',
            detail: `POST a ${N8N_WEBHOOK_URL} | payload ${JSON.stringify(body).length} chars`,
            duration_ms: duration,
            data: {
              webhook_url: N8N_WEBHOOK_URL,
              payload_sent: body,
            },
          },
          {
            stage: 'Respuesta de n8n',
            status: 'ok',
            detail: `${resultArray.length} producto(s) devueltos`,
            duration_ms: 0,
            data: {
              raw_response: data,
            },
          },
        ],
        input_summary: {
          product_count: body?.productos?.length || 0,
          product_names: (body?.productos || []).map((p: any) => p.nombre),
          categorias_generales: body?.categorias_generales || [],
          categorias_especificas: body?.categorias_especificas || [],
          especies: body?.especies || [],
          edades: body?.edades || [],
          condiciones: body?.condiciones || [],
          marcas_count: (body?.marcas || []).length,
          marcas: body?.marcas || [],
          productos: body?.productos || [],
        },
        output_summary: {
          result_count: resultArray.length,
          full_output: resultArray,
        },
      });
      return NextResponse.json(data);
    }
  } catch (error: any) {
    await logProcessing({
      type: 'categorization', mode: useNative ? 'native' : 'n8n', status: 'error',
      duration_ms: Date.now() - startedAt,
      input_summary: inputSummary,
      error_message: error.message,
    });
    return NextResponse.json(
      { error: 'Error interno del servidor', detail: error.message },
      { status: 500 }
    );
  }
}
