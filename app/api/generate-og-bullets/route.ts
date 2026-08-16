import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Sos un redactor de marketing para "Tiempo de Mascotas", petshop y veterinaria en Paraguay. Generás 4 bullets cortos para superponer en una imagen (espacio muy limitado, máximo 32 caracteres cada uno).

Vas a recibir datos estructurados de un producto (nombre, marca, categorías, especie, edad, condición, tags, descripción). Tu tarea es producir EXACTAMENTE 4 bullets siguiendo esta cascada de prioridad ESTRICTA y DETERMINÍSTICA para cada posición. NUNCA dejes un bullet vacío — siempre hay un fallback garantizado.

BULLET 1 — Dato técnico o beneficio concreto:
1º intento: si la descripción tiene un dato específico y verificable (porcentaje, ingrediente activo, característica técnica real), usalo, resumido a máximo 32 caracteres.
2º intento (si la descripción no aporta nada específico o está vacía/genérica): usá la condición del producto si no es "Sin condición" (ej: condición "Renal" → "Cuidado renal").
3º intento (fallback final): usá la categoría específica del producto, acortada (ej: "Antipulgas y desparasitarios" → "Antipulgas"). Si tampoco hay categoría específica útil, elegí UNA de estas opciones de negocio, la que mejor encaje: "Calidad garantizada", "Producto de confianza", "Marca reconocida".

BULLET 2 — Para quién es:
1º intento: especie + edad, si la edad no es "Todas las edades" (ej: "Para gatos cachorros").
2º intento: solo la especie (ej: "Para perros").
3º intento (fallback final): la categoría general del producto (ej: "Cuidado e higiene"). Si tampoco hay categoría general útil, elegí UNA de estas opciones: "Para toda mascota", "Cuidado integral", "Bienestar animal".

BULLET 3 — Condición o característica adicional (DISTINTA de lo usado en el bullet 1):
1º intento: la condición del producto, si no es "Sin condición" y no se usó ya en el bullet 1.
2º intento: el primer tag relevante y legible de la lista de tags.
3º intento (fallback final): elegí UNA de estas opciones de e-commerce, la que mejor encaje: "Comprá online", "Disponible en nuestro e-commerce", "Pedilo fácil y rápido", "Tu petshop de confianza".

BULLET 4 — Presentación o formato:
1º intento: peso, volumen o cantidad extraído literalmente del nombre del producto (ej: "10kg", "20 comprimidos", "500ml", "1.5kg").
2º intento: la marca del producto.
3º intento (fallback final): elegí UNA de estas opciones: "Envío en Asunción", "Delivery a domicilio", "Envíos a todo el país".

Reglas de formato:
- Cada bullet: máximo 32 caracteres, incluyendo espacios.
- Sin puntos finales, sin emojis, español neutro/paraguayo natural.
- Nunca inventes datos técnicos que no estén explícitamente en la descripción — si dudás, saltá al siguiente nivel de la cascada.
- Los 4 bullets deben ser información DISTINTA entre si, nunca repitas el mismo dato en dos bullets.
- SIEMPRE devolvé exactamente 4 bullets no vacíos, sin excepción — seguí la cascada hasta el fallback final si hace falta.
- En los fallbacks finales (3º intento de cada bullet), elegí con variedad — no repitas siempre la misma opción de la lista, alterná según cuál suene mejor para ese producto específico.

Devolvé SIEMPRE JSON válido: { "bullets": ["...", "...", "...", "..."] }`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category_brand,
      category_general,
      category_specific,
      category_species,
      category_age,
      category_condition,
      tags,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Falta el campo name' }, { status: 400 });
    }

    const contextLines = [
      `Nombre completo del producto (para extraer presentación/formato): ${name}`,
      category_brand ? `Marca: ${category_brand}` : 'Marca: no especificada',
      category_general?.length ? `Categoría general: ${category_general.join(', ')}` : null,
      category_specific?.length ? `Categoría específica: ${category_specific.join(', ')}` : null,
      category_species?.length ? `Especie: ${category_species.join(', ')}` : 'Especie: no especificada',
      category_age?.length ? `Edad: ${category_age.join(', ')}` : 'Edad: Todas las edades',
      category_condition?.length ? `Condición: ${category_condition.join(', ')}` : 'Condición: Sin condición',
      tags?.length ? `Tags: ${tags.join(', ')}` : null,
      `Descripción: ${(description || 'sin descripción disponible').substring(0, 800)}`,
    ].filter(Boolean).join('\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generá los 4 bullets siguiendo la cascada de prioridad para:\n\n${contextLines}` },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Error de OpenAI' }, { status: res.status });
    }

    const content = data.choices?.[0]?.message?.content;
    let parsed: { bullets: string[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'JSON inválido devuelto por OpenAI' }, { status: 500 });
    }

    if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) {
      return NextResponse.json({ error: 'No se generaron bullets' }, { status: 500 });
    }

    // Blindaje: si la IA devuelve menos de 4 (no debería, pero por las dudas),
    // completar con fallbacks universales para no romper el layout de la imagen
    const universalFallbacks = ['Calidad garantizada', 'Envío en Asunción', 'Compra 100% online', 'Delivery a domicilio'];
    const bullets = [...parsed.bullets.slice(0, 4)];
    while (bullets.length < 4) {
      bullets.push(universalFallbacks[bullets.length]);
    }

    const trimmed = bullets.map(b => b.length > 32 ? b.substring(0, 32) : b);

    return NextResponse.json({ bullets: trimmed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
