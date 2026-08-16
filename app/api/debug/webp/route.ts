export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nativeConvertToWebp, WebpStage } from '@/src/lib/native-webp';

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!;

async function checkIfNativeWebp(): Promise<boolean> {
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
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let forceNative = false;
    let imageUrl = '';
    let fileBuffer: Buffer | null = null;
    let originalFilename = 'archivo_subido.bin';
    let input_size_bytes = 0;

    let stages: WebpStage[] = [];

    try {
      const tStart = Date.now();
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('file');
        forceNative = formData.get('forceNative') === 'true';

        if (file && file instanceof File) {
          const arrayBuffer = await file.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
          input_size_bytes = fileBuffer.length;
          originalFilename = file.name;
          stages.push({
            stage: 'Recepción del FormData',
            status: 'ok',
            detail: `Recibido archivo "${file.name}" de tipo ${file.type} (${fileBuffer.length} bytes)`,
            duration_ms: Date.now() - tStart,
            size_bytes: fileBuffer.length,
          });
        } else {
          stages.push({
            stage: 'Recepción del FormData',
            status: 'error',
            detail: 'No se encontró un archivo válido en el FormData',
            duration_ms: Date.now() - tStart,
          });
          return NextResponse.json({ ok: false, stages, error: 'No file received' });
        }
      } else {
        // JSON
        const body = await req.json();
        forceNative = !!body.forceNative;
        imageUrl = body.imageUrl || '';
        stages.push({
          stage: 'Recepción del JSON',
          status: 'ok',
          detail: imageUrl ? `Recibida URL: "${imageUrl}" (forceNative: ${forceNative})` : 'JSON recibido vacío o sin URL',
          duration_ms: Date.now() - tStart,
        });
        if (!imageUrl) {
          return NextResponse.json({ ok: false, stages, error: 'No imageUrl provided' });
        }
      }

      const useNative = forceNative || (await checkIfNativeWebp());
      const mode = useNative ? 'native' : 'n8n';

      if (useNative) {
        const convInput = fileBuffer 
          ? { kind: 'file' as const, buffer: fileBuffer } 
          : { kind: 'url' as const, url: imageUrl };
        
        const convRes = await nativeConvertToWebp(convInput);
        
        // Combinar stages
        stages = [...stages, ...convRes.stages];

        if (!convRes.ok || !convRes.buffer) {
          return NextResponse.json({
            ok: false,
            mode,
            stages,
            error: convRes.error || 'Fallo en la conversión nativa'
          });
        }

        const base64 = `data:image/webp;base64,${convRes.buffer.toString('base64')}`;
        return NextResponse.json({
          ok: true,
          mode,
          stages,
          input_size_bytes: input_size_bytes || (convRes.stages[0]?.size_bytes ?? 0),
          output_size_bytes: convRes.buffer.length,
          base64_image: base64,
        });

      } else {
        // Registrar etapa de conexión a n8n
        const t0 = Date.now();
        stages.push({
          stage: 'Preparación para n8n',
          status: 'ok',
          detail: `Haciendo proxy a webhook de n8n: ${N8N_WEBHOOK_URL || 'No configurada (usando fallback de prueba)'}`,
          duration_ms: Date.now() - t0,
        });

        const t1 = Date.now();
        let res: Response;
        let finalBuffer: Buffer;
        
        try {
          if (!N8N_WEBHOOK_URL) {
            throw new Error('La variable NEXT_PUBLIC_N8N_WEBHOOK_URL no está configurada.');
          }

          if (fileBuffer) {
            res = await fetch(N8N_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': contentType.includes('application/json') ? 'application/json' : 'image/jpeg' },
              body: new Uint8Array(fileBuffer),
            });
          } else {
            res = await fetch(N8N_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl }),
            });
          }

          if (!res.ok) throw new Error(`n8n respondió HTTP ${res.status}`);
          
          const blob = await res.blob();
          const arrayBuf = await blob.arrayBuffer();
          finalBuffer = Buffer.from(arrayBuf);

          stages.push({
            stage: 'Llamada webhook n8n',
            status: 'ok',
            detail: `n8n procesó con éxito. Recibidos ${finalBuffer.length} bytes`,
            duration_ms: Date.now() - t1,
            size_bytes: finalBuffer.length,
          });

        } catch (err: any) {
          stages.push({
            stage: 'Llamada de webhook n8n',
            status: 'error',
            detail: err.message,
            duration_ms: Date.now() - t1,
          });
          return NextResponse.json({
            ok: false,
            mode,
            stages,
            error: `Error en proxy n8n: ${err.message}`
          });
        }

        const base64 = `data:image/webp;base64,${finalBuffer.toString('base64')}`;
        return NextResponse.json({
          ok: true,
          mode,
          stages,
          input_size_bytes: input_size_bytes || 500000, // estimado si viene de URL y fallback
          output_size_bytes: finalBuffer.length,
          base64_image: base64,
        });
      }

    } catch (error: any) {
      stages.push({
        stage: 'Error de ejecución general',
        status: 'error',
        detail: error.message,
        duration_ms: 0,
      });
      return NextResponse.json({
        ok: false,
        stages,
        error: error.message,
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, mode: 'native' as const, stages: [], error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
