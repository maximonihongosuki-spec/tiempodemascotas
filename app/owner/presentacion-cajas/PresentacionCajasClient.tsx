'use client';
import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Package, Check, X, Image as ImageIcon, Link, ToggleLeft, ToggleRight, Loader2, ChevronDown, ChevronUp, Search, RefreshCw } from 'lucide-react';
import { detectBoxPresentation } from '../../../src/lib/boxPresentation';
import { uploadImageToStorage, assertNoBase64 } from '../../../src/lib/imageUpload';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CAJAS_COLS_STR = 'id,product_code,name,price,stock,active,box_factor,parent_product_id,uploaded_image_url,image_url,pending_activation,url_slug';

type Caja = {
  id: string;
  product_code: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  box_factor: number;
  parent_product_id: string | null;
  uploaded_image_url: string | null;
  image_url: string | null;
  pending_activation: boolean;
  url_slug: string | null;
};

type Grupo = { id: string; name: string };

type ProductoConCaja = {
  id: string;
  product_code: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  parent_product_id: string | null;
  uploaded_image_url: string | null;
  image_url: string | null;
  url_slug: string | null;
  box_factor: number | null;
  category_general: string[] | null;
  category_specific: string[] | null;
  category_sub_specific: string[] | null;
  category_detail: string[] | null;
  category_species: string[] | null;
  category_brand: string | null;
  category_age: string[] | null;
  category_condition: string[] | null;
  tags: string[] | null;
  brand: string | null;
  description: string | null;
  is_prescription?: boolean;
  requires_prescription?: boolean;
  local_only?: boolean;
  requires_refrigeration?: boolean;
  volume_prices: { id: string; product_id: string; price_level: number; min_qty: number; max_qty: number; price: number }[];
};

type Props = {
  cajasCreadas: Caja[];
  grupos: Grupo[];
  productosConCaja: ProductoConCaja[];
};

export default function PresentacionCajasClient({ cajasCreadas: init, grupos, productosConCaja }: Props) {
  const [tab, setTab] = useState<'creadas' | 'crear'>('creadas');
  const [subTab, setSubTab] = useState<'sin-caja' | 'con-caja'>('sin-caja');
  const [cajas, setCajas] = useState<Caja[]>(init);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [creatingIds, setCreatingIds] = useState<Set<string>>(new Set());
  const [groupOverrides, setGroupOverrides] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const [syncingPrices, setSyncingPrices] = useState(false);

  const handleSyncPrices = async () => {
    setSyncingPrices(true);
    let actualizadas = 0;
    let sinOrigen = 0;
    try {
      for (const caja of cajas) {
        if (!caja.box_factor) continue;
        const codigoOrigen = caja.product_code.replace(/-C\d+$/, '');

        const { data: origen } = await supabase
          .from('products')
          .select('id, price, stock, volume_prices(id, product_id, price_level, min_qty, max_qty, price)')
          .eq('product_code', codigoOrigen)
          .maybeSingle();

        if (!origen) {
          sinOrigen++;
          continue;
        }

        const boxInfo = detectBoxPresentation((origen as any).volume_prices, origen.price);
        const nuevoStock = Math.floor((origen.stock || 0) / caja.box_factor);
        const nuevoPrecio = boxInfo.hasBox ? boxInfo.boxPrice : caja.price;

        if (nuevoStock !== caja.stock || nuevoPrecio !== caja.price) {
          const { error } = await supabase
            .from('products')
            .update({ stock: nuevoStock, price: nuevoPrecio, updated_at: new Date().toISOString() })
            .eq('id', caja.id);

          if (!error) {
            actualizadas++;
            setCajas(prev => prev.map(c => c.id === caja.id ? { ...c, stock: nuevoStock, price: nuevoPrecio } : c));
          }
        }
      }

      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'box_presentations_last_synced_at')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('settings')
          .update({ value: new Date().toISOString() })
          .eq('key', 'box_presentations_last_synced_at');
      } else {
        await supabase
          .from('settings')
          .insert({ key: 'box_presentations_last_synced_at', value: new Date().toISOString() });
      }

      showToast(`Sincronización completa: ${actualizadas} actualizadas${sinOrigen > 0 ? `, ${sinOrigen} sin producto origen` : ''}`, true);
    } catch (err: any) {
      showToast('Error al sincronizar: ' + (err.message || 'desconocido'), false);
    } finally {
      setSyncingPrices(false);
    }
  };

  // ── PESTAÑA 1: CAJAS CREADAS ──────────────────────────────────

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cajas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cajas.map(c => c.id)));
    }
  };

  const handleMassToggleActive = async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    ids.forEach(id => setLoadingIds(prev => {
      const n = new Set(prev);
      n.add(id);
      return n;
    }));
    const { error } = await supabase
      .from('products')
      .update({ active: activate, pending_activation: activate ? false : true })
      .in('id', ids);
    if (error) {
      showToast('Error al actualizar: ' + error.message, false);
    } else {
      setCajas(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, active: activate } : c));
      setSelectedIds(new Set());
      showToast(`${ids.length} productos ${activate ? 'activados' : 'desactivados'}`);
    }
    ids.forEach(id => setLoadingIds(prev => { const n = new Set(prev); n.delete(id); return n; }));
  };

  const handleSingleToggleActive = async (caja: Caja) => {
    setLoadingIds(prev => {
      const n = new Set(prev);
      n.add(caja.id);
      return n;
    });
    const { error } = await supabase
      .from('products')
      .update({ active: !caja.active, pending_activation: caja.active })
      .eq('id', caja.id);
    if (!error) {
      setCajas(prev => prev.map(c => c.id === caja.id ? { ...c, active: !c.active } : c));
    }
    setLoadingIds(prev => { const n = new Set(prev); n.delete(caja.id); return n; });
  };

  const handleLinkGroup = async (cajaId: string, groupId: string) => {
    setLoadingIds(prev => {
      const n = new Set(prev);
      n.add(cajaId);
      return n;
    });
    const { error } = await supabase
      .from('products')
      .update({ parent_product_id: groupId || null })
      .eq('id', cajaId);
    if (!error) {
      setCajas(prev => prev.map(c => c.id === cajaId ? { ...c, parent_product_id: groupId || null } : c));
      showToast('Grupo vinculado correctamente');
    } else {
      showToast('Error: ' + error.message, false);
    }
    setLoadingIds(prev => { const n = new Set(prev); n.delete(cajaId); return n; });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = uploadTargetId.current;
    if (!file || !id) return;
    setUploadingId(id);
    try {
      const url = await uploadImageToStorage(file, 'product-main');
      const payload = { uploaded_image_url: url };
      assertNoBase64(payload);
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (!error) {
        setCajas(prev => prev.map(c => c.id === id ? { ...c, uploaded_image_url: url } : c));
        showToast('Imagen subida correctamente');
      }
    } catch (err: any) {
      showToast('Error subiendo imagen: ' + (err.message || 'desconocido'), false);
    } finally {
      setUploadingId(null);
      uploadTargetId.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── PESTAÑA 2: CREAR CAJAS MASIVAMENTE ───────────────────────

  const handleCrearCaja = async (producto: ProductoConCaja) => {
    const boxInfo = detectBoxPresentation(producto.volume_prices, producto.price);
    if (!boxInfo.hasBox) return;

    setCreatingIds(prev => {
      const n = new Set(prev);
      n.add(producto.id);
      return n;
    });
    try {
      const unitsPerBox = boxInfo.unitsPerBox;
      const boxPrice = boxInfo.boxPrice;
      const boxCode = `${producto.product_code}-C${unitsPerBox}`;
      const boxName = `${producto.name} - Caja de ${unitsPerBox}u`;
      const boxSlug = `${producto.url_slug || producto.product_code}-caja-x${unitsPerBox}`;
      const boxStock = Math.floor((producto.stock || 0) / unitsPerBox);
      // Si el origen tiene grupo, la caja hereda ese grupo
      const parentId = producto.parent_product_id || null;

      const payload = {
        product_code: boxCode,
        name: boxName,
        url_slug: boxSlug,
        price: boxPrice,
        cost: 0,
        stock: boxStock,
        active: false,
        pending_activation: true,
        is_bulk: true,
        box_factor: unitsPerBox,
        parent_product_id: parentId,
        image_url: producto.image_url || '',
        uploaded_image_url: producto.uploaded_image_url || null,
        description: producto.description || '',
        category_general: producto.category_general || [],
        category_specific: producto.category_specific || [],
        category_sub_specific: producto.category_sub_specific || [],
        category_detail: producto.category_detail || [],
        category_species: producto.category_species || [],
        category_brand: producto.category_brand || null,
        category_age: producto.category_age || [],
        category_condition: producto.category_condition || [],
        tags: producto.tags || [],
        brand: producto.brand || null,
        is_prescription: producto.is_prescription || false,
        requires_prescription: producto.requires_prescription || false,
        local_only: producto.local_only || false,
        requires_refrigeration: producto.requires_refrigeration || false,
      };

      assertNoBase64(payload);
      const { data: created, error } = await supabase
        .from('products')
        .insert(payload)
        .select(CAJAS_COLS_STR)
        .single();

      if (error) throw error;
      if (created) {
        setCajas(prev => [created as Caja, ...prev]);
        showToast(`✅ Caja creada: ${boxName}`);
      }
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'desconocido'), false);
    } finally {
      setCreatingIds(prev => { const n = new Set(prev); n.delete(producto.id); return n; });
    }
  };

  // Construir set de product_codes que ya tienen caja creada
  // La caja tiene product_code = '[origen]-C[N]', entonces el origen es todo antes de '-C'
  const codigosConCaja = new Set(
    cajas
      .map(c => {
        const match = c.product_code.match(/^(.+)-C\d+$/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[]
  );

  const matchesSearch = (name: string, code: string) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
  };

  const cajasFiltradas = cajas.filter(c => matchesSearch(c.name, c.product_code));

  const productosSinCaja = productosConCaja
    .filter(p => !codigosConCaja.has(p.product_code))
    .filter(p => matchesSearch(p.name, p.product_code));
  const productosYaConCaja = productosConCaja
    .filter(p => codigosConCaja.has(p.product_code))
    .filter(p => matchesSearch(p.name, p.product_code));

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Input oculto para subir imagen */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-yellow-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presentación de Cajas</h1>
            <p className="text-sm text-gray-500">Gestión de productos en presentación de caja</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncPrices}
            disabled={syncingPrices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {syncingPrices ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncingPrices ? 'Sincronizando...' : 'Sincronizar precios y stock'}
          </button>
          <div className="relative max-w-sm w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-yellow-500 focus:ring-0 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('creadas')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'creadas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📦 Cajas creadas ({cajas.length})
        </button>
        <button
          onClick={() => setTab('crear')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'crear' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          ➕ Crear cajas ({productosConCaja.length})
        </button>
      </div>

      {/* ══ PESTAÑA 1: CAJAS CREADAS ══ */}
      {tab === 'creadas' && (
        <div className="space-y-4">
          {/* Acciones masivas */}
          {cajas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === cajas.length && cajas.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">Seleccionar todos ({cajas.length})</span>
              </label>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-gray-400">{selectedIds.size} seleccionados</span>
                  <button
                    onClick={() => handleMassToggleActive(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Check size={12} /> Activar seleccionados
                  </button>
                  <button
                    onClick={() => handleMassToggleActive(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X size={12} /> Desactivar seleccionados
                  </button>
                </>
              )}
            </div>
          )}

          {cajas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">No hay presentaciones de caja creadas todavía.</p>
              <button onClick={() => setTab('crear')} className="mt-3 text-yellow-600 text-sm font-semibold hover:underline">
                Ir a crear cajas →
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 w-8"></th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Imagen</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Factor</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cajasFiltradas.map(caja => {
                      const isLoading = loadingIds.has(caja.id);
                      const isUploading = uploadingId === caja.id;
                      const imgUrl = caja.uploaded_image_url || caja.image_url;
                      const grupo = grupos.find(g => g.id === caja.parent_product_id);
                      return (
                        <tr key={caja.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(caja.id) ? 'bg-yellow-50' : ''}`}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(caja.id)}
                              onChange={() => toggleSelected(caja.id)}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div
                              className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 cursor-pointer flex items-center justify-center hover:border-yellow-400 transition-colors"
                              onClick={() => {
                                uploadTargetId.current = caja.id;
                                fileInputRef.current?.click();
                              }}
                              title="Click para cambiar imagen"
                            >
                              {isUploading ? (
                                <Loader2 size={14} className="animate-spin text-gray-400" />
                              ) : imgUrl ? (
                                <img src={imgUrl} alt={caja.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <ImageIcon size={14} className="text-gray-300" />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-900 text-xs leading-tight max-w-[180px]">{caja.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{caja.product_code}</p>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                              ×{caja.box_factor}u
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-semibold text-gray-700">
                            Gs. {Number(caja.price).toLocaleString('es-PY')}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={`text-xs font-bold ${(caja.stock || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {caja.stock || 0}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={groupOverrides[caja.id] ?? (caja.parent_product_id || '')}
                              onChange={e => setGroupOverrides(prev => ({ ...prev, [caja.id]: e.target.value }))}
                              disabled={isLoading}
                              className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-yellow-500 outline-none max-w-[160px]"
                            >
                              <option value="">Sin grupo</option>
                              {grupos.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                            {(groupOverrides[caja.id] !== undefined && groupOverrides[caja.id] !== (caja.parent_product_id || '')) && (
                              <button
                                onClick={() => handleLinkGroup(caja.id, groupOverrides[caja.id])}
                                disabled={isLoading}
                                className="ml-1 text-[10px] px-1.5 py-0.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-40 transition-colors"
                              >
                                {isLoading ? '...' : 'Guardar'}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleSingleToggleActive(caja)}
                              disabled={isLoading}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors mx-auto ${
                                caja.active
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {isLoading ? <Loader2 size={10} className="animate-spin" /> : caja.active ? <Check size={10} /> : <X size={10} />}
                              {caja.active ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => {
                                uploadTargetId.current = caja.id;
                                fileInputRef.current?.click();
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-medium rounded-lg transition-colors mx-auto"
                            >
                              <ImageIcon size={10} /> Imagen
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PESTAÑA 2: CREAR CAJAS MASIVAMENTE ══ */}
      {tab === 'crear' && (
        <div className="space-y-4">
          <div className="space-y-4">
            {/* Subpestañas */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setSubTab('sin-caja')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === 'sin-caja'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sin P.C. ({productosSinCaja.length})
              </button>
              <button
                onClick={() => setSubTab('con-caja')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === 'con-caja'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Con P.C. ({productosYaConCaja.length})
              </button>
            </div>

            {subTab === 'sin-caja' && (
              <p className="text-sm text-gray-500">
                {productosSinCaja.length} productos sin presentación de caja creada todavía.
              </p>
            )}
            {subTab === 'con-caja' && (
              <p className="text-sm text-gray-500">
                {productosYaConCaja.length} productos que ya tienen presentación de caja creada.
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Producto base</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio unit.</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Caja detectada</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grupo origen</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(subTab === 'sin-caja' ? productosSinCaja : productosYaConCaja).map(p => {
                    const boxInfo = detectBoxPresentation(p.volume_prices, p.price);
                    if (!boxInfo.hasBox) return null;
                    const isCreating = creatingIds.has(p.id);
                    const grupoOrigen = grupos.find(g => g.id === p.parent_product_id);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {(p.uploaded_image_url || p.image_url) && (
                              <img
                                src={p.uploaded_image_url || p.image_url || ''}
                                alt={p.name}
                                className="w-8 h-8 object-contain rounded border border-gray-100"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 text-xs leading-tight max-w-[200px] truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{p.product_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-gray-600">
                          Gs. {Number(p.price).toLocaleString('es-PY')}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold">
                          <span className={(p.stock || 0) > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                            {p.stock || 0}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[10px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 w-fit">
                            <span className="font-bold">×{boxInfo.unitsPerBox} unidades</span>
                            <span className="text-gray-500 ml-1">→ Gs. {Number(boxInfo.boxPrice).toLocaleString('es-PY')}</span>
                            {!boxInfo.dataIsComplete && <span className="ml-1 text-orange-500">(parcial)</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {grupoOrigen ? (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                              {grupoOrigen.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Producto suelto</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {subTab === 'con-caja' ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg mx-auto w-fit">
                              ✓ Ya creada
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCrearCaja(p)}
                              disabled={isCreating}
                              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white text-xs font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-40 transition-colors mx-auto"
                            >
                              {isCreating ? <Loader2 size={11} className="animate-spin" /> : <Package size={11} />}
                              {isCreating ? 'Creando...' : 'Crear caja'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
