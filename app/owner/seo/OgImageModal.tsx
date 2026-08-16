'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X } from 'lucide-react';
import OgImageGenerator from './edit/product/[id]/OgImageGenerator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Product = {
  id: string;
  name: string;
  public_name: string | null;
  uploaded_image_url: string | null;
  image_url: string | null;
  category_brand: string | null;
  category_general: string[] | null;
  category_specific: string[] | null;
  category_species: string[] | null;
  category_age: string[] | null;
  category_condition: string[] | null;
  tags: string[] | null;
  description: string | null;
  description_ai_enhanced: string | null;
};

export default function OgImageModal({
  productId,
  onClose,
  onSaved,
}: {
  productId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('products')
      .select('id, name, public_name, uploaded_image_url, image_url, category_brand, category_general, category_specific, category_species, category_age, category_condition, tags, description, description_ai_enhanced')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProduct(data as Product);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [productId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-gray-900">Generar imagen OG</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {loading && <p className="text-sm text-gray-400">Cargando producto…</p>}
          {!loading && product && (
            <OgImageGenerator
              product={product}
              onSaved={() => { onSaved(); onClose(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
