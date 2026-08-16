import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nativeConvertToWebp } from '@/src/lib/native-webp';
import { logProcessing } from '@/src/lib/processing-log';

export const runtime = 'nodejs';

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;

async function getUseNativeWebp(): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from('admin_settings')
      .select('use_native_webp')
      .maybeSingle();
    return data?.use_native_webp ?? false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const contentType = req.headers.get('content-type') || '';
  const useNative = await getUseNativeWebp();
  let inputSummary: any = {};

  const widthParam = req.nextUrl.searchParams.get('width');
  const heightParam = req.nextUrl.searchParams.get('height');
  const webpOptions = (widthParam && heightParam)
    ? { width: parseInt(widthParam, 10), height: parseInt(heightParam, 10) }
    : undefined;

  try {
    if (useNative) {
      let result;
      if (contentType.includes('application/json')) {
        const { imageUrl } = await req.json();
        inputSummary = { source: 'url', imageUrl };
        result = await nativeConvertToWebp({ kind: 'url', url: imageUrl }, webpOptions);
      } else {
        const arrayBuffer = await req.arrayBuffer();
        inputSummary = { source: 'file', size_bytes: arrayBuffer.byteLength, contentType };
        result = await nativeConvertToWebp({
          kind: 'file',
          buffer: Buffer.from(arrayBuffer),
          contentType,
        }, webpOptions);
      }
      const duration = Date.now() - startedAt;

      if (!result.ok || !result.buffer) {
        await logProcessing({
          type: 'webp', mode: 'native', status: 'error',
          duration_ms: duration,
          stages: result.stages,
          input_summary: inputSummary,
          error_message: result.error,
        });
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      await logProcessing({
        type: 'webp', mode: 'native', status: 'success',
        duration_ms: duration,
        stages: result.stages,
        input_summary: inputSummary,
        output_summary: {
          input_size_bytes: result.input_size_bytes,
          output_size_bytes: result.output_size_bytes,
          reduction_pct: result.input_size_bytes
            ? Number((((result.input_size_bytes - result.output_size_bytes!) / result.input_size_bytes) * 100).toFixed(1))
            : 0,
        },
      });
      
      return new NextResponse(result.buffer as any, {
        headers: { 'Content-Type': 'image/webp' },
      });
    } else {
      // Modo n8n proxy
      let res: Response;
      if (contentType.includes('application/json')) {
        const body = await req.json();
        inputSummary = { source: 'url', imageUrl: body.imageUrl };
        res = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        const arrayBuffer = await req.arrayBuffer();
        inputSummary = { source: 'file', size_bytes: arrayBuffer.byteLength, contentType };
        res = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': contentType },
          body: arrayBuffer,
        });
      }
      const duration = Date.now() - startedAt;
      
      if (!res.ok) {
        await logProcessing({
          type: 'webp', mode: 'n8n', status: 'error',
          duration_ms: duration,
          input_summary: inputSummary,
          error_message: `n8n HTTP ${res.status}`,
        });
        throw new Error(`n8n respondió ${res.status}`);
      }
      
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      await logProcessing({
        type: 'webp', mode: 'n8n', status: 'success',
        duration_ms: duration,
        input_summary: inputSummary,
        output_summary: {
          output_size_bytes: buf.byteLength,
        },
      });
      return new NextResponse(buf, { headers: { 'Content-Type': 'image/webp' } });
    }
  } catch (error: any) {
    await logProcessing({
      type: 'webp', mode: useNative ? 'native' : 'n8n', status: 'error',
      duration_ms: Date.now() - startedAt,
      input_summary: inputSummary,
      error_message: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
