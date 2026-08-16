// Construye correctamente filtros de array de Postgres para PostgREST,
// evitando el bug de supabase-js con comas dentro de los valores.

function quoteArrayElement(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function pgArrayLiteral(values: string[]): string {
  return `{${values.map(quoteArrayElement).join(',')}}`;
}

/** Equivalente seguro a .contains(column, [value]) para columnas array */
export function pgContains(query: any, column: string, values: string[]) {
  return query.filter(column, 'cs', pgArrayLiteral(values));
}

/** Equivalente seguro a .overlaps(column, values) para columnas array */
export function pgOverlaps(query: any, column: string, values: string[]) {
  return query.filter(column, 'ov', pgArrayLiteral(values));
}
