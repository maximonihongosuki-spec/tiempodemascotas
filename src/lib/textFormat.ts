/**
 * Convierte un texto en MAYÚSCULAS a Title Case inteligente para mostrar al cliente.
 * Mantiene unidades y siglas en mayúsculas, conectores en minúscula.
 */

const UNITS_UPPER = new Set([
  'KG', 'G', 'ML', 'L', 'CC', 'MG', 'CM', 'MT', 'MM', 'OZ', 'LB',
  'RMG', 'RP', 'UV', 'UHT', 'XL', 'XXL', 'XS', 'SM', 'MD', 'LG',
  'DM', 'M2', 'M3', 'GR', 'KGS', 'PCS', 'UN', 'UD', 'BSAS',
  'PVP', 'API', 'USB', 'PHD', 'SPF',
]);

const CONNECTORS_LOWER = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'con', 'sin', 'para', 'por',
  'y', 'o', 'u', 'e', 'a', 'al', 'en', 'que',
]);

function titleCaseWord(word: string, isFirst: boolean): string {
  if (!word) return word;
  
  // Si tiene números mezclados con letras (ej "21KG", "8KG", "3KG"), 
  // dejar números intactos y mayúsculas en las letras finales si son unidades
  const numLetterMatch = word.match(/^(\d+(?:\.\d+)?(?:\+\d+(?:\.\d+)?)?)([A-Za-zÁ-Úá-ú]+)$/);
  if (numLetterMatch) {
    const num = numLetterMatch[1];
    const suffix = numLetterMatch[2].toUpperCase();
    if (UNITS_UPPER.has(suffix)) {
      return num + suffix.toLowerCase();  // "21kg", "3kg"
    }
    return num + suffix.charAt(0).toUpperCase() + suffix.slice(1).toLowerCase();
  }
  
  // Si es 100% números, dejar igual
  if (/^\d+$/.test(word)) return word;
  
  const upper = word.toUpperCase();
  const lower = word.toLowerCase();
  
  // Siglas conocidas → mayúscula
  if (UNITS_UPPER.has(upper)) return upper;
  
  // Conectores en minúscula (excepto si es la primera palabra)
  if (!isFirst && CONNECTORS_LOWER.has(lower)) return lower;
  
  // Si tiene 2 letras o menos y es alfa: tratarla como sigla en mayúscula
  if (word.length <= 2 && /^[A-Za-zÁ-Úá-ú]+$/.test(word)) {
    return upper;
  }
  
  // Title case normal
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function toTitleCase(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  
  // Si el texto YA tiene mezcla de mayúsculas y minúsculas (no es 100% upper), 
  // respetarlo y devolverlo tal cual
  const upper = text.toUpperCase();
  const hasLowerCase = text !== upper && text !== text.toLowerCase();
  if (hasLowerCase) return text;
  
  // Separar respetando espacios y signos
  return text.split(/(\s+|[-,/])/).map((token, idx) => {
    if (/^\s+$/.test(token) || /^[-,/]+$/.test(token)) return token;
    return titleCaseWord(token, idx === 0 || /^[-,/]+$/.test(token));
  }).join('');
}

/**
 * Helper para nombres de productos que pueden tener public_name (ya formateado por el dueño)
 * o name (del sistema, posiblemente en mayúsculas).
 */
export function formatProductName(product: { name?: string | null; public_name?: string | null }): string {
  // Si tiene public_name no vacío, usarlo tal cual (ya está formateado a gusto del dueño)
  if (product.public_name && product.public_name.trim()) {
    return product.public_name.trim();
  }
  // Si solo tiene name, aplicar title case
  return toTitleCase(product.name || '');
}
