'use client';
import { useState, useCallback, useRef } from 'react';
import { supabase, Product } from '../../../src/lib/supabase';
import ProductManagement from '../../../src/components/owner/ProductManagement';

const PRODUCT_LIST_COLUMNS = 'id,name,public_name,product_code,url_slug,price,special_price,differentiated_price,stock,active,archived,image_url,uploaded_image_url,is_parent,parent_product_id,variant_label,category_general,category_specific,category_species,category_brand,category_age,category_detail,requires_prescription,is_bulk,ai_categorized_at,created_at,updated_at,category_sub_specific,category_condition,is_prescription,local_only,requires_refrigeration';

type Props = { initialProducts: Product[] };

export default function ProductosClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Mutación puntual: reemplaza sólo la fila afectada, sin refetch
  const handleProductUpdated = useCallback((id: string, changes: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...changes } : p)));
  }, []);

  // Alta de un producto nuevo: lo agrega al estado sin refetch
  const handleProductCreated = useCallback((product: Product) => {
    setProducts(prev => [product, ...prev]);
  }, []);

  // Baja / archivo: lo saca del estado sin refetch
  const handleProductRemoved = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  // Refetch explícito para casos puntuales (importación masiva, botón "recargar")
  // Cancela el anterior si estaba en vuelo.
  const handleRefreshAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const PAGE = 1000;
      let all: Product[] = [];
      let from = 0;
      let keep = true;
      while (keep) {
        if (ctrl.signal.aborted) return;
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_LIST_COLUMNS)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data as Product[]);
        from += PAGE;
        keep = data.length === PAGE;
      }
      if (!ctrl.signal.aborted) {
        const seen = new Set<string>();
        const deduped = all.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProducts(deduped);
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setLoading(false);
    }
  }, []);

  return (
    <ProductManagement
      products={products}
      loading={loading}
      onProductUpdated={handleProductUpdated}
      onProductCreated={handleProductCreated}
      onProductRemoved={handleProductRemoved}
      onRefreshAll={handleRefreshAll}
    />
  );
}
