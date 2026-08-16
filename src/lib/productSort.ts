type SortableProduct = {
  name?: string;
  public_name?: string | null;
  stock?: number | null;
};

/**
 * Ordena productos alfabéticamente por nombre (usa public_name si existe,
 * si no name), moviendo los productos sin stock (stock <= 0) al final.
 */
export function sortAlphabeticalStockLast<T extends SortableProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const aOut = (a.stock ?? 0) <= 0;
    const bOut = (b.stock ?? 0) <= 0;
    if (aOut !== bOut) return aOut ? 1 : -1;

    const aName = (a.public_name || a.name || '').toLowerCase();
    const bName = (b.public_name || b.name || '').toLowerCase();
    return aName.localeCompare(bName, 'es');
  });
}
