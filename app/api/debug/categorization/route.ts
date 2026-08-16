export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nativeCategorization, CategorizationStage } from '@/src/lib/native-categorization';

const N8N_WEBHOOK_URL = 'https://etereasprojects.app.n8n.cloud/webhook/categorizar-productos-tm';

async function checkIfNativeCategorization(): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from('admin_settings')
      .select('use_native_categorization')
      .maybeSingle();
    return data?.use_native_categorization ?? false;
  } catch {
    return false; // fallback seguro a n8n
  }
}

export async function GET(req: NextRequest) {
  try {
    const list = req.nextUrl.searchParams.get('list');
    if (list === 'true') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .limit(100);
      
      if (error) throw error;
      
      const { data: categories } = await supabase
        .from('categories')
        .select('name, type');

      return NextResponse.json({
        products: products || [],
        categories: categories || []
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const stages: CategorizationStage[] = [];

  try {
    const body = await req.json();
    let productos = body.productos || [];
    const product_ids = body.product_ids || [];
    const forceNative = !!body.forceNative;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Obtener productos reales de Supabase si viene product_ids
    if (product_ids && product_ids.length > 0) {
      const tFetch = Date.now();
      const { data: realProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id, name')
        .in('id', product_ids);

      if (fetchErr) {
        stages.push({
          stage: 'Recuperación de IDs reales de Supabase',
          status: 'error',
          detail: `Error al buscar IDs: ${fetchErr.message}`,
          duration_ms: Date.now() - tFetch,
        });
        return NextResponse.json({ ok: false, stages, error: fetchErr.message }, { status: 500 });
      }

      stages.push({
        stage: 'Recuperación de IDs reales de Supabase',
        status: 'ok',
        detail: `Se encontraron ${realProducts?.length || 0} de ${product_ids.length} productos reales en la DB`,
        duration_ms: Date.now() - tFetch,
      });

      if (realProducts && realProducts.length > 0) {
        const mapped = realProducts.map(p => ({
          id: p.id,
          nombre: p.name,
        }));
        // Agregar a los productos
        productos = [...productos, ...mapped];
      }
    }

    stages.push({
      stage: 'Recopilación de input para debug',
      status: 'ok',
      detail: `Recibidos ${productos.length} productos a procesar (forceNative: ${forceNative})`,
      duration_ms: Date.now() - t0,
    });

    if (productos.length === 0) {
      return NextResponse.json({
        ok: false,
        stages,
        error: 'No se enviaron productos a categorizar',
      }, { status: 400 });
    }

    // Recopilar contexto real de todas las categorías de Supabase
    const tQuery = Date.now();
    let categorias_generales: string[] = [];
    let categorias_especificas: string[] = [];
    let especies: string[] = [];
    let edades: string[] = [];
    let condiciones: string[] = [];
    let marcas: string[] = [];

    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('name, type');

      if (catData) {
        catData.forEach(c => {
          if (!c.name) return;
          const name = c.name;
          if (c.type === 'general') {
            categorias_generales.push(name);
          } else if (c.type === 'specific') {
            categorias_especificas.push(name);
          } else if (c.type === 'species') {
            especies.push(name);
          } else if (c.type === 'age') {
            edades.push(name);
          } else if (c.type === 'condition') {
            condiciones.push(name);
          } else if (c.type === 'brand') {
            marcas.push(name);
          }
        });
      }
    } catch (queryErr) {
      console.error('Error al poblar contexto original de categorías:', queryErr);
    }

    // Fallbacks si la base de datos está vacía para evitar fallos catastróficos
    if (categorias_generales.length === 0) {
      categorias_generales = ['Alimento', 'Juguetes', 'Ropa', 'Farmacia', 'Accesorios', 'Cuidado, Higiene y Bienestar', 'Varios', 'Jardinería'];
    }
    if (categorias_especificas.length === 0) {
      categorias_especificas = ['Alimento seco', 'Alimento húmedo', 'Juguete', 'Collar', 'Golosina', 'Antipulgas', 'Shampoo', 'Rascador'];
    }
    if (especies.length === 0) {
      especies = ['Perros', 'Gatos', 'Aves', 'Peces', 'Roedores', 'Tortugas'];
    }
    if (edades.length === 0) {
      edades = ['Cachorro', 'Adulto', 'Castrado', 'Senior', 'Starter'];
    }
    if (condiciones.length === 0) {
      condiciones = ['Hipoalergénico', 'Gastrointestinal', 'Hepático', 'Renal', 'Urinario', 'Cardíaco', 'Obesidad', 'Diabético', 'Articular/Movilidad', 'Dermatológico', 'Oncológico', 'Leishmaniasis'];
    }
    if (marcas.length === 0) {
      marcas = ['Purina', 'Royal Canin', 'Pedigree', 'Whiskas', 'Pro Plan', 'Nogopet', 'Excellent', 'Unik'];
    }

    stages.push({
      stage: 'Consulta de contexto Supabase',
      status: 'ok',
      detail: `Obtenido contexto: ${categorias_generales.length} generales, ${categorias_especificas.length} específicas, ${especies.length} especies, ${edades.length} edades, ${condiciones.length} condiciones, ${marcas.length} marcas`,
      duration_ms: Date.now() - tQuery,
      data: { categorias_generales, categorias_especificas, especies, edades, condiciones, marcas },
    });

    const useNative = forceNative || (await checkIfNativeCategorization());
    const mode = useNative ? 'native' : 'n8n';

    // Leer el modelo de la base de datos
    const { data: settingsData } = await supabase
      .from('admin_settings')
      .select('native_ai_model')
      .maybeSingle();
    const model = settingsData?.native_ai_model || 'gpt-4o-mini';

    const payload_sent = {
      productos: productos.map((p: any) => ({ id: p.id, nombre: p.nombre || p.name })),
      categorias_generales,
      categorias_especificas,
      especies,
      edades,
      condiciones,
      marcas,
      model,
    };

    if (useNative) {
      const nativeRes = await nativeCategorization(payload_sent);
      const combinedStages = [...stages, ...nativeRes.stages];

      return NextResponse.json({
        ok: nativeRes.ok,
        mode,
        stages: combinedStages,
        results: nativeRes.results,
        payload_sent,
        error: nativeRes.error,
        model_used: model,
      });

    } else {
      const tStartN8n = Date.now();
      stages.push({
        stage: 'Llamada webhook n8n',
        status: 'ok',
        detail: `Haciendo POST a webhook n8n: ${N8N_WEBHOOK_URL}`,
        duration_ms: 0,
      });

      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload_sent),
        });

        if (!response.ok) {
          const errDetail = await response.text();
          throw new Error(`n8n respondió HTTP ${response.status}: ${errDetail}`);
        }

        const rawResults = await response.json();
        
        let parsedResults = rawResults;
        if (rawResults && typeof rawResults === 'object' && !Array.isArray(rawResults)) {
          if (Array.isArray(rawResults.results)) {
            parsedResults = rawResults.results;
          } else if (Array.isArray(rawResults.output)) {
            parsedResults = rawResults.output;
          } else if (typeof rawResults.text === 'string') {
            try {
              const match = rawResults.text.match(/\[[\s\S]*\]/);
              parsedResults = match ? JSON.parse(match[0]) : [];
            } catch {
              parsedResults = [];
            }
          }
        }

        stages.push({
          stage: 'Llamada webhook n8n',
          status: 'ok',
          detail: `Conexión exitosa. Recibidos resultados para ${Array.isArray(parsedResults) ? parsedResults.length : 0} productos`,
          duration_ms: Date.now() - tStartN8n,
          data: parsedResults,
        });

        return NextResponse.json({
          ok: true,
          mode,
          stages,
          results: parsedResults,
          payload_sent,
        });

      } catch (err: any) {
        stages.push({
          stage: 'Llamada webhook n8n',
          status: 'error',
          detail: err.message,
          duration_ms: Date.now() - tStartN8n,
        });

        return NextResponse.json({
          ok: false,
          mode,
          stages,
          payload_sent,
          error: err.message,
        });
      }
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
}
