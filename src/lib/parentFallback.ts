import type { Product } from './supabase';

/**
 * Para producto padre virtual: si los campos están vacíos, leer del primer hijo.
 * Si tiene datos propios, usarlos. 
 * Si no es padre, devuelve los datos del producto tal cual.
 */
export type ParentResolvedData = {
  description: string;
  seo_title: string | null;
  seo_description: string | null;
  category_general: string[];
  category_specific: string[];
  category_sub_specific: string[];
  category_detail: string[];
  tags: string[];
};

export function resolveParentData(
  product: Product,
  firstChild?: Product | null
): ParentResolvedData {
  const isParent = !product ? false : !!product.is_parent;
  const fallback = isParent ? firstChild : null;

  const isEmptyArr = (v: any): boolean => 
    !Array.isArray(v) || v.length === 0;

  const parseSubSpecific = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const s = String(v).trim();
    if (s === '[]' || s === 'null' || s === '""') return [];
    return s.split(',').map(item => item.trim()).filter(Boolean);
  };

  const productSubSpec = parseSubSpecific(product?.category_sub_specific);
  const fallbackSubSpec = parseSubSpecific(fallback?.category_sub_specific);

  return {
    description: product?.description?.trim()
      || (fallback?.description?.trim() || ''),
    seo_title: product?.seo_title?.trim() 
      || (fallback?.seo_title?.trim() || null),
    seo_description: product?.seo_description?.trim() 
      || (fallback?.seo_description?.trim() || null),
    category_general: !isEmptyArr(product?.category_general) 
      ? product.category_general! 
      : (fallback?.category_general || []),
    category_specific: !isEmptyArr(product?.category_specific) 
      ? product.category_specific! 
      : (fallback?.category_specific || []),
    category_sub_specific: productSubSpec.length > 0 
      ? productSubSpec 
      : fallbackSubSpec,
    category_detail: !isEmptyArr(product?.category_detail) 
      ? product.category_detail! 
      : (fallback?.category_detail || []),
    tags: !isEmptyArr(product?.tags)
      ? product.tags!
      : (fallback?.tags || []),
  };
}
