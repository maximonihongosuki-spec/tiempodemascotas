'use client';

import { useState, useCallback } from 'react';
import { Upload, Download, X, Zap, Loader2, FileImage, RefreshCw } from 'lucide-react';

type ImageItem = {
  id: string;
  file: File;
  originalUrl: string;
  originalSize: number;
  webpBlob: Blob | null;
  webpUrl: string | null;
  webpSize: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
};

export default function ConvertirWebpPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: ImageItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      newItems.push({
        id: Math.random().toString(36).slice(2, 11),
        file,
        originalUrl: URL.createObjectURL(file),
        originalSize: file.size,
        webpBlob: null,
        webpUrl: null,
        webpSize: 0,
        status: 'pending',
      });
    }
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const processItem = async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'processing', error: undefined } : i));
    
    // Buscar el item actualizado en el array más reciente
    const allCurrent = await new Promise<ImageItem[]>(resolve => {
      setItems(prev => { resolve(prev); return prev; });
    });
    const target = allCurrent.find(i => i.id === id);
    if (!target) return;

    try {
      const res = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': target.file.type },
        body: target.file,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setItems(prev => prev.map(i => i.id === id ? {
        ...i,
        webpBlob: blob,
        webpUrl: url,
        webpSize: blob.size,
        status: 'done',
      } : i));
    } catch (err: any) {
      setItems(prev => prev.map(i => i.id === id ? {
        ...i,
        status: 'error',
        error: err.message || 'Error desconocido',
      } : i));
    }
  };

  const processAll = async () => {
    setIsProcessing(true);
    const pending = items.filter(i => i.status === 'pending' || i.status === 'error');
    const batchSize = 3;
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      await Promise.all(batch.map(item => processItem(item.id)));
    }
    setIsProcessing(false);
  };

  const downloadItem = (item: ImageItem) => {
    if (!item.webpUrl || !item.webpBlob) return;
    const originalName = item.file.name.replace(/\.[^.]+$/, '');
    const link = document.createElement('a');
    link.href = item.webpUrl;
    link.download = `${originalName}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    items.filter(i => i.status === 'done').forEach((item, idx) => {
      setTimeout(() => downloadItem(item), idx * 200);
    });
  };

  const removeItem = (id: string) => {
    const target = items.find(i => i.id === id);
    if (target) {
      URL.revokeObjectURL(target.originalUrl);
      if (target.webpUrl) URL.revokeObjectURL(target.webpUrl);
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearAll = () => {
    items.forEach(i => {
      URL.revokeObjectURL(i.originalUrl);
      if (i.webpUrl) URL.revokeObjectURL(i.webpUrl);
    });
    setItems([]);
  };

  const fmtSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const totalOriginal = items.reduce((s, i) => s + i.originalSize, 0);
  const totalWebp = items.reduce((s, i) => s + i.webpSize, 0);
  const totalReduction = totalOriginal > 0 && totalWebp > 0
    ? Math.round((1 - totalWebp / totalOriginal) * 100)
    : 0;

  const allDone = items.length > 0 && items.every(i => i.status === 'done');

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="text-yellow-500" /> Convertidor de Imágenes WebP
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Convertí JPG, PNG o cualquier imagen a formato WebP optimizado. 
          Las imágenes no se guardan en el servidor — solo se procesan y descargan.
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-base font-medium text-gray-700 mb-2">
          Arrastrá imágenes aquí o
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm cursor-pointer hover:bg-blue-700 transition-colors">
          <FileImage size={16} />
          Seleccionar archivos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
        <p className="text-xs text-gray-400 mt-3">JPG, PNG, WEBP, GIF — Hasta 10 MB c/u</p>
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="text-sm">
            <span className="font-bold text-gray-800">{items.length}</span>{' '}
            <span className="text-gray-500">
              {items.length === 1 ? 'imagen' : 'imágenes'}
              {totalReduction > 0 && (
                <span className="ml-2 text-green-600 font-bold">
                  · −{totalReduction}% ({fmtSize(totalOriginal)} → {fmtSize(totalWebp)})
                </span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            {allDone ? (
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-md text-sm font-bold hover:bg-green-700 transition-colors"
              >
                <Download size={14} /> Descargar todo
              </button>
            ) : (
              <button
                onClick={processAll}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isProcessing ? 'Convirtiendo...' : 'Convertir todo'}
              </button>
            )}
            <button
              onClick={clearAll}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <img src={item.originalUrl} alt="" className="w-16 h-16 object-cover rounded border border-gray-200" />
                  <span className="text-[10px] text-gray-500">{fmtSize(item.originalSize)}</span>
                </div>

                <span className="text-gray-400">→</span>

                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
                  {item.status === 'processing' && (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
                      <Loader2 size={20} className="animate-spin text-blue-600" />
                    </div>
                  )}
                  {item.status === 'done' && item.webpUrl && (
                    <>
                      <img src={item.webpUrl} alt="" className="w-16 h-16 object-cover rounded border border-green-200" />
                      <span className="text-[10px] text-green-600 font-bold">
                        {fmtSize(item.webpSize)}
                      </span>
                    </>
                  )}
                  {item.status === 'error' && (
                    <div className="w-16 h-16 flex items-center justify-center bg-red-50 rounded border border-red-200">
                      <X size={20} className="text-red-500" />
                    </div>
                  )}
                  {item.status === 'pending' && (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
                      <span className="text-[10px] text-gray-400">Pendiente</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                  {item.status === 'done' && item.webpSize > 0 && (
                    <p className="text-xs text-green-600 font-bold">
                      −{Math.round((1 - item.webpSize / item.originalSize) * 100)}% reducción
                    </p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-500">Error: {item.error}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {item.status === 'done' && (
                  <button
                    onClick={() => downloadItem(item)}
                    className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                    title="Descargar WebP"
                  >
                    <Download size={16} />
                  </button>
                )}
                {(item.status === 'pending' || item.status === 'error') && (
                  <button
                    onClick={() => processItem(item.id)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                    title="Convertir"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"
                  title="Quitar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
