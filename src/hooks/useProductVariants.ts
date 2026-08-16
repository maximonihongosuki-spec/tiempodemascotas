'use client';
import { useState, useEffect } from 'react';
import { supabase, Product } from '../lib/supabase';

export function useProductVariants(parent: Product | null, initialVariants?: Product[]) {
  const [variants, setVariants] = useState<Product[]>(() => initialVariants || []);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(() => {
    if (initialVariants && initialVariants.length > 0) {
      return initialVariants.find(v => (v.stock || 0) > 0) || initialVariants[0] || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parent || !parent.is_parent) {
      setVariants([]);
      setSelectedVariant(null);
      return;
    }
    if (initialVariants && initialVariants.length > 0) {
      setVariants(initialVariants);
      const firstInStock = initialVariants.find(v => (v.stock || 0) > 0);
      setSelectedVariant(firstInStock || initialVariants[0] || null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('products')
      .select('id, name, public_name, description, description_ai_enhanced, image_url, uploaded_image_url, additional_images, seo_title, seo_description, tags, url_slug, product_code, price, special_price, differentiated_price, wholesale_price, wholesale_factor, active, is_parent, parent_product_id, stock, requires_prescription, category_general, category_specific, category_sub_specific, category_detail, category_species, category_brand, is_bulk, is_featured, variant_label, category')
      .eq('parent_product_id', parent.id)
      .eq('active', true)
      .order('price', { ascending: true })
      .then(({ data }) => {
        // El padre virtual no tiene precio — solo listar los hijos
        const allOptions = (data || []) as any as Product[];
        setVariants(allOptions);
        // Seleccionar la primera variante con stock, si no hay, la primera
        const firstInStock = allOptions.find(v => (v.stock || 0) > 0);
        setSelectedVariant(firstInStock || allOptions[0] || null);
        setLoading(false);
      });
  }, [parent?.id, parent?.is_parent, initialVariants]);

  return { variants, selectedVariant, setSelectedVariant, loading };
}
