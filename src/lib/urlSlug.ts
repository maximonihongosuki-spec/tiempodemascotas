export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '_')     // Cambiar cualquier no-alfanumérico por guion bajo
    .replace(/^_+|_+$/g, '')         // Limpiar guiones bajos al inicio/final
    .substring(0, 100);
}

export async function ensureUniqueSlug(
  baseSlug: string,
  productId: string | null,
  supabase: any
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const query = supabase
      .from('products')
      .select('id')
      .eq('url_slug', slug);

    if (productId) {
      query.neq('id', productId);
    }

    const { data } = await query.maybeSingle();

    if (!data) {
      isUnique = true;
    } else {
      slug = `${baseSlug}_${counter}`;
      counter++;
    }
  }

  return slug;
}