'use client';

import { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  originalUrl: string;
  improvedUrl: string;
  onAccept: () => void;
  onRetry: (correctionInstructions: string) => Promise<void>;
  isRetrying: boolean;
  showBrandSealToggle?: boolean;
  applyBrandSeal?: boolean;
  onToggleBrandSeal?: (value: boolean) => void;
};

export default function AIImageReviewModal({
  open,
  onClose,
  originalUrl,
  improvedUrl,
  onAccept,
  onRetry,
  isRetrying,
  showBrandSealToggle = false,
  applyBrandSeal = false,
  onToggleBrandSeal,
}: Props) {
  const [instructions, setInstructions] = useState('');


  useEffect(() => {
    if (!open) setInstructions('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isRetrying) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              ✨ Revisión — Imagen mejorada con IA
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Compará y decidí si querés guardar la propuesta o pedir correcciones.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            disabled={isRetrying}
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Original</p>
              <div className="aspect-square bg-gray-50 border-2 border-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                {originalUrl ? (
                  <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400 italic">Sin imagen original</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">Mejorada con IA</p>
              <div className="aspect-square bg-purple-50 border-2 border-purple-300 rounded-xl overflow-hidden flex items-center justify-center relative">
                {isRetrying ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-50/90 gap-2">
                    <Loader2 size={32} className="animate-spin text-purple-600" />
                    <p className="text-xs font-bold text-purple-700">Procesando con IA...</p>
                  </div>
                ) : (
                  <img src={improvedUrl} alt="Mejorada" className="w-full h-full object-contain" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              📝 Instrucciones de corrección (opcional)
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={2}
              placeholder='Ej: "Fondo más blanco", "El producto debe quedar más centrado", "Quitar las sombras"'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 outline-none resize-none"
              disabled={isRetrying}
            />
            <p className="text-[10px] text-gray-400">
              Si querés ajustar la imagen, escribí qué corregir y dale "Reenviar a IA". 
              Consume un crédito adicional.
            </p>
          </div>

          {showBrandSealToggle && (
            <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <input
                type="checkbox"
                checked={applyBrandSeal || false}
                onChange={e => onToggleBrandSeal?.(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1">
                🛡️ Aplicar sello de marca antes de guardar
              </span>
            </label>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isRetrying}
              className="px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              ❌ Cancelar
            </button>
            <button
              onClick={() => onRetry(instructions)}
              disabled={isRetrying || !instructions.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={!instructions.trim() ? 'Escribí instrucciones para reenviar' : ''}
            >
              {isRetrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Reenviar a IA
            </button>
            <button
              onClick={onAccept}
              disabled={isRetrying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-40"
            >
              <Save size={14} /> Guardar imagen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
