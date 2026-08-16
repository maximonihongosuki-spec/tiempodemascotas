'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Download, Play, Pause, Square, CheckCircle, XCircle, SkipForward, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';

const SITEMAPS = [
  'https://tiempodemascotas.com/product-sitemap.xml',
  'https://tiempodemascotas.com/product-sitemap2.xml',
  'https://tiempodemascotas.com/product-sitemap3.xml',
];

const IMPORT_SECRET = 'tiempo-de-mascotas-1415051811';
const IMPORT_ENDPOINT = '/api/import-product';
const UPDATE_ENDPOINT = '/api/update-product';
const DELAY_MS = 1500;

type LogEntry = {
  id: number;
  type: 'success' | 'error' | 'skip' | 'info';
  message: string;
  time: string;
};

type Stats = {
  total: number;
  processed: number;
  success: number;
  skipped: number;
  errors: number;
};

type ImportedProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  source_url: string;
  image_url: string;
};

function parseSitemapXml(xmlText: string): { url: string; image_url: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const urlNodes = doc.querySelectorAll('url');
  const results: { url: string; image_url: string }[] = [];
  urlNodes.forEach((node) => {
    const loc = node.querySelector('loc')?.textContent?.trim() || '';
    if (!loc.includes('/producto/')) return;
    const imageLoc = node.getElementsByTagNameNS('http://www.google.com/schemas/sitemap-image/1.1', 'loc')[0]?.textContent?.trim() || '';
    results.push({ url: loc, image_url: imageLoc });
  });
  return results;
}

async function scrapeProduct(url: string): Promise<{ name: string; price: number; description: string; image_url: string } | null> {
  try {
    const res = await fetch(`/api/proxy-scrape?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const name =
      doc.querySelector('h1.product_title')?.textContent?.trim() ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';

    const priceRaw =
      doc.querySelector('.product_price .woocommerce-Price-amount bdi')?.textContent?.trim() ||
      doc.querySelector('p.price .woocommerce-Price-amount bdi')?.textContent?.trim() ||
      doc.querySelector('.woocommerce-Price-amount bdi')?.textContent?.trim() || '';

    const price = priceRaw
      ? parseFloat(priceRaw.replace(/[^\d.]/g, '').replace('.', '')) || 0
      : 0;

    const stockText = doc.querySelector('p.stock')?.textContent?.trim() || '';
    const stockMatch = stockText.match(/\d+/);
    const stock = stockMatch ? parseInt(stockMatch[0]) : 10;

    const description =
      doc.querySelector('#tab-description')?.textContent?.trim() ||
      doc.querySelector('.woocommerce-product-details__short-description')?.textContent?.trim() ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';

    const image_url =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || '';

    if (!name) return null;
    return { name, price, description, image_url, stock } as any;
  } catch {
    return null;
  }
}

export default function ImportarProductosPage() {
  // --- Importación ---
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [stats, setStats] = useState<Stats>({ total: 0, processed: 0, success: 0, skipped: 0, errors: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const logIdRef = useRef(0);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // --- Actualización ---
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterZeroPrice, setFilterZeroPrice] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [updateLogs, setUpdateLogs] = useState<LogEntry[]>([]);
  const [updateStats, setUpdateStats] = useState<Stats>({ total: 0, processed: 0, success: 0, skipped: 0, errors: 0 });
  const updatePausedRef = useRef(false);
  const updateStoppedRef = useRef(false);
  const updateLogsEndRef = useRef<HTMLDivElement>(null);
  const updateLogIdRef = useRef(0);

  useEffect(() => {
    loadImportedProducts();
  }, []);

  const loadImportedProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, stock, source_url, image_url')
        .not('source_url', 'is', null)
        .order('created_at', { ascending: false });
      setImportedProducts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = filterZeroPrice
    ? importedProducts.filter(p => p.price === 0)
    : importedProducts;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    const entry: LogEntry = { id: logIdRef.current++, type, message, time: new Date().toLocaleTimeString('es-PY') };
    setLogs(prev => [...prev.slice(-200), entry]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const addUpdateLog = (type: LogEntry['type'], message: string) => {
    const entry: LogEntry = { id: updateLogIdRef.current++, type, message, time: new Date().toLocaleTimeString('es-PY') };
    setUpdateLogs(prev => [...prev.slice(-200), entry]);
    setTimeout(() => updateLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const waitIfPaused = async (ref: React.MutableRefObject<boolean>, stoppedRef: React.MutableRefObject<boolean>) => {
    while (ref.current && !stoppedRef.current) await sleep(500);
  };

  // --- IMPORTACIÓN ---
  const handleStart = async () => {
    setStatus('running');
    setLogs([]);
    setStats({ total: 0, processed: 0, success: 0, skipped: 0, errors: 0 });
    pausedRef.current = false;
    stoppedRef.current = false;

    addLog('info', 'Leyendo sitemaps...');
    const allProducts: { url: string; image_url: string }[] = [];

    for (const sitemapUrl of SITEMAPS) {
      try {
        const res = await fetch(`/api/proxy-scrape?url=${encodeURIComponent(sitemapUrl)}`);
        const xml = await res.text();
        const products = parseSitemapXml(xml);
        addLog('info', `${sitemapUrl.split('/').pop()}: ${products.length} productos encontrados`);
        allProducts.push(...products);
      } catch {
        addLog('error', `Error leyendo ${sitemapUrl}`);
      }
    }

    setStats(s => ({ ...s, total: allProducts.length }));
    addLog('info', `Total: ${allProducts.length} productos a importar`);

    for (let i = 0; i < allProducts.length; i++) {
      if (stoppedRef.current) break;
      await waitIfPaused(pausedRef, stoppedRef);

      const { url, image_url: sitemapImage } = allProducts[i];
      setCurrentUrl(url);

      const scraped = await scrapeProduct(url);
      if (!scraped) {
        addLog('error', `[${i + 1}] Sin datos: ${url.split('/producto/')[1]?.replace(/\/$/, '') || url}`);
        setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
        await sleep(DELAY_MS);
        continue;
      }

      try {
        const res = await fetch(IMPORT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-import-secret': IMPORT_SECRET },
          body: JSON.stringify({
            name: scraped.name,
            price: scraped.price,
            description: scraped.description,
            image_url: scraped.image_url || sitemapImage,
            source_url: url,
            category_general: 'Importado',
            category_specific: 'Importado',
            category_species: ['Otros'],
          }),
        });
        const data = await res.json();
        if (data.skipped) {
          addLog('skip', `[${i + 1}] Ya existe: ${scraped.name}`);
          setStats(s => ({ ...s, processed: s.processed + 1, skipped: s.skipped + 1 }));
        } else if (data.success) {
          addLog('success', `[${i + 1}] ✓ ${scraped.name} — Gs. ${scraped.price.toLocaleString()}`);
          setStats(s => ({ ...s, processed: s.processed + 1, success: s.success + 1 }));
        } else {
          addLog('error', `[${i + 1}] Error: ${data.error || 'desconocido'}`);
          setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
        }
      } catch {
        addLog('error', `[${i + 1}] Fallo al importar: ${scraped.name}`);
        setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
      }
      await sleep(DELAY_MS);
    }

    setCurrentUrl('');
    setStatus('done');
    addLog('info', '✅ Importación finalizada');
    loadImportedProducts();
  };

  // --- ACTUALIZACIÓN ---
  const handleUpdate = async () => {
    if (selectedIds.size === 0) return;
    const toUpdate = importedProducts.filter(p => selectedIds.has(p.id));

    setUpdateStatus('running');
    setUpdateLogs([]);
    setUpdateStats({ total: toUpdate.length, processed: 0, success: 0, skipped: 0, errors: 0 });
    updatePausedRef.current = false;
    updateStoppedRef.current = false;

    addUpdateLog('info', `Actualizando ${toUpdate.length} productos seleccionados...`);

    for (let i = 0; i < toUpdate.length; i++) {
      if (updateStoppedRef.current) break;
      await waitIfPaused(updatePausedRef, updateStoppedRef);

      const product = toUpdate[i];

      const scraped = await scrapeProduct(product.source_url) as any;
      if (!scraped) {
        addUpdateLog('error', `[${i + 1}] Sin datos: ${product.name}`);
        setUpdateStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
        await sleep(DELAY_MS);
        continue;
      }

      try {
        const res = await fetch(UPDATE_ENDPOINT, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-import-secret': IMPORT_SECRET },
          body: JSON.stringify({
            id: product.id,
            price: scraped.price || product.price,
            stock: scraped.stock ?? 10,
            description: scraped.description,
            image_url: scraped.image_url || product.image_url,
          }),
        });
        const data = await res.json();
        if (data.success) {
          addUpdateLog('success', `[${i + 1}] ✓ ${product.name} — Gs. ${(scraped.price || 0).toLocaleString()} · Stock: ${scraped.stock ?? 10}`);
          setUpdateStats(s => ({ ...s, processed: s.processed + 1, success: s.success + 1 }));
        } else {
          addUpdateLog('error', `[${i + 1}] Error: ${data.error} — ${product.name}`);
          setUpdateStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
        }
      } catch {
        addUpdateLog('error', `[${i + 1}] Fallo: ${product.name}`);
        setUpdateStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
      }
      await sleep(DELAY_MS);
    }

    setUpdateStatus('done');
    addUpdateLog('info', '✅ Actualización finalizada');
    loadImportedProducts();
    setSelectedIds(new Set());
  };

  const progress = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const updateProgress = updateStats.total > 0 ? Math.round((updateStats.processed / updateStats.total) * 100) : 0;

  const logIcon = (type: LogEntry['type']) => {
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />;
    if (type === 'error') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    if (type === 'skip') return <SkipForward className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
    return <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  };

  const LogBlock = ({ logs, logsEndRef }: { logs: LogEntry[], logsEndRef: React.RefObject<HTMLDivElement> }) => (
    <div className="bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-700">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Log</p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-2 text-xs">
            {logIcon(log.type)}
            <span className="text-slate-400 flex-shrink-0">{log.time}</span>
            <span className={
              log.type === 'success' ? 'text-green-400' :
              log.type === 'error' ? 'text-red-400' :
              log.type === 'skip' ? 'text-yellow-400' : 'text-slate-300'
            }>{log.message}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ===== SECCIÓN 1: IMPORTACIÓN ===== */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Download className="w-6 h-6 text-blue-600" />
            Importar Productos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Importa productos desde tiempodemascotas.com — {SITEMAPS.length} sitemaps · ~2530 productos
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Importados', value: stats.success, color: 'text-green-600' },
            { label: 'Ya existían', value: stats.skipped, color: 'text-yellow-600' },
            { label: 'Errores', value: stats.errors, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {stats.total > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso: {stats.processed} / {stats.total}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            {currentUrl && <p className="text-xs text-gray-400 mt-2 truncate">Procesando: {currentUrl}</p>}
          </div>
        )}

        <div className="flex gap-3">
          {status === 'idle' || status === 'done' ? (
            <button onClick={handleStart} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Play className="w-4 h-4" />
              {status === 'done' ? 'Reiniciar importación' : 'Iniciar importación'}
            </button>
          ) : status === 'running' ? (
            <>
              <button onClick={() => { pausedRef.current = true; setStatus('paused'); }} className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors shadow-sm">
                <Pause className="w-4 h-4" /> Pausar
              </button>
              <button onClick={() => { stoppedRef.current = true; setStatus('done'); }} className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-sm">
                <Square className="w-4 h-4" /> Detener
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { pausedRef.current = false; setStatus('running'); }} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
                <Play className="w-4 h-4" /> Reanudar
              </button>
              <button onClick={() => { stoppedRef.current = true; setStatus('done'); }} className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-sm">
                <Square className="w-4 h-4" /> Detener
              </button>
            </>
          )}
        </div>

        {logs.length > 0 && <LogBlock logs={logs} logsEndRef={logsEndRef} />}
      </div>

      <hr className="border-gray-200" />

      {/* ===== SECCIÓN 2: ACTUALIZACIÓN ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              Actualizar productos importados
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Seleccioná productos para actualizar precio y stock desde el sitio origen.
            </p>
          </div>
          <button onClick={loadImportedProducts} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg">
            <RefreshCw className="w-3 h-3" /> Recargar lista
          </button>
        </div>

        {/* Filtros y acciones */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={filterZeroPrice}
              onChange={e => { setFilterZeroPrice(e.target.checked); setSelectedIds(new Set()); }}
              className="rounded"
            />
            <Filter className="w-3 h-3" />
            Solo precio = 0
          </label>
          <span className="text-xs text-gray-400">{filteredProducts.length} productos · {selectedIds.size} seleccionados</span>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-gray-600">Producto</th>
                  <th className="p-3 text-right font-medium text-gray-600">Precio</th>
                  <th className="p-3 text-right font-medium text-gray-600">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingProducts ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">Cargando...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">No hay productos importados</td></tr>
                ) : filteredProducts.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-3">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-10 h-10 object-contain rounded-lg bg-gray-100 flex-shrink-0" />}
                        <span className="font-medium text-gray-800 line-clamp-1">{p.name}</span>
                      </div>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold ${p.price === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                      Gs. {p.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-600">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón actualizar */}
        {selectedIds.size > 0 && updateStatus !== 'running' && (
          <button
            onClick={handleUpdate}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar {selectedIds.size} producto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </button>
        )}

        {/* Progress actualización */}
        {updateStats.total > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso: {updateStats.processed} / {updateStats.total}</span>
              <span className="font-semibold">{updateProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-green-600 h-3 rounded-full transition-all duration-300" style={{ width: `${updateProgress}%` }} />
            </div>
          </div>
        )}

        {updateLogs.length > 0 && <LogBlock logs={updateLogs} logsEndRef={updateLogsEndRef} />}
      </div>

    </div>
  );
}
