'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateSeoForBatch } from './actions';
import SeoBatchReviewModal from './SeoBatchReviewModal';
import OgImageModal from './OgImageModal';
import { 
  Globe, 
  CheckCircle2, 
  Clock, 
  Search, 
  ExternalLink, 
  Edit3, 
  Sparkles, 
  User, 
  Image as ImageIcon,
  Tag,
  Hash
} from 'lucide-react';

interface PageSeo {
  id: string;
  page_key: string;
  page_label: string;
  page_url: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  ai_generated: boolean;
  updated_at: string;
}

interface ProductSeoTransformed {
  id: string;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
  ai_generated: boolean;
  og_image_url?: string | null;
  product: {
    id: string;
    name: string;
    url_slug: string;
    uploaded_image_url: string | null;
    category_general: string[] | null;
    category_brand: string | null;
  } | null;
}

interface PendingProduct {
  id: string;
  name: string;
  url_slug: string;
  uploaded_image_url: string | null;
  category_general: string[] | null;
  category_brand: string | null;
  price: number;
}

interface SeoClientProps {
  pages: PageSeo[];
  recentOkNoOg: ProductSeoTransformed[];
  recentOkWithOg: ProductSeoTransformed[];
  allPending: PendingProduct[];
  counts: {
    totalProducts: number;
    seoOk: number;
    pending: number;
    okNoOg: number;
    okWithOg: number;
  };
}

function PaginationBar({
  page, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange,
}: {
  page: number; totalPages: number; pageSize: number; totalItems: number;
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  const pageNumbers: (number | string)[] = [];
  if (totalPages > 1) {
    const rawNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(n => n === 1 || n === totalPages || (n >= page - 2 && n <= page + 2));
    
    rawNumbers.forEach((n, i) => {
      if (i > 0 && n - rawNumbers[i - 1] > 1) {
        pageNumbers.push('...');
      }
      pageNumbers.push(n);
    });
  }

  return (
    <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Mostrar:</span>
        {[50, 100, 500, 1000].map(size => (
          <button
            key={size}
            onClick={() => onPageSizeChange(size)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${pageSize === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            {size}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">
          Mostrando {Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)} de {totalItems}
        </span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={page === 1} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
          {pageNumbers.map((item, i) =>
            item === '...'
              ? <span key={`ellipsis-${i}`} className="text-xs px-1 text-gray-400">…</span>
              : <button
                  key={item}
                  onClick={() => onPageChange(item as number)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${page === item ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                >{item}</button>
          )}
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
          <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
        </div>
      )}
    </div>
  );
}

type TabType = 'pages' | 'pending' | 'ok_no_og' | 'ok_with_og';
type ProgressType = { done: number; total: number } | null;

export default function SeoClient({ pages, recentOkNoOg, recentOkWithOg, allPending, counts }: SeoClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('pages');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGeneralCategory, setFilterGeneralCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isProcessing, startProcessing] = useTransition();
  const [progress, setProgress] = useState<ProgressType>(null);

  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(100);
  const [okNoOgPage, setOkNoOgPage] = useState(1);
  const [okNoOgPageSize, setOkNoOgPageSize] = useState(100);
  const [okWithOgPage, setOkWithOgPage] = useState(1);
  const [okWithOgPageSize, setOkWithOgPageSize] = useState(100);

  const [batchReview, setBatchReview] = useState<any[] | null>(null);
  const [ogModalProductId, setOgModalProductId] = useState<string | null>(null);

  const generalCategoryOptions = Array.from(new Set(
    allPending.flatMap(p => p.category_general || []).filter(Boolean)
  )).sort();

  const brandOptions = Array.from(new Set(
    allPending.map(p => p.category_brand).filter(Boolean) as string[]
  )).sort();

  useEffect(() => {
    setPendingPage(1);
    setOkNoOgPage(1);
    setOkWithOgPage(1);
  }, [searchQuery, filterGeneralCategory, filterBrand]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size <= 19) {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchGenerate = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    startProcessing(async () => {
      setProgress({ done: 0, total: ids.length });
      const res = await generateSeoForBatch(ids);
      setProgress(null);
      if (res.errors && res.errors.length > 0) {
        alert(`Errores: ${res.errors.join(', ')}`);
        return;
      }
      setBatchReview(res.output);
    });
  };

  // Format Date helper
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Filters based on search query
  const filteredPages = pages.filter(p => 
    p.page_label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.page_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.meta_title && p.meta_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredOkNoOgAll = recentOkNoOg.filter(item => {
    const matchSearch = (item.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.meta_title && item.meta_title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchGeneral = !filterGeneralCategory || (item.product?.category_general || []).includes(filterGeneralCategory);
    const matchBrand = !filterBrand || item.product?.category_brand === filterBrand;
    return matchSearch && matchGeneral && matchBrand;
  });
  const okNoOgTotalPages = Math.max(1, Math.ceil(filteredOkNoOgAll.length / okNoOgPageSize));
  const okNoOgSafePage = Math.min(okNoOgPage, okNoOgTotalPages);
  const filteredOkNoOg = filteredOkNoOgAll.slice((okNoOgSafePage - 1) * okNoOgPageSize, okNoOgSafePage * okNoOgPageSize);

  const filteredOkWithOgAll = recentOkWithOg.filter(item => {
    const matchSearch = (item.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.meta_title && item.meta_title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchGeneral = !filterGeneralCategory || (item.product?.category_general || []).includes(filterGeneralCategory);
    const matchBrand = !filterBrand || item.product?.category_brand === filterBrand;
    return matchSearch && matchGeneral && matchBrand;
  });
  const okWithOgTotalPages = Math.max(1, Math.ceil(filteredOkWithOgAll.length / okWithOgPageSize));
  const okWithOgSafePage = Math.min(okWithOgPage, okWithOgTotalPages);
  const filteredOkWithOg = filteredOkWithOgAll.slice((okWithOgSafePage - 1) * okWithOgPageSize, okWithOgSafePage * okWithOgPageSize);

  const filteredPendingAll = allPending.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.category_brand && item.category_brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchGeneral = !filterGeneralCategory || (item.category_general || []).includes(filterGeneralCategory);
    const matchBrand = !filterBrand || item.category_brand === filterBrand;
    return matchSearch && matchGeneral && matchBrand;
  });
  const pendingTotalPages = Math.max(1, Math.ceil(filteredPendingAll.length / pendingPageSize));
  const pendingSafePage = Math.min(pendingPage, pendingTotalPages);
  const filteredPending = filteredPendingAll.slice((pendingSafePage - 1) * pendingPageSize, pendingSafePage * pendingPageSize);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">SEO y Metadatos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las etiquetas meta, títulos, descripciones y configuraciones de Open Graph de las páginas y productos.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-500">Total Productos Activos</span>
            <div className="text-3xl font-black text-gray-900 mt-1">{counts.totalProducts}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-emerald-700">SEO Optimizado (OK)</span>
            <div className="text-3xl font-black text-emerald-800 mt-1">{counts.seoOk}</div>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-amber-50/45 p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-amber-700">SEO Pendiente</span>
            <div className="text-3xl font-black text-amber-800 mt-1">{counts.pending}</div>
          </div>
          <div className="p-3 bg-amber-100/80 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-px">
        <div className="flex overflow-x-auto gap-1">
          <button
            onClick={() => { setActiveTab('pages'); setSearchQuery(''); }}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'pages'
                ? 'border-gray-950 text-gray-950 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Páginas Principales ({pages.length})
          </button>
          <button
            onClick={() => { setActiveTab('pending'); setSearchQuery(''); }}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Productos Pendientes ({counts.pending})
          </button>
          <button
            onClick={() => { setActiveTab('ok_no_og'); setSearchQuery(''); }}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'ok_no_og'
                ? 'border-[#1A8A00] text-[#1A8A00] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            SEO OK sin OG Image ({counts.okNoOg})
          </button>
          <button
            onClick={() => { setActiveTab('ok_with_og'); setSearchQuery(''); }}
            className={`py-3 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'ok_with_og'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Con OG Image ({counts.okWithOg})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-950/10 focus:border-gray-950 bg-white"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {activeTab !== 'pages' && (
          <div className="px-6 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gray-50">
            <select
              value={filterGeneralCategory}
              onChange={e => setFilterGeneralCategory(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Cat. General</option>
              {generalCategoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Marca</option>
              {brandOptions.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            {(filterGeneralCategory || filterBrand) && (
              <button
                onClick={() => { setFilterGeneralCategory(''); setFilterBrand(''); }}
                className="text-xs text-blue-600 hover:underline ml-1"
              >
                Limpiar filtros
              </button>
            )}

            <span className="ml-auto text-[10px] text-gray-400">
              {activeTab === 'pending' && `${filteredPendingAll.length} de ${allPending.length} productos`}
              {activeTab === 'ok_no_og' && `${filteredOkNoOgAll.length} de ${recentOkNoOg.length} productos`}
              {activeTab === 'ok_with_og' && `${filteredOkWithOgAll.length} de ${recentOkWithOg.length} productos`}
            </span>
          </div>
        )}

        {/* PAGES TAB */}
        {activeTab === 'pages' && (
          <div className="overflow-x-auto">
            {filteredPages.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No se encontraron páginas principales</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-4">Página</th>
                    <th className="px-6 py-4">Título Meta (Title)</th>
                    <th className="px-6 py-4">Descripción Meta (Description)</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredPages.map((page) => (
                    <tr key={page.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">{page.page_label}</span>
                          <span className="text-xs text-gray-400 mt-0.5">{page.page_key}</span>
                          <Link 
                            href={page.page_url || '#'} 
                            target="_blank"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-1 self-start"
                          >
                            Ir a la página <ExternalLink size={10} />
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-gray-800 font-medium line-clamp-2">{page.meta_title || <span className="text-gray-400 italic">No definido</span>}</p>
                        {page.meta_title && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {page.meta_title.length} caracteres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <p className="text-gray-600 line-clamp-2">{page.meta_description || <span className="text-gray-400 italic">No definido</span>}</p>
                        {page.meta_description && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {page.meta_description.length} caracteres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/owner/seo/edit/page/${page.page_key}`}
                          className="inline-flex p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-[#1A8A00] rounded-lg transition-colors"
                          title="Editar SEO"
                        >
                          <Edit3 size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SEO OK SIN OG TAB */}
        {activeTab === 'ok_no_og' && (
          <div className="overflow-x-auto">
            {filteredOkNoOg.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay productos sin imagen OG en este listado</div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Título Optimizado</th>
                    <th className="px-6 py-4">Descripción Optimizada</th>
                    <th className="px-6 py-4 text-center">Método</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredOkNoOg.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                            {item.product?.uploaded_image_url ? (
                              <img src={item.product.uploaded_image_url} alt="" className="object-cover w-full h-full" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 line-clamp-1">{item.product?.name || 'Producto sin nombre'}</span>
                            {item.product?.url_slug && (
                              <Link 
                                href={`/${item.product.url_slug}`} 
                                target="_blank"
                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5 self-start"
                              >
                                Ver producto <ExternalLink size={10} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-gray-800 font-medium line-clamp-2">{item.meta_title}</p>
                        {item.meta_title && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {item.meta_title.length} caracteres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <p className="text-gray-600 line-clamp-2">{item.meta_description}</p>
                        {item.meta_description && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {item.meta_description.length} caracteres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.ai_generated ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full border border-purple-150">
                            <Sparkles size={11} className="text-purple-500" /> IA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-150">
                            <User size={11} className="text-blue-500" /> Manual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setOgModalProductId(item.product?.id || null)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                            title="Generar imagen OG con IA"
                          >
                            <Sparkles size={12} className="text-purple-500" />
                            <span>Generar OG con IA</span>
                          </button>
                          <Link
                            href={`/owner/seo/edit/product/${item.product?.id}`}
                            className="inline-flex p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-[#1A8A00] rounded-lg transition-colors"
                            title="Editar SEO"
                          >
                            <Edit3 size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationBar
                page={okNoOgSafePage}
                totalPages={okNoOgTotalPages}
                pageSize={okNoOgPageSize}
                totalItems={filteredOkNoOgAll.length}
                onPageChange={setOkNoOgPage}
                onPageSizeChange={(s) => { setOkNoOgPageSize(s); setOkNoOgPage(1); }}
              />
              </>
            )}
          </div>
        )}

        {/* SEO OK CON OG TAB */}
        {activeTab === 'ok_with_og' && (
          <div className="overflow-x-auto">
            {filteredOkWithOg.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay productos con imagen OG en este listado</div>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Imagen OG</th>
                    <th className="px-6 py-4">Título Optimizado</th>
                    <th className="px-6 py-4">Descripción Optimizada</th>
                    <th className="px-6 py-4 text-center">Método</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredOkWithOg.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                            {item.product?.uploaded_image_url ? (
                              <img src={item.product.uploaded_image_url} alt="" className="object-cover w-full h-full" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 line-clamp-1">{item.product?.name || 'Producto sin nombre'}</span>
                            {item.product?.url_slug && (
                              <Link 
                                href={`/${item.product.url_slug}`} 
                                target="_blank"
                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5 self-start"
                              >
                                Ver producto <ExternalLink size={10} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-16 h-10 rounded bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                          {item.og_image_url ? (
                            <img src={item.og_image_url} alt="OG Preview" className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-xs text-gray-400 italic">No OG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-gray-800 font-medium line-clamp-2">{item.meta_title}</p>
                        {item.meta_title && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {item.meta_title.length} caracteres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <p className="text-gray-600 line-clamp-2">{item.meta_description}</p>
                        {item.meta_description && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {item.meta_description.length} caracteres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.ai_generated ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full border border-purple-150">
                            <Sparkles size={11} className="text-purple-500" /> IA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-150">
                            <User size={11} className="text-blue-500" /> Manual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/owner/seo/edit/product/${item.product?.id}`}
                          className="inline-flex p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-[#1A8A00] rounded-lg transition-colors"
                          title="Editar SEO"
                        >
                          <Edit3 size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationBar
                page={okWithOgSafePage}
                totalPages={okWithOgTotalPages}
                pageSize={okWithOgPageSize}
                totalItems={filteredOkWithOgAll.length}
                onPageChange={setOkWithOgPage}
                onPageSizeChange={(s) => { setOkWithOgPageSize(s); setOkWithOgPage(1); }}
              />
              </>
            )}
          </div>
        )}

        {/* SEO PENDING TAB */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {selected.size > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-200 mx-6 mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {selected.size} producto(s) seleccionado(s) (Máximo 20)
                  </span>
                  {isProcessing && (
                    <span className="text-xs text-gray-500 animate-pulse">
                      Procesando lote con OpenAI...
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {progress && (
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#1A8A00] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(progress.done / progress.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {progress.done}/{progress.total}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleBatchGenerate}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-[#1A8A00] hover:bg-[#064E3B] disabled:bg-gray-300 text-white rounded-xl font-medium text-sm transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    <Sparkles size={14} />
                    {isProcessing ? 'Generando...' : `Generar SEO (${selected.size})`}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              {filteredPending.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No hay productos pendientes de optimización SEO</div>
              ) : (
                <>
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === Math.min(20, filteredPending.length) && filteredPending.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newSelected = new Set<string>();
                              filteredPending.slice(0, 20).forEach(item => newSelected.add(item.id));
                              setSelected(newSelected);
                            } else {
                              setSelected(new Set());
                            }
                          }}
                          className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00]"
                        />
                      </th>
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4">Marca</th>
                      <th className="px-6 py-4">Precio</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredPending.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="rounded border-gray-300 text-[#1A8A00] focus:ring-[#1A8A00]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                              {item.uploaded_image_url ? (
                                <img src={item.uploaded_image_url} alt="" className="object-cover w-full h-full" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 line-clamp-1">{item.name}</span>
                              {item.url_slug && (
                                <Link 
                                  href={`/${item.url_slug}`} 
                                  target="_blank"
                                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5 self-start"
                                >
                                  Ver producto <ExternalLink size={10} />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Tag size={13} className="text-gray-400" />
                            <span>{item.category_general && item.category_general[0] ? item.category_general[0] : <span className="text-gray-300 italic">Sin categoría</span>}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.category_brand || <span className="text-gray-300 italic">Genérico</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          ₲ {Number(item.price).toLocaleString('es-PY')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <Clock size={11} className="text-amber-500" /> Pendiente
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Link
                            href={`/owner/seo/edit/product/${item.id}`}
                            className="inline-flex p-2 bg-gray-50 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Editar / Generar con IA"
                          >
                            <Sparkles size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationBar
                  page={pendingSafePage}
                  totalPages={pendingTotalPages}
                  pageSize={pendingPageSize}
                  totalItems={filteredPendingAll.length}
                  onPageChange={setPendingPage}
                  onPageSizeChange={(s) => { setPendingPageSize(s); setPendingPage(1); }}
                />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {batchReview && (
        <SeoBatchReviewModal
          items={batchReview}
          pendingItems={allPending}
          onClose={() => setBatchReview(null)}
          onSaved={() => {
            setBatchReview(null);
            setSelected(new Set());
            router.refresh();
          }}
        />
      )}

      {ogModalProductId && (
        <OgImageModal
          productId={ogModalProductId}
          onClose={() => setOgModalProductId(null)}
          onSaved={() => { router.refresh(); }}
        />
      )}
    </div>
  );
}
