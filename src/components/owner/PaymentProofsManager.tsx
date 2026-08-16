'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Trash2, RefreshCw, FileImage, Loader2, AlertTriangle } from 'lucide-react';

type ProofFile = {
  name: string;
  created_at: string;
  size: number;
  url: string;
};

export default function PaymentProofsManager() {
  const [files, setFiles] = useState<ProofFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadFiles(); }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .list('', { sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const filesWithUrls: ProofFile[] = (data || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(f.name);
          return {
            name: f.name,
            created_at: f.created_at || '',
            size: f.metadata?.size || 0,
            url: publicUrl,
          };
        });

      setFiles(filesWithUrls);
    } catch (err) {
      console.error('Error al cargar comprobantes:', err);
    }
    setLoading(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadAll = async () => {
    if (files.length === 0) return;
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      await Promise.all(files.map(async (file) => {
        const res = await fetch(file.url);
        const blob = await res.blob();
        zip.file(file.name, blob);
      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobantes_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar el ZIP. Intentá de nuevo.');
    }
    setDownloading(false);
  };

  const handleDeleteAll = async () => {
    if (files.length === 0) return;
    const confirmed = confirm(
      `⚠️ ¿Eliminar TODOS los ${files.length} comprobantes del bucket?\n\nEsta acción no se puede deshacer. Asegurate de haber descargado los archivos primero.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const filenames = files.map(f => f.name);
      const { error } = await supabase.storage
        .from('payment-proofs')
        .remove(filenames);
      if (error) throw error;
      setFiles([]);
      alert('✅ Bucket limpiado correctamente.');
    } catch (err) {
      alert('Error al eliminar archivos. Intentá de nuevo.');
    }
    setDeleting(false);
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">
            🧾 Comprobantes de pago
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {files.length} archivos · {formatSize(totalSize)} en total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadFiles} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
          <button onClick={handleDownloadAll} disabled={files.length === 0 || downloading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#166534] text-white rounded-lg text-xs font-bold hover:bg-[#064E3B] transition-colors disabled:opacity-40">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Descargar ZIP
          </button>
          <button onClick={handleDeleteAll} disabled={files.length === 0 || deleting}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-40">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Limpiar bucket
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-800">
          <span className="font-black">Recomendación mensual:</span> Descargá el ZIP primero y luego limpiá el bucket. La eliminación es permanente.
        </p>
      </div>

      {/* File list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando archivos...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm italic">
          El bucket está vacío.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map(file => (
            <div key={file.name}
              className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-300 transition-colors">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileImage className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400">{formatDate(file.created_at)} · {formatSize(file.size)}</p>
              </div>
              <a href={file.url} target="_blank" rel="noreferrer"
                className="p-2 text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors flex-shrink-0"
                title="Ver comprobante">
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
