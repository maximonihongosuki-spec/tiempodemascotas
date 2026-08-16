import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, Image as ImageIcon, Star, Monitor, Globe, Brain, Loader2, AlertCircle, GitMerge, Unlink, ChevronDown, Settings2, Archive, Lock } from 'lucide-react';
import { supabase, Product, Category, assertNoBase64, VolumePrice } from '../../lib/supabase';
import { generateProductCode } from '../../lib/csvParser';
import { generateSlug, ensureUniqueSlug } from '../../lib/urlSlug';
import { handleFormattedPaste } from '../../lib/richTextPaste';
import AIImageReviewModal from './AIImageReviewModal';
import AIPromptConfigModal from './AIPromptConfigModal';
import GruposPanel from './GruposPanel';
import LazyHoverImage from './LazyHoverImage';
import { detectBoxPresentation, BoxDetectionResult } from '../../lib/boxPresentation';

function cleanSubSpecific(val: any): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(', ');
  const s = String(val).trim();
  if (s === '[]' || s === 'null' || s === '""') return '';
  return s;
}

interface AIResult {
  id: string;
  name: string;
  category_general: string[];
  category_specific: string[];
  category_sub_specific: string[];
  category_detail: string[];
  category_species: string[];
  category_brand: string;
  category_age: string[];
  category_condition: string[];
  is_bulk: boolean;
  is_prescription: boolean;
  requires_prescription: boolean;
  local_only: boolean;
  requires_refrigeration: boolean;
  tags: string[];
  active: boolean;
  pendingImageFile: File | null;
  pendingImageUrl: string;
  imagePreview: string;
  isAiImproving: boolean;
  aiImproved: boolean;
  imageInputMethod: 'file' | 'url';
  ageIsDefault: boolean;
  conditionIsDefault: boolean;
  speciesIsDefault: boolean;
  categorizationDone: boolean;
  status: 'complete' | 'incomplete';
}

interface SearchableSelectProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SearchableSelect({ value, options, onChange, placeholder = 'Seleccionar...', disabled = false }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full text-xs px-2 py-2 border rounded-md cursor-pointer bg-white flex items-center justify-between ${
          disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-gray-300'
        }`}
      >
        <span className={value ? 'text-gray-900 text-sm' : 'text-gray-400 text-sm'}>{value || placeholder}</span>
        <span className="text-gray-400 text-[10px]">▼</span>
      </div>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-xs px-2 py-1.5 border-b border-gray-200 outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-2">Sin resultados</p>
            ) : filtered.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                className={`text-xs px-2 py-1.5 cursor-pointer hover:bg-blue-50 ${value === opt ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchableSelectWithAddProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onAdd: (val: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

function SearchableSelectWithAdd({ value, options, onChange, onAdd, placeholder = 'Seleccionar...', disabled = false }: SearchableSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newVal.trim()) return;
    setSaving(true);
    await onAdd(newVal.trim());
    onChange(newVal.trim());
    setNewVal('');
    setAdding(false);
    setSaving(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1 items-center">
        <div
          onClick={() => !disabled && setOpen(o => !o)}
          className={`flex-1 text-xs px-2 py-2 border rounded-md flex items-center justify-between ${
            disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-gray-300 cursor-pointer bg-white'
          }`}
        >
          <span className={value ? 'text-gray-900 text-sm' : 'text-gray-400 text-sm'}>{value || placeholder}</span>
          <span className="text-gray-400 text-[10px]">▼</span>
        </div>
        {!disabled && (
          <button
            onClick={() => { setAdding(a => !a); setOpen(false); }}
            className="text-xs px-1.5 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-bold border border-green-200"
            title="Agregar nueva"
            type="button"
          >+</button>
        )}
      </div>
      {adding && !disabled && (
        <div className="mt-1 flex gap-1 items-center">
          <input
            autoFocus
            type="text"
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nueva categoría..."
            className="flex-1 text-xs px-2 py-1 border border-green-400 rounded outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-40"
            type="button"
          >{saving ? '...' : 'OK'}</button>
        </div>
      )}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-xs px-2 py-1.5 border-b border-gray-200 outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-2 py-2">Sin resultados</p>
            ) : filtered.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                className={`text-xs px-2 py-1.5 cursor-pointer hover:bg-blue-50 ${value === opt ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CheckboxListWithAddProps {
  selected: string[];
  options: string[];
  onChange: (vals: string[]) => void;
  onAdd: (val: string) => Promise<void>;
  emptyText?: string;
}

function CheckboxListWithAdd({ selected, options, onChange, onAdd, emptyText = 'Sin opciones' }: CheckboxListWithAddProps) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newVal.trim()) return;
    setSaving(true);
    await onAdd(newVal.trim());
    onChange([...selected, newVal.trim()]);
    setNewVal('');
    setAdding(false);
    setSaving(false);
  };

  const toggle = (name: string) => {
    const updated = selected.includes(name)
      ? selected.filter(s => s !== name)
      : [...selected, name];
    onChange(updated);
  };

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 text-[10px] px-2 py-1 border border-gray-200 rounded outline-none"
        />
        <button
          onClick={() => setAdding(a => !a)}
          className="text-xs px-1.5 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-bold border border-green-200"
          type="button"
          title="Agregar nueva"
        >+</button>
      </div>
      {adding && (
        <div className="flex gap-1 mb-1">
          <input
            autoFocus
            type="text"
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nueva opción..."
            className="flex-1 text-xs px-2 py-1 border border-green-400 rounded outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-40"
            type="button"
          >{saving ? '...' : 'OK'}</button>
        </div>
      )}
      <div className="border border-gray-300 rounded-md p-2 bg-white max-h-32 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 italic">{emptyText}</p>
        ) : filtered.map(opt => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="rounded text-blue-600"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// === SearchableCheckboxList (multi-valor con buscador) ===
interface SearchableCheckboxListProps {
  options: string[];
  selectedValues: string[];
  onChange: (updated: string[]) => void;
}

function SearchableCheckboxList({ options, selectedValues, onChange }: SearchableCheckboxListProps) {
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-1 p-1 border border-gray-100 rounded bg-white max-h-32 overflow-y-auto">
      <input
        type="text"
        placeholder="Filtrar..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="text-[9px] px-1 py-0.5 border-b border-gray-100 outline-none mb-1 sticky top-0 bg-white"
      />
      {filtered.length === 0 ? (
        <p className="text-[9px] text-gray-400 px-1">Sin resultados</p>
      ) : filtered.map(opt => (
        <label key={opt} className="flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap px-1 hover:bg-gray-50 rounded">
          <input
            type="checkbox"
            checked={selectedValues.includes(opt)}
            onChange={() => {
              const updated = selectedValues.includes(opt)
                ? selectedValues.filter(s => s !== opt)
                : [...selectedValues, opt];
              onChange(updated);
            }}
            className="rounded text-blue-600 w-3 h-3"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-300 rounded min-h-[40px] focus-within:ring-1 focus-within:ring-blue-500 bg-white">
      {tags.map((tag, idx) => (
        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} 
            className="hover:bg-purple-200 rounded-full w-3.5 h-3.5 flex items-center justify-center text-purple-700 hover:text-purple-900 font-bold">
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue.trim() && addTag(inputValue)}
        placeholder={tags.length === 0 ? 'Agregar tags... (Enter o coma)' : ''}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-gray-800"
      />
    </div>
  );
}

function guessVariantLabel(name: string): string {
  // Busca patrones tipo "3KG", "21 KG", "21+3KG", "500G", "1L"
  const match = name.match(/(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?)?\s*(?:KG|G|L|ML|CC|CM|MT|MTS|UN|UNIDADES?))/i);
  return match ? match[0].replace(/\s+/g, ' ').trim().toUpperCase() : '';
}

type ProductManagementProps = {
  products: Product[];
  onProductUpdated: (id: string, changes: Partial<Product>) => void;
  onProductCreated: (product: Product) => void;
  onProductRemoved: (id: string) => void;
  onRefreshAll: () => Promise<void>;
  loading?: boolean;
};

export default function ProductManagement({
  products,
  onProductUpdated,
  onProductCreated,
  onProductRemoved,
  onRefreshAll,
  loading = false,
}: ProductManagementProps) {
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  async function bulkUpdateInChunks(
    ids: string[],
    updateData: Record<string, any>,
    onProgress?: (done: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const CHUNK_SIZE = 50;
    const chunks = chunkArray(ids, CHUNK_SIZE);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const { error } = await supabase
          .from('products')
          .update(updateData)
          .in('id', chunks[i]);
        if (error) {
          failed += chunks[i].length;
          errors.push(`Lote ${i + 1}: ${error.message}`);
        } else {
          success += chunks[i].length;
        }
      } catch (err: any) {
        failed += chunks[i].length;
        errors.push(`Lote ${i + 1}: ${err.message || 'error de red'}`);
      }
      onProgress?.(i + 1, chunks.length);
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    return { success, failed, errors };
  }

  async function bulkDeleteInChunks(
    ids: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const CHUNK_SIZE = 50;
    const chunks = chunkArray(ids, CHUNK_SIZE);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', chunks[i]);
        if (error) {
          failed += chunks[i].length;
          errors.push(`Lote ${i + 1}: ${error.message}`);
        } else {
          success += chunks[i].length;
        }
      } catch (err: any) {
        failed += chunks[i].length;
        errors.push(`Lote ${i + 1}: ${err.message || 'error de red'}`);
      }
      onProgress?.(i + 1, chunks.length);
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    return { success, failed, errors };
  }

  const [bulkProgress, setBulkProgress] = useState<{
    open: boolean;
    label: string;
    done: number;
    total: number;
  }>({ open: false, label: '', done: 0, total: 0 });

  const [editing, setEditing] = useState<string | null>(null);
  const [volumePrices, setVolumePrices] = useState<VolumePrice[]>([]);
  const [loadingVolumePrices, setLoadingVolumePrices] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [codeSearchTerm, setCodeSearchTerm] = useState('');
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [categories, setCategories] = useState<Category[]>([]);
  const [manualSlug, setManualSlug] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [imageTooltip, setImageTooltip] = useState<{ url: string; x: number; y: number } | null>(null);

  // Imagen pendiente (archivo o URL a procesar al guardar)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isAiImproving, setIsAiImproving] = useState(false);
  const [aiImproved, setAiImproved] = useState(false); // indica si la imagen ya pasó por IA
  const [aiCredits, setAiCredits] = useState<number>(0);
  const [categorizationDone, setCategorizationDone] = useState(false);

  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewOriginalUrl, setAiReviewOriginalUrl] = useState('');
  const [aiReviewImprovedUrl, setAiReviewImprovedUrl] = useState('');
  const [aiReviewFile, setAiReviewFile] = useState<File | null>(null);
  const [aiReviewRetrying, setAiReviewRetrying] = useState(false);
  const [applyBrandSeal, setApplyBrandSeal] = useState(false);

  const [bulkEditing, setBulkEditing] = useState(false);
  const [bulkFormData, setBulkFormData] = useState<Partial<Product>>({});
  const [bulkTouchedFields, setBulkTouchedFields] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [filterGeneralCategory, setFilterGeneralCategory] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterStockMode, setFilterStockMode] = useState<'all' | 'with' | 'without' | 'below'>('all');
  const [filterMaxStock, setFilterMaxStock] = useState<number>(5);
  const [filterPriceMode, setFilterPriceMode] = useState<'all' | 'gte' | 'lte' | 'eq'>('all');
  const [filterPriceValue, setFilterPriceValue] = useState<number>(0);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubSpecificCategory, setFilterSubSpecificCategory] = useState('');
  const [filterDetail, setFilterDetail] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterDuplicateNames, setFilterDuplicateNames] = useState(false);
  const [filterBulk, setFilterBulk] = useState(false);
  const [activeView, setActiveView] = useState<'products' | 'groups' | 'archived'>('products');

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    codeSearchTerm,
    filterGeneralCategory,
    filterCategory,
    filterSubSpecificCategory,
    filterDetail,
    filterBrand,
    filterStatus,
    filterSpecies,
    filterStockMode,
    filterLowStock,
    filterPriceMode,
    filterPriceValue,
    filterDuplicateNames,
    filterBulk,
  ]);

  const [imageProgressModal, setImageProgressModal] = useState<{
    open: boolean;
    label: string;
    step: number;
    totalSteps: number;
  }>({ open: false, label: '', step: 0, totalSteps: 0 });

  // IA Categorization
  const [isAIConfirmOpen, setIsAIConfirmOpen] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiCurrentBatch, setAiCurrentBatch] = useState(0);
  const [aiTotalBatches, setAiTotalBatches] = useState(0);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  const [isAIReviewOpen, setIsAIReviewOpen] = useState(false);
  const [aiSaveLoading, setAiSaveLoading] = useState(false);

  // Grouping
  const [groupingModalOpen, setGroupingModalOpen] = useState(false);
  const [groupingParentName, setGroupingParentName] = useState('');
  const [groupingSlugPreview, setGroupingSlugPreview] = useState('');
  const [groupingLabels, setGroupingLabels] = useState<Record<string, string>>({});
  const [groupingSaving, setGroupingSaving] = useState(false);

  // IA description generation state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingEnhanced, setIsGeneratingEnhanced] = useState(false);
  const [propagating, setPropagating] = useState(false);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [boxProductSaving, setBoxProductSaving] = useState(false);

  // SEO Avanzado collapse state
  const [seoSectionOpen, setSeoSectionOpen] = useState(false);

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

  const handleOpenGrouping = () => {
    const selected = products.filter(p => selectedIds.has(p.id));
    if (selected.length < 2) {
      alert('Seleccioná al menos 2 productos para agrupar.');
      return;
    }

    // TAREA 6: Adaptar el caso "agregar a grupo existente"
    const hasParent = selected.some(p => p.is_parent);
    if (hasParent) {
      alert('Para agregar variantes a un grupo existente, usá el botón de editar del grupo padre. Aquí solo se crean grupos nuevos.');
      return;
    }

    const alreadyChild = selected.find(p => p.parent_product_id);
    if (alreadyChild) {
      alert(`"${alreadyChild.name}" ya es variante de otro producto. Separalo primero.`);
      return;
    }
    // Auto-rellenar labels
    const labels: Record<string, string> = {};
    selected.forEach(p => {
      labels[p.id] = p.variant_label || guessVariantLabel(p.name);
    });
    setGroupingLabels(labels);
    setGroupingParentName('');
    setGroupingSlugPreview('');
    setGroupingModalOpen(true);
  };

  const handleConfirmGrouping = async () => {
    if (!groupingParentName.trim()) {
      alert('Escribí un nombre para el grupo.');
      return;
    }
    setGroupingSaving(true);
    try {
      const selected = products.filter(p => selectedIds.has(p.id));

      // 1. Generar slug único para el padre
      const baseSlug = generateSlug(groupingParentName.trim());
      const uniqueSlug = await ensureUniqueSlug(baseSlug, null, supabase);

      // 2. Crear el producto padre virtual
      const { data: newParent, error: parentError } = await supabase
        .from('products')
        .insert([{
          name: groupingParentName.trim(),
          product_code: 'GRP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
          public_name: groupingParentName.trim(),
          url_slug: uniqueSlug,
          is_parent: true,
          active: true,
          price: 0,
          stock: 0,
          is_bulk: false,
          is_prescription: false,
          requires_prescription: false,
          is_featured: false,
          show_in_hero: false,
          category_general: [],
          category_specific: [],
          category_sub_specific: null,
          category_detail: [],
          category_species: [],
          category_age: [],
          category_condition: [],
          tags: [],
          additional_images: [],
          location: 'SHOW ROOM',
          cost: 0,
          wholesale_price: 0,
          retail_margin: 0,
          wholesale_margin: 0,
          interest_rate_6: 0,
          interest_rate_12: 0,
          interest_rate_18: 0,
          interest_rate_24: 0,
        }])
        .select()
        .single();

      if (parentError || !newParent) {
        throw new Error(parentError?.message || 'Error al crear el grupo padre.');
      }

      // 3. Marcar TODOS los seleccionados como hijos del nuevo padre
      for (const hijo of selected) {
        const { error: hijoError } = await supabase
          .from('products')
          .update({
            parent_product_id: newParent.id,
            is_parent: false,
            variant_label: (groupingLabels[hijo.id] || '').trim() || null,
          })
          .eq('id', hijo.id);
        if (hijoError) throw hijoError;
      }

      setGroupingModalOpen(false);
      setSelectedIds(new Set());
      onRefreshAll();
      alert(`✅ Grupo "${groupingParentName.trim()}" creado con ${selected.length} variantes.`);
    } catch (err: any) {
      alert('Error al agrupar: ' + (err.message || 'desconocido'));
    } finally {
      setGroupingSaving(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      alert('Completá al menos el nombre antes de generar la descripción.');
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: formData.name,
            public_name: formData.public_name,
            category_brand: formData.category_brand,
            category_general: formData.category_general,
            category_specific: formData.category_specific,
            category_sub_specific: formData.category_sub_specific,
            category_detail: formData.category_detail,
            category_species: formData.category_species,
            category_age: formData.category_age,
            category_condition: formData.category_condition,
            is_prescription: formData.is_prescription,
            requires_prescription: formData.requires_prescription,
            is_bulk: formData.is_bulk,
            tags: formData.tags,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setFormData({ ...formData, description: data.description });
    } catch (err: any) {
      alert('Error al generar descripción: ' + (err.message || 'desconocido'));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleGenerateEnhancedDescription = async () => {
    if (!formData.description?.trim()) {
      alert('Completá o generá primero el campo "Descripción" antes de mejorarla.');
      return;
    }
    setIsGeneratingEnhanced(true);
    try {
      const res = await fetch('/api/generate-enhanced-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setFormData({ ...formData, description_ai_enhanced: data.description_ai_enhanced });
    } catch (err: any) {
      alert('Error al generar descripción mejorada: ' + (err.message || 'desconocido'));
    } finally {
      setIsGeneratingEnhanced(false);
    }
  };

  const handlePropagateToChildren = async () => {
    const currentProduct = editing ? products.find(p => p.id === editing) : null;
    if (!currentProduct?.id || !currentProduct?.is_parent) return;
    
    // Confirmar
    const ok = confirm(
      '¿Propagar descripción, SEO y categorías del padre a TODOS sus hijos? ' +
      'Esto sobrescribirá los datos actuales de los hijos.'
    );
    if (!ok) return;
    
    setPropagating(true);
    try {
      // Preparar el payload con los campos a propagar
      const propagateData: any = {};
      
      if (formData.description !== undefined) {
        propagateData.description = formData.description || null;
      }
      if (Array.isArray(formData.category_general)) {
        propagateData.category_general = formData.category_general;
      }
      if (Array.isArray(formData.category_specific)) {
        propagateData.category_specific = formData.category_specific;
      }
      if (Array.isArray(formData.category_sub_specific)) {
        propagateData.category_sub_specific = formData.category_sub_specific.length > 0
          ? formData.category_sub_specific.filter(Boolean).join(', ')
          : null;
      }
      if (Array.isArray(formData.category_detail)) {
        propagateData.category_detail = formData.category_detail;
      }
      if (Array.isArray(formData.tags)) {
        propagateData.tags = formData.tags;
      }
      
      // Aplicar UPDATE a todos los hijos
      const { data, error } = await supabase
        .from('products')
        .update(propagateData)
        .eq('parent_product_id', currentProduct.id)
        .select('id');
      
      if (error) throw error;
      
      alert(`✅ Datos propagados a ${data?.length || 0} variantes.`);
    } catch (err: any) {
      alert('Error al propagar: ' + (err.message || 'desconocido'));
    } finally {
      setPropagating(false);
    }
  };

  const refreshCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  };

  const handleAddSpecific = async (name: string) => {
    const genArr = Array.isArray(formData.category_general) ? formData.category_general : (formData.category_general ? [formData.category_general] : []);
    const selectedGeneral = categories.find(c => c.type === 'general' && genArr.includes(c.name));
    await supabase.from('categories').insert([{
      name,
      type: 'specific',
      parent_id: selectedGeneral?.id || null,
    }]);
    await refreshCategories();
  };

  const handleAddSubSpecific = async (name: string) => {
    const specArr = Array.isArray(formData.category_specific) ? formData.category_specific : (formData.category_specific ? [formData.category_specific] : []);
    const selectedSpecific = categories.find(c => c.type === 'specific' && specArr.includes(c.name));
    await supabase.from('categories').insert([{
      name,
      type: 'sub_specific',
      parent_id: selectedSpecific?.id || null,
    }]);
    await refreshCategories();
  };

  const handleAddBrand = async (name: string) => {
    await supabase.from('categories').insert([{ name, type: 'brand' }]);
    await refreshCategories();
  };

  const handleAddSpecies = async (name: string) => {
    await supabase.from('categories').insert([{ name, type: 'species' }]);
    await refreshCategories();
  };

  const handleAddAge = async (name: string) => {
    await supabase.from('categories').insert([{ name, type: 'age' }]);
    await refreshCategories();
  };

  const handleAddCondition = async (name: string) => {
    await supabase.from('categories').insert([{ name, type: 'condition' }]);
    await refreshCategories();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} productos? Esta acción no se puede deshacer.`)) return;
    
    const ids = Array.from(selectedIds);
    const totalChunks = Math.ceil(ids.length / 50);
    setBulkProgress({ open: true, label: 'Eliminando productos...', done: 0, total: totalChunks });
    
    const result = await bulkDeleteInChunks(
      ids,
      (done, total) => setBulkProgress(prev => ({ ...prev, done, total }))
    );
    
    setBulkProgress({ open: false, label: '', done: 0, total: 0 });
    setSelectedIds(new Set());
    onRefreshAll();
    
    if (result.failed > 0) {
      alert(`✅ ${result.success} eliminados. ⚠️ ${result.failed} fallaron.`);
    } else {
      alert(`✅ ${result.success} productos eliminados.`);
    }
  };

  const handleBulkActivate = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    const totalChunks = Math.ceil(ids.length / 50);
    setBulkProgress({ open: true, label: 'Activando productos...', done: 0, total: totalChunks });
    
    const result = await bulkUpdateInChunks(
      ids,
      { active: true },
      (done, total) => setBulkProgress(prev => ({ ...prev, done, total }))
    );
    
    setBulkProgress({ open: false, label: '', done: 0, total: 0 });
    setSelectedIds(new Set());
    onRefreshAll();
    
    if (result.failed > 0) {
      alert(`✅ ${result.success} activados. ⚠️ ${result.failed} fallaron.\n\n${result.errors.slice(0, 3).join('\n')}`);
    } else {
      alert(`✅ ${result.success} productos activados correctamente.`);
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    const totalChunks = Math.ceil(ids.length / 50);
    setBulkProgress({ open: true, label: 'Desactivando productos...', done: 0, total: totalChunks });
    
    const result = await bulkUpdateInChunks(
      ids,
      { active: false },
      (done, total) => setBulkProgress(prev => ({ ...prev, done, total }))
    );
    
    setBulkProgress({ open: false, label: '', done: 0, total: 0 });
    setSelectedIds(new Set());
    onRefreshAll();
    
    if (result.failed > 0) {
      alert(`✅ ${result.success} desactivados. ⚠️ ${result.failed} fallaron.\n\n${result.errors.slice(0, 3).join('\n')}`);
    } else {
      alert(`✅ ${result.success} productos desactivados correctamente.`);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const loadCredits = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'ai_image_credits')
          .maybeSingle();
        const val = parseInt(data?.value || '0', 10);
        setAiCredits(isNaN(val) ? 0 : val);
      } catch {}
    };
    loadCredits();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (data) setCategories(data);
  };

  const startAdd = () => {
    setFormData({
      product_code: generateProductCode(),
      external_code: '',
      name: '',
      public_name: '',
      description: '',
      description_ai_enhanced: '',
      price: 0,
      special_price: 0,
      differentiated_price: 0,
      category_general: [],
      category_specific: ['Otros'],
      category_sub_specific: [],
      category_detail: [],
      category_species: ['Otros'],
      category_brand: 'Otros',
      image_url: '',
      uploaded_image_url: '',
      additional_images: [],
      stock: 0,
      active: true,
      brand: '',
      location: 'SHOW ROOM',
      cost: 0,
      wholesale_price: 0,
      retail_margin: 0,
      wholesale_margin: 0,
      interest_rate_6: 10,
      interest_rate_12: 15,
      interest_rate_18: 20,
      interest_rate_24: 25,
      is_featured: false,
      show_in_hero: false,
      local_only: false,
      requires_refrigeration: false,
      url_slug: '',
    });
    setImageSource('url');
    setManualSlug(false);
    setAdding(true);
    setPendingImageFile(null);
    setPendingImageUrl('');
    setImagePreview('');
    setAiImproved(false);
    setCategorizationDone(false);
  };

  const startEdit = (product: Product) => {
    setFormData({
      ...product,
      public_name: product.public_name || '',
      category_sub_specific: Array.isArray(product.category_sub_specific)
        ? product.category_sub_specific
        : (product.category_sub_specific && typeof (product.category_sub_specific as any) === 'string'
            ? (() => {
                const s = (product.category_sub_specific as any).trim();
                if (s === '[]' || s === 'null' || s === '""') return [];
                return s.split(',').map((item: string) => item.trim()).filter(Boolean);
              })()
            : []),
      category_detail: Array.isArray(product.category_detail)
        ? product.category_detail
        : (product.category_detail ? [product.category_detail] : []),
      additional_images: product.additional_images || [],
    });
    setImageSource(product.uploaded_image_url ? 'upload' : 'url');
    setManualSlug(true);
    setEditing(product.id);
    setPendingImageFile(null);
    setPendingImageUrl('');
    setImagePreview(product.uploaded_image_url || product.image_url || '');
    setAiImproved(false);
    setCategorizationDone(false);

    setVolumePrices([]);
    setLoadingVolumePrices(true);
    supabase
      .from('volume_prices')
      .select('id, product_id, price_level, min_qty, max_qty, price')
      .eq('product_id', product.id)
      .order('price_level', { ascending: true })
      .then(async ({ data }) => {
        setVolumePrices((data as VolumePrice[]) || []);
        setLoadingVolumePrices(false);

        // Cargar grupos disponibles para poder asignar presentación de caja
        const { data: gruposData } = await supabase
          .from('products')
          .select('id, name')
          .eq('is_parent', true)
          .eq('active', true)
          .order('name');
        setGrupos(gruposData || []);
        setSelectedGroupId('');
      });
  };

  const handleNameChange = (val: string) => {
    const updates: Partial<Product> = { name: val };
    if (!manualSlug || !formData.url_slug) {
      updates.url_slug = generateSlug(val);
    }
    setFormData({ ...formData, ...updates });
  };

  const handleSlugChange = (val: string) => {
    setManualSlug(true);
    const formattedSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData({ ...formData, url_slug: formattedSlug });
  };

  const handleBulkFieldChange = (field: string, value: any) => {
    setBulkTouchedFields(prev => new Set(prev).add(field));
    setBulkFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkSave = async () => {
    if (bulkTouchedFields.size === 0) {
      alert('No modificaste ningún campo.');
      return;
    }
    if (!confirm(`¿Aplicar cambios a ${selectedIds.size} producto(s)?`)) return;

    const updates: Record<string, any> = {};
    bulkTouchedFields.forEach(field => {
      if (field === 'category_sub_specific') {
        const val = (bulkFormData as any)[field];
        updates[field] = Array.isArray(val) && val.length > 0
          ? val.filter(Boolean).join(', ')
          : null;
      } else {
        updates[field] = (bulkFormData as any)[field];
      }
    });

    const ids = Array.from(selectedIds);
    const totalChunks = Math.ceil(ids.length / 50);
    setBulkProgress({ open: true, label: 'Guardando cambios masivos...', done: 0, total: totalChunks });

    const result = await bulkUpdateInChunks(
      ids,
      updates,
      (done, total) => setBulkProgress(prev => ({ ...prev, done, total }))
    );

    setBulkProgress({ open: false, label: '', done: 0, total: 0 });
    setBulkEditing(false);
    setBulkFormData({});
    setBulkTouchedFields(new Set());
    setSelectedIds(new Set());
    onRefreshAll();

    if (result.failed > 0) {
      alert(`✅ ${result.success} actualizados. ⚠️ ${result.failed} fallaron.\n\n${result.errors.slice(0, 3).join('\n')}`);
    } else {
      alert(`✅ ${result.success} productos actualizados correctamente.`);
    }
  };

  const calculateRetailPrice = (cost: number, margin: number) => Math.round(cost * (1 + margin / 100));
  const calculateWholesalePrice = (cost: number, margin: number) => Math.round(cost * (1 + margin / 100));

  const handleCostChange = (val: number) => {
    const retailMargin = formData.retail_margin || 0;
    const wholesaleMargin = formData.wholesale_margin || 0;
    
    setFormData({
      ...formData,
      cost: val,
      price: retailMargin > 0 ? calculateRetailPrice(val, retailMargin) : formData.price,
      wholesale_price: wholesaleMargin > 0 ? calculateWholesalePrice(val, wholesaleMargin) : formData.wholesale_price
    });
  };

  const handleRetailMarginChange = (val: number) => {
    const cost = formData.cost || 0;
    setFormData({ ...formData, retail_margin: val, price: calculateRetailPrice(cost, val) });
  };

  const handleWholesaleMarginChange = (val: number) => {
    const cost = formData.cost || 0;
    setFormData({ ...formData, wholesale_margin: val, wholesale_price: calculateWholesalePrice(cost, val) });
  };

  const optimizeImage = async (input: File | Blob | string): Promise<Blob | null> => {
    try {
      let res: Response;
      if (typeof input === 'string') {
        res = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: input }),
        });
      } else {
        res = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': input.type },
          body: input,
        });
      }
      if (!res.ok) throw new Error(`Error al optimizar imagen: ${res.status}`);
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) {
        console.error('Respuesta inesperada:', blob.type);
        return null;
      }
      return blob;
    } catch (err) {
      console.error('optimizeImage error:', err);
      return null;
    }
  };

  const processDataUriIfNeeded = async (value: string, prefix: string): Promise<string> => {
    if (!value || !value.startsWith('data:')) return value;
    try {
      const res = await fetch(value);
      const originalBlob = await res.blob();

      const webpBlob = await optimizeImage(originalBlob);
      if (!webpBlob) {
        throw new Error('No se pudo optimizar la imagen a WebP.');
      }

      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .upload(filename, webpBlob, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error processing data URI:', error);
      throw new Error('Error al procesar y subir imagen. La imagen NO se guardó. Por favor, reintente.');
    }
  };

  const handleImproveWithAI = async () => {
    if (!categorizationDone) {
      alert('Antes de mejorar con IA, marcá el checkbox "Terminé" para confirmar que terminaste de categorizar este producto. Esto asegura que toda la metadata se envíe a la IA.');
      return;
    }
    if (!pendingImageFile && !pendingImageUrl && !imagePreview) {
      alert('Cargá una imagen primero'); return;
    }

    const { data: ctxRefSettings } = await supabase
      .from('ai_image_context_settings')
      .select('send_metadata, use_reference_images, ai_model, credits_per_use')
      .eq('context', 'products')
      .maybeSingle();
    const creditsNeeded = ctxRefSettings?.credits_per_use ?? 1;

    if (aiCredits < creditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${aiCredits}.`);
      return;
    }

    setIsAiImproving(true);
    try {
      // 1. Obtener prompt activo de la DB
      const { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'products')
        .order('sort_order', { ascending: true });

      const prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Professional e-commerce product photo, pure white background, centered, soft studio lighting, sharp focus, 1:1 square format';

      const shouldSendMeta = ctxRefSettings?.send_metadata ?? true;

      const shouldUseRefImages = ctxRefSettings?.use_reference_images ?? true;
      const selectedModel = ctxRefSettings?.ai_model ?? 'gpt-image-1.5';

      let referenceImageUrlsToSend: string[] = [];
      if (shouldUseRefImages) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'products')
          .order('sort_order', { ascending: true })
          .limit(2);
        if (refImgs && refImgs.length > 0) {
          referenceImageUrlsToSend = refImgs.map(r => r.image_url);
        }
      }

      // 2. Preparar FormData para /api/ai-image
      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');

      if (pendingImageFile) {
        form.append('image', pendingImageFile);
      } else {
        const urlToUse = pendingImageUrl || imagePreview;
        form.append('imageUrl', urlToUse);
      }

      if (shouldSendMeta) {
        const productMetadata = {
          name: formData.name,
          brand: formData.category_brand,
          category_general: formData.category_general,
          category_specific: formData.category_specific,
          category_sub_specific: formData.category_sub_specific,
          category_detail: formData.category_detail,
          category_species: formData.category_species,
          category_age: formData.category_age,
          category_condition: formData.category_condition,
          tags: formData.tags,
        };
        form.append('productMetadata', JSON.stringify(productMetadata));
      }

      if (referenceImageUrlsToSend.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrlsToSend));
      }

      form.append('model', selectedModel);

      // 3. Llamar a OpenAI via API route
      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (!data.b64) throw new Error('Sin imagen en la respuesta');

      // 4. Convertir base64 a File y reemplazar como imagen pendiente
      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const aiBlob = new Blob([ab], { type: 'image/png' });
      const aiFile = new File([aiBlob], `ai-improved-${Date.now()}.png`, { type: 'image/png' });

      // Guardar la URL original ANTES de cambiarla
      setAiReviewOriginalUrl(imagePreview);
      setAiReviewImprovedUrl(URL.createObjectURL(aiFile));
      setAiReviewFile(aiFile);
      setAiReviewOpen(true);

      // Descontar créditos según costo
      const newCredits = Math.max(0, aiCredits - creditsNeeded);
      await supabase
        .from('settings')
        .update({ value: String(newCredits), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      setAiCredits(newCredits);
    } catch (err: any) {
      alert('Error al mejorar con IA: ' + (err.message || 'Desconocido'));
    } finally {
      setIsAiImproving(false);
    }
  };

  const handleAiRetry = async (corrections: string) => {
    if (!aiReviewFile) return;

    const { data: ctxRefSettings } = await supabase
      .from('ai_image_context_settings')
      .select('send_metadata, use_reference_images, ai_model, credits_per_use')
      .eq('context', 'products')
      .maybeSingle();
    const creditsNeeded = ctxRefSettings?.credits_per_use ?? 1;

    if (aiCredits < creditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${aiCredits}.`);
      return;
    }

    setAiReviewRetrying(true);
    try {
      const { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'products')
        .order('sort_order', { ascending: true });

      let prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Professional e-commerce product photo, pure white background, centered, soft studio lighting, sharp focus, 1:1 square format';

      // Concatenar correcciones del usuario
      prompt = `${prompt}. IMPORTANT corrections from user: ${corrections}`;

      const shouldSendMeta = ctxRefSettings?.send_metadata ?? true;

      const shouldUseRefImages = ctxRefSettings?.use_reference_images ?? true;
      const selectedModel = ctxRefSettings?.ai_model ?? 'gpt-image-1.5';

      let referenceImageUrlsToSend: string[] = [];
      if (shouldUseRefImages) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'products')
          .order('sort_order', { ascending: true })
          .limit(2);
        if (refImgs && refImgs.length > 0) {
          referenceImageUrlsToSend = refImgs.map(r => r.image_url);
        }
      }

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('image', aiReviewFile);

      if (shouldSendMeta) {
        const productMetadata = {
          name: formData.name,
          brand: formData.category_brand,
          category_general: formData.category_general,
          category_specific: formData.category_specific,
          category_sub_specific: formData.category_sub_specific,
          category_detail: formData.category_detail,
          category_species: formData.category_species,
          category_age: formData.category_age,
          category_condition: formData.category_condition,
          tags: formData.tags,
        };
        form.append('productMetadata', JSON.stringify(productMetadata));
      }

      if (referenceImageUrlsToSend.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrlsToSend));
      }

      form.append('model', selectedModel);

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Convertir b64 to File
      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const newBlob = new Blob([ab], { type: 'image/png' });
      const newFile = new File([newBlob], `ai-retry-${Date.now()}.png`, { type: 'image/png' });

      // Actualizar la imagen mejorada en el modal
      setAiReviewFile(newFile);
      setAiReviewImprovedUrl(URL.createObjectURL(newFile));

      // Descontar crédito según costo
      const newCredits = Math.max(0, aiCredits - creditsNeeded);
      await supabase
        .from('settings')
        .update({ value: String(newCredits), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      setAiCredits(newCredits);
    } catch (err: any) {
      alert('Error al reenviar a IA: ' + (err.message || 'desconocido'));
    } finally {
      setAiReviewRetrying(false);
    }
  };

  const handleAiAccept = async () => {
    if (!aiReviewFile) {
      setAiReviewOpen(false);
      return;
    }

    let finalFile = aiReviewFile;

    if (applyBrandSeal) {
      try {
        const form = new FormData();
        form.append('image', aiReviewFile);
        form.append('position', 'south_east');
        const res = await fetch('/api/apply-brand-seal', { method: 'POST', body: form });
        if (res.ok) {
          const blob = await res.blob();
          finalFile = new File([blob], `branded-${Date.now()}.png`, { type: 'image/png' });
        } else {
          const errData = await res.json();
          alert('No se pudo aplicar el sello: ' + (errData.error || 'error desconocido') + '. Se usará la imagen sin sello.');
        }
      } catch (err) {
        alert('Error al aplicar sello de marca. Se usará la imagen sin sello.');
      }
    }

    setPendingImageFile(finalFile);
    setPendingImageUrl('');
    setImagePreview(URL.createObjectURL(finalFile));
    setAiImproved(true);
    setAiReviewOpen(false);
    setAiReviewFile(null);
  };

  const handleAiCancel = () => {
    setAiReviewOpen(false);
    setAiReviewFile(null);
    // Liberar las object URLs
    if (aiReviewImprovedUrl) URL.revokeObjectURL(aiReviewImprovedUrl);
    setAiReviewImprovedUrl('');
    setAiReviewOriginalUrl('');
  };

  const handleSave = async () => {
    if (!formData.name || formData.price === undefined || !formData.product_code) {
      alert('Completa nombre, precio y código'); return;
    }
    try {
      let urlSlug = formData.url_slug?.trim() || generateSlug(formData.name);
      urlSlug = await ensureUniqueSlug(urlSlug, editing || null, supabase);

      // ── Pipeline de imagen principal ──
      let finalUploadedUrl = formData.uploaded_image_url || '';
      let finalImageUrl = formData.image_url || '';

      if (pendingImageFile || pendingImageUrl) {
        setImageProgressModal({ open: true, label: 'Optimizando a WebP...', step: 1, totalSteps: 2 });
        const input: File | string = pendingImageFile ? pendingImageFile : pendingImageUrl;
        const webpBlob = await optimizeImage(input);

        if (!webpBlob) {
          throw new Error(
            'No se pudo optimizar la imagen a WebP. La imagen NO se guardó — ' +
            'reintentá en unos segundos o probá con otra imagen/URL.'
          );
        }

        setImageProgressModal(prev => ({ ...prev, label: 'Subiendo imagen...', step: 2 }));
        const filename = `product-main-${Date.now()}.webp`;
        const { error: storageError } = await supabase.storage
          .from('product-images')
          .upload(filename, webpBlob, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });
        if (storageError) throw storageError;
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);
        finalUploadedUrl = urlData.publicUrl;
        finalImageUrl = '';
      }

      // Proteger contra base64 en la imagen principal que venga por cualquier otro flujo
      if (finalUploadedUrl.startsWith('data:')) {
        setImageProgressModal({ open: true, label: 'Guardando imagen principal...', step: 1, totalSteps: 2 });
        finalUploadedUrl = await processDataUriIfNeeded(finalUploadedUrl, 'product-main');
      }
      if (finalImageUrl.startsWith('data:')) {
        setImageProgressModal({ open: true, label: 'Guardando imagen principal...', step: 1, totalSteps: 2 });
        finalImageUrl = await processDataUriIfNeeded(finalImageUrl, 'product-main');
      }

      // Procesar imágenes adicionales si contienen base64/data URI
      let finalAdditionalImages = [...(formData.additional_images || [])];
      let hasBase64InGallery = finalAdditionalImages.some(img => img.startsWith('data:'));
      if (hasBase64InGallery) {
        setImageProgressModal({ open: true, label: 'Procesando imágenes de galería...', step: 1, totalSteps: 2 });
        for (let i = 0; i < finalAdditionalImages.length; i++) {
          const img = finalAdditionalImages[i];
          if (img.startsWith('data:')) {
            setImageProgressModal(prev => ({ ...prev, label: `Subiendo imagen de galería (${i + 1}/${finalAdditionalImages.length})...` }));
            const publicUrl = await processDataUriIfNeeded(img, 'product-additional');
            finalAdditionalImages[i] = publicUrl;
          }
        }
      }

      const productData = {
        product_code: formData.product_code.trim(),
        external_code: formData.external_code?.trim() || '',
        name: formData.name.trim(),
        public_name: formData.public_name?.trim() || null,
        description: formData.description?.trim() || '',
        description_ai_enhanced: formData.description_ai_enhanced?.trim() || null,
        price: Number(formData.price),
        special_price: Number(formData.special_price) || 0,
        differentiated_price: Number(formData.differentiated_price) || 0,
        category_general: (formData.category_general as string[] | undefined) || [],
        category_specific: (formData.category_specific as string[] | undefined) || [],
        category_sub_specific: (formData.category_sub_specific as string[] || []).length > 0
          ? (formData.category_sub_specific as string[]).filter(Boolean).join(', ')
          : null,
        category_detail: (formData.category_detail as string[] | undefined) || [],
        category_species: formData.category_species?.length ? formData.category_species : ['Otros'],
        category_brand: formData.category_brand || 'Otros',
        category_age: (formData.category_age as string[] || []).length ? formData.category_age : [],
        category_condition: (formData.category_condition as string[] || []).length ? formData.category_condition : [],
        is_bulk: formData.is_bulk || false,
        is_prescription: formData.is_prescription || false,
        requires_prescription: formData.requires_prescription || false,
        local_only: formData.local_only || false,
        requires_refrigeration: formData.requires_refrigeration || false,
        tags: (formData.tags as string[] || []).length ? formData.tags : [],
        image_url: finalImageUrl,
        uploaded_image_url: finalUploadedUrl,
        additional_images: finalAdditionalImages,
        stock: Number(formData.stock) || 0,
        active: formData.active !== false,
        brand: formData.brand?.trim() || '',
        location: formData.location || 'SHOW ROOM',
        cost: Number(formData.cost) || 0,
        wholesale_price: Number(formData.wholesale_price) || 0,
        retail_margin: Number(formData.retail_margin) || 0,
        wholesale_margin: Number(formData.wholesale_margin) || 0,
        interest_rate_6: Number(formData.interest_rate_6) || 0,
        interest_rate_12: Number(formData.interest_rate_12) || 0,
        interest_rate_18: Number(formData.interest_rate_18) || 0,
        interest_rate_24: Number(formData.interest_rate_24) || 0,
        url_slug: urlSlug,
        seo_title: formData.seo_title?.trim() || null,
        seo_description: formData.seo_description?.trim() || null,
        is_featured: formData.is_featured || false,
        show_in_hero: formData.show_in_hero || false,
        updated_at: new Date().toISOString(),
      };

      // Si el producto queda con categorías completas, marcarlo como categorizado
      // para que no aparezca como "Pendiente" en /owner/categorizar-productos
      if ((productData.category_general?.length || 0) > 0 && (productData.category_specific?.length || 0) > 0) {
        (productData as any).ai_categorized_at = new Date().toISOString();
      }

      setImageProgressModal(prev => ({ ...prev, label: 'Guardando producto...', step: 2, totalSteps: 2 }));

      // Sanity check obligatorio antes de persistir
      assertNoBase64(productData);

      if (adding) {
        const { data, error } = await supabase.from('products').insert([productData]).select().single();
        if (error) {
          if (error.code === '23505') throw new Error('El código de producto o slug ya existe.');
          throw error;
        }
        alert('Producto agregado');
        setAdding(false);
        if (data) {
          onProductCreated(data as Product);
        }
      } else if (editing) {
        const { error } = await supabase.from('products').update(productData).eq('id', editing);
        if (error) throw error;
        alert('Producto actualizado');
        setEditing(null);
        onProductUpdated(editing, productData);
      }

      setFormData({});
      setPendingImageFile(null);
      setPendingImageUrl('');
      setImagePreview('');
      setAiImproved(false);
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + (error.message || 'Desconocido'));
    } finally {
      setImageProgressModal({ open: false, label: '', step: 0, totalSteps: 0 });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (isGallery) {
      setImageProgressModal({ open: true, label: 'Optimizando galería...', step: 1, totalSteps: files.length });
      try {
        const newImages: string[] = [...(formData.additional_images || [])];
        for (let i = 0; i < files.length; i++) {
          setImageProgressModal({ open: true, label: `Procesando imagen ${i + 1} de ${files.length}...`, step: i + 1, totalSteps: files.length });
          const file = files[i];
          
          const webpBlob = await optimizeImage(file);
          if (!webpBlob) {
            throw new Error(`No se pudo optimizar la imagen ${i + 1} de la galería. Ninguna imagen de este lote se guardó — reintentá.`);
          }
          const path = `product-additional/${crypto.randomUUID()}.webp`;
          const { error: uploadErr } = await supabase.storage
            .from('product-images')
            .upload(path, webpBlob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
          if (uploadErr) throw uploadErr;

          const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
          newImages.push(pub.publicUrl);
        }
        setFormData(prev => ({ ...prev, additional_images: newImages }));
      } catch (err: any) {
        console.error('Error uploading gallery images:', err);
        alert('Error al subir imágenes de galería: ' + (err.message || 'desconocido'));
      } finally {
        setImageProgressModal({ open: false, label: '', step: 0, totalSteps: 0 });
      }
    } else {
      // Imagen principal: guardar como File pendiente
      const file = files[0];
      setPendingImageFile(file);
      setPendingImageUrl('');
      setImagePreview(URL.createObjectURL(file));
      setAiImproved(false);
      setImageSource('upload');
    }
  };

  const removeGalleryImage = (index: number) => {
    const newImages = (formData.additional_images || []).filter((_, i) => i !== index);
    setFormData({ ...formData, additional_images: newImages });
  };

  const isResultComplete = (res: AIResult): boolean => {
    const hasSpecific = Array.isArray(res.category_specific) && res.category_specific.length > 0;
    const hasSpecies = res.category_species.length > 0;
    const hasBrand = !!res.category_brand && res.category_brand.trim() !== '';
    // sub_specific es opcional para el estado "completo"
    return hasSpecific && hasSpecies && hasBrand;
  };

  const normalizeAIResult = (res: any, original: Product | undefined): AIResult => {
    const ceRaw = Array.isArray(res.category_specific)
      ? (res.category_specific[0] || '')
      : (res.category_specific || '');
    const ceFromAI = String(ceRaw).trim();
    const ceArray = ceFromAI ? [ceFromAI] : [];

    // Normalizar species — la IA puede devolver singular o plural
    let category_species: string[] = [];
    if (Array.isArray(res.category_species)) {
      const validSpecies = categories.map(c => c.type === 'species' ? c.name : null).filter(Boolean) as string[];
      category_species = res.category_species
        .filter((s: string) => s !== 'N/A' && s.trim() !== '')
        .map((s: string) => {
          // Buscar match exacto primero
          const exact = validSpecies.find(v => v === s);
          if (exact) return exact;
          // Buscar match sin distinción singular/plural (ej: "Perro" → "Perros")
          const fuzzy = validSpecies.find(v =>
            v.toLowerCase().startsWith(s.toLowerCase()) ||
            s.toLowerCase().startsWith(v.toLowerCase())
          );
          return fuzzy || s;
        });
    }

    // Normalizar brand — si no es N/A y no está en la lista, igual se acepta (se creará)
    const category_brand = (!res.category_brand || res.category_brand === 'N/A')
      ? ''
      : res.category_brand.trim();

    const cgArray = Array.isArray(original?.category_general)
      ? original.category_general
      : (original?.category_general ? [original.category_general as any as string] : []);

    const aiAge = Array.isArray(res.category_age) ? res.category_age.filter(Boolean) : [];
    const category_age = aiAge.length > 0 ? aiAge : ['Todas las edades'];
    const ageIsDefault = aiAge.length === 0;

    const aiCondition = Array.isArray(res.category_condition) ? res.category_condition.filter(Boolean) : [];
    const category_condition = aiCondition.length > 0 ? aiCondition : ['Sin condición'];
    const conditionIsDefault = aiCondition.length === 0;

    const speciesIsDefault = category_species.length === 0;

    const result: AIResult = {
      id: res.id,
      name: original?.name || 'Producto desconocido',
      category_general: cgArray,
      category_specific: ceArray,
      category_sub_specific: Array.isArray(res.category_sub_specific)
        ? res.category_sub_specific
        : (res.category_sub_specific && typeof (res.category_sub_specific as any) === 'string'
            ? (() => {
                const s = (res.category_sub_specific as any).trim();
                if (s === '[]' || s === 'null' || s === '""') return [];
                return s.split(',').map((item: string) => item.trim()).filter(Boolean);
              })()
            : []),
      category_detail: Array.isArray(original?.category_detail) ? original!.category_detail : [],
      category_species,
      category_brand,
      category_age,
      category_condition,
      ageIsDefault,
      conditionIsDefault,
      speciesIsDefault,
      is_bulk: res.is_bulk === true || res.is_bulk === 'true',
      is_prescription: res.is_prescription === true || res.is_prescription === 'true',
      requires_prescription: original?.requires_prescription || false,
      local_only: original?.local_only || false,
      requires_refrigeration: original?.requires_refrigeration || false,
      tags: Array.isArray(res.tags) ? res.tags : [],
      active: original?.active !== false,
      pendingImageFile: null,
      pendingImageUrl: '',
      imagePreview: original?.uploaded_image_url || original?.image_url || '',
      isAiImproving: false,
      aiImproved: false,
      imageInputMethod: 'url',
      categorizationDone: false,
      status: 'complete',
    };
    result.status = isResultComplete(result) ? 'complete' : 'incomplete';
    return result;
  };

  const startAICategorization = async () => {
    setIsAIConfirmOpen(false);
    setIsAIProcessing(true);
    setAiCurrentBatch(0);
    setAiResults([]);

    const selected = products.filter(p => selectedIds.has(p.id));
    const BATCH_SIZE = 20;
    const batches: Product[][] = [];
    for (let i = 0; i < selected.length; i += BATCH_SIZE) {
      batches.push(selected.slice(i, i + BATCH_SIZE));
    }
    setAiTotalBatches(batches.length);
    const fullResults: AIResult[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        setAiCurrentBatch(i + 1);
        const batch = batches[i];

        const { data: latestCats } = await supabase.from('categories').select('*');
        const cats = latestCats || [];

        const categoriasEspecificas = Array.from(new Set(
          cats.filter((c: Category) => c.type === 'specific').map((c: Category) => c.name)
        ));
        const especies = Array.from(new Set(
          cats.filter((c: Category) => c.type === 'species').map((c: Category) => c.name)
        ));
        const marcas = Array.from(new Set(
          cats.filter((c: Category) => c.type === 'brand').map((c: Category) => c.name)
        ));

        const response = await fetch('/api/categorizar-productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productos: batch.map(p => ({ id: p.id, nombre: p.name })),
            categorias_especificas: categoriasEspecificas,
            especies,
            marcas,
          }),
        });

        if (!response.ok) throw new Error('Error al conectar con el servidor de IA');

        const data = await response.json();
        const resultados: any[] = Array.isArray(data)
          ? data
          : (data.output || data.items || []);

        const batchResults: AIResult[] = resultados.map((res: any) => {
          const original = batch.find(p => p.id === res.id);
          return normalizeAIResult(res, original);
        });

        fullResults.push(...batchResults);
      }

      setAiResults(fullResults);
      setIsAIProcessing(false);
      setIsAIReviewOpen(true);
    } catch (error) {
      console.error(error);
      alert('Error durante el procesamiento. Por favor reintentá.');
      setIsAIProcessing(false);
    }
  };

  const handleAIReviewChange = (id: string, field: keyof AIResult, value: any) => {
    setAiResults(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      updated.status = isResultComplete(updated) ? 'complete' : 'incomplete';
      return updated;
    }));
  };

  const handleAIAddSpecific = async (name: string, aiResultId: string) => {
    const aiRes = aiResults.find(r => r.id === aiResultId);
    if (!aiRes) return;

    const generals = Array.isArray(aiRes.category_general) ? aiRes.category_general : (aiRes.category_general ? [aiRes.category_general] : []);
    const firstGenName = generals[0];
    const genCat = categories.find(c => c.type === 'general' && c.name === firstGenName);

    const { data, error } = await supabase.from('categories').insert([{
      name, type: 'specific', parent_id: genCat?.id || null
    }]).select().single();

    if (!error && data) {
      await refreshCategories();
      const currentCE = Array.isArray(aiRes.category_specific) ? aiRes.category_specific : (aiRes.category_specific ? [aiRes.category_specific] : []);
      handleAIReviewChange(aiResultId, 'category_specific', [...currentCE, data.name]);
    }
  };

  const handleAIAddSubSpecific = async (name: string, aiResultId: string) => {
    const aiRes = aiResults.find(r => r.id === aiResultId);
    if (!aiRes) return;

    const specs = Array.isArray(aiRes.category_specific) ? aiRes.category_specific : (aiRes.category_specific ? [aiRes.category_specific] : []);
    const specCat = categories.find(c => c.type === 'specific' && specs.includes(c.name));

    const { data, error } = await supabase.from('categories').insert([{
      name,
      type: 'sub_specific',
      parent_id: specCat?.id || null
    }]).select().single();

    if (!error && data) {
      await refreshCategories();
      const currentSub = Array.isArray(aiRes.category_sub_specific) ? aiRes.category_sub_specific : [];
      handleAIReviewChange(aiResultId, 'category_sub_specific', [...currentSub, data.name]);
    }
  };

  const handleAISaveAll = async () => {
    setAiSaveLoading(true);
    try {
      // 1. Crear categorías nuevas (específicas Y marcas)
      const { data: existingCats } = await supabase.from('categories').select('name, type');
      
      // Categorías específicas nuevas
      const existingSpecific = (existingCats || [])
        .filter((c: any) => c.type === 'specific')
        .map((c: any) => c.name.toLowerCase());

      const allSpecific = Array.from(new Set(
        aiResults.flatMap(r => Array.isArray(r.category_specific) ? r.category_specific : (r.category_specific ? [r.category_specific] : []))
      ));
      const newSpecific = allSpecific.filter(name =>
        !existingSpecific.includes(name.toLowerCase())
      );

      if (newSpecific.length > 0) {
        await supabase.from('categories').insert(
          newSpecific.map(name => ({ name, type: 'specific' }))
        );
      }

      // Marcas nuevas — registrar automáticamente las que la IA identificó pero no existen
      const existingBrands = (existingCats || [])
        .filter((c: any) => c.type === 'brand')
        .map((c: any) => c.name.toLowerCase());

      const allBrands = Array.from(new Set(aiResults.map(r => r.category_brand).filter(Boolean)));
      const newBrands = allBrands.filter(name =>
        !existingBrands.includes(name.toLowerCase())
      );

      if (newBrands.length > 0) {
        await supabase.from('categories').insert(
          newBrands.map(name => ({ name, type: 'brand' }))
        );
      }

      const updatePromises = aiResults.map(res =>
        supabase.from('products').update({
          category_general: res.category_general,
          category_specific: res.category_specific || null,
          category_sub_specific: Array.isArray(res.category_sub_specific) && res.category_sub_specific.length > 0
            ? res.category_sub_specific.filter(Boolean).join(', ')
            : null,
          category_detail: res.category_detail || [],
          category_species: res.category_species,
          category_brand: res.category_brand || null,
          category_age: res.category_age && res.category_age.length > 0 ? res.category_age : [],
          category_condition: res.category_condition && res.category_condition.length > 0 ? res.category_condition : [],
          is_bulk: res.is_bulk,
          is_prescription: res.is_prescription,
          requires_prescription: res.requires_prescription || false,
          local_only: res.local_only || false,
          requires_refrigeration: res.requires_refrigeration || false,
          active: res.active,
          tags: res.tags && res.tags.length > 0 ? res.tags : [],
          ai_categorized_at: new Date().toISOString(),
        }).eq('id', res.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) console.error('Algunos updates fallaron:', errors);

      const completeCount = aiResults.filter(r => r.status === 'complete').length;
      const incompleteCount = aiResults.filter(r => r.status === 'incomplete').length;

      alert(`✅ ${completeCount} producto(s) categorizados.\n⚠️ ${incompleteCount} guardados incompletos para revisión manual.`);

      setIsAIReviewOpen(false);
      setSelectedIds(new Set());
      fetchCategories();
      onRefreshAll();
    } catch (error) {
      console.error(error);
      alert('Error al guardar los cambios.');
    } finally {
      setAiSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      onProductRemoved(id);
    } catch (error: any) {
      alert('Error al eliminar');
    }
  };

  const duplicateNameSet = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.is_parent || p.parent_product_id || p.archived) return;
      if (p.active === false) return;
      const key = (p.name || '').trim().toLowerCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Los contenedores padre se gestionan en la pestaña "Grupos"
      if (p.is_parent) return false;

      // Excluir archivados de la vista principal
      if (p.archived) return false;

      const matchSearch = !searchTerm || 
        (p.public_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCode = !codeSearchTerm ||
        (p.product_code || '').toLowerCase().includes(codeSearchTerm.toLowerCase());

      const matchCategory = !filterCategory || (Array.isArray(p.category_specific) && p.category_specific.includes(filterCategory));
      const matchSubSpecific = !filterSubSpecificCategory || (() => {
        if (!p.category_sub_specific) return false;
        if (Array.isArray(p.category_sub_specific)) {
          return p.category_sub_specific.includes(filterSubSpecificCategory);
        }
        const cleanStr = String(p.category_sub_specific);
        if (cleanStr === '[]' || cleanStr === 'null' || cleanStr === '""') return false;
        const list = cleanStr.split(',').map(s => s.trim()).filter(Boolean);
        return list.includes(filterSubSpecificCategory);
      })();
      const matchBrand = !filterBrand || p.category_brand === filterBrand;
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.active : !p.active);

      const matchGeneralCategory = !filterGeneralCategory || (Array.isArray(p.category_general) && p.category_general.includes(filterGeneralCategory));

      // Especie/Raza
      const matchSpecies = !filterSpecies || (
        Array.isArray(p.category_species)
          ? (p.category_species as string[]).includes(filterSpecies)
          : p.category_species === filterSpecies
      );

      // Stock
      const matchStock = (() => {
        if (filterStockMode === 'all') return true;
        if (filterStockMode === 'with') return p.stock > 0;
        if (filterStockMode === 'without') return p.stock === 0;
        if (filterStockMode === 'below') return p.stock < filterMaxStock;
        return true;
      })();

      // Precio
      const matchPrice = (() => {
        if (filterPriceMode === 'all' || filterPriceValue === 0) return true;
        if (filterPriceMode === 'gte') return p.price >= filterPriceValue;
        if (filterPriceMode === 'lte') return p.price <= filterPriceValue;
        if (filterPriceMode === 'eq') return p.price === filterPriceValue;
        return true;
      })();

      // Mantener filterLowStock existente (stock <= 5) como alias conveniente
      const matchLowStock = !filterLowStock || p.stock <= 5;
      const matchDetail = !filterDetail || (Array.isArray(p.category_detail) && p.category_detail.includes(filterDetail));
      const matchDuplicateName = !filterDuplicateNames || duplicateNameSet.has((p.name || '').trim().toLowerCase());
      const matchBulk = !filterBulk || p.is_bulk === true;

      return matchSearch && matchCode && matchCategory && matchSubSpecific && matchBrand && matchStatus &&
        matchGeneralCategory && matchSpecies && matchStock && matchPrice && matchLowStock && matchDetail && matchDuplicateName && matchBulk;
    }).sort((a, b) => {
      if (!filterDuplicateNames) return 0;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [
    products, searchTerm, codeSearchTerm, filterCategory, filterSubSpecificCategory, filterBrand,
    filterStatus, filterGeneralCategory, filterSpecies, filterStockMode, filterMaxStock,
    filterPriceMode, filterPriceValue, filterLowStock, filterDetail, duplicateNameSet, filterDuplicateNames,
    filterBulk
  ]);

  const archivedProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.archived) return false;
      if (p.is_parent) return false;
      const matchSearch = !searchTerm || 
        (p.public_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCode = !codeSearchTerm ||
        (p.product_code || '').toLowerCase().includes(codeSearchTerm.toLowerCase());
      return matchSearch && matchCode;
    });
  }, [products, searchTerm, codeSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectVisibleOnly = () => {
    const visibleIds = paginatedProducts.map(p => p.id);
    const allVisibleSelected = visibleIds.length > 0 && 
      visibleIds.every(id => selectedIds.has(id));
    
    if (allVisibleSelected) {
      // Deseleccionar solo los visibles
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Seleccionar todos los visibles (sin tocar los ya seleccionados de otras páginas)
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  console.log('[DEBUG productos]', {
    totalProducts: products.length,
    searchTerm,
    filteredCount: filteredProducts.length,
    paginatedCount: paginatedProducts.length,
  });

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6 font-sans text-gray-900">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Productos</h2>
            <p className="text-gray-500 text-sm">Gestiona tu catálogo completo</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-16 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-gray-700">Cargando productos...</p>
          <p className="text-xs text-gray-400">Esto puede tardar unos segundos en catálogos grandes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Productos</h2>
            <p className="text-gray-500 text-sm">Gestiona tu catálogo completo</p>
          </div>

          {/* Pestañas */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setActiveView('products')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'products'
                  ? 'bg-white shadow text-[#166534]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Productos ({products.filter(p => !p.is_parent).length})
            </button>
            <button
              onClick={() => setActiveView('groups')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'groups'
                  ? 'bg-white shadow text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🗂️ Grupos ({products.filter(p => p.is_parent).length})
            </button>
            <button
              onClick={() => setActiveView('archived')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'archived'
                  ? 'bg-white shadow text-amber-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🗄️ Archivados ({products.filter(p => p.archived && !p.is_parent).length})
            </button>
          </div>
        </div>
        {!adding && !editing && (
          <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <span className="font-medium text-blue-800">{selectedIds.size} seleccionado(s)</span>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium"
          >
            <Trash2 size={13} /> Eliminar seleccionados
          </button>
          <button
            onClick={handleBulkActivate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#166534] text-white rounded-md hover:bg-[#15803d] text-xs font-medium"
          >
            Activar seleccionados
          </button>
          <button
            onClick={handleBulkDeactivate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-xs font-medium"
          >
            Desactivar seleccionados
          </button>
          <button
            onClick={() => {
              setBulkFormData({});
              setBulkTouchedFields(new Set());
              setBulkEditing(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium"
          >
            <Edit size={13} /> Editar seleccionados
          </button>
          <button
            onClick={() => setIsAIConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs font-medium"
          >
            <Brain size={13} /> Categorizar con IA
          </button>
          <button
            onClick={handleOpenGrouping}
            disabled={selectedIds.size < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <GitMerge size={14} /> Agrupar
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 text-xs font-medium"
          >
            <X size={13} /> Deseleccionar
          </button>
        </div>
      )}

      {(adding || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setAdding(false); setEditing(null); setVolumePrices([]); } }}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {adding ? 'Agregar Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button onClick={() => { setAdding(false); setEditing(null); setVolumePrices([]); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {(() => {
                  const currentProduct = editing ? products.find(p => p.id === editing) : null;
                  if (currentProduct?.is_parent) {
                    return (
                      <div className="md:col-span-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="text-2xl flex-shrink-0">📤</div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-indigo-900">Producto padre (grupo)</p>
                          <p className="text-xs text-indigo-700 leading-relaxed">
                            La descripción, SEO y categorías del padre se usan como fallback cuando los hijos 
                            no tienen los suyos. Usá "Propagar" para sobrescribir los datos de todos los hijos 
                            con los del padre.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handlePropagateToChildren}
                          disabled={propagating}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 self-start md:self-auto"
                        >
                          {propagating ? (
                            <><Loader2 size={12} className="animate-spin" /> Propagando...</>
                          ) : (
                            <>📤 Propagar a hijos</>
                          )}
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto *</label>
                  <input type="text" value={formData.name || ''} onChange={e => handleNameChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Nombre público
                    <span className="ml-1 font-normal text-gray-400">(opcional — el que ven los clientes)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.public_name || ''}
                    onChange={(e) => setFormData({ ...formData, public_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#166534] outline-none"
                    placeholder="Ej: Alimento premium para perros adultos"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Si está vacío se mostrará el nombre de sistema: "{formData.name}"
                  </p>
                </div>

                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-600">
                      Descripción
                      <span className="ml-1 font-normal text-gray-400">(aparece en la página del producto)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription || !formData.name}
                      className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-xs font-semibold transition-colors"
                    >
                      {isGeneratingDescription ? (
                        <><Loader2 size={12} className="animate-spin" /> Generando...</>
                      ) : (
                        <>✨ Generar con IA</>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    onPaste={(e) => handleFormattedPaste(e, (newValue) => 
                      setFormData(prev => ({ ...prev, description: newValue }))
                    )}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-[#166534] outline-none resize-y"
                    placeholder="Descripción del producto..."
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Tip: completá las categorías y la marca antes de generar — la IA produce mejores 
                    descripciones con contexto.
                  </p>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-600">
                        Descripción mejorada con IA (HTML enriquecido — tablas, negritas)
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateEnhancedDescription}
                        disabled={isGeneratingEnhanced}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md font-bold disabled:opacity-50 flex items-center gap-1"
                      >
                        {isGeneratingEnhanced ? (
                          <><Loader2 size={12} className="animate-spin" /> Generando...</>
                        ) : (
                          <>🪄 Generar mejorada con IA</>
                        )}
                      </button>
                    </div>
                    <textarea
                      value={formData.description_ai_enhanced || ''}
                      onChange={(e) => setFormData({ ...formData, description_ai_enhanced: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:ring-1 focus:ring-indigo-400 outline-none resize-y"
                      placeholder="Se genera con el botón de arriba a partir del campo Descripción. También podés pegar/editar HTML manualmente."
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Si este campo tiene contenido, se muestra en la página del producto en vez de la 
                      "Descripción" normal. Dejalo vacío para usar siempre la descripción simple.
                    </p>
                  </div>
                </div>

                {/* Categorías */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-3 bg-white p-4 rounded-lg border border-[#1A8A00]/20">

                  {/* C. General */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      C. General <span className="text-red-500">*</span>
                    </label>
                    <CheckboxListWithAdd
                      selected={(formData.category_general as string[]) || []}
                      options={categories.filter(c => c.type === 'general').map(c => c.name)}
                      onChange={vals => setFormData({ 
                        ...formData, 
                        category_general: vals,
                        // Si se sacó alguna general, limpiar específicas, sub-específicas y detail que dependían
                        category_specific: [],
                        category_sub_specific: [],
                        category_detail: [],
                      })}
                      onAdd={async (val) => {
                        const { data } = await supabase.from('categories').insert([{
                          name: val, type: 'general', parent_id: null
                        }]).select().single();
                        if (data) await refreshCategories();
                      }}
                      emptyText="No hay categorías generales"
                    />
                  </div>

                  {/* C. Específica — bloqueada hasta que haya CG */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      C. Específica <span className="text-red-500">*</span>
                    </label>
                    <CheckboxListWithAdd
                      selected={(formData.category_specific as string[]) || []}
                      options={(() => {
                        const selectedGenerals = categories.filter(c => 
                          c.type === 'general' && ((formData.category_general as string[]) || []).includes(c.name)
                        );
                        const ids = selectedGenerals.map(g => g.id);
                        return categories
                          .filter(c => c.type === 'specific' && c.parent_id && ids.includes(c.parent_id))
                          .map(c => c.name);
                      })()}
                      onChange={vals => setFormData({ 
                        ...formData, 
                        category_specific: vals,
                        category_sub_specific: [],
                        category_detail: [],
                      })}
                      onAdd={async (val) => {
                        const firstGeneral = categories.find(c => 
                          c.type === 'general' && ((formData.category_general as string[]) || [])[0] === c.name
                        );
                        const { data } = await supabase.from('categories').insert([{
                          name: val, type: 'specific', parent_id: firstGeneral?.id || null
                        }]).select().single();
                        if (data) await refreshCategories();
                      }}
                      emptyText={((formData.category_general as string[]) || []).length === 0 
                        ? "Elegí al menos una C. General primero" 
                        : "No hay específicas para las generales seleccionadas"}
                    />
                  </div>

                  {/* C. Sub-específica — multi-valor, anidada en CE */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      C. Sub-específica
                    </label>
                    {((formData.category_specific as string[]) || []).length > 0 ? (
                      <CheckboxListWithAdd
                        selected={(formData.category_sub_specific as string[]) || []}
                        options={(() => {
                          const selectedSpecifics = categories.filter(
                            c => c.type === 'specific' && ((formData.category_specific as string[]) || []).includes(c.name)
                          );
                          const ids = selectedSpecifics.map(spec => spec.id);
                          return categories
                            .filter(c => c.type === 'sub_specific' && c.parent_id && ids.includes(c.parent_id))
                            .map(c => c.name);
                        })()}
                        onChange={vals => setFormData({ 
                          ...formData, 
                          category_sub_specific: vals,
                          category_detail: []
                        })}
                        onAdd={handleAddSubSpecific}
                        emptyText="Sin sub-específicas para esta CE"
                      />
                    ) : (
                      <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
                        <p className="text-xs text-gray-400 italic">Elegí C. Específica primero</p>
                      </div>
                    )}
                  </div>

                  {/* C. Detalle — multi-valor, anidada en Sub-específica */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      C. Detalle
                    </label>
                    {((formData.category_sub_specific as string[]) || []).length > 0 ? (
                      <CheckboxListWithAdd
                        selected={(formData.category_detail as string[]) || []}
                        options={(() => {
                          const selectedSubSpecs = categories.filter(c =>
                            c.type === 'sub_specific' &&
                            ((formData.category_sub_specific as string[]) || []).includes(c.name)
                          );
                          const subSpecIds = selectedSubSpecs.map(s => s.id);
                          return categories
                            .filter(c => c.type === 'detail' && c.parent_id && subSpecIds.includes(c.parent_id))
                            .map(c => c.name);
                        })()}
                        onChange={updated => setFormData({ ...formData, category_detail: updated })}
                        onAdd={async (val) => {
                          const firstSubSpec = categories.find(c =>
                            c.type === 'sub_specific' &&
                            ((formData.category_sub_specific as string[]) || []).includes(c.name)
                          );
                          const { data } = await supabase.from('categories').insert([{
                            name: val,
                            type: 'detail',
                            parent_id: firstSubSpec?.id || null
                          }]).select().single();
                          if (data) await refreshCategories();
                        }}
                        emptyText="No hay detalles para las sub-específicas seleccionadas"
                      />
                    ) : (
                      <p className="text-xs text-gray-400 italic px-2 py-1.5 border border-gray-200 rounded bg-gray-50">
                        Elegí al menos una Sub-específica primero
                      </p>
                    )}
                  </div>

                  {/* Marca */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Marca <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelectWithAdd
                      value={formData.category_brand || ''}
                      options={categories.filter(c => c.type === 'brand').map(c => c.name)}
                      onChange={val => setFormData({ ...formData, category_brand: val })}
                      onAdd={handleAddBrand}
                      placeholder="-- Seleccionar --"
                    />
                  </div>

                  {/* Especie/Raza */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Especie/Raza <span className="text-red-500">*</span>
                    </label>
                    <CheckboxListWithAdd
                      selected={(formData.category_species as string[]) || []}
                      options={categories.filter(c => c.type === 'species').map(c => c.name)}
                      onChange={vals => setFormData({ ...formData, category_species: vals })}
                      onAdd={handleAddSpecies}
                      emptyText="Sin especies definidas"
                    />
                  </div>

                  {/* Edad */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Edad <span className="text-red-500">*</span>
                    </label>
                    <CheckboxListWithAdd
                      selected={(formData.category_age as string[]) || []}
                      options={categories.filter(c => c.type === 'age').map(c => c.name)}
                      onChange={vals => setFormData({ ...formData, category_age: vals })}
                      onAdd={handleAddAge}
                      emptyText="Sin edades definidas"
                    />
                  </div>

                  {/* Condición de base */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Condición de base <span className="text-red-500">*</span>
                    </label>
                    <CheckboxListWithAdd
                      selected={(formData.category_condition as string[]) || []}
                      options={categories.filter(c => c.type === 'condition').map(c => c.name)}
                      onChange={vals => setFormData({ ...formData, category_condition: vals })}
                      onAdd={handleAddCondition}
                      emptyText="Sin condiciones definidas"
                    />
                  </div>

                  {/* Tags */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">Tags / Etiquetas SEO</label>
                    <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-300 rounded-md min-h-[38px] bg-white focus-within:ring-1 focus-within:ring-blue-500">
                      {((formData.tags as string[]) || []).map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-medium">
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = ((formData.tags as string[]) || []).filter((_, i) => i !== idx);
                              setFormData({ ...formData, tags: updated });
                            }}
                            className="hover:bg-blue-200 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                          >×</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={((formData.tags as string[]) || []).length === 0 ? 'Agregar tags... (Enter para confirmar)' : ''}
                        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent"
                        onKeyDown={e => {
                          if ((e.key === 'Enter' || e.key === ',') && e.currentTarget.value.trim()) {
                            e.preventDefault();
                            const newTag = e.currentTarget.value.trim().toLowerCase();
                            const current = (formData.tags as string[]) || [];
                            if (!current.includes(newTag)) {
                              setFormData({ ...formData, tags: [...current, newTag] });
                            }
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Booleanos */}
                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_bulk || false}
                        onChange={e => setFormData({...formData, is_bulk: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Venta a granel</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_prescription || false}
                        onChange={e => setFormData({...formData, is_prescription: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Es prescripción (farmacéutico)
                      </span>
                      <span className="text-[10px] text-gray-400 italic ml-1">Tag IA</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_prescription || false}
                        onChange={e => setFormData({...formData, requires_prescription: e.target.checked})}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        🩺 Requiere receta física
                      </span>
                      <span className="text-[10px] text-red-500 italic ml-1">Regla de negocio</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.local_only || false}
                        onChange={e => setFormData({...formData, local_only: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        🏪 Solo venta en local
                      </span>
                      <span className="text-[10px] text-gray-400 italic ml-1">No delivery</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requires_refrigeration || false}
                        onChange={e => setFormData({...formData, requires_refrigeration: e.target.checked})}
                        className="rounded text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        ❄️ Requiere refrigeración
                      </span>
                      <span className="text-[10px] text-gray-400 italic ml-1">Cadena de frío</span>
                    </label>
                  </div>

                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Globe size={14} /> Ruta SEO (Slug URL)
                  </label>
                  <input type="text" value={formData.url_slug || ''} onChange={e => handleSlugChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none" placeholder="ej: shorts_nike_exclusive" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código Web</label>
                  <input type="text" value={formData.product_code || ''} onChange={e => setFormData({...formData, product_code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo (Gs.)</label>
                    <input type="number" value={formData.cost || 0} onChange={e => handleCostChange(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Precio Venta (Gs.)</label>
                    <input type="number" value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Especial (Gs.)</label>
                    <input type="number" value={formData.special_price || 0} onChange={e => setFormData({...formData, special_price: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Diferenciado (Gs.)</label>
                    <input type="number" value={formData.differentiated_price || 0} onChange={e => setFormData({...formData, differentiated_price: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                     <select value={formData.location || 'SHOW ROOM'} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                        <option value="SHOW ROOM">SHOW ROOM</option>
                        <option value="DEPOSITO">DEPÓSITO</option>
                        <option value="GUARDA PROVEEDOR">PROVEEDOR</option>
                     </select>
                  </div>
              </div>

              {editing && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock size={14} className="text-amber-600" />
                    <h4 className="text-sm font-semibold text-amber-800">Precios por volumen</h4>
                    <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                      Sincronizado desde ÉTER Sync
                    </span>
                  </div>

                  {loadingVolumePrices ? (
                    <p className="text-xs text-amber-700 flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Cargando precios por volumen...
                    </p>
                  ) : volumePrices.filter(v => v.min_qty > 0 || v.max_qty > 0 || v.price > 0).length === 0 ? (
                    <p className="text-xs text-amber-700">
                      Este producto no tiene precios por volumen configurados en el sistema externo.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {volumePrices
                        .filter(v => v.min_qty > 0 || v.max_qty > 0 || v.price > 0)
                        .map(v => (
                          <div key={v.id} className="relative group">
                            <label className="block text-[11px] font-medium text-amber-700 mb-1">
                              Nivel {v.price_level} · {v.min_qty} a {v.max_qty} unidades
                            </label>
                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={`Gs. ${Number(v.price).toLocaleString('es-PY')} c/u`}
                              onFocus={e => e.target.blur()}
                              className="w-full px-3 py-2 border border-amber-200 rounded-md bg-amber-100/60 text-amber-900 font-semibold text-sm cursor-not-allowed select-none"
                            />
                            <div className="absolute bottom-full left-0 mb-1 px-3 py-2 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              Favor modificar este campo en su sistema y sincronizar con la app "ÉTER Sync"
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Presentación de Caja */}
              {editing && (() => {
                const boxInfo = detectBoxPresentation(volumePrices, Number(formData.price || 0));
                if (!boxInfo.hasBox) return null;
                const { boxPrice, unitsPerBox, boxLevel, dataIsComplete } = boxInfo;
                const minQtyForBoxPrice = unitsPerBox;
                const inferredLevel = boxLevel;

                return (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">📦</span>
                      <h4 className="text-sm font-semibold text-blue-800">Presentación de Caja Detectada</h4>
                      <span className="text-[10px] text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                        Factor: x{boxInfo.unitsPerBox} {dataIsComplete ? 'estándar' : 'inferido (Nivel ' + inferredLevel + ')'}
                      </span>
                    </div>

                    <p className="text-xs text-blue-700 mb-4 leading-relaxed">
                      Se detectó una oferta de caja con precio total de{' '}
                      <span className="font-bold">Gs. {Number(boxPrice).toLocaleString('es-PY')}</span>{' '}
                      comprando un mínimo de <span className="font-bold">{minQtyForBoxPrice}</span> unidades.{' '}
                      Si esta caja representa un producto físico real (un pack cerrado), podés crearlo automáticamente como un producto hijo en un grupo existente:
                    </p>

                    <div className="bg-white p-3 rounded-md border border-blue-100 flex flex-col sm:flex-row items-end gap-3 max-w-xl">
                      <div className="flex-1 w-full">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Seleccionar Grupo Destino (Padre)
                        </label>
                        <select
                          value={selectedGroupId}
                          onChange={e => setSelectedGroupId(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-300 rounded bg-white outline-none"
                        >
                          <option value="">-- Elegir un grupo --</option>
                          {grupos.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedGroupId) {
                            alert('Por favor selecciona un grupo.');
                            return;
                          }
                          const currentProduct = products.find(p => p.id === editing);
                          if (!currentProduct) return;

                          if (!confirm(`¿Crear presentación de caja de ${boxInfo.unitsPerBox} unidades y agregarla al grupo seleccionado?`)) return;

                          setBoxProductSaving(true);
                          try {
                            // 1. Obtener datos del grupo y sus variantes para no repetir el factor
                            const { data: variants } = await supabase
                              .from('products')
                              .select('box_factor')
                              .eq('parent_product_id', selectedGroupId);

                            const exists = variants?.some(v => Number(v.box_factor) === boxInfo.unitsPerBox);
                            if (exists) {
                              throw new Error(`Este grupo ya cuenta con una variante para el factor x${boxInfo.unitsPerBox}.`);
                            }

                            // Generar código de producto y slug únicos para la caja
                            const boxCode = `${currentProduct.product_code}-C${boxInfo.unitsPerBox}`;
                            const boxName = `${currentProduct.name} - Caja de ${boxInfo.unitsPerBox}u`;
                            const boxSlug = `${currentProduct.url_slug}-caja-${boxInfo.unitsPerBox}`;

                            // Crear el registro de producto para la caja
                            const boxProduct = {
                              product_code: boxCode,
                              name: boxName,
                              public_name: currentProduct.public_name ? `${currentProduct.public_name} (Caja de ${boxInfo.unitsPerBox}u)` : null,
                              description: currentProduct.description,
                              description_ai_enhanced: currentProduct.description_ai_enhanced,
                              price: boxPrice, // Precio total de la caja
                              cost: (currentProduct.cost || 0) * boxInfo.unitsPerBox,
                              stock: Math.floor((currentProduct.stock || 0) / boxInfo.unitsPerBox),
                              category_general: currentProduct.category_general,
                              category_specific: currentProduct.category_specific,
                              category_sub_specific: currentProduct.category_sub_specific,
                              category_detail: currentProduct.category_detail,
                              category_species: currentProduct.category_species,
                              category_brand: currentProduct.category_brand,
                              category_age: currentProduct.category_age,
                              category_condition: currentProduct.category_condition,
                              tags: currentProduct.tags,
                              brand: currentProduct.brand,
                              location: currentProduct.location,
                              image_url: currentProduct.image_url,
                              uploaded_image_url: currentProduct.uploaded_image_url,
                              additional_images: currentProduct.additional_images,
                              parent_product_id: selectedGroupId,
                              is_parent: false,
                              variant_label: `Caja de ${boxInfo.unitsPerBox}u`,
                              box_factor: boxInfo.unitsPerBox,
                              is_bulk: true,
                              is_prescription: currentProduct.is_prescription || false,
                              requires_prescription: currentProduct.requires_prescription || false,
                              local_only: currentProduct.local_only || false,
                              requires_refrigeration: currentProduct.requires_refrigeration || false,
                              active: false,
                              pending_activation: true,
                              updated_at: new Date().toISOString()
                            };

                            // Insertar
                            const { data: inserted, error: insertError } = await supabase
                              .from('products')
                              .insert([boxProduct])
                              .select()
                              .single();

                            if (insertError) throw insertError;

                            // 2. Asociar también este producto base (el suelto) al grupo si no tiene parent_product_id
                            if (!currentProduct.parent_product_id) {
                              const { error: updateBaseErr } = await supabase
                                .from('products')
                                .update({
                                  parent_product_id: selectedGroupId,
                                  variant_label: 'Unidad',
                                  box_factor: 1
                                })
                                .eq('id', currentProduct.id);

                              if (updateBaseErr) throw updateBaseErr;
                              // Actualizar localmente el producto base
                              onProductUpdated(currentProduct.id, {
                                parent_product_id: selectedGroupId,
                                variant_label: 'Unidad',
                                box_factor: 1
                              });
                            }

                            alert('Presentación de caja creada con éxito y agregada al grupo.');
                            setSelectedGroupId('');
                            
                            // Invocar callback de refresco total para actualizar tabla/estado
                            onRefreshAll();
                            
                            // Cerrar modal de edición
                            setEditing(null);
                            setVolumePrices([]);
                          } catch (err: any) {
                            console.error(err);
                            alert('Error: ' + (err.message || 'No se pudo crear la caja'));
                          } finally {
                            setBoxProductSaving(false);
                          }
                        }}
                        disabled={boxProductSaving || !selectedGroupId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        {boxProductSaving ? 'Creando...' : 'Crear Producto Caja'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid md:grid-cols-2 gap-8 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagen Principal</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setImageSource('url')}
                      className={`px-3 py-1 rounded text-xs font-medium border ${imageSource === 'url' ? 'bg-gray-100 border-gray-300' : 'border-transparent text-gray-500'}`}
                    >URL</button>
                    <button
                      onClick={() => setImageSource('upload')}
                      className={`px-3 py-1 rounded text-xs font-medium border ${imageSource === 'upload' ? 'bg-gray-100 border-gray-300' : 'border-transparent text-gray-500'}`}
                    >Subir</button>
                  </div>

                  {imageSource === 'url' ? (
                    <input
                      type="url"
                      value={pendingImageUrl || formData.image_url || ''}
                      onChange={e => {
                        setPendingImageUrl(e.target.value);
                        setImagePreview(e.target.value);
                        setAiImproved(false);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://..."
                    />
                  ) : (
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e)} className="w-full text-sm" />
                  )}

                  {/* Preview + botón IA */}
                  {imagePreview && (
                    <div className="mt-3 flex items-end gap-3">
                      <div className="relative w-24 h-24 border border-gray-200 rounded-md bg-gray-50 flex-shrink-0">
                        <img src={imagePreview} className="w-full h-full object-contain rounded-md" alt="Vista previa" />
                        {aiImproved && (
                          <div className="absolute bottom-0 left-0 right-0 bg-purple-600/90 text-white text-[9px] text-center py-0.5 font-medium rounded-b-md">
                            ✨ IA
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('¿Eliminar la imagen de este producto?')) return;
                            
                            // Si hay imagen pendiente local, solo limpiar el preview
                            if (pendingImageFile || pendingImageUrl) {
                              setPendingImageFile(null);
                              setPendingImageUrl('');
                              setImagePreview('');
                              setAiImproved(false);
                              return;
                            }
                            
                            // Si es imagen ya guardada en DB, hacer UPDATE
                            if (editing) {
                              const { error } = await supabase
                                .from('products')
                                .update({ image_url: null, uploaded_image_url: null })
                                .eq('id', editing);
                              if (error) {
                                alert('Error al eliminar imagen: ' + error.message);
                                return;
                              }
                              onProductUpdated(editing, { image_url: null, uploaded_image_url: null } as any);
                            }
                            setImagePreview('');
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all shadow-md z-10"
                          title="Eliminar imagen"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="relative group flex items-center gap-1">
                          <label
                            className="flex items-center gap-1 cursor-pointer text-[10px] text-gray-600 hover:text-gray-900 whitespace-nowrap"
                            title="Marcar antes de mejorar con IA para enviar la metadata configurada"
                          >
                            <input
                              type="checkbox"
                              checked={categorizationDone}
                              onChange={() => setCategorizationDone(v => !v)}
                              className="rounded w-3 h-3 text-purple-600"
                            />
                            <span>Terminé</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleImproveWithAI}
                            disabled={!categorizationDone || isAiImproving || aiCredits <= 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-semibold transition-colors"
                          >
                            {isAiImproving ? (
                              <><Loader2 size={12} className="animate-spin" /> Procesando...</>
                            ) : (
                              <>✨ Mejorar con IA</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiConfigOpen(true)}
                            className="p-1.5 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 rounded-md transition-colors"
                            title="Configurar prompts de IA para productos"
                          >
                            <Settings2 size={12} />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {aiCredits} mejoras con IA disponibles
                          </div>
                        </div>
                        {aiImproved && (
                          <p className="text-[10px] text-purple-600 font-medium">Imagen mejorada por IA</p>
                        )}
                        <p className="text-[10px] text-gray-400">Se convierte a WebP al guardar</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Galería</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {formData.additional_images?.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 border border-gray-200 rounded overflow-hidden group">
                        <img src={img} className="w-full h-full object-contain" />
                        <button type="button" onClick={() => removeGalleryImage(idx)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X size={12}/></button>
                      </div>
                    ))}
                    <label className="w-16 h-16 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                       <Plus className="text-gray-400 w-4 h-4" />
                       <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-3 border-t border-gray-200 pt-4">
                  {editing ? (
                    <a
                      href={`/owner/seo/edit/product/${editing}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg text-sm font-bold text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      🔍 Editar SEO avanzado (título, descripción, IA) →
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      El SEO avanzado (título, descripción para Google, generación con IA) se edita una vez guardado el producto, desde el panel de SEO.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Star size={14} className="text-yellow-500" /> Destacado</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.show_in_hero} onChange={e => setFormData({...formData, show_in_hero: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Monitor size={14} className="text-blue-500" /> Hero Slider</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Activo</span>
                 </label>
              </div>

              <div className="flex gap-3 mt-8">
                {(() => {
                  const categoriesComplete =
                    ((formData.category_general as string[]) || []).length > 0 &&
                    ((formData.category_specific as string[]) || []).length > 0 &&
                    !!formData.category_brand &&
                    ((formData.category_species as string[]) || []).length > 0 &&
                    ((formData.category_age as string[]) || []).length > 0 &&
                    ((formData.category_condition as string[]) || []).length > 0;

                  return (
                    <div className="relative group inline-block">
                      <button
                        onClick={handleSave}
                        disabled={!categoriesComplete}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Save size={16} /> Guardar
                      </button>
                      {!categoriesComplete && (
                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Completá C. General, C. Específica, Marca, Especie, Edad y Condición antes de guardar
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button onClick={() => {setAdding(false); setEditing(null); setVolumePrices([]);}} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setBulkEditing(false); }}
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Editar {selectedIds.size} productos</h3>
                <p className="text-xs text-gray-500 mt-0.5">Solo los campos que modifiques se actualizarán. Los demás quedan intactos en cada producto.</p>
              </div>
              <button onClick={() => setBulkEditing(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* Indicador campos tocados */}
              {bulkTouchedFields.size > 0 && (
                <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-medium text-blue-800 mr-1">Se aplicará:</span>
                  {Array.from(bulkTouchedFields).map(field => (
                    <span key={field} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{field}</span>
                  ))}
                </div>
              )}

              {/* Categorías */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Categorías</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      C. Específica {bulkTouchedFields.has('category_specific') && <span className="text-blue-600">●</span>}
                    </label>
                    <select
                      value={(bulkFormData.category_specific as string[] | undefined)?.[0] || ''}
                      onChange={e => {
                        handleBulkFieldChange('category_specific', e.target.value ? [e.target.value] : []);
                        handleBulkFieldChange('category_sub_specific', []);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white text-sm"
                    >
                      <option value="">-- Sin cambio --</option>
                      {categories.filter(c => c.type === 'specific').map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      C. Sub-específica {bulkTouchedFields.has('category_sub_specific') && <span className="text-blue-600">●</span>}
                    </label>
                    <div className="border border-gray-300 rounded-md p-2 bg-white max-h-32 overflow-y-auto space-y-1">
                      {(() => {
                        const specName = Array.isArray(bulkFormData.category_specific) ? bulkFormData.category_specific[0] : bulkFormData.category_specific;
                        const specCat = categories.find(c => c.type === 'specific' && c.name === specName);
                        return categories
                          .filter(c => c.type === 'sub_specific' && (!specCat || c.parent_id === specCat.id))
                          .map(c => {
                            const selected = ((bulkFormData.category_sub_specific as string[]) || []).includes(c.name);
                            return (
                              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const current = (bulkFormData.category_sub_specific as string[]) || [];
                                    const updated = selected ? current.filter(s => s !== c.name) : [...current, c.name];
                                    handleBulkFieldChange('category_sub_specific', updated);
                                  }}
                                  className="rounded text-blue-600"
                                />
                                <span>{c.name}</span>
                              </label>
                            );
                          });
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Especie/Raza {bulkTouchedFields.has('category_species') && <span className="text-blue-600">●</span>}
                    </label>
                    <div className="border border-gray-300 rounded-md p-2 bg-white max-h-32 overflow-y-auto space-y-1">
                      {categories.filter(c => c.type === 'species').map(c => {
                        const selected = ((bulkFormData.category_species as string[]) || []).includes(c.name);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                const current = (bulkFormData.category_species as string[]) || [];
                                const updated = selected ? current.filter(s => s !== c.name) : [...current, c.name];
                                handleBulkFieldChange('category_species', updated);
                              }}
                              className="rounded text-blue-600"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                      {categories.filter(c => c.type === 'species').length === 0 && (
                        <p className="text-xs text-gray-400 italic">Sin especies definidas</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Marca {bulkTouchedFields.has('category_brand') && <span className="text-blue-600">●</span>}
                    </label>
                    <select
                      value={bulkFormData.category_brand || ''}
                      onChange={e => handleBulkFieldChange('category_brand', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none bg-white text-sm"
                    >
                      <option value="">-- Sin cambio --</option>
                      {categories.filter(c => c.type === 'brand').map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Edad bulk */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Edad {bulkTouchedFields.has('category_age') && <span className="text-blue-600">●</span>}
                    </label>
                    <div className="border border-gray-300 rounded-md p-2 bg-white max-h-32 overflow-y-auto space-y-1">
                      {categories.filter(c => c.type === 'age').map(c => {
                        const selected = ((bulkFormData.category_age as string[]) || []).includes(c.name);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                const current = (bulkFormData.category_age as string[]) || [];
                                const updated = selected ? current.filter(s => s !== c.name) : [...current, c.name];
                                handleBulkFieldChange('category_age', updated);
                              }}
                              className="rounded text-blue-600"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Condición bulk */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A8A00] uppercase mb-1">
                      Condición {bulkTouchedFields.has('category_condition') && <span className="text-blue-600">●</span>}
                    </label>
                    <div className="border border-gray-300 rounded-md p-2 bg-white max-h-32 overflow-y-auto space-y-1">
                      {categories.filter(c => c.type === 'condition').map(c => {
                        const selected = ((bulkFormData.category_condition as string[]) || []).includes(c.name);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                const current = (bulkFormData.category_condition as string[]) || [];
                                const updated = selected ? current.filter(s => s !== c.name) : [...current, c.name];
                                handleBulkFieldChange('category_condition', updated);
                              }}
                              className="rounded text-blue-600"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granel y Receta bulk */}
                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkFormData.is_bulk || false}
                        onChange={e => handleBulkFieldChange('is_bulk', e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Venta a granel {bulkTouchedFields.has('is_bulk') && <span className="text-blue-600">●</span>}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkFormData.is_prescription || false}
                        onChange={e => handleBulkFieldChange('is_prescription', e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Es prescripción (farmacéutico) {bulkTouchedFields.has('is_prescription') && <span className="text-blue-600">●</span>}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkFormData.requires_prescription || false}
                        onChange={e => handleBulkFieldChange('requires_prescription', e.target.checked)}
                        className="rounded text-red-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        🩺 Requiere receta física {bulkTouchedFields.has('requires_prescription') && <span className="text-blue-600">●</span>}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkFormData.local_only || false}
                        onChange={e => handleBulkFieldChange('local_only', e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        🏪 Solo venta en local {bulkTouchedFields.has('local_only') && <span className="text-blue-600">●</span>}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkFormData.requires_refrigeration || false}
                        onChange={e => handleBulkFieldChange('requires_refrigeration', e.target.checked)}
                        className="rounded text-cyan-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        ❄️ Requiere refrigeración {bulkTouchedFields.has('requires_refrigeration') && <span className="text-blue-600">●</span>}
                      </span>
                    </label>
                  </div>

                </div>
              </div>

              {/* Precios */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Precios y Costos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { field: 'cost', label: 'Costo (Gs.)', color: 'gray' },
                    { field: 'price', label: 'Precio Venta (Gs.)', color: 'blue' },
                    { field: 'special_price', label: 'P. Especial (Gs.)', color: 'gray' },
                    { field: 'differentiated_price', label: 'P. Diferenciado (Gs.)', color: 'gray' },
                  ].map(({ field, label, color }) => (
                    <div key={field}>
                      <label className={`block text-xs font-medium text-${color}-700 mb-1`}>
                        {label} {bulkTouchedFields.has(field) && <span className="text-blue-600">●</span>}
                      </label>
                      <input
                        type="number"
                        placeholder="Sin cambio"
                        value={bulkTouchedFields.has(field) ? ((bulkFormData as any)[field] ?? '') : ''}
                        onChange={e => handleBulkFieldChange(field, e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full px-3 py-2 border border-${color}-300 rounded-md bg-white text-sm focus:ring-1 focus:ring-blue-500 outline-none`}
                        min={0}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Stock</h4>
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Stock {bulkTouchedFields.has('stock') && <span className="text-blue-600">●</span>}
                  </label>
                  <input
                    type="number"
                    placeholder="Sin cambio"
                    value={bulkTouchedFields.has('stock') ? (bulkFormData.stock ?? '') : ''}
                    onChange={e => handleBulkFieldChange('stock', e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    min={0}
                  />
                </div>
              </div>

              {/* Visibilidad — botones Activar/Desactivar */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Visibilidad</h4>
                <p className="text-xs text-gray-400 italic">Tocá Activar o Desactivar solo en los que querés cambiar.</p>
                <div className="flex flex-wrap gap-6">
                  {[
                    { field: 'is_featured', label: 'Destacado', icon: <Star size={12} className="text-yellow-500" /> },
                    { field: 'show_in_hero', label: 'Hero Slider', icon: <Monitor size={12} className="text-blue-500" /> },
                    { field: 'active', label: 'Activo', icon: null },
                  ].map(({ field, label, icon }) => (
                    <div key={field} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        {icon}{label} {bulkTouchedFields.has(field) && <span className="text-blue-600">●</span>}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBulkFieldChange(field, true)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${bulkTouchedFields.has(field) && (bulkFormData as any)[field] === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >Activar</button>
                        <button
                          onClick={() => handleBulkFieldChange(field, false)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${bulkTouchedFields.has(field) && (bulkFormData as any)[field] === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >Desactivar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {bulkTouchedFields.size === 0
                  ? 'Ningún campo modificado aún'
                  : `${bulkTouchedFields.size} campo(s) → ${selectedIds.size} producto(s)`}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setBulkEditing(false)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
                >Cancelar</button>
                <button
                  onClick={handleBulkSave}
                  disabled={bulkTouchedFields.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={15} /> Aplicar a {selectedIds.size} producto(s)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeView === 'products' ? (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
           <div className="flex items-center gap-2 flex-1 min-w-0">
             <Search size={18} className="text-gray-400 flex-shrink-0" />
             <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm flex-1" />
           </div>
           <div className="hidden sm:block w-px h-6 bg-gray-200" />
           <div className="flex items-center gap-2 sm:w-64 flex-shrink-0 sm:pl-3 sm:border-l sm:border-gray-200">
             <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Código:</span>
             <input type="text" placeholder="Ej: PRD-A1B2C3" value={codeSearchTerm} onChange={e => setCodeSearchTerm(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 outline-none text-sm flex-1 focus:ring-1 focus:ring-blue-400" />
           </div>
        </div>
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gray-50">

          {/* Categoría General */}
          <select
            value={filterGeneralCategory}
            onChange={e => setFilterGeneralCategory(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cat. General</option>
            {Array.from(new Set(
              categories
                .filter(c => c.type === 'general')
                .map(c => c.name)
            )).sort().map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Categoría Específica */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cat. Específica</option>
            {Array.from(new Set(products.flatMap(p => p.category_specific || []).filter(Boolean))).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Categoría Sub-Específica */}
          <select
            value={filterSubSpecificCategory}
            onChange={e => setFilterSubSpecificCategory(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cat. Sub-Esp</option>
            {Array.from(new Set(products.flatMap(p => {
              if (!p.category_sub_specific) return [];
              if (Array.isArray(p.category_sub_specific)) return p.category_sub_specific;
              const s = String(p.category_sub_specific).trim();
              if (s === '[]' || s === 'null' || s === '""') return [];
              return s.split(',').map(item => item.trim()).filter(Boolean);
            }).filter(Boolean))).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Categoría Detalle */}
          <select
            value={filterDetail}
            onChange={e => setFilterDetail(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cat. Detalle</option>
            {Array.from(new Set(products.flatMap(p => p.category_detail || []).filter(Boolean))).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Especie/Raza */}
          <select
            value={filterSpecies}
            onChange={e => setFilterSpecies(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Especie/Raza</option>
            {Array.from(new Set(
              categories.filter(c => c.type === 'species').map(c => c.name)
            )).sort().map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Marca */}
          <select
            value={filterBrand}
            onChange={e => setFilterBrand(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Marca</option>
            {Array.from(new Set(products.map(p => p.category_brand).filter(Boolean).map(val => val as string))).sort().map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          {/* Estado activo */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Estado</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          {/* Stock */}
          <div className="flex items-center gap-1">
            <select
              value={filterStockMode}
              onChange={e => setFilterStockMode(e.target.value as 'all' | 'with' | 'without' | 'below')}
              className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Stock</option>
              <option value="with">Con stock</option>
              <option value="without">Sin stock</option>
              <option value="below">Stock menor a</option>
            </select>
            {filterStockMode === 'below' && (
              <input
                type="number"
                value={filterMaxStock}
                onChange={e => setFilterMaxStock(Number(e.target.value))}
                className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none w-16 focus:ring-1 focus:ring-blue-500"
                min={1}
              />
            )}
          </div>

          {/* Precio */}
          <div className="flex items-center gap-1">
            <select
              value={filterPriceMode}
              onChange={e => setFilterPriceMode(e.target.value as 'all' | 'gte' | 'lte' | 'eq')}
              className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Precio</option>
              <option value="gte">Mayor o igual a</option>
              <option value="lte">Menor o igual a</option>
              <option value="eq">Igual a</option>
            </select>
            {filterPriceMode !== 'all' && (
              <input
                type="number"
                value={filterPriceValue}
                onChange={e => setFilterPriceValue(Number(e.target.value))}
                className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none w-24 focus:ring-1 focus:ring-blue-500"
                min={0}
                placeholder="Gs."
              />
            )}
          </div>

          {/* Solo nombres duplicados */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-700 bg-white border border-gray-300 rounded px-2 py-1">
            <input
              type="checkbox"
              checked={filterDuplicateNames}
              onChange={e => setFilterDuplicateNames(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
            />
            <span>Solo nombres duplicados</span>
          </label>

          {/* Solo a granel */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-700 bg-white border border-gray-300 rounded px-2 py-1">
            <input
              type="checkbox"
              checked={filterBulk}
              onChange={e => setFilterBulk(e.target.checked)}
              className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer w-3.5 h-3.5"
            />
            <span>Solo a granel</span>
          </label>

          {/* Limpiar filtros */}
          {(filterGeneralCategory || filterCategory || filterSubSpecificCategory || filterDetail || filterBrand || filterStatus !== 'all' || filterLowStock || filterSpecies || filterStockMode !== 'all' || filterPriceMode !== 'all' || filterDuplicateNames || filterBulk) && (
            <button
              onClick={() => {
                setFilterGeneralCategory('');
                setFilterCategory('');
                setFilterSubSpecificCategory('');
                setFilterDetail('');
                setFilterBrand('');
                setFilterStatus('all');
                setFilterLowStock(false);
                setFilterSpecies('');
                setFilterStockMode('all');
                setFilterMaxStock(5);
                setFilterPriceMode('all');
                setFilterPriceValue(0);
                setFilterDuplicateNames(false);
                setFilterBulk(false);
              }}
              className="text-xs text-blue-600 hover:underline ml-1"
            >
              Limpiar filtros
            </button>
          )}

          <span className="ml-auto text-[10px] text-gray-400">
            {filteredProducts.length} de {products.length} productos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 w-20">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Seleccionar/deseleccionar TODOS los productos filtrados (todas las páginas)"
                    />
                    <button
                      type="button"
                      onClick={selectVisibleOnly}
                      className="text-[9px] px-1.5 py-0.5 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 rounded font-bold transition-colors whitespace-nowrap"
                      title="Seleccionar solo los productos visibles en esta página"
                    >
                      Vista
                    </button>
                  </div>
                </th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categorías</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio Venta</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">P. Especial</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">P. Diferenc.</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedProducts.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-2 py-1.5 w-20">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        <div
                          className="w-6 h-6 bg-gray-100 rounded border border-gray-200 overflow-hidden cursor-pointer"
                          onMouseEnter={(p.uploaded_image_url || p.image_url) ? (e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setImageTooltip({
                              url: p.uploaded_image_url || p.image_url || '',
                              x: rect.right,
                              y: rect.top + rect.height / 2,
                            });
                          } : undefined}
                          onMouseLeave={() => setImageTooltip(null)}
                        >
                          <LazyHoverImage 
                            src={p.uploaded_image_url || p.image_url} 
                            alt={p.name}
                            className="w-full h-full"
                            iconSize={10}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 leading-tight">
                          {p.is_parent && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide mr-1">
                              ★ Padre
                            </span>
                          )}
                          {p.parent_product_id && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide mr-1" 
                              title="Variante de otro producto">
                              Variante{p.variant_label ? ` · ${p.variant_label}` : ''}
                            </span>
                          )}
                          <span>{p.public_name || p.name}</span>
                          {p.requires_prescription && (
                            <span 
                              title="Este producto requiere presentar receta veterinaria"
                              className="ml-1 text-red-500 text-xs font-bold cursor-help inline-block align-middle"
                            >
                              🩺
                            </span>
                          )}
                          {p.public_name && (
                            <span className="block text-[9px] text-gray-400 font-normal">{p.name}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.product_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="relative group inline-block">
                      <span className="text-[10px] text-gray-500 cursor-pointer underline decoration-dotted hover:text-blue-600 truncate max-w-[80px] block">
                        {(Array.isArray(p.category_detail) && p.category_detail.length > 0 ? p.category_detail.join(', ') : '') || cleanSubSpecific(p.category_sub_specific) || (Array.isArray(p.category_specific) && p.category_specific.length > 0 ? p.category_specific.join(', ') : '—')}
                      </span>
                      {/* Popup categorías */}
                      <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block pointer-events-none min-w-[160px]">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-2 text-[10px] space-y-0.5">
                          <p><span className="font-bold text-[#1A8A00]">Gen:</span> {Array.isArray(p.category_general) && p.category_general.length > 0 ? p.category_general.join(', ') : '—'}</p>
                          <p><span className="font-bold text-[#1A8A00]">Esp:</span> {Array.isArray(p.category_specific) && p.category_specific.length > 0 ? p.category_specific.join(', ') : '—'}</p>
                          {cleanSubSpecific(p.category_sub_specific) ? (
                            <p><span className="font-bold text-[#1A8A00]">Sub-Esp:</span> {cleanSubSpecific(p.category_sub_specific)}</p>
                          ) : null}
                          {((Array.isArray(p.category_detail) && p.category_detail.length > 0)) && (
                            <p><span className="font-bold text-[#1A8A00]">Det:</span> {p.category_detail.join(', ')}</p>
                          )}
                          <p><span className="font-bold text-[#1A8A00]">Raza:</span> {Array.isArray(p.category_species) ? p.category_species.join(', ') : p.category_species}</p>
                          <p><span className="font-bold text-[#1A8A00]">Marca:</span> {p.category_brand}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-sm font-bold text-gray-900">Gs. {p.price.toLocaleString('es-PY')}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-600">Gs. {p.special_price?.toLocaleString('es-PY') || '0'}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-600">Gs. {p.differentiated_price?.toLocaleString('es-PY') || '0'}</td>
                  <td className="px-2 py-1.5 text-center">
                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.stock <= 5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{p.stock}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex justify-center items-center gap-2">
                      {p.is_featured && <Star size={14} className="fill-yellow-400 text-yellow-400" />}
                      {p.show_in_hero && <Monitor size={14} className="text-blue-500" />}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newActive = !p.active;
                          const { error } = await supabase.from('products')
                            .update({ active: newActive })
                            .eq('id', p.id);
                          if (error) {
                            alert('Error al cambiar estado: ' + error.message);
                            return;
                          }
                          onProductUpdated(p.id, { active: newActive });
                        }}
                        className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          p.active ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-300 focus:ring-gray-400'
                        }`}
                        title={p.active ? 'Activo — click para desactivar' : 'Inactivo — click para activar'}
                      >
                        <span
                          className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full shadow transition-transform ${
                            p.active ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {p.parent_product_id && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`¿Separar "${p.name}" del grupo padre?`)) return;
                            
                            // 1. Desvincular el hijo
                            await supabase.from('products')
                              .update({ parent_product_id: null, variant_label: null })
                              .eq('id', p.id);

                            // 2. Verificar si el padre quedó sin hijos y quitarle is_parent
                            const { data: remaining } = await supabase
                              .from('products')
                              .select('id')
                              .eq('parent_product_id', p.parent_product_id)
                              .neq('id', p.id);
                            
                            if (!remaining || remaining.length === 0) {
                              await supabase.from('products')
                                .update({ is_parent: false, variant_label: null })
                                .eq('id', p.parent_product_id);
                            }

                            onRefreshAll();
                          }}
                          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Separar del grupo padre"
                        >
                          <Unlink size={14} />
                        </button>
                      )}
                      {p.is_parent && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`¿Disolver el grupo de "${p.name}"? Todos sus variantes quedarán como productos independientes.`)) return;
                            
                            // Desvincular todos los hijos
                            await supabase.from('products')
                              .update({ parent_product_id: null, variant_label: null })
                              .eq('parent_product_id', p.id);
                            
                            // Quitar is_parent al padre
                            await supabase.from('products')
                              .update({ is_parent: false, variant_label: null })
                              .eq('id', p.id);
                            
                            onRefreshAll();
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Disolver grupo completo"
                        >
                          <GitMerge size={14} className="rotate-180" />
                        </button>
                      )}
                      <button onClick={() => startEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={16}/></button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`¿Archivar "${p.public_name || p.name}"?\n\nSe ocultará del sitio público y de esta lista. Podés restaurarlo desde la pestaña "Archivados".`)) return;
                          const { error } = await supabase.from('products')
                            .update({
                              archived: true,
                              archived_at: new Date().toISOString(),
                              active: false,
                            })
                            .eq('id', p.id);
                          if (error) { alert('Error: ' + error.message); return; }
                          onProductUpdated(p.id, {
                            archived: true,
                            archived_at: new Date().toISOString(),
                            active: false,
                          });
                        }}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Archivar producto"
                      >
                        <Archive size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Barra de paginación */}
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Mostrar:</span>
              {[50, 100, 500, 1000].map(size => (
                <button
                  key={size}
                  onClick={() => { setPageSize(size); setCurrentPage(1); }}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${pageSize === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  {size}
                </button>
              ))}
              <span className="text-xs text-gray-400 ml-2">
                Mostrando {Math.min((safePage - 1) * pageSize + 1, filteredProducts.length)}–{Math.min(safePage * pageSize, filteredProducts.length)} de {filteredProducts.length}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >«</button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >‹</button>

                {/* Números de página — mostrar máx 5 alrededor de la actual */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || (n >= safePage - 2 && n <= safePage + 2))
                  .reduce<(number | string)[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === '...'
                      ? <span key={`ellipsis-${i}`} className="text-xs px-1 text-gray-400">…</span>
                      : <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${safePage === item ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                        >{item}</button>
                  )
                }

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >›</button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >»</button>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : activeView === 'groups' ? (
        <GruposPanel
          products={products}
          onUpdate={onRefreshAll}
          categories={categories}
        />
      ) : (
        // Vista de archivados
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Productos archivados</h3>
              <p className="text-xs text-gray-500">{archivedProducts.length} producto(s) archivado(s)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Archivado</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archivedProducts.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm">No hay productos archivados.</td></tr>
                ) : archivedProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {(p.uploaded_image_url || p.image_url) && (
                          <img src={p.uploaded_image_url || p.image_url} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
                        )}
                        <span className="text-sm text-gray-700">{p.public_name || p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono">{p.product_code}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {p.archived_at ? new Date(p.archived_at).toLocaleDateString('es-PY') : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Restaurar "${p.public_name || p.name}" de archivados?`)) return;
                          const { error } = await supabase.from('products')
                            .update({ archived: false, archived_at: null })
                            .eq('id', p.id);
                          if (error) { alert('Error: ' + error.message); return; }
                          onProductUpdated(p.id, { archived: false, archived_at: null });
                        }}
                        className="px-3 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                      >
                        ↩ Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Tooltip imagen flotante */}
      {imageTooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: imageTooltip.x + 12,
            top: imageTooltip.y - 80,
          }}
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-2">
            <img
              src={imageTooltip.url}
              alt="Vista previa"
              className="w-60 h-60 object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Modal Confirmación IA */}
      {isAIConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" /> Categorizar con IA
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Vas a enviar <span className="font-semibold text-gray-900">{selectedIds.size} producto(s)</span> para ser analizados en lotes de 20.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <p className="text-purple-800 text-xs font-medium flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>La IA asignará categoría específica, especie/raza y marca. Los incompletos quedarán marcados para revisión. Podés corregir todo antes de guardar.</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsAIConfirmOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">Cancelar</button>
              <button onClick={startAICategorization} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium flex items-center justify-center gap-2">
                <Brain size={15} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Procesando */}
      {isAIProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-sm p-8 text-center">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="font-bold text-gray-900 text-lg">Analizando con IA</p>
            <p className="text-gray-400 text-sm mt-1">Procesando lote {aiCurrentBatch} de {aiTotalBatches}...</p>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${aiTotalBatches > 0 ? (aiCurrentBatch / aiTotalBatches) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">
              {aiTotalBatches > 0 ? Math.round((aiCurrentBatch / aiTotalBatches) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Modal Revisión */}
      {isAIReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col" style={{ maxHeight: '90vh' }}>

            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Revisión de categorización IA</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ {aiResults.filter(r => r.status === 'complete').length} completos</span>
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">⚠️ {aiResults.filter(r => r.status === 'incomplete').length} incompletos</span>
                </div>
              </div>
              {!aiSaveLoading && (
                <button onClick={() => setIsAIReviewOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-6"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">C. Específica</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">C. Sub-Esp</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Especie/Raza</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Marca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...aiResults].sort((a, b) => a.status === b.status ? 0 : a.status === 'complete' ? -1 : 1).map(res => {
                    const incomplete = res.status === 'incomplete';
                    const missingSpecific = !res.category_specific;
                    const missingSpecies = res.category_species.length === 0;
                    const missingBrand = !res.category_brand;
                    return (
                      <tr key={res.id} className={`hover:bg-gray-50 transition-colors ${incomplete ? 'bg-orange-50/50' : ''}`}>
                        <td className="px-3 py-1.5 text-center">
                          {incomplete ? <span title="Incompleto">⚠️</span> : <span title="Completo">✅</span>}
                        </td>
                        <td className="px-3 py-1.5">
                          <p className="text-xs font-medium text-gray-900 leading-tight">{res.name}</p>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <select
                              value={Array.isArray(res.category_specific) ? res.category_specific[0] || '' : (res.category_specific || '')}
                              onChange={e => handleAIReviewChange(res.id, 'category_specific', e.target.value ? [e.target.value] : [])}
                              className={`flex-1 text-xs px-2 py-1 border rounded focus:ring-1 focus:ring-purple-500 outline-none ${missingSpecific ? 'border-red-400 bg-red-50 text-red-900' : 'border-gray-300'}`}
                            >
                              <option value="">-- Seleccionar --</option>
                              {(() => {
                                // Filtrar específicas por la general que trae el producto original
                                const productsInBatch = products.filter(p => selectedIds.has(p.id));
                                const originalProd = productsInBatch.find(p => p.id === res.id);
                                const genArray = (Array.isArray(res.category_general) && res.category_general.length > 0)
                                  ? res.category_general
                                  : (Array.isArray(originalProd?.category_general) ? originalProd?.category_general : []);
                                const genName = genArray[0] || '';
                                const genCat = categories.find(c => c.type === 'general' && c.name === genName);
                                return categories
                                  .filter(c => c.type === 'specific' && (!genCat || c.parent_id === genCat.id))
                                  .map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                  ));
                              })()}
                            </select>
                            <button
                              onClick={() => {
                                const name = prompt('Nueva Categoría Específica:');
                                if (name) handleAIAddSpecific(name, res.id);
                              }}
                              className="p-1 bg-green-50 text-green-600 rounded border border-green-200 hover:bg-green-100"
                              title="Agregar específica"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 min-w-[140px]">
                          <SearchableCheckboxList
                            options={(() => {
                              const specArray = Array.isArray(res.category_specific) ? res.category_specific : (res.category_specific ? [res.category_specific] : []);
                              const specName = specArray[0] || '';
                              const specCat = categories.find(
                                c => c.type === 'specific' && c.name === specName
                              );
                              return specCat
                                ? categories
                                    .filter(c => c.type === 'sub_specific' && c.parent_id === specCat.id)
                                    .map(c => c.name)
                                : [];
                            })()}
                            selectedValues={Array.isArray(res.category_sub_specific)
                              ? res.category_sub_specific
                              : (res.category_sub_specific ? [res.category_sub_specific] : [])}
                            onChange={updated => handleAIReviewChange(res.id, 'category_sub_specific', updated)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className={`flex flex-wrap gap-x-2 gap-y-0.5 p-1 rounded ${missingSpecies ? 'bg-orange-50 border border-orange-400' : ''}`}>
                            {categories.filter(c => c.type === 'species').map(c => (
                              <label key={c.id} className="flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={res.category_species.includes(c.name)}
                                  onChange={() => {
                                    const current = res.category_species;
                                    const updated = current.includes(c.name)
                                      ? current.filter(s => s !== c.name)
                                      : [...current, c.name];
                                    handleAIReviewChange(res.id, 'category_species', updated);
                                  }}
                                  className="rounded text-purple-600"
                                />
                                {c.name}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            value={res.category_brand}
                            onChange={e => handleAIReviewChange(res.id, 'category_brand', e.target.value)}
                            className={`w-full text-xs px-2 py-1 border rounded focus:ring-1 focus:ring-purple-500 outline-none bg-white ${missingBrand ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`}
                          >
                            <option value="">— Sin marca —</option>
                            {categories.filter(c => c.type === 'brand').map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <p className="text-xs text-gray-500">Los incompletos se guardan igual para completar después.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsAIReviewOpen(false)} disabled={aiSaveLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium disabled:opacity-40">Descartar</button>
                <button onClick={handleAISaveAll} disabled={aiSaveLoading} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2 disabled:opacity-40">
                  {aiSaveLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Guardar todo ({aiResults.length})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {groupingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setGroupingModalOpen(false); }}
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <GitMerge size={18} className="text-indigo-600" /> Crear grupo de variantes
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Todos los productos seleccionados serán variantes del nuevo grupo.
                </p>
              </div>
              <button onClick={() => setGroupingModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Nombre del grupo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nombre del grupo padre
                </label>
                <input
                  type="text"
                  value={groupingParentName}
                  onChange={e => {
                    setGroupingParentName(e.target.value);
                    setGroupingSlugPreview(generateSlug(e.target.value));
                  }}
                  placeholder="Ej: DogChow RMG"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                {groupingSlugPreview && (
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    URL: tiempodemascotas.com.py/<span className="text-indigo-600">{groupingSlugPreview}</span>
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  El padre no tiene precio ni stock propio — solo agrupa las variantes.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
                💡 Los productos seleccionados quedarán <strong>ocultos del catálogo</strong> y serán 
                accesibles como variantes dentro de la página del grupo. 
                Cada uno conserva su precio y stock individual.
              </div>

              {/* Lista de hijos */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Variantes que se agruparán ({products.filter(p => selectedIds.has(p.id)).length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {products.filter(p => selectedIds.has(p.id)).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.product_code}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[10px] text-gray-500">Etiqueta</label>
                        <input
                          type="text"
                          value={groupingLabels[p.id] || ''}
                          onChange={e => setGroupingLabels(prev => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Ej: 3 KG"
                          className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => setGroupingModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmGrouping}
                  disabled={groupingSaving || !groupingParentName.trim()}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {groupingSaving ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                  {groupingSaving ? 'Creando grupo...' : 'Crear grupo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AIImageReviewModal
        open={aiReviewOpen}
        onClose={handleAiCancel}
        originalUrl={aiReviewOriginalUrl}
        improvedUrl={aiReviewImprovedUrl}
        onAccept={handleAiAccept}
        onRetry={handleAiRetry}
        isRetrying={aiReviewRetrying}
        showBrandSealToggle={true}
        applyBrandSeal={applyBrandSeal}
        onToggleBrandSeal={setApplyBrandSeal}
      />

      <AIPromptConfigModal
        open={aiConfigOpen}
        onClose={() => setAiConfigOpen(false)}
        context="products"
        contextLabel="Imágenes de productos"
      />

      {imageProgressModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
            {/* Spinner animado */}
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-gray-100" />
              <div className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-t-[#1A8A00] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🖼️</span>
              </div>
            </div>

            {/* Texto de estado */}
            <div className="text-center space-y-1">
              <p className="font-bold text-gray-900 text-base">{imageProgressModal.label}</p>
              <p className="text-xs text-gray-400">
                Paso {imageProgressModal.step} de {imageProgressModal.totalSteps}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-[#1A8A00] transition-all duration-500"
                style={{ width: `${(imageProgressModal.step / imageProgressModal.totalSteps) * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center leading-relaxed">
              ⚠️ No cerres esta ventana ni cambies de pestaña mientras se procesa la imagen.
            </p>
          </div>
        </div>
      )}

      {bulkProgress.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-gray-100" />
              <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-[#166534] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900">{bulkProgress.label}</p>
              <p className="text-xs text-gray-400 mt-1">
                Lote {bulkProgress.done} de {bulkProgress.total}
              </p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-[#166534] transition-all duration-300"
                style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}