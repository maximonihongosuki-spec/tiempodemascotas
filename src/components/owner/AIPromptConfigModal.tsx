'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Block = {
  id: string;
  name: string;
  prompt_block: string;
  active: boolean;
  sort_order: number;
  context: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  context: string;
  contextLabel: string;
};

export default function AIPromptConfigModal({ open, onClose, context, contextLabel }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', prompt_block: '' });
  const [saving, setSaving] = useState(false);
  const [sendMetadata, setSendMetadata] = useState<boolean>(true);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [refImages, setRefImages] = useState<{id: string; image_url: string; sort_order: number}[]>([]);
  const [useRefImages, setUseRefImages] = useState<boolean>(true);
  const [uploadingRefSlot, setUploadingRefSlot] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadBlocks();
      loadMetadataSetting();
      loadReferenceImages();
    }
  }, [open, context]);

  const loadMetadataSetting = async () => {
    setLoadingMeta(true);
    try {
      const { data } = await supabase
        .from('ai_image_context_settings')
        .select('send_metadata, use_reference_images')
        .eq('context', context)
        .maybeSingle();
      setSendMetadata(data?.send_metadata ?? true);
      setUseRefImages(data?.use_reference_images ?? true);
    } catch (err) {
      console.error('Error al cargar config de metadata:', err);
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadReferenceImages = async () => {
    const { data } = await supabase
      .from('ai_reference_images')
      .select('id, image_url, sort_order')
      .eq('context', context)
      .order('sort_order', { ascending: true });
    setRefImages(data || []);
  };

  const toggleSendMetadata = async () => {
    const newVal = !sendMetadata;
    setSendMetadata(newVal);
    try {
      await supabase.from('ai_image_context_settings').upsert({
        context,
        send_metadata: newVal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'context' });
    } catch (err) {
      console.error('Error al guardar toggle de metadata:', err);
    }
  };

  const toggleUseRefImages = async () => {
    const newVal = !useRefImages;
    setUseRefImages(newVal);
    try {
      await supabase.from('ai_image_context_settings').upsert({
        context,
        use_reference_images: newVal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'context' });
    } catch (err) {
      console.error('Error al guardar toggle de useRefImages:', err);
    }
  };

  const handleUploadReferenceImage = async (file: File) => {
    if (refImages.length >= 2) return;
    setUploadingRefSlot(refImages.length);
    try {
      let blobToUpload: Blob = file;
      try {
        const res = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (res.ok) {
          const optimized = await res.blob();
          if (optimized.type.startsWith('image/')) blobToUpload = optimized;
        }
      } catch {
        // Si falla la optimización, seguimos con el archivo original
      }

      const ext = blobToUpload.type.includes('webp') ? 'webp' : (file.name.split('.').pop() || 'png');
      const filename = `ai-reference/${context}/ref-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(filename, blobToUpload, {
          upsert: true,
          contentType: blobToUpload.type || 'image/webp',
          cacheControl: '31536000',
        });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);

      const { error: insErr } = await supabase.from('ai_reference_images').insert({
        context,
        image_url: urlData.publicUrl,
        sort_order: refImages.length,
      });
      if (insErr) throw insErr;

      await loadReferenceImages();
    } catch (err: any) {
      alert('Error al subir imagen de referencia: ' + (err.message || 'desconocido'));
    } finally {
      setUploadingRefSlot(null);
    }
  };

  const handleDeleteReferenceImage = async (id: string) => {
    if (!confirm('¿Eliminar esta imagen de referencia?')) return;
    await supabase.from('ai_reference_images').delete().eq('id', id);
    await loadReferenceImages();
  };

  const loadBlocks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ai_image_config')
      .select('*')
      .eq('context', context)
      .order('sort_order', { ascending: true });
    setBlocks(data || []);
    setLoading(false);
  };

  const handleToggle = async (block: Block) => {
    await supabase.from('ai_image_config')
      .update({ active: !block.active, updated_at: new Date().toISOString() })
      .eq('id', block.id);
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, active: !b.active } : b));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prompt_block.trim()) {
      alert('Completá nombre y prompt');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('ai_image_config').update({
          name: formData.name.trim(),
          prompt_block: formData.prompt_block.trim(),
          updated_at: new Date().toISOString(),
        }).eq('id', editingId);
      } else {
        const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) + 1 : 0;
        await supabase.from('ai_image_config').insert([{
          name: formData.name.trim(),
          prompt_block: formData.prompt_block.trim(),
          context,
          active: true,
          sort_order: maxOrder,
        }]);
      }
      setFormData({ name: '', prompt_block: '' });
      setEditingId(null);
      await loadBlocks();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este bloque?')) return;
    await supabase.from('ai_image_config').delete().eq('id', id);
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleEdit = (block: Block) => {
    setEditingId(block.id);
    setFormData({ name: block.name, prompt_block: block.prompt_block });
  };

  if (!open) return null;
  const activePrompt = blocks.filter(b => b.active).map(b => b.prompt_block).join('. ');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">⚙️ Config IA — {contextLabel}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Bloques que se combinan al mejorar imágenes en este contexto.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex-1 pr-3">
              <p className="text-sm font-bold text-purple-900">
                🧠 Enviar metadata del producto a la IA
              </p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Incluye nombre, marca, categorías y tags como contexto adicional para 
                mejorar el resultado de la imagen. Desactivar si los resultados con 
                metadata no son los esperados.
              </p>
            </div>
            <button
              onClick={toggleSendMetadata}
              disabled={loadingMeta}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                sendMetadata ? 'bg-purple-600' : 'bg-gray-300'
              } disabled:opacity-40`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                sendMetadata ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Imágenes de referencia persistentes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <p className="text-sm font-bold text-blue-900">
                  🖼️ Imágenes de referencia ({refImages.length}/2)
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Se envían junto a la imagen del producto en cada mejora con IA, como 
                  referencia visual de estilo y composición. Se configuran una sola vez 
                  — no hace falta volver a subirlas.
                </p>
              </div>
              <button
                onClick={toggleUseRefImages}
                disabled={loadingMeta}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  useRefImages ? 'bg-blue-600' : 'bg-gray-300'
                } disabled:opacity-40`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  useRefImages ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-[140px]">
              {Array.from({ length: 2 }).map((_, i) => {
                const img = refImages[i];
                const isUploading = uploadingRefSlot === i;

                if (img) {
                  return (
                    <div key={img.id} className="relative aspect-square bg-white border border-blue-200 rounded-lg overflow-hidden group">
                      <img src={img.image_url} alt={`Referencia ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDeleteReferenceImage(img.id)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in duration-200"
                        title="Eliminar"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                }

                return (
                  <label
                    key={`empty-${i}`}
                    className="aspect-square bg-white border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                    ) : (
                      <Plus size={16} className="text-blue-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading || refImages.length >= 2}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadReferenceImage(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Bloques</h4>
            {loading ? (
              <div className="text-center py-6"><Loader2 size={20} className="animate-spin mx-auto text-gray-400" /></div>
            ) : blocks.length === 0 ? (
              <p className="text-sm text-gray-404 italic text-center py-6">No hay bloques en este contexto. Agregá el primero.</p>
            ) : (
              <div className="space-y-2">
                {blocks.map(block => (
                  <div key={block.id} className={`border rounded-lg p-3 flex items-start gap-2 ${block.active ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                    <input type="checkbox" checked={block.active} onChange={() => handleToggle(block)} className="mt-1 w-4 h-4 rounded text-purple-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{block.name}</p>
                      <p className="text-xs text-gray-600 font-mono leading-relaxed mt-0.5 line-clamp-3">{block.prompt_block}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(block)} className="p-1 text-gray-500 hover:text-blue-600">✏️</button>
                      <button onClick={() => handleDelete(block.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activePrompt && (
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Prompt activo combinado</p>
              <p className="text-xs text-gray-700 font-mono leading-relaxed">{activePrompt}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase">{editingId ? 'Editar bloque' : '+ Nuevo bloque'}</h4>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del bloque" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            <textarea rows={3} value={formData.prompt_block} onChange={e => setFormData({ ...formData, prompt_block: e.target.value })}
              placeholder="Professional e-commerce product photo..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono" />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
              </button>
              {editingId && (
                <button onClick={() => { setEditingId(null); setFormData({ name: '', prompt_block: '' }); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
