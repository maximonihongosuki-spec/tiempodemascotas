/**
 * Convierte HTML (típicamente del portapapeles al pegar contenido con formato)
 * a nuestra sintaxis de texto plano con marcadores:
 * - Párrafos/divs/headers → separados por doble salto de línea
 * - <br> → salto de línea simple
 * - <li> → "- texto" en su propia línea
 * - <strong>/<b> → **texto**
 * - <em>/<i> → _texto_
 */
export function htmlToFormattedText(html: string): string {
  if (typeof window === 'undefined') return '';

  const container = document.createElement('div');
  container.innerHTML = html;

  function walk(node: ChildNode): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const childText = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'br':
        return '\n';
      case 'p':
      case 'div':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return childText.trim() ? childText.trim() + '\n\n' : '';
      case 'li':
        return childText.trim() ? '- ' + childText.trim() + '\n' : '';
      case 'ul':
      case 'ol':
        return childText + '\n';
      case 'strong':
      case 'b':
        return childText ? `**${childText}**` : '';
      case 'em':
      case 'i':
        return childText ? `_${childText}_` : '';
      case 'table':
        return '\n[[TABLA]]\n' + childText + '[[/TABLA]]\n\n';
      case 'thead':
      case 'tbody':
      case 'tfoot':
        return childText;
      case 'tr':
        return childText.replace(/\t$/, '') + '\n';
      case 'th':
      case 'td':
        return (childText.trim() || ' ') + '\t';
      default:
        return childText;
    }
  }

  const raw = Array.from(container.childNodes).map(walk).join('');
  // Normalizar: máximo 2 saltos consecutivos, sin espacios sobrantes
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Handler de paste reutilizable para textareas de descripción.
 * Si el portapapeles tiene HTML, lo convierte con htmlToFormattedText e
 * inserta el resultado en la posición del cursor, reemplazando la selección.
 * Si NO hay HTML (texto plano puro), deja que el navegador maneje el paste
 * normalmente — el texto plano ya conserva sus propios \n si los tiene.
 *
 * @param onChange callback que recibe el nuevo valor completo del textarea
 */
export function handleFormattedPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  onChange: (newValue: string) => void
) {
  const html = e.clipboardData.getData('text/html');
  if (!html) return; // sin HTML: dejar comportamiento default del navegador

  e.preventDefault();
  const converted = htmlToFormattedText(html);
  if (!converted) return;

  const textarea = e.currentTarget;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentValue = textarea.value;
  const newValue = currentValue.slice(0, start) + converted + currentValue.slice(end);

  onChange(newValue);

  requestAnimationFrame(() => {
    const newCursorPos = start + converted.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });
}
