'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BrainCircuit,
  Settings,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

type WebpStage = {
  stage: string;
  status: 'ok' | 'error';
  detail: string;
  duration_ms: number;
  size_bytes?: number;
};

type CategorizationStage = {
  stage: string;
  status: 'ok' | 'error';
  detail: string;
  duration_ms: number;
  data?: any;
};

function generateWebpReport(result: any, inputInfo: any): string {
  const now = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' });
  const lines: string[] = [];
  lines.push('══════════════════════════════════════════════════════════════');
  lines.push(`REPORTE CONVERSIÓN WEBP — tiempodemascotas.com.py — ${now}`);
  lines.push('══════════════════════════════════════════════════════════════');
  lines.push(`MODO: ${result.mode === 'native' ? 'Nativo (sharp)' : 'n8n webhook'}`);
  lines.push(`ORIGEN: ${inputInfo.type === 'file' ? `Archivo local "${inputInfo.name}"` : `URL externa`}`);
  if (inputInfo.type === 'url') lines.push(`URL: ${inputInfo.url}`);
  lines.push('');
  lines.push('ETAPAS:');
  for (const stage of result.stages || []) {
    const icon = stage.status === 'ok' ? '[✓]' : '[✗]';
    lines.push(`  ${icon} ${stage.stage.padEnd(40)} ${String(stage.duration_ms + 'ms').padStart(6)}   ${stage.detail}`);
  }
  lines.push('');
  lines.push('RESULTADO FINAL:');
  if (result.ok && result.input_size_bytes && result.output_size_bytes) {
    const inputKb = (result.input_size_bytes / 1024).toFixed(1);
    const outputKb = (result.output_size_bytes / 1024).toFixed(1);
    const reduction = (((result.input_size_bytes - result.output_size_bytes) / result.input_size_bytes) * 100).toFixed(1);
    lines.push(`  Original:    ${result.input_size_bytes.toLocaleString()} bytes (${inputKb} KB)`);
    lines.push(`  WebP:        ${result.output_size_bytes.toLocaleString()} bytes (${outputKb} KB)`);
    lines.push(`  Reducción:   ${reduction}% de ahorro`);
    lines.push(`  Estado:      ✓ ÉXITO`);
  } else {
    lines.push(`  Estado:      ✗ ERROR — ${result.error || 'desconocido'}`);
  }
  lines.push('');
  lines.push('Generado desde: /owner/debug-procesamiento');
  lines.push('══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

function generateCategorizationReport(result: any, selectedProducts: any[]): string {
  const now = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' });
  const totalMs = (result.stages || []).reduce((acc: number, s: any) => acc + s.duration_ms, 0);
  const lines: string[] = [];
  lines.push('══════════════════════════════════════════════════════════════');
  lines.push(`REPORTE CATEGORIZACIÓN IA — tiempodemascotas.com.py — ${now}`);
  lines.push('══════════════════════════════════════════════════════════════');
  lines.push(`MODO: ${result.mode === 'native' ? `Nativo (${result.model_used || 'OpenAI'})` : 'n8n webhook'}`);
  lines.push(`PRODUCTOS: ${selectedProducts.length} | DURACIÓN TOTAL: ${totalMs.toLocaleString()}ms`);
  lines.push('');
  lines.push('ETAPAS:');
  for (const stage of result.stages || []) {
    const icon = stage.status === 'ok' ? '[✓]' : '[✗]';
    lines.push(`  ${icon} ${stage.stage.padEnd(40)} ${String(stage.duration_ms + 'ms').padStart(6)}   ${stage.detail}`);
  }
  lines.push('');
  if (result.results && result.results.length > 0) {
    lines.push('RESULTADOS:');
    lines.push('');
    result.results.forEach((r: any, i: number) => {
      const nombre = selectedProducts.find(p => p.id === r.id)?.nombre || r.id;
      lines.push(`  #${i + 1}  ${nombre}`);
      lines.push(`       CG: ${r.category_general || '—'} | CE: ${r.category_specific || '—'}`);
      lines.push(`       Especie: ${r.category_species?.join(', ') || 'Todos'} | Marca: ${r.category_brand || '—'}`);
      lines.push(`       Edad: ${r.category_age?.join(', ') || '—'} | Condición: ${r.category_condition?.join(', ') || '—'}`);
      lines.push(`       Prescripción: ${r.is_prescription ? 'Sí' : 'No'} | A granel: ${r.is_bulk ? 'Sí' : 'No'}`);
      lines.push(`       Tags: ${r.tags?.join(', ') || '—'}`);
      lines.push('');
    });
  } else {
    lines.push(`RESULTADO: ✗ ERROR — ${result.error || 'desconocido'}`);
    lines.push('');
  }
  // Incluir el system prompt si está disponible
  const promptStage = result.stages?.find((s: any) => s.stage.includes('prompt') || s.stage.includes('Prompt'));
  if (promptStage?.data?.systemPrompt) {
    lines.push('SYSTEM PROMPT ENVIADO:');
    lines.push('──────────────────────────────────────────────────────────────');
    lines.push(promptStage.data.systemPrompt);
    lines.push('──────────────────────────────────────────────────────────────');
    lines.push('');
  }
  lines.push('Generado desde: /owner/debug-procesamiento');
  lines.push('══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

async function safeFetchJson(url: string, init?: RequestInit): Promise<{
  ok: boolean;
  data?: any;
  errorInfo?: {
    httpStatus: number;
    contentType: string;
    rawText: string;
    parseError?: string;
  };
}> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();
    
    // Intentar parsear como JSON
    try {
      const data = JSON.parse(rawText);
      return { ok: res.ok, data, errorInfo: res.ok ? undefined : {
        httpStatus: res.status,
        contentType,
        rawText: rawText.slice(0, 2000),
      }};
    } catch (parseErr: any) {
      return {
        ok: false,
        errorInfo: {
          httpStatus: res.status,
          contentType,
          rawText: rawText.slice(0, 2000),
          parseError: parseErr.message,
        },
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      errorInfo: {
        httpStatus: 0,
        contentType: 'network-error',
        rawText: err.message || 'Error de red / conexión fallida',
        parseError: 'No se pudo contactar con el servidor',
      },
    };
  }
}

function ErrorInfoDisplay({ errorInfo }: { errorInfo: { httpStatus: number; contentType: string; rawText: string; parseError?: string } }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-red-700">
        <span className="text-2xl">⚠️</span>
        <h3 className="font-semibold">El servidor devolvió una respuesta inesperada</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">HTTP Status:</span>{' '}
          <span className="font-mono font-semibold text-red-700">
            {errorInfo.httpStatus}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Content-Type:</span>{' '}
          <span className="font-mono text-gray-800">
            {errorInfo.contentType || '(vacío)'}
          </span>
        </div>
      </div>
      
      {errorInfo.parseError && (
        <div className="text-sm">
          <span className="text-gray-500">Error de parseo:</span>{' '}
          <span className="text-red-700">{errorInfo.parseError}</span>
        </div>
      )}
      
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">
          Respuesta cruda del servidor (primeros 2000 caracteres):
        </p>
        <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap break-words font-mono">
{errorInfo.rawText}
        </pre>
      </div>
      
      <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded p-2">
        💡 Si la respuesta es HTML de Vercel (empieza con &lt;!DOCTYPE), significa que 
        la función serverless crashó. Revisar los logs en Vercel → Functions → debug/webp 
        o debug/categorization.
      </div>
    </div>
  );
}

export default function DebugProcesamientoPage() {
  const [activeTab, setActiveTab] = useState<'webp' | 'cat'>('webp');
  
  // Status actual del sistema
  const [systemStatus, setSystemStatus] = useState<{
    use_native_webp: boolean;
    use_native_categorization: boolean;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Estados WebP
  const [webpInputKind, setWebpInputKind] = useState<'file' | 'url'>('file');
  const [webpUrl, setWebpUrl] = useState('');
  const [webpFile, setWebpFile] = useState<File | null>(null);
  const [webpForceNative, setWebpForceNative] = useState(true); // default true para probar el desarrollo nuevo
  const [webpLoading, setWebpLoading] = useState(false);
  const [webpError, setWebpError] = useState<string | null>(null);
  const [webpErrorInfo, setWebpErrorInfo] = useState<any | null>(null);
  const [webpResult, setWebpResult] = useState<{
    ok: boolean;
    mode: 'native' | 'n8n';
    stages: WebpStage[];
    input_size_bytes?: number;
    output_size_bytes?: number;
    base64_image?: string;
  } | null>(null);

  // Estados Categorización
  const [realProducts, setRealProducts] = useState<{ id: string; name: string }[]>([]);
  const [categoriesList, setCategoriesList] = useState<{ name: string; type: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<{ [id: string]: boolean }>({});
  const [productSearchText, setProductSearchText] = useState('');

  const [catForceNative, setCatForceNative] = useState(true); // default true
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [catErrorInfo, setCatErrorInfo] = useState<any | null>(null);
  const [catResult, setCatResult] = useState<{
    ok: boolean;
    mode: 'native' | 'n8n';
    stages: CategorizationStage[];
    results?: any[];
  } | null>(null);

  // Estados Modal de Revisión
  const [isMockReviewOpen, setIsMockReviewOpen] = useState(false);
  const [mockReviewItems, setMockReviewItems] = useState<any[]>([]);

  // Etapas del acordeón
  const [expandedStages, setExpandedStages] = useState<{ [key: string]: boolean }>({});

  const [copied, setCopied] = useState(false);

  const handleCopyReport = (reportText: string) => {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleStage = (key: string) => {
    setExpandedStages(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/debug/status');
      if (res.ok) {
        setSystemStatus(await res.json());
      }
    } catch (e) {
      console.error('Error loading current system status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadRealProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/debug/categorization?list=true');
      if (res.ok) {
        const data = await res.json();
        setRealProducts(data.products || []);
        setCategoriesList(data.categories || []);
      }
    } catch (e) {
      console.error('Error loading real products for selection:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'cat') {
      loadRealProducts();
    }
  }, [activeTab]);

  const handleWebpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebpLoading(true);
    setWebpError(null);
    setWebpErrorInfo(null);
    setWebpResult(null);
    setExpandedStages({});

    try {
      let fetchResult;
      if (webpInputKind === 'file') {
        if (!webpFile) {
          throw new Error('Debe seleccionar un archivo de imagen');
        }
        const formData = new FormData();
        formData.append('file', webpFile);
        formData.append('forceNative', String(webpForceNative));
        fetchResult = await safeFetchJson('/api/debug/webp', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!webpUrl.trim()) {
          throw new Error('Debe proveer una URL de imagen válida');
        }
        fetchResult = await safeFetchJson('/api/debug/webp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: webpUrl, forceNative: webpForceNative }),
        });
      }

      if (!fetchResult.ok) {
        if (fetchResult.errorInfo) {
          setWebpErrorInfo(fetchResult.errorInfo);
        }
        setWebpResult(fetchResult.data || null);
        setWebpError(fetchResult.data?.error || 'Error al procesar la imagen');
      } else {
        const data = fetchResult.data;
        setWebpResult(data);
        const defaultExpanded: { [key: string]: boolean } = {};
        data.stages?.forEach((s: WebpStage, i: number) => {
          if (s.status === 'error') {
            defaultExpanded[`webp-${i}`] = true;
          }
        });
        setExpandedStages(defaultExpanded);
      }
    } catch (err: any) {
      setWebpError(err.message || 'Error inesperado de comunicación');
    } finally {
      setWebpLoading(false);
    }
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedIds = Object.keys(selectedProductIds).filter(id => selectedProductIds[id]);
    if (selectedIds.length === 0) {
      setCatError('Debe seleccionar al menos un producto real para categorizar.');
      return;
    }

    setCatLoading(true);
    setCatError(null);
    setCatErrorInfo(null);
    setCatResult(null);
    setExpandedStages({});

    try {
      const fetchResult = await safeFetchJson('/api/debug/categorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: selectedIds,
          productos: [],
          forceNative: catForceNative
        }),
      });

      if (!fetchResult.ok) {
        if (fetchResult.errorInfo) {
          setCatErrorInfo(fetchResult.errorInfo);
        }
        setCatResult(fetchResult.data || null);
        setCatError(fetchResult.data?.error || 'La categorización falló');
      } else {
        const data = fetchResult.data;
        setCatResult(data);
        const defaultExpanded: { [key: string]: boolean } = {};
        data.stages?.forEach((s: any, i: number) => {
          if (s.status === 'error' || s.stage.toLowerCase().includes('prompt')) {
            defaultExpanded[`cat-${i}`] = true;
          }
        });
        setExpandedStages(defaultExpanded);
      }
    } catch (err: any) {
      setCatError(err.message || 'Error inesperado de comunicación con AI');
    } finally {
      setCatLoading(false);
    }
  };

  const getFormatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Validar si el resultado de categorización del producto está completo para la tabla general
  const getProductCompeteness = (p: any) => {
    const hasSpec = !!p.category_specific && p.category_specific !== 'N/A' && p.category_specific !== 'Ninguna';
    const hasBrand = !!p.category_brand && p.category_brand !== 'N/A';
    const hasSpecies = Array.isArray(p.category_species) && p.category_species.length > 0;
    
    if (hasSpec && hasBrand && hasSpecies) {
      return { label: 'Completo', color: 'bg-green-100 text-green-800 border-green-200' };
    }
    return { label: 'Incompleto', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  };

  // Mapear resultados al abrir el modal de revisión simulación
  const openMockReviewModal = () => {
    if (!catResult || !catResult.results) return;

    const items = catResult.results.map((r: any, idx: number) => {
      const productObj = realProducts.find(p => p.id === r.id);
      const name = productObj ? productObj.name : `Producto ${idx + 1}`;

      let itemTags: string[] = [];
      if (Array.isArray(r.tags)) {
        itemTags = r.tags;
      } else if (typeof r.tags === 'string') {
        try {
          const parsed = JSON.parse(r.tags);
          if (Array.isArray(parsed)) itemTags = parsed;
        } catch {
          itemTags = r.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
      }

      let itemSpecies: string[] = [];
      if (Array.isArray(r.category_species)) {
        itemSpecies = r.category_species;
      } else if (typeof r.category_species === 'string') {
        try {
          const parsed = JSON.parse(r.category_species);
          if (Array.isArray(parsed)) itemSpecies = parsed;
        } catch {
          itemSpecies = r.category_species.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      return {
        id: r.id || `mock-${idx}-${Date.now()}`,
        name: name,
        category_general: r.category_general || '',
        category_specific: r.category_specific || '',
        category_species: itemSpecies,
        category_brand: r.category_brand || '',
        tags: itemTags,
        newTagInput: ''
      };
    });

    setMockReviewItems(items);
    setIsMockReviewOpen(true);
  };

  const checkItemCompleteness = (item: any) => {
    const hasGeneral = !!item.category_general && item.category_general !== 'N/A' && item.category_general !== 'Ninguna';
    const hasSpecific = !!item.category_specific && item.category_specific !== 'N/A' && item.category_specific !== 'Ninguna';
    const hasSpecies = Array.isArray(item.category_species) && item.category_species.length > 0;
    const hasBrand = !!item.category_brand && item.category_brand !== 'N/A' && item.category_brand.trim() !== '';

    return hasGeneral && hasSpecific && hasSpecies && hasBrand;
  };

  const updateReviewItemField = (id: string, field: string, value: any) => {
    setMockReviewItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const removeTag = (itemId: string, tagToRemove: string) => {
    setMockReviewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          tags: item.tags.filter((t: string) => t !== tagToRemove)
        };
      }
      return item;
    }));
  };

  const addTag = (itemId: string, tagToAdd: string) => {
    if (!tagToAdd || !tagToAdd.trim()) return;
    setMockReviewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const cleaned = tagToAdd.trim();
        if (item.tags.includes(cleaned)) {
          return { ...item, newTagInput: '' };
        }
        return {
          ...item,
          tags: [...item.tags, cleaned],
          newTagInput: ''
        };
      }
      return item;
    }));
  };

  // Filtrado y renderizado del listado de productos reales
  const filteredProducts = realProducts.filter(p =>
    (p.name || '').toLowerCase().includes(productSearchText.toLowerCase())
  );
  
  const visibleProducts = filteredProducts.slice(0, 50);

  const handleSelectAllVisible = () => {
    const nextSelected = { ...selectedProductIds };
    visibleProducts.forEach(p => {
      nextSelected[p.id] = true;
    });
    setSelectedProductIds(nextSelected);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectedCount = Object.values(selectedProductIds).filter(Boolean).length;

  const uniqueGenerales = Array.from(new Set([
    ...categoriesList.filter(c => c.type === 'general').map(c => c.name),
    'Alimento', 'Juguetes', 'Ropa', 'Farmacia', 'Accesorios', 'Cuidado, Higiene y Bienestar', 'Varios', 'Jardinería'
  ])).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Contenedor del encabezado */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 rounded text-indigo-700">
                <BrainCircuit size={22} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Herramienta de Diagnóstico
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Verifica paso a paso el procesamiento asincrónico e IA en el ecosistema ÉTER
            </p>
          </div>

          {/* Estado de Configuración actual */}
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-xs flex flex-col gap-1.5 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 flex items-center gap-1">
                <Settings size={12} className="text-gray-500 animate-spin-slow" /> Configuración Guardada
              </span>
              <button 
                onClick={loadStatus} 
                disabled={loadingStatus}
                className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loadingStatus ? 'animate-spin' : ''} />
              </button>
            </div>
            {loadingStatus ? (
              <span className="text-gray-400">Cargando estado...</span>
            ) : (
              <div className="space-y-1 mt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Imágenes WebP:</span>
                  <span className={`font-semibold ${systemStatus?.use_native_webp ? 'text-teal-600' : 'text-blue-600'}`}>
                    {systemStatus?.use_native_webp ? '🔧 sharp nativo' : '🔗 Webhook n8n'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Categorización IA:</span>
                  <span className={`font-semibold ${systemStatus?.use_native_categorization ? 'text-teal-600' : 'text-blue-600'}`}>
                    {systemStatus?.use_native_categorization ? '🔧 Claude-Haiku nativo' : '🔗 Webhook n8n'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de Selección */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl p-2 pb-0 shadow-sm">
          <button
            onClick={() => setActiveTab('webp')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'webp'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ImageIcon size={16} /> 🖼️ Conversión WebP (Cloudinary)
          </button>
          <button
            onClick={() => setActiveTab('cat')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'cat'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BrainCircuit size={16} /> 🧠 Categorización Inteligente (Claude)
          </button>
        </div>

        {/* CONTENIDO TAB 1 — WEBP */}
        {activeTab === 'webp' && (
          <div className="bg-white border-x border-b border-gray-200 rounded-b-xl shadow-sm p-6 space-y-8">
            <form onSubmit={handleWebpSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Origen de la Imagen
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="webpInputKind"
                        checked={webpInputKind === 'file'}
                        onChange={() => setWebpInputKind('file')}
                        className="text-indigo-600"
                      />
                      Archivo Local
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="webpInputKind"
                        checked={webpInputKind === 'url'}
                        onChange={() => setWebpInputKind('url')}
                        className="text-indigo-600"
                      />
                      URL Externa
                    </label>
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={webpForceNative}
                      onChange={(e) => setWebpForceNative(e.target.checked)}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                    <div>
                      <p className="text-xs font-semibold text-indigo-900">Forzar Procesamiento Nativo</p>
                      <p className="text-[10px] text-indigo-600">Salta el toggle guardado y usa sharp localmente en el backend</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                {webpInputKind === 'file' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seleccionar archivo de imagen (PNG, JPG, HEIC, etc.)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setWebpFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-gray-300 rounded-lg p-1"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL de la imagen origen
                    </label>
                    <input
                      type="url"
                      placeholder="https://picsum.photos/seed/pet/800/600"
                      value={webpUrl}
                      onChange={(e) => setWebpUrl(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={webpLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold tracking-wide transition-colors shadow-sm"
                >
                  {webpLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Procesando Imagen...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Probar conversión WebP
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error WebP */}
            {webpErrorInfo ? (
              <ErrorInfoDisplay errorInfo={webpErrorInfo} />
            ) : webpError ? (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex gap-3 text-sm">
                <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Fallo en la prueba</p>
                  <p className="mt-1 opacity-90">{webpError}</p>
                </div>
              </div>
            ) : null}

            {/* Pipeline de etapas WebP */}
            {webpResult && (
              <div className="space-y-6 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Pipeline de Procesamiento Ejecutado</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1.5 items-center">
                    <span>Modo de ejecución:</span>
                    <span className={`px-2 py-0.5 rounded-full border font-semibold ${webpResult.mode === 'native' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                      {webpResult.mode === 'native' ? '🔧 Nativo (Cloudinary)' : '🔗 Proxy n8n'}
                    </span>
                    <span>•</span>
                    <span>Estado global:</span>
                    <span className={`px-2 py-0.5 rounded-full border font-semibold ${webpResult.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                      {webpResult.ok ? 'Éxito' : 'Error'}
                    </span>
                  </div>
                </div>

                {/* Lista de Stages */}
                <div className="space-y-3">
                  {webpResult.stages?.map((stage, i) => {
                    const isExpanded = !!expandedStages[`webp-${i}`];
                    return (
                      <div
                        key={i}
                        className={`border rounded-lg transition-colors overflow-hidden ${
                          stage.status === 'ok'
                            ? 'border-gray-200 hover:bg-gray-50'
                            : 'border-red-200 bg-red-50/20'
                        }`}
                      >
                        <div
                          onClick={() => toggleStage(`webp-${i}`)}
                          className="flex items-center justify-between p-3.5 cursor-pointer selection:bg-transparent"
                        >
                          <div className="flex items-center gap-3">
                            {stage.status === 'ok' ? (
                                <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                            ) : (
                              <XCircle className="text-red-500 shrink-0" size={18} />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {i + 1}. {stage.stage}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Duración: <span className="font-medium text-gray-600">{stage.duration_ms}ms</span>
                                {stage.size_bytes !== undefined && (
                                  <> • Tamaño: <span className="font-medium text-gray-600">{getFormatBytes(stage.size_bytes)}</span></>
                                )}
                              </p>
                            </div>
                          </div>
                          <div>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 text-xs border-t border-gray-100 bg-gray-50">
                            <p className="font-mono text-gray-700 whitespace-pre-wrap py-1.5 font-medium">
                              {stage.detail}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mostrar Comparación y Preview */}
                {webpResult.ok && webpResult.base64_image && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
                      Comparación y Vista Previa (Salida Reconvertida)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-400">Estadísticas de peso:</p>
                          <div className="flex gap-4 text-sm font-medium">
                            <div>
                              <p className="text-xs text-gray-500">Original:</p>
                              <p className="text-gray-800">{getFormatBytes(webpResult.input_size_bytes)}</p>
                            </div>
                            <div className="border-l border-gray-200 pl-4">
                              <p className="text-xs text-indigo-500">Optimizado WebP:</p>
                              <p className="text-indigo-700 font-bold">{getFormatBytes(webpResult.output_size_bytes)}</p>
                            </div>
                            {webpResult.input_size_bytes && webpResult.output_size_bytes ? (
                              <div className="border-l border-gray-200 pl-4">
                                <p className="text-xs text-teal-500">Reducción:</p>
                                <p className="text-teal-700 font-extrabold text-base">
                                  {(((webpResult.input_size_bytes - webpResult.output_size_bytes) / webpResult.input_size_bytes) * 100).toFixed(1)}%
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-lg p-3 flex gap-2 items-start text-xs text-teal-800">
                          <Info size={14} className="text-teal-600 shrink-0 mt-0.5" />
                          <p>
                            La imagen fue completamente redimensionada y transcodificada a <strong>WebP con factor de calidad del 82%</strong> para asegurar velocidad máxima de carga móvil.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <p className="text-xs text-gray-500 mb-2 font-semibold">WebP Resultante</p>
                        <div className="relative border-4 border-white shadow-lg bg-checkers rounded-lg overflow-hidden max-w-full max-h-[300px]">
                          <img
                            src={webpResult.base64_image}
                            alt="Debug converted"
                            className="object-contain max-w-full max-h-[250px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón copiar reporte */}
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopyReport(generateWebpReport(webpResult, { type: webpInputKind, name: webpFile?.name, url: webpUrl }))}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    {copied ? '✅ Copiado!' : '📋 Copiar reporte completo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO TAB 2 — CATEGORIZACIÓN */}
        {activeTab === 'cat' && (
          <div className="bg-white border-x border-b border-gray-200 rounded-b-xl shadow-sm p-6 space-y-8">
            <form onSubmit={handleCatSubmit} className="space-y-4">
              
              {/* Selector de productos reales con filtro y controles */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Seleccionar Productos Reales de la Base de Datos
                    </label>
                    <p className="text-xs text-gray-400">
                      Busca y selecciona entre los primeros 100 productos de Supabase para su categorización.
                    </p>
                  </div>
                  
                  <label className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={catForceNative}
                      onChange={(e) => setCatForceNative(e.target.checked)}
                      className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-semibold text-indigo-900">Forzar Procesamiento Nativo</p>
                      <p className="text-[10px] text-indigo-600">Salta el toggle y llama directamente a Claude en el servidor</p>
                    </div>
                  </label>
                </div>

                {/* Filtro y Acciones */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Filtrar productos por nombre..."
                    value={productSearchText}
                    onChange={(e) => setProductSearchText(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold tracking-wide border border-indigo-100 whitespace-nowrap active:scale-95 transition-transform"
                    >
                      Seleccionar todos los visibles
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds({})}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold tracking-wide border border-gray-200 whitespace-nowrap active:scale-95 transition-transform"
                    >
                      Limpiar selección
                    </button>
                  </div>
                </div>

                {/* Contador de selección */}
                <div className="text-xs font-bold text-indigo-700 bg-indigo-50/50 px-3 py-1.5 rounded-md inline-block">
                  {selectedCount} productos seleccionados
                </div>

                {/* Listado con scrollbar */}
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 bg-white shadow-inner">
                  {loadingProducts ? (
                    <div className="p-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-600" /> Cargando productos de la base de datos...
                    </div>
                  ) : visibleProducts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-400 italic">
                      No se encontraron productos que coincidan con la búsqueda
                    </div>
                  ) : (
                    visibleProducts.map(p => {
                      const isChecked = !!selectedProductIds[p.id];
                      return (
                        <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer select-none transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProductSelection(p.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer transition-all"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-gray-800 block truncate">{p.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">ID real: {p.id}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  Mostrando máx 50 de {filteredProducts.length} productos coincidentes.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={catLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold tracking-wide transition-colors shadow-sm"
                >
                  {catLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Categorizando con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Probar categorización
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Cat */}
            {catErrorInfo ? (
              <ErrorInfoDisplay errorInfo={catErrorInfo} />
            ) : catError ? (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex gap-3 text-sm">
                <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Ha ocurrido un error en la categorización</p>
                  <p className="mt-1 opacity-90">{catError}</p>
                </div>
              </div>
            ) : null}

            {/* Pipeline de etapas Cat */}
            {catResult && (
              <div className="space-y-6 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Pipeline de Categorización Ejecutado</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1.5 items-center">
                    <span>Modo de ejecución:</span>
                    <span className={`px-2 py-0.5 rounded-full border font-semibold ${catResult.mode === 'native' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                      {catResult.mode === 'native' ? '🔧 Nativo (Gemini local)' : '🔗 Proxy n8n'}
                    </span>
                    <span>•</span>
                    <span>Estado global:</span>
                    <span className={`px-2 py-0.5 rounded-full border font-semibold ${catResult.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                      {catResult.ok ? 'Éxito' : 'Error'}
                    </span>
                  </div>
                </div>

                {/* Lista de Stages */}
                <div className="space-y-3">
                  {catResult.stages?.map((stage, i) => {
                    const isExpanded = !!expandedStages[`cat-${i}`];
                    return (
                      <div
                        key={i}
                        className={`border rounded-lg transition-colors overflow-hidden ${
                          stage.status === 'ok'
                            ? 'border-gray-200 hover:bg-gray-50'
                            : 'border-red-200 bg-red-50/20'
                        }`}
                      >
                        <div
                          onClick={() => toggleStage(`cat-${i}`)}
                          className="flex items-center justify-between p-3.5 cursor-pointer selection:bg-transparent"
                        >
                          <div className="flex items-center gap-3">
                            {stage.status === 'ok' ? (
                              <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                            ) : (
                              <XCircle className="text-red-500 shrink-0" size={18} />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {i + 1}. {stage.stage}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Duración: <span className="font-medium text-gray-600">{stage.duration_ms}ms</span>
                              </p>
                            </div>
                          </div>
                          <div>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 text-xs border-t border-gray-100 bg-gray-50">
                            <p className="font-sans text-gray-700 font-medium py-1">
                              {stage.detail}
                            </p>
                            
                            {/* System Prompt / rawText / results representation */}
                            {stage.data && (
                              <div className="mt-2.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                  Datos de Diagnóstico Enviados/Recibidos:
                                </p>
                                <pre className="bg-gray-900 text-green-400 text-[11px] rounded p-3 overflow-x-auto font-mono max-h-60">
                                  {typeof stage.data === 'string'
                                    ? stage.data
                                    : JSON.stringify(stage.data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mostrar Resultados de Categorización */}
                {catResult.ok && Array.isArray(catResult.results) && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        Tabla de Productos Resultante (Sintetizado)
                      </h4>
                      <button
                        type="button"
                        onClick={openMockReviewModal}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold tracking-wide transition-colors shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Sparkles size={14} /> Ver modal de revisión
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              ID / Nombre Original
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Cat. Específica
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Especies
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Marca
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {catResult.results.map((r: any, idx: number) => {
                            const productObj = realProducts.find(p => p.id === r.id);
                            const origName = productObj ? productObj.name : `Producto ${idx + 1}`;
                            const completeness = getProductCompeteness(r);

                            return (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  <div className="truncate max-w-xs">{origName}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">ID: {r.id || '-'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {r.category_specific || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {Array.isArray(r.category_species) ? (
                                    <div className="flex flex-wrap gap-1">
                                      {r.category_species.map((sp: string, spidx: number) => (
                                        <span key={spidx} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                          {sp}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                                  {r.category_brand || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  <span className={`px-2 py-0.5 rounded-full font-bold border ${completeness.color}`}>
                                    {completeness.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Botón copiar reporte */}
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopyReport(generateCategorizationReport(
                      catResult, 
                      realProducts.filter(p => selectedProductIds[p.id]).map(p => ({ id: p.id, nombre: p.name }))
                    ))}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    {copied ? '✅ Copiado!' : '📋 Copiar reporte completo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Revisión Simulada (Debug) */}
      {isMockReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] max-w-[95vw]">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600 animate-pulse" /> Revisión de Categorización (Simulación Debug)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vista previa interactiva. Los cambios realizados aquí son temporales y no se guardan en la base de datos de producción.
                </p>
              </div>
              <button
                onClick={() => setIsMockReviewOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-lg transition-colors"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Tabla del Modal */}
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre del Producto</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Categoría General</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría Específica</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Especie / Raza</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider max-w-[280px]">Tags (Chips)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {mockReviewItems.map(item => {
                    const isComp = checkItemCompleteness(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {/* Nombre */}
                        <td className="px-4 py-3 font-semibold text-gray-950 max-w-xs">
                          <div className="truncate" title={item.name}>{item.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">ID: {item.id}</div>
                        </td>
                        
                        {/* General Category */}
                        <td className="px-4 py-3">
                          <select
                            value={item.category_general}
                            onChange={e => updateReviewItemField(item.id, 'category_general', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-800 outline-none"
                          >
                            <option value="">Seleccione...</option>
                            {uniqueGenerales.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>

                        {/* Specific Category */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.category_specific}
                            onChange={e => updateReviewItemField(item.id, 'category_specific', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-800 outline-none"
                            placeholder="Categoría Específica..."
                          />
                        </td>

                        {/* Species (Not editable) */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.category_species.length > 0 ? (
                              item.category_species.map((sp: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-100"
                                >
                                  {sp}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">Ninguna</span>
                            )}
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.category_brand}
                            onChange={e => updateReviewItemField(item.id, 'category_brand', e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-800 outline-none"
                            placeholder="Marca..."
                          />
                        </td>

                        {/* Tags (Chips) */}
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {item.tags.map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-indigo-100"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => removeTag(item.id, tag)}
                                    className="text-red-500 hover:text-red-700 font-bold ml-0.5 flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-50"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-1 max-w-[180px]">
                              <input
                                type="text"
                                placeholder="Añadir tag (Enter)..."
                                value={item.newTagInput || ''}
                                onChange={e => updateReviewItemField(item.id, 'newTagInput', e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addTag(item.id, item.newTagInput);
                                  }
                                }}
                                className="flex-1 text-[10px] px-2 py-1 border border-gray-200 rounded outline-none focus:border-indigo-400"
                              />
                              <button
                                type="button"
                                onClick={() => addTag(item.id, item.newTagInput)}
                                className="bg-indigo-600 text-white rounded px-2 py-1 text-[10px] font-bold hover:bg-indigo-700 active:scale-95 transition-transform"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Completeness check */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isComp ? (
                            <span className="px-2.5 py-1 rounded-full font-bold border text-xs bg-green-50 text-green-800 border-green-200">
                              Completo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full font-bold border text-xs bg-amber-50 text-amber-800 border-amber-200">
                              Incompleto
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer del Modal */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setIsMockReviewOpen(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors active:scale-95"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
