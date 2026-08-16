'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Upload, X } from 'lucide-react';

const SPECIES_LIST = ['Perros', 'Gatos', 'Aves', 'Peces', 'Roedores', 'Tortugas'];

export default function SpeciesIconManager() {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploadingSpecies, setUploadingSpecies] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('species_icon_urls').single()
      .then(({ data }) => setUrls((data?.species_icon_urls as any) || {}));
  }, []);

  const uploadIcon = async (species: string, file: File) => {
    setUploadingSpecies(species);
    try {
      let blob: Blob | null = null;
      try {
        const res = await fetch('/api/convert-to-webp', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (res.ok) blob = await res.blob();
      } catch { /* fallback abajo */ }

      const filename = `${species.toLowerCase()}_${Date.now()}.${blob ? 'webp' : (file.name.split('.').pop() || 'png')}`;
      const fileToUpload = blob ?? file;
      const contentType = blob ? 'image/webp' : file.type;

      const { error } = await supabase.storage.from('species-icons').upload(filename, fileToUpload, { contentType, upsert: false, cacheControl: '31536000' });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('species-icons').getPublicUrl(filename);
      const newUrls = { ...urls, [species]: publicUrl };
      setUrls(newUrls);

      await supabase.from('site_settings').update({ species_icon_urls: newUrls }).eq('id', '00000000-0000-0000-0000-000000000001');
    } catch (e: any) {
      alert('Error al subir el ícono: ' + e.message);
    } finally {
      setUploadingSpecies(null);
    }
  };

  const removeIcon = async (species: string) => {
    const newUrls = { ...urls };
    delete newUrls[species];
    setUrls(newUrls);
    await supabase.from('site_settings').update({ species_icon_urls: newUrls }).eq('id', '00000000-0000-0000-0000-000000000001');
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b pb-2">
          🐾 Iconos de especie en tarjetas de producto
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Subí una imagen cuadrada (PNG con fondo transparente, 256×256px recomendado) por cada especie.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SPECIES_LIST.map(species => (
          <div key={species} className="border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2">
            <p className="text-xs font-bold text-gray-700">{species}</p>
            {urls[species] ? (
              <div className="relative">
                <img src={urls[species]} alt={species} className="w-16 h-16 object-contain rounded-lg bg-gray-50 border border-gray-100" />
                <button
                  onClick={() => removeIcon(species)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#166534] transition-colors">
                <input
                  type="file"
                  accept="image/png, image/webp, image/svg+xml, image/jpeg"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadIcon(species, e.target.files[0])}
                />
                {uploadingSpecies === species ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-400" />
                )}
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
