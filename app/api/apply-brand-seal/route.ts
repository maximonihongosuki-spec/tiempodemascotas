import { NextRequest, NextResponse } from 'next/server';
import { applyBrandSealOverlay } from '@/src/lib/native-webp';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const position = (formData.get('position') as string) || 'south_east';

    if (!imageFile) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: settings } = await supabase
      .from('site_settings')
      .select('brand_seal_cloudinary_id')
      .single();

    const sealId = settings?.brand_seal_cloudinary_id;
    if (!sealId) {
      return NextResponse.json({ error: 'No hay sello de marca configurado en /admin' }, { status: 400 });
    }

    const resultBlob = await applyBrandSealOverlay(imageFile, sealId, position as any);
    const buffer = Buffer.from(await resultBlob.arrayBuffer());

    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
