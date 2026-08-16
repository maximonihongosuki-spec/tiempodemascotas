import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, Save } from 'lucide-react';
import { uploadImageToStorage, assertNoBase64 } from '../../lib/imageUpload';

type ProductPageContent = {
  id: string;
  bottom_banner_desktop: string | null;
  bottom_banner_mobile: string | null;
};

export default function OwnerProductPageContentManagement() {
  const [content, setContent] = useState<ProductPageContent>({
    id: '00000000-0000-0000-0000-000000000001',
    bottom_banner_desktop: null,
    bottom_banner_mobile: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('product_page_content')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setContent(data);
      }
    } catch (error) {
      console.error('Error fetching product page content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof ProductPageContent) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImageToStorage(file, 'product-page-banners');
      setContent(prev => ({ ...prev, [field]: url }));
    } catch (error: any) {
      alert('Error al subir banner: ' + error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      assertNoBase64(content);
      const { error } = await supabase
        .from('product_page_content')
        .upsert(content);

      if (error) throw error;
      alert('Contenido guardado exitosamente');
    } catch (error: any) {
      console.error('Error saving product page content:', error);
      alert('Error al guardar el contenido: ' + (error.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Banner de Página de Producto</h2>
            <p className="text-gray-500 text-sm mt-1">Gestiona el banner publicitario que aparece al pie de la página de cada producto</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-4 border rounded-lg p-6 bg-gray-50">
            <h3 className="font-bold text-lg border-b pb-2">Banner Inferior (Arriba del footer)</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Desktop */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Versión Desktop (Relación 8:1)
                </label>
                <div className="w-full aspect-[8/1] bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {content.bottom_banner_desktop ? (
                    <img src={content.bottom_banner_desktop} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-300 w-8 h-8" />
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <span className="text-white text-xs font-bold uppercase">Subir Imagen</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bottom_banner_desktop')} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Versión Móvil (Relación 2:1)
                </label>
                <div className="w-full max-w-[300px] aspect-[2/1] bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative group">
                  {content.bottom_banner_mobile ? (
                    <img src={content.bottom_banner_mobile} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-300 w-8 h-8" />
                  )}
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                    <span className="text-white text-xs font-bold uppercase">Subir Imagen</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bottom_banner_mobile')} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
