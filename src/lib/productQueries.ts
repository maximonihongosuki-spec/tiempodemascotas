import { supabase } from './supabase';

/**
 * Filtra productos del catálogo público.
 * - Los padres (is_parent=true) solo se incluyen si al menos 1 hijo tiene stock > 0
 * - Los productos individuales (is_parent=false) se incluyen si cumplen el filtro de stock
 */
export async function getPublicProducts({
  onlyIndividuals = false,
  showOutOfStock = false,
  category = '',
  limit = 1000,
  orderBy = 'created_at',
  ascending = false,
}: {
  onlyIndividuals?: boolean;
  showOutOfStock?: boolean;
  category?: string;
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}) {
  // Primero obtener los padres que tienen al menos un hijo con stock
  const parentQuery = supabase
    .from('products')
    .select('id')
    .eq('is_parent', true)
    .eq('active', true);

  const { data: parentIds } = await parentQuery;

  if (!parentIds) return [];

  // Para cada padre, verificar si tiene hijos con stock
  const parentsWithStock: string[] = [];
  if (parentIds.length > 0) {
    const { data: childrenWithStock } = await supabase
      .from('products')
      .select('parent_product_id')
      .in('parent_product_id', parentIds.map(p => p.id))
      .gt('stock', 0)
      .eq('active', true);

    const parentIdsWithStock = new Set((childrenWithStock || []).map(c => c.parent_product_id));
    parentsWithStock.push(...Array.from(parentIdsWithStock) as string[]);
  }

  return { parentsWithStock };
}
