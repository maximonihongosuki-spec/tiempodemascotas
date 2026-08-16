export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatPrice(price: number): string {
  return price.toLocaleString('es-PY');
}

export interface ParsedProduct {
  external_code: string;
  name: string;
  description: string;
  cost: number;
  price: number;
  wholesale_price: number;
  stock: number;
  category: string;
  brand: string;
  location: string;
}

export function generateProductCode(): string {
  const randomHex = Array.from(
    { length: 6 },
    () => Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('');

  return `PRD-${randomHex}`;
}

export function parseProductCSV(csvText: string, forceLocation?: string): ParsedProduct[] {
  const lines = csvText.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos');
  }

  const products: ParsedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < 10) continue;
    if (!values[0] || !values[1]) continue;

    const code = values[0].trim();
    const name = values[1].trim();

    if (!code || !name) continue;

    const cost = parseNumber(values[2]);
    const retailPrice = parseNumber(values[3]);
    const wholesalePrice = parseNumber(values[4]);
    const quantity = Math.max(0, parseInt(values[5]) || 0);
    const category = values[6].trim() || 'OTROS';
    const brand = values[7].trim() || '';
    const rawLocation = values[8].trim().toUpperCase();

    let location = forceLocation || rawLocation;
    if (!location || !['SHOW ROOM', 'DEPOSITO', 'GUARDA PROVEEDOR'].includes(location)) {
      location = 'SHOW ROOM';
    }

    products.push({
      external_code: code,
      name,
      description: `${name} - Marca: ${brand}${location ? ` - Ubicación: ${location}` : ''}`,
      cost,
      price: retailPrice,
      wholesale_price: wholesalePrice,
      stock: quantity,
      category,
      brand,
      location
    });
  }

  return products;
}
