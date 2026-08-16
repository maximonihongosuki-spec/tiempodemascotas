import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ═══════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════

export type CategorizationInput = {
  productos: { id: string; nombre: string; codigo?: string }[];
  categorias_generales?: string[];
  categorias_especificas?: string[];
  especies?: string[];
  edades?: string[];
  condiciones?: string[];
  marcas?: string[];
  model?: string;
};

export type CategorizationStage = {
  stage: string;
  status: 'ok' | 'error';
  detail: string;
  duration_ms: number;
  data?: any;
};

export type CategorizationResult = {
  ok: boolean;
  results?: any[];
  stages: CategorizationStage[];
  error?: string;
};

// ═══════════════════════════════════════════════════════════
// DICCIONARIOS DE KEYWORDS (replicados exactamente de n8n prompteador1)
// ═══════════════════════════════════════════════════════════

const KEYWORDS_ESPECIE: Record<string, string[]> = {
  'Perros': ['PERROS', 'PERRO', 'CANINO', 'CANINOS', 'CANIS', 'DOG', 'DOGS', 'CAES'],
  'Gatos': ['GATOS', 'GATO', 'GATITO', 'GATITA', 'FELINO', 'FELINOS', 'CAT', 'CATS', 'KITTEN', 'BABYCAT', 'PERSIAN', 'SIAMESE'],
  'Aves': ['AVES', 'AVE', 'PAJARO', 'PAJAROS', 'PERIQUITO', 'CANARIO', 'CANARIOS', 'TUCANES', 'TUCAN', 'PSITACIDOS', 'CALOPSITAS', 'CALOPSITA', 'PAPAGAYO', 'PAPAGAYOS', 'PICHONES', 'BIRD'],
  'Peces': ['PECES', 'PEZ', 'GOLDFISH', 'KOI', 'CICHLIDS', 'FISH'],
  'Roedores': ['ROEDORES', 'ROEDOR', 'HAMSTER', 'CONEJOS', 'CONEJO', 'PORQUINHO DA INDIA', 'COBAYO', 'COBAYA', 'RAT', 'RATON'],
  'Tortugas': ['TORTUGAS', 'TORTUGA', 'MORROCOY', 'TORTOISE', 'REPTOMIX'],
};

const KEYWORDS_EDAD: Record<string, string[]> = {
  'Cachorro': ['BABYCAT', 'CACHORROS', 'CACHORRO', 'PUPPY', 'KITTEN', 'FILHOTE', 'GATITO', 'GATITA', 'JUNIOR', 'PICHONES'],
  'Adulto': ['ADULTOS', 'ADULTO', 'ADULT'],
  'Castrado': ['LIGHT STERILIZED', 'SENSITIVE STERILIZED', 'STERILIZED', 'ESTERILIZADO', 'CASTRADO', 'CASTRADA', 'NEUTERED', 'CAST'],
  'Senior': ['LONGEVIDAD 7+', 'ACTIVE MIND', 'GERIATRICO', 'GERIOOX', '7+ AÑOS', 'AGEING', 'MATURE', 'SENIOR', '12+', '7+', '8+', '6+', '5+'],
  'Starter': ['MAXI STARTER', 'MEDIUM STARTER', 'MINI STARTER', 'STARTER'],
};

const KEYWORDS_CONDICION: Record<string, string[]> = {
  'Hipoalergénico': ['SENSITIVE STOMACH SKIN', 'SKIN SENSITIVITY', 'DERM COMPLETE', 'ULTRAHYPO', 'HYPOALLERGENIC', 'HYPOALLERGENICO', 'HIPOALERGENICO', 'HIPOALERGENICA', 'HIPOALLERGENICO', 'ALLERGENIC', 'HYDROLYZED', 'ATOPIC', 'SENSIBLE', 'HYPO'],
  'Gastrointestinal': ['LOW FAT DIGESTIVE CARE', 'DIGESTIVE CARE', 'GASTROINTESTINAL', 'GI BIOME', 'DIGESTIVE', 'GASTRO', 'STOMACH', 'I/D'],
  'Hepático': ['HEPATIC', 'HEPÁTICO', 'HEPATO', 'LIVER', 'L/D'],
  'Renal': ['KIDNEY CARE', 'KIDNEY', 'RENAL', 'NEPHRO', 'K/D'],
  'Urinario': ['URINARY STRUVITE', 'URINARY OSSALATI', 'URINARY S/O', 'URINARY CARE', 'C/D STRESS', 'CTRL DE PH', 'RENAL OXALATE', 'STRUVITE', 'OSSALATI', 'OXALATE', 'URINARY', 'S/O', 'C/D', 'U/D'],
  'Cardíaco': ['CARDIAC', 'CARDIAL', 'CARDIO', 'HEART', 'H/D'],
  'Obesidad': ['WEIGHT REDUCTION', 'WEIGHT LOSS', 'REDUCED CALORIE', 'CONTROL DE PESO', 'SATIETY SUPPORT', 'CTRL DE PESO', 'METABOLIC', 'OBESITY', 'SATIETY', 'WEIGHT', 'LIGHT', 'W/D', 'R/D'],
  'Diabético': ['DIABETIC', 'DIABETICO', 'DIABETES'],
  'Articular/Movilidad': ['MOBILITY JOINTS', 'MOBILITY AID', 'JOINT CARE', 'OSTEOARTRITE', 'MOBILITY', 'JOINT', 'ARTRO', 'ARTRIN', 'J/D'],
  'Dermatológico': ['SKIN/FOOD SENSITIVITIES', 'SKIN AND COAT', 'SKIN SOLDIER', 'HAIRBALL CONTROL', 'PELO Y PIEL', 'DERMACOMFORT', 'DERMACARE', 'SENSITIVITIES', 'DERMA', 'DERM', 'SKIN', 'Z/D'],
  'Oncológico': ['ONC CARE', 'ONCOLOGICO', 'ONCOLOGIC', 'CANCER', 'TUMOR'],
  'Leishmaniasis': ['LEISHMANIASIS', 'LEISHMANIA'],
};

const CONDICIONES_PRESCRIPCION = new Set([
  'Hipoalergénico', 'Gastrointestinal', 'Hepático', 'Renal', 'Urinario',
  'Cardíaco', 'Obesidad', 'Diabético', 'Articular/Movilidad', 'Dermatológico',
  'Oncológico', 'Leishmaniasis',
]);

const MARCAS_PRESCRIPCION = new Set([
  'Bravecto', 'Nexgard', 'Simparica', 'Scalibor', 'Seresto',
  'Power Gold', 'Power Ultra', 'Fleanet', 'Flurapet',
]);

const ALIAS_MARCAS: Record<string, string> = {
  'ROYAL': 'Royal Canin',
  'PROPLAN': 'Proplan',
};

const KEYWORDS_BULK = ['A GRANEL', 'POR KILO', 'KG SUELTO', 'GRANEL', 'SUELTO'];

// ═══════════════════════════════════════════════════════════
// FUNCIONES DE MATCHING (port exacto de n8n prompteador1)
// ═══════════════════════════════════════════════════════════

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordRegex(keyword: string): RegExp {
  const escaped = escapeRegex(keyword);
  const startsWithLetter = /^[A-Za-z]/.test(keyword);
  const endsWithLetter = /[A-Za-z]/.test(keyword[keyword.length - 1]);
  const prefix = startsWithLetter ? '\\b' : '(?<![A-Z0-9])';
  const suffix = endsWithLetter ? '\\b' : '(?![A-Z0-9])';
  return new RegExp(prefix + escaped + suffix, 'i');
}

function matchMultiple(nombre: string, dict: Record<string, string[]>): string[] {
  const results = new Set<string>();
  for (const [canonical, keywords] of Object.entries(dict)) {
    for (const kw of keywords) {
      if (buildKeywordRegex(kw).test(nombre)) {
        results.add(canonical);
        break;
      }
    }
  }
  return Array.from(results);
}

function matchBrand(nombre: string, listaMarcas: string[]): string {
  const ordenadas = [...listaMarcas].sort((a, b) => b.length - a.length);
  for (const marca of ordenadas) {
    if (buildKeywordRegex(marca).test(nombre)) return marca;
  }
  for (const [alias, canonical] of Object.entries(ALIAS_MARCAS)) {
    if (buildKeywordRegex(alias).test(nombre)) return canonical;
  }
  return '';
}

function detectBulk(nombre: string): boolean {
  for (const kw of KEYWORDS_BULK) {
    if (buildKeywordRegex(kw).test(nombre)) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// NORMALIZACIÓN
// ═══════════════════════════════════════════════════════════

function normalizeCategoryGeneral(value: string, validValues: string[]): string {
  if (!value) return value;
  
  // 1. Match exacto
  if (validValues.includes(value)) return value;
  
  // 2. Match case-insensitive
  const lower = value.toLowerCase();
  const exactCI = validValues.find(v => v.toLowerCase() === lower);
  if (exactCI) return exactCI;
  
  // 3. La respuesta está contenida en algún valor de la lista
  //    ej: "Farmacia" dentro de "Salud y Farmacia Veterinaria"
  const contains = validValues.find(v => v.toLowerCase().includes(lower));
  if (contains) return contains;
  
  // 4. Algún valor de la lista está contenido en la respuesta
  //    ej: "Alimento" dentro de "Alimentos"
  const contained = validValues.find(v => lower.includes(v.toLowerCase()));
  if (contained) return contained;
  
  // 5. No se encontró match → devolver el valor original
  //    (en el modal el usuario puede corregirlo manualmente)
  return value;
}

// ═══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════

export async function nativeCategorization(input: CategorizationInput): Promise<CategorizationResult> {
  const stages: CategorizationStage[] = [];
  const model = input.model || 'gpt-4o-mini';

  const categoriasGenerales = input.categorias_generales || [];
  const categoriasEspecificas = input.categorias_especificas || [];
  const marcas = input.marcas || [];

  // ─── STAGE 1: Pre-extracción por regex (replica prompteador1) ───
  let t0 = Date.now();
  const productosConPreExtraccion = input.productos.map(p => {
    const nombre = (p.nombre || '').toUpperCase();
    const brand = matchBrand(nombre, marcas);
    const condition = matchMultiple(nombre, KEYWORDS_CONDICION);
    const is_prescription =
      condition.some(c => CONDICIONES_PRESCRIPCION.has(c)) ||
      MARCAS_PRESCRIPCION.has(brand);

    return {
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo || '',
      pre: {
        brand,
        species: matchMultiple(nombre, KEYWORDS_ESPECIE),
        age: matchMultiple(nombre, KEYWORDS_EDAD),
        condition,
        is_bulk: detectBulk(nombre),
        is_prescription,
      },
    };
  });

  const preResumen = productosConPreExtraccion.map(p =>
    `${p.nombre}: especie=${p.pre.species.join(',') || 'ninguna'}, marca=${p.pre.brand || 'ninguna'}, condicion=${p.pre.condition.join(',') || 'ninguna'}, prescripcion=${p.pre.is_prescription}`
  ).join(' | ');

  stages.push({
    stage: 'Pre-extracción regex (prompteador1)',
    status: 'ok',
    detail: `${input.productos.length} producto(s) procesados: ${preResumen}`,
    duration_ms: Date.now() - t0,
    data: productosConPreExtraccion.map(p => ({ id: p.id, nombre: p.nombre, pre: p.pre })),
  });

  // ─── STAGE 2: Construcción del prompt (replica prompteador1) ───
  t0 = Date.now();
  const listaProductos = productosConPreExtraccion.map(p =>
    `- ID: ${p.id}\n  Nombre: ${p.nombre}\n  Pre-extraído (NO modificar, solo usar como contexto):\n    - Marca detectada: ${p.pre.brand || '(ninguna)'}\n    - Especies: ${p.pre.species.length ? p.pre.species.join(', ') : '(ninguna detectada)'}\n    - Edades: ${p.pre.age.length ? p.pre.age.join(', ') : '(ninguna detectada)'}\n    - Condiciones: ${p.pre.condition.length ? p.pre.condition.join(', ') : '(ninguna detectada)'}\n    - Es prescripción: ${p.pre.is_prescription}\n    - Es a granel: ${p.pre.is_bulk}`
  ).join('\n\n');

  const listaGenerales = categoriasGenerales.join(', ');
  const listaEspecificas = categoriasEspecificas.join(', ');

  const systemPrompt = `Sos un asistente experto en categorización de productos para "Tiempo de Mascotas", una agroveterinaria en Paraguay.

Tu tarea es categorizar productos con SOLO 3 campos a decidir por vos:
1. category_general (CG)
2. category_specific (CE)
3. tags (etiquetas SEO descriptivas)

Los campos de marca, especies, edades, condiciones, prescripción y granel YA FUERON pre-extraídos del nombre por un proceso anterior. NO tenés que decidirlos. Solo los recibís como contexto para tomar mejores decisiones de CG y CE.

═══════════════════════════════════════════
1. "category_general" (OBLIGATORIO, string)
═══════════════════════════════════════════
Debe ser EXACTAMENTE uno de estos valores. NUNCA inventes:
${listaGenerales || 'Alimento, Juguetes, Ropa, Farmacia, Accesorios, Cuidado, Higiene y Bienestar, Varios, Jardinería'}

REGLA CRÍTICA SOBRE PRESCRIPCIÓN:
"Es prescripción: true" NO determina la CG. Un alimento sigue siendo Alimento aunque sea prescriptivo. Un medicamento sigue siendo Farmacia. La prescripción es un atributo INDEPENDIENTE de la CG.

Reglas de asignación de CG:
- Comida, balanceado, snacks, premios, latas, sachets, semillas, pellets, croquetas, paté, pouch, alimento de cualquier especie → "Alimento" (SIEMPRE, aunque sea prescriptivo)
- Pelotas, peluches, juguetes interactivos, mordedores, kongs, rascadores, columpios → "Juguetes"
- Abrigos, pilchas, disfraces, calzado, ropa post-quirúrgica → "Ropa"
- Medicamentos orales (comprimidos, jarabes, suspensiones, pastas medicinales, suplementos en pasta), inyectables, antibióticos, antiinflamatorios, vacunas, suplementos vitamínicos, colirios, cremas medicinales, antiparasitarios sistémicos (Bravecto/Nexgard/Simparica), collares antiparasitarios (Scalibor/Seresto), pipetas, difusores y sprays de feromonas (Adaptil/Feliway), mallas quirúrgicas → "Farmacia"
- Correas, pecheras, arneses, bozales, collares de paseo (NO antiparasitarios), collares isabelinos, comederos, bebederos, transportadores, camas, jaulas, areneros, acuarios → "Accesorios"
- Shampoo, acondicionador, crema de enjuague, perfume, colonia, toallitas, pañales, peines, cepillos, cortauñas, arenas higiénicas, sustratos sanitarios → "Cuidado, Higiene y Bienestar"
- Insecticidas ambientales, fumigantes, raticidas, repelentes ambientales, productos de limpieza del hogar → "Varios"
- Insecticidas/herbicidas/fertilizantes para jardín → "Jardinería"

EJEMPLOS DE PRESCRIPCIÓN QUE NO CAMBIAN LA CG:
- "HILLS GATO ONC CARE" → Alimento + Balanceado (es croqueta, no medicamento)
- "ROYAL PERRO RENAL" → Alimento + Balanceado (es croqueta)
- "LENDA PERRO LATA HYPO CONEJO" → Alimento + Alimento húmedo (es lata)
- "BRAVECTO 3M PERRO" → Farmacia + Antipulgas (es comprimido masticable)

EJEMPLOS DE CG CORRECTA PARA CASOS CONFUSOS:
- "BEACHLAB BIT 4.5/10 KG" → Accesorios (BIT es un arnés/pechera)
- "BOZAL CUERINA P" → Accesorios (bozal es accesorio de sujeción)
- "COLLAR ISABELINO" → Accesorios (dispositivo físico, no medicamento)
- "DERMOSEDAN CREMA DE ENJUAGUE" → Cuidado, Higiene y Bienestar (crema de enjuague/acondicionador)
- "HOLLIDAY POTEN PET PASTA" → Farmacia (suplemento en pasta)
- "CIPERMAX PLUS INSECTICIDA" → Varios (insecticida ambiental)

═══════════════════════════════════════════
2. "category_specific" (OBLIGATORIO, string)
═══════════════════════════════════════════
Priorizá reutilizar una de estas existentes:
${listaEspecificas || '(ninguna aún — creá las que correspondan)'}

Si NINGUNA aplica, podés crear una nueva.

Mapeo obligatorio — seguí esto estrictamente:
- LATA, sachet, paté, pouch, alimento húmedo, mousse → "Alimento húmedo"
- Balanceado seco, croquetas, pellets de perro/gato (incluyendo dietas prescriptivas) → "Balanceado"
- Alimento de aves, peces, roedores, tortugas → "Alimentos y premios"
- Snack, premio, galleta, hueso, sazonador, oreja, masticable → "Snacks, premios y galletas"
- Pipeta, antiparasitario oral, desparasitante, antipulgas, collar antiparasitario, Bravecto, Nexgard, Simparica, Scalibor, Seresto → "Antipulgas y desparasitarios"
- Antibiótico, antiinflamatorio, jarabe, comprimido, vacuna, vitamina, suplemento vitamínico, suplemento en pasta (Poten Pet, Glicopan, Viyo), colirio, crema medicinal, inyectable → "Fármacos"
- Shampoo, acondicionador, crema de enjuague → "Shampoo y acondicionadores"
- Perfume, colonia → "Perfumes"
- Toallita húmeda, pañal, tapete sanitario → "Toallitas, tapete y pañales"
- Peine, cepillo, cortauñas → "Peines, cepillos y elementos de aseo"
- Feromona, Adaptil, Feliway → "Feromonas y análogos"
- Arena sanitaria, piedrita sanitaria → "Arenas y piedritas higiénicas"
- Correa, pechera, collar de paseo, arnés, bozal, BIT (arnés) → "Arnés, collar, correa y pecheras"
- Comedero, bebedero, fuente → "Comederos y bebederos"
- Mochila, bolso, transportador → "Mochilas, bolsos y transportadores"
- Cama, colchoneta, almohadón → "Camas y colchonetas"
- Arenero, caja sanitaria → "Areneros y accesorios"
- Jaula → "Jaulas"
- Acuario, pecera, filtro → "Acuarios y peceras"
- Insecticida ambiental, fumigante, raticida, repelente ambiental (dentro de CG "Varios") → "Fumigación insecticidas"

Usá "Otros" SOLO como último recurso después de revisar TODA la lista.

═══════════════════════════════════════════
3. "tags" (OBLIGATORIO, array de strings)
═══════════════════════════════════════════
Generá entre 3 y 8 etiquetas SEO en minúsculas, cortas (1-3 palabras), útiles para búsqueda.
- Incluí: tipo de producto, sabor/ingrediente principal, beneficio, formato.
- NO repitas marca, especie, edad ni condición (ya están en otros campos).
- Respetá la especie pre-extraída: si species=["Gatos"] NO uses "perro" en los tags.

Ejemplos:
- "LENDA PERRO LATA HYPO CONEJO ZANAHORIA 400G" → ["lata", "conejo", "zanahoria", "sin alérgenos", "dieta veterinaria"]
- "HILLS GATO K/D KIDNEY CARE 1.81KG" → ["dieta renal", "alimento seco", "soporte renal", "prescripción"]
- "ADAPTIL CALM SPRAY 60ML" → ["calmante", "spray", "ansiedad", "estrés", "comportamiento"]
- "BEACHLAB BIT 4.5/10 KG ROJO" → ["arnés", "pechera", "ajustable", "rojo"]
- "CIPERMAX PLUS 250CC INSECTICIDA" → ["insecticida", "ambiental", "fumigación", "control de plagas"]

═══════════════════════════════════════════
FORMATO DE RESPUESTA OBLIGATORIO
═══════════════════════════════════════════
Respondé ÚNICAMENTE un objeto JSON con esta estructura EXACTA:

{
  "results": [
    {
      "id": "uuid-del-producto",
      "category_general": "...",
      "category_specific": "...",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

La clave "results" es OBLIGATORIA y debe contener un array con un elemento por cada producto recibido.

═══════════════════════════════════════════
REGLAS CRÍTICAS FINALES
═══════════════════════════════════════════
- category_general: SIEMPRE uno de la lista cerrada. NUNCA inventes.
- category_specific: SIEMPRE string no vacío. Reutilizá antes de crear.
- tags: SIEMPRE array de 3-8 strings en minúsculas. Respetá la especie pre-extraída.
- Respondé SOLO el JSON estructurado, sin explicaciones.`;

  stages.push({
    stage: 'Construcción del prompt',
    status: 'ok',
    detail: `Modelo: ${model} | Productos: ${input.productos.length} | System: ${systemPrompt.length} chars`,
    duration_ms: Date.now() - t0,
    data: { systemPrompt, productList: listaProductos, model },
  });

  // ─── STAGE 3: Llamada a OpenAI (replica AI Agent — solo CG, CE, tags) ───
  t0 = Date.now();
  let rawText: string;
  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Categorizá estos productos y devolvé un objeto con la clave "results":\n\n${listaProductos}` },
      ],
    });
    rawText = response.choices[0]?.message?.content || '';
    const usage = response.usage;
    stages.push({
      stage: `Llamada a OpenAI (${model})`,
      status: 'ok',
      detail: `Input tokens: ${usage?.prompt_tokens ?? '—'} | Output tokens: ${usage?.completion_tokens ?? '—'}`,
      duration_ms: Date.now() - t0,
      data: { rawText },
    });
  } catch (err: any) {
    stages.push({ stage: `Llamada a OpenAI (${model})`, status: 'error', detail: err.message, duration_ms: Date.now() - t0 });
    return { ok: false, stages, error: err.message };
  }

  // ─── STAGE 4: Parseo JSON de la respuesta de la IA ───
  t0 = Date.now();
  let iaOutput: any[];
  try {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('La respuesta de OpenAI está vacía');
    }
    
    // Con response_format: json_object, la respuesta DEBE ser un objeto JSON válido
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (jsonErr: any) {
      throw new Error(`OpenAI devolvió contenido no-JSON pese a json_object mode: ${jsonErr.message} | Raw: ${rawText.slice(0, 400)}`);
    }
    
    // Buscar el array dentro del objeto
    if (Array.isArray(parsed)) {
      iaOutput = parsed;
    } else if (Array.isArray(parsed.results)) {
      iaOutput = parsed.results;
    } else if (Array.isArray(parsed.output)) {
      iaOutput = parsed.output;
    } else if (Array.isArray(parsed.productos)) {
      iaOutput = parsed.productos;
    } else {
      // Buscar la primera clave del objeto que sea un array
      const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (firstArrayKey) {
        iaOutput = parsed[firstArrayKey];
      } else {
        throw new Error(`No se encontró un array en la respuesta. Claves recibidas: ${Object.keys(parsed).join(', ')}`);
      }
    }
    
    if (!Array.isArray(iaOutput)) {
      throw new Error('El campo extraído no es un array');
    }
    if (iaOutput.length === 0) {
      throw new Error('El array de resultados está vacío');
    }
    
    stages.push({
      stage: 'Parseo y validación JSON',
      status: 'ok',
      detail: `${iaOutput.length} resultado(s) parseados correctamente (JSON mode activo)`,
      duration_ms: Date.now() - t0,
      data: iaOutput,
    });
  } catch (err: any) {
    stages.push({
      stage: 'Parseo JSON',
      status: 'error',
      detail: err.message,
      duration_ms: Date.now() - t0,
      data: { rawText: rawText.slice(0, 800) },
    });
    return { ok: false, stages, error: err.message };
  }

  // ─── STAGE 5: Merge (replica Code JS 2 "merge" de n8n) ───
  t0 = Date.now();
  const validGenerales = input.categorias_generales || [];
  const merged = iaOutput.map(item => {
    const pre = productosConPreExtraccion.find(p => p.id === item.id);
    if (!pre) return item;
    const normalizedCG = normalizeCategoryGeneral(item.category_general || '', validGenerales);
    return {
      id: item.id,
      category_general: normalizedCG ? [normalizedCG] : [],
      category_specific: item.category_specific ? [item.category_specific] : [],
      category_species: pre.pre.species.length > 0 ? pre.pre.species : ['Todos'],
      category_brand: pre.pre.brand || '',
      category_age: pre.pre.age,
      category_condition: pre.pre.condition,
      is_bulk: pre.pre.is_bulk,
      is_prescription: pre.pre.is_prescription,
      tags: Array.isArray(item.tags) ? item.tags : [],
    };
  });

  // Contar cuántos valores fueron normalizados
  const normalizados = merged.filter((r: any, i: number) => {
    const original = iaOutput[i]?.category_general || '';
    return r.category_general !== original;
  }).length;

  stages.push({
    stage: 'Merge IA + pre-extracción regex',
    status: 'ok',
    detail: `${merged.length} producto(s) mergeados | ${normalizados} CG normalizada(s)`,
    duration_ms: Date.now() - t0,
    data: merged,
  });

  return { ok: true, results: merged, stages };
}
