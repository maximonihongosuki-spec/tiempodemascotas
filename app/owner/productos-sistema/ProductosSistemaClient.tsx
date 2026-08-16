'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Archive, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Producto = {
  id: string;
  product_code: string;
  name: string;
  active: boolean;
  archived: boolean;
  deactivated_reason: string;
  stock: number;
  price: number;
  updated_at: string;
};

type Props = { initialProductos: Producto[] };

export default function ProductosSistemaClient({ initialProductos }: Props) {
  const [productos, setProductos] = useState<Producto[]>(initialProductos);
  const [filtroRazon, setFiltroRazon] = useState<'todos' | 'libre' | 'duplicado'>('todos');
  const [soloConStock, setSoloConStock] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const filtrados = productos.filter(p => {
    if (filtroRazon !== 'todos' && p.deactivated_reason !== filtroRazon) return false;
    if (soloConStock && p.stock <= 0) return false;
    return true;
  });

  const handleRestaurar = async (p: Producto) => {
    setLoading(p.id);
    const { error } = await supabase
      .from('products')
      .update({ deactivated_reason: null, archived: false })
      .eq('id', p.id);
    if (error) {
      showToast('Error al restaurar: ' + error.message, false);
    } else {
      setProductos(prev => prev.filter(x => x.id !== p.id));
      showToast('Producto restaurado al flujo normal');
    }
    setLoading(null);
  };

  const handleBorrar = async (p: Producto) => {
    if (p.stock > 0) return;
    if (!confirm(`¿Borrar definitivamente "${p.name}" (${p.product_code})? Esta acción no se puede deshacer.`)) return;
    setLoading(p.id);
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', p.id);
    if (error) {
      showToast('Error al borrar: ' + error.message, false);
    } else {
      setProductos(prev => prev.filter(x => x.id !== p.id));
      showToast('Producto eliminado definitivamente');
    }
    setLoading(null);
  };

  const razonLabel = (r: string) => {
    if (r === 'libre') return { label: 'LIBRE', color: 'bg-orange-100 text-orange-700' };
    if (r === 'duplicado') return { label: 'Duplicado', color: 'bg-red-100 text-red-700' };
    return { label: r, color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive className="w-6 h-6 text-slate-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos Sistema</h1>
          <p className="text-sm text-gray-500">Productos desactivados automáticamente por ÉTER Sync</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{productos.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{productos.filter(p => p.deactivated_reason === 'libre').length}</div>
          <div className="text-xs text-gray-500 mt-1">Renombrados LIBRE</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{productos.filter(p => p.deactivated_reason === 'duplicado').length}</div>
          <div className="text-xs text-gray-500 mt-1">Duplicados</div>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-2xl font-bold text-orange-700">{productos.filter(p => p.stock > 0).length}</div>
          <div className="text-xs text-orange-600 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> Con stock real</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Razón:</span>
          {(['todos', 'libre', 'duplicado'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFiltroRazon(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtroRazon === r ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {r === 'todos' ? 'Todos' : r === 'libre' ? 'LIBRE' : 'Duplicado'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={soloConStock}
            onChange={e => setSoloConStock(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-gray-600">Solo con stock &gt; 0</span>
        </label>
        <span className="text-xs text-gray-400">{filtrados.length} productos</span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Archive className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay productos con estos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Razón</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(p => {
                  const { label, color } = razonLabel(p.deactivated_reason);
                  const isLoading = loading === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.product_code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{p.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={p.stock > 0 ? 'text-orange-600 font-semibold' : 'text-gray-400'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        Gs. {Number(p.price).toLocaleString('es-PY')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(p.updated_at).toLocaleDateString('es-PY')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRestaurar(p)}
                            disabled={isLoading}
                            title="Restaurar al flujo normal"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            <RotateCcw size={12} />
                            Restaurar
                          </button>
                          <button
                            onClick={() => handleBorrar(p)}
                            disabled={isLoading || p.stock > 0}
                            title={p.stock > 0 ? 'No se puede borrar: tiene stock en el sistema externo' : 'Borrar definitivamente'}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={12} />
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
