function toTitleCaseLocal(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

type ProductForSeo = {
  id: string;
  name: string;
  public_name?: string | null;
  price: number;
  special_price?: number | null;
  category_brand?: string | null;
  category_species?: string[] | null;
  category_general?: string[] | null;
  description?: string | null;
  description_ai_enhanced?: string | null;
  url_slug: string;
};

type SeoResult = {
  id: string;
  meta_title: string;
  meta_description: string;
  schema_description: string;
};

const SYSTEM_PROMPT = `Sos un experto en SEO para e-commerce paraguayo. Generás metadata para productos de una veterinaria y petshop en Asunción, Paraguay llamado "Tiempo de Mascotas".

Reglas ESTRICTAS por producto:
- meta_title: máximo 60 caracteres, debe incluir el nombre del producto y terminar con " | Tiempo de Mascotas"
- meta_description: máximo 155 caracteres. NO incluir precio (cambia con frecuencia y quedaría desactualizado). Sí incluir: especie destinataria, un beneficio o característica concreta del producto, mención de envío en Asunción/Gran Asunción, y un CTA sutil (ej: "Comprá online", "Consultá por WhatsApp"). Sin mayúsculas gritadas.
- schema_description: 2-3 oraciones neutras y técnicas para JSON-LD Schema.org, máximo 500 caracteres, describe el producto en sí sin CTAs comerciales.
- IMPORTANTE: nunca uses mayúsculas sostenidas en el nombre del producto, aunque en la base de datos esté así. Convertilo siempre a Capitalización Normal (ej: "Kualcos Kualcohepat 350mg 10kg 20 Comp", no "KUALCOS KUALCOHEPAT 350MG 10KG 20 COMP").

Tono: español paraguayo natural, "vos" no "tú". Menciones locales permitidas: Asunción, Gran Asunción, Paraguay. Evitar frases hechas ("los mejores amigos", "peluditos").

Si es un medicamento veterinario: describí composición y presentación, NUNCA prometas efectos ni cures.

Respondé SIEMPRE con JSON válido, formato exacto:
{
  "results": [
    { "id": "uuid-del-producto", "meta_title": "...", "meta_description": "...", "schema_description": "..." }
  ]
}`;

function buildUserPrompt(products: ProductForSeo[]): string {
  const lines = products.map(p => {
    const displayName = p.public_name || toTitleCaseLocal(p.name);
    const price = p.special_price && p.special_price > 0 ? p.special_price : p.price;
    return `- id: ${p.id}
  nombre: ${displayName}
  marca: ${p.category_brand || 'sin marca'}
  especie: ${p.category_species?.join(', ') || 'todas'}
  categoría: ${p.category_general?.join(', ') || 'sin categoría'}
  precio: Gs. ${new Intl.NumberFormat('es-PY').format(price)}
  descripción existente: ${(p.description_ai_enhanced || p.description || 'sin descripción').substring(0, 300)}`;
  }).join('\n\n');

  return `Generá metadata SEO para estos ${products.length} producto(s):\n\n${lines}`;
}

function truncar(texto: string, max: number): string {
  if (!texto || texto.length <= max) return texto || '';
  const cortado = texto.substring(0, max);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return (ultimoEspacio > 0 ? cortado.substring(0, ultimoEspacio) : cortado);
}

export async function nativeGenerateSeo(
  products: ProductForSeo[],
  model: string = 'gpt-4o-mini'
): Promise<{ results: SeoResult[]; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { results: [], error: 'OPENAI_API_KEY no configurada' };

  const userPrompt = buildUserPrompt(products);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { results: [], error: `OpenAI ${response.status}: ${errText.substring(0, 300)}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { results: [], error: 'OpenAI no devolvió contenido' };

    let parsed: { results: SeoResult[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { results: [], error: 'JSON inválido devuelto por OpenAI: ' + content.substring(0, 300) };
    }

    if (!Array.isArray(parsed.results)) {
      return { results: [], error: 'Formato inesperado: falta array "results"' };
    }

    // Truncar por las dudas de que el modelo no respete los límites
    const cleaned = parsed.results.map(r => ({
      id: r.id,
      meta_title: truncar(r.meta_title, 60),
      meta_description: truncar(r.meta_description, 155),
      schema_description: truncar(r.schema_description, 500),
    }));

    return { results: cleaned };
  } catch (err: any) {
    return { results: [], error: err.message || 'Error de red llamando a OpenAI' };
  }
}
