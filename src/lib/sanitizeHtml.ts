import sanitize from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'br',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'h3', 'h4',
];

/**
 * Sanitiza el HTML generado por IA para la "Descripción mejorada con IA".
 * Elimina cualquier atributo (style, class, onError, etc.), scripts, iframes
 * e imágenes — solo se permite texto estructurado (tablas, listas, negritas).
 */
export function sanitizeDescriptionHtml(html: string): string {
  if (!html) return '';
  return sanitize(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}
