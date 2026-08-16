import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const IMPORT_SECRET = process.env.IMPORT_SECRET || 'tdm-import-2024';

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('x-import-secret');
  if (authHeader !== IMPORT_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const updateData: any = {};
    if (body.price !== undefined) updateData.price = body.price;
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.description !== undefined && body.description) updateData.description = body.description;
    if (body.image_url !== undefined && body.image_url) updateData.image_url = body.image_url;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', body.id)
      .select('id, name, price, stock')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
