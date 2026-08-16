'use client';

import React, { useState, useTransition } from 'react';
import { Sparkles, X, AlertCircle } from 'lucide-react';
import { saveBatchSeo } from './actions';

interface SeoBatchReviewModalProps {
  items: Array<{
    id: string;
    name: string;
    meta_title: string;
    meta_description: string;
    schema_description?: string;
  }>;
  pendingItems: Array<{
    id: string;
    name: string;
    uploaded_image_url: string | null;
  }>;
  onClose: () => void;
  onSaved: () => void;
}

export default function SeoBatchReviewModal({
  items,
  pendingItems,
  onClose,
  onSaved
}: SeoBatchReviewModalProps) {
  const [editedItems, setEditedItems] = useState(
    items.map(item => {
      const p = pendingItems.find(x => x.id === item.id);
      return {
        id: item.id,
        name: item.name || p?.name || 'Producto',
        uploaded_image_url: p?.uploaded_image_url || null,
        meta_title: item.meta_title || '',
        meta_description: item.meta_description || '',
        schema_description: item.schema_description || ''
      };
    })
  );

  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (index: number, field: 'meta_title' | 'meta_description', value: string) => {
    setEditedItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = () => {
    setError(null);
    startSaving(async () => {
      const payload = editedItems.map(item => ({
        productId: item.id,
        metaTitle: item.meta_title,
        metaDescription: item.meta_description,
        schemaDescription: item.schema_description
      }));

      const res = await saveBatchSeo(payload);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || 'Error al guardar el SEO por lote');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Revisión de SEO por Lote ({editedItems.length})</h2>
              <p className="text-xs text-gray-500 mt-0.5">Revisa y edita las propuestas de la IA antes de guardarlas en estado OK.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="m-6 mb-0 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error:</span> {error}
            </div>
          </div>
        )}

        {/* Main Content (List) */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          {editedItems.map((item, index) => {
            const titleLength = item.meta_title.length;
            const descLength = item.meta_description.length;
            const isTitleOptimal = titleLength > 0 && titleLength <= 60;
            const isDescOptimal = descLength > 0 && descLength <= 155;

            return (
              <div key={item.id} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-150 flex flex-col md:flex-row gap-5 items-start">
                
                {/* Product Info Column */}
                <div className="w-full md:w-1/4 shrink-0 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center">
                    {item.uploaded_image_url ? (
                      <img src={item.uploaded_image_url} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No img</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">{item.name}</h4>
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md font-semibold mt-1 inline-block">Propuesta IA</span>
                  </div>
                </div>

                {/* Form Fields Column */}
                <div className="flex-1 w-full space-y-4">
                  {/* Meta Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-gray-700">Meta Título (máx. 60)</label>
                      <span className={`font-medium ${isTitleOptimal ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {titleLength} / 60
                      </span>
                    </div>
                    <input
                      type="text"
                      value={item.meta_title}
                      onChange={(e) => handleFieldChange(index, 'meta_title', e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A8A00]/10 focus:border-[#1A8A00] bg-white"
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-gray-700">Meta Descripción (máx. 155)</label>
                      <span className={`font-medium ${isDescOptimal ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {descLength} / 155
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={item.meta_description}
                      onChange={(e) => handleFieldChange(index, 'meta_description', e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A8A00]/10 focus:border-[#1A8A00] bg-white resize-none"
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-gray-150 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 border border-gray-200 hover:bg-gray-100 disabled:opacity-50 rounded-xl text-sm font-bold text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || editedItems.length === 0}
            className="px-6 py-2.5 bg-[#1A8A00] hover:bg-[#156e00] disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-colors shadow-sm inline-flex items-center gap-2"
          >
            {isSaving ? 'Guardando...' : 'Guardar todo'}
          </button>
        </div>

      </div>
    </div>
  );
}
