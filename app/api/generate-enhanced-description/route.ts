import { NextRequest, NextResponse } from 'next/server';
import { sanitizeDescriptionHtml } from '@/src/lib/sanitizeHtml';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Sos un maquetador de contenido para fichas de producto de 
"Tiempo de Mascotas", una clínica veterinaria y petshop en Paraguay.

Vas a recibir la descripción en texto plano de un producto. Tu tarea es reformatearla 
como HTML enriquecido y semántico, SIN cambiar ni inventar información nueva.

Reglas de formato (OBLIGATORIAS):
- Usá SOLO estas etiquetas: <p>, <strong>, <em>, <ul>, <li>, <table>, <thead>, <tbody>, 
  <tr>, <th>, <td>, <h3>, <h4>.
- NUNCA uses atributos: nada de style="", class="", id="". Ningún atributo en ninguna etiqueta.
- NUNCA incluyas <img>, <script>, <iframe>, <a>, <div>, <span>, ni comentarios HTML.
- Si el texto tiene datos que se prestan a tabla (especificaciones, ingredientes, 
  tabla nutricional, tallas, variantes con sus características), armá una <table> con 
  <thead> y encabezados claros.
- El resto del contenido va en párrafos <p> normales, con <strong> para resaltar 
  palabras clave puntuales.
- NO agregues información que no esté en el texto original. Es un trabajo de formato, 
  no de redacción nueva.
- NUNCA resumas, acortes ni omitas secciones del texto original. Tenés que reformatear 
  el 100% del contenido recibido a HTML, sin importar qué tan largo sea. Si el texto 
  tiene 10 secciones, el HTML final debe tener las 10 secciones. Perder contenido es 
  un error grave.
- Respondé ÚNICAMENTE el HTML, sin explicaciones, sin \`\`\`html, sin texto antes o después.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 500 });
    }

    const body = await request.json();
    const description: string = body.description || '';

    if (!description.trim()) {
      return NextResponse.json({ error: 'Falta el campo description' }, { status: 400 });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Reformateá esta descripción:\n\n${description}` },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Error de OpenAI' }, { status: res.status });
    }

    const rawHtml = data.choices?.[0]?.message?.content?.trim() || '';
    const cleanHtml = sanitizeDescriptionHtml(rawHtml);

    return NextResponse.json({ description_ai_enhanced: cleanHtml });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
