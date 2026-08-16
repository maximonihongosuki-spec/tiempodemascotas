import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ProductData = {
  name?: string;
  public_name?: string;
  category_brand?: string;
  category_general?: string[];
  category_specific?: string[];
  category_sub_specific?: string[];
  category_detail?: string[];
  category_species?: string[];
  category_age?: string[];
  category_condition?: string[];
  is_prescription?: boolean;
  requires_prescription?: boolean;
  is_bulk?: boolean;
  tags?: string[];
};

const SYSTEM_PROMPT = `Sos un redactor especializado en productos para mascotas de "Tiempo de Mascotas", una clínica veterinaria y petshop en Paraguay.

Tu tarea es generar una descripción de producto para la web. La descripción debe:
- Tener entre 60 y 140 palabras
- Estar en español neutro (sin regionalismos)
- Ser informativa y convincente para el cliente final
- Destacar el beneficio principal y características clave inferibles del nombre y categorías
- Mencionar especie objetivo, etapa de vida y condición especial si aplica
- NO incluir el precio ni el stock
- NO mencionar la marca explícitamente (ya se muestra aparte en la página)
- NO inventar ingredientes específicos, dosis, ni propiedades no inferibles del nombre/categorías
- Si el producto requiere receta veterinaria, incluir una frase corta al final indicándolo
- Terminar con una llamada a la acción suave
- Formato de salida (IMPORTANTE): escribí en texto plano usando esta sintaxis liviana — NO HTML, NO markdown de encabezados:
  - Separá los párrafos con una línea completamente vacía entre ellos.
  - Si tiene sentido listar características, usos o variantes, usá líneas que empiecen con "- " (un guion y un espacio), una idea por línea.
  - Para resaltar una palabra o frase clave podés envolverla así: **palabra clave**.
  - NO uses #, ##, numeración (1. 2. 3.), comillas, emojis, ni etiquetas HTML.
  - No es obligatorio usar viñetas — solo cuando ayuden a la lectura (por ejemplo, al mencionar variantes o usos). La mayoría de la descripción puede ser párrafos normales.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
    }

    const body = await request.json();
    const product: ProductData = body.product || {};

    if (!product.name) {
      return NextResponse.json({ error: 'Falta el campo name' }, { status: 400 });
    }

    const contextLines: string[] = [
      `Nombre: ${product.public_name || product.name}`,
      product.category_brand ? `Marca: ${product.category_brand}` : null,
      product.category_general?.length ? `Categoría general: ${product.category_general.join(', ')}` : null,
      product.category_specific?.length ? `Categoría específica: ${product.category_specific.join(', ')}` : null,
      product.category_sub_specific?.length ? `Sub-específica: ${product.category_sub_specific.join(', ')}` : null,
      product.category_detail?.length ? `Detalle: ${product.category_detail.join(', ')}` : null,
      product.category_species?.length ? `Especie: ${product.category_species.join(', ')}` : null,
      product.category_age?.length ? `Edad: ${product.category_age.join(', ')}` : null,
      product.category_condition?.length ? `Condición: ${product.category_condition.join(', ')}` : null,
      product.is_prescription ? `Tipo: prescripción veterinaria` : null,
      product.requires_prescription ? `Requiere receta veterinaria física al retirar` : null,
      product.is_bulk ? `Se vende a granel` : null,
      product.tags?.length ? `Etiquetas: ${product.tags.join(', ')}` : null,
    ].filter(Boolean) as string[];

    const userMessage = `Generá una descripción para el siguiente producto:\n\n${contextLines.join('\n')}\n\nRespondé solo con el texto de la descripción.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Error de OpenAI' }, { status: res.status });
    }

    const description = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({ description, model: 'gpt-4o-mini' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
