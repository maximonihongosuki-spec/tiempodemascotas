import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Token de seguridad para que solo n8n pueda llamar este endpoint
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'tdm-import-2024';

export async function POST(req: NextRequest) {
  try {
    // Validar token
    const authHeader = req.headers.get('x-import-secret');
    if (authHeader !== IMPORT_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();

    // Validar campos obligatorios
    if (!body.name || body.price === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: name, price' },
        { status: 400 }
      );
    }

    // Verificar si el producto ya existe por source_url o url_slug
    if (body.source_url) {
      const { data: existing } = await supabase
        .from('products')
        .select('id, name')
        .eq('source_url', body.source_url)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { 
            skipped: true, 
            message: 'Producto ya existe', 
            id: existing.id,
            name: existing.name 
          },
          { status: 200 }
        );
      }
    }

    // Generar product_code único
    const product_code = 'TDM-' + Date.now().toString(36).toUpperCase();

    // Generar url_slug desde el nombre si no viene
    const url_slug = body.url_slug || 
      body.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Verificar que el slug no esté duplicado
    const { data: slugExists } = await supabase
      .from('products')
      .select('id')
      .eq('url_slug', url_slug)
      .maybeSingle();

    const finalSlug = slugExists 
      ? url_slug + '-' + Date.now().toString(36)
      : url_slug;

    // Construir objeto producto
    const productData = {
      product_code,
      name: body.name,
      description: body.description || '',
      price: Number(body.price),
      category: body.category_specific || body.category_general || 'Otros',
      category_general: body.category_general || null,
      category_specific: body.category_specific || 'Otros',
      category_species: Array.isArray(body.category_species) 
        ? body.category_species 
        : body.category_species 
          ? [body.category_species] 
          : ['Otros'],
      category_brand: body.category_brand || 'Otros',
      image_url: body.image_url || '',
      uploaded_image_url: '',
      additional_images: Array.isArray(body.additional_images) 
        ? body.additional_images 
        : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      source_url: body.source_url || null,
      url_slug: finalSlug,
      stock: 0,
      active: true,
      cost: 0,
      special_price: 0,
      differentiated_price: 0,
      wholesale_price: 0,
      retail_margin: 0,
      wholesale_margin: 0,
      interest_rate_6: 0,
      interest_rate_12: 0,
      interest_rate_18: 0,
      interest_rate_24: 0,
      is_featured: false,
      show_in_hero: false,
      supplier_id: null,
      delivery_time_hours: 0,
      location: 'SHOW ROOM',
      brand: body.category_brand || '',
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select('id, name, url_slug')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Error al guardar producto', detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        id: data.id, 
        name: data.name,
        url_slug: data.url_slug
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json(
      { error: 'Error interno', detail: err.message },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: 'import-product',
    version: '1.0'
  });
}
