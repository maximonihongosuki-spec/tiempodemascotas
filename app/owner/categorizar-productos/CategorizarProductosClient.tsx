'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Product, Category } from '../../../src/lib/supabase';
import { Brain, Search, CheckCircle, Clock, Loader2, Save, X, AlertCircle, Settings2 } from 'lucide-react';
import AIImageReviewModal from '../../../src/components/owner/AIImageReviewModal';
import AIPromptConfigModal from '../../../src/components/owner/AIPromptConfigModal';

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
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 border border-gray-300 rounded min-h-[32px] focus-within:ring-1 focus-within:ring-blue-500 bg-white">
      {tags.map((tag, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-medium"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="hover:bg-blue-200 rounded-full w-3.5 h-3.5 flex items-center justify-center text-blue-700 hover:text-blue-900"
            type="button"
          >
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
        placeholder={tags.length === 0 ? "Agregar tags..." : ""}
        className="flex-1 min-w-[80px] text-[10px] outline-none bg-transparent"
      />
    </div>
  );
}

// === SearchableSelect (listas cerradas) ===
interface SearchableSelectProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
}

function SearchableSelect({ value, options, onChange, placeholder = 'Seleccionar...' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

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
        onClick={() => setOpen(o => !o)}
        className="w-full text-xs px-2 py-1 border border-gray-300 rounded cursor-pointer bg-white flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        <span className="text-gray-400 text-[10px]">▼</span>
      </div>
      {open && (
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

// === SearchableSelectWithAdd (listas abiertas: específica y marca) ===
interface SearchableSelectWithAddProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onAdd: (val: string) => Promise<void>;
  placeholder?: string;
}

function SearchableSelectWithAdd({ value, options, onChange, onAdd, placeholder = 'Seleccionar...' }: SearchableSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          onClick={() => setOpen(o => !o)}
          className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded cursor-pointer bg-white flex items-center justify-between"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
          <span className="text-gray-400 text-[10px]">▼</span>
        </div>
        <button
          onClick={() => { setAdding(a => !a); setOpen(false); }}
          className="text-xs px-1.5 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-bold"
          title="Agregar nueva"
          type="button"
        >
          +
        </button>
      </div>
      {adding && (
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
          >
            {saving ? '...' : 'OK'}
          </button>
        </div>
      )}
      {open && (
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
            <span className="text-[10px]">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface AIResult {
  id: string;
  name: string;
  product_code: string;
  external_code: string;
  image_url: string;
  category_general: string[];
  category_specific: string[];
  category_species: string[];
  category_brand: string;
  category_sub_specific: string[];
  category_detail?: string[];
  category_age: string[];
  category_condition: string[];
  is_bulk: boolean;
  is_prescription: boolean;
  requires_prescription: boolean;
  local_only?: boolean;
  requires_refrigeration?: boolean;
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
}

const PRODUCT_CATEGORIZE_COLUMNS = [
  'id', 'name', 'public_name', 'product_code', 'external_code', 'price',
  'active', 'archived', 'stock', 'image_url', 'uploaded_image_url',
  'category_general', 'category_specific', 'category_sub_specific',
  'category_species', 'category_brand', 'category_age', 'category_detail', 'category_condition',
  'is_bulk', 'is_prescription', 'requires_prescription', 'local_only', 'requires_refrigeration',
  'ai_categorized_at', 'description', 'tags', 'url_slug',
  'is_parent', 'parent_product_id', 'created_at'
].join(',');

export default function CategorizarProductosClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTab, setViewTab] = useState<'pending' | 'done' | 'all'>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterGeneral, setFilterGeneral] = useState('');
  const [filterSpecific, setFilterSpecific] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterStock, setFilterStock] = useState('');

  // Flow state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchResolve, setBatchResolve] = useState<(() => void) | null>(null);
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [currentBatchProducts, setCurrentBatchProducts] = useState<Product[]>([]);
  const [aiCredits, setAiCredits] = useState<number>(0);
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewProductId, setAiReviewProductId] = useState<string>('');
  const [aiReviewOriginalUrl, setAiReviewOriginalUrl] = useState('');
  const [aiReviewImprovedUrl, setAiReviewImprovedUrl] = useState('');
  const [aiReviewFile, setAiReviewFile] = useState<File | null>(null);
  const [aiReviewRetrying, setAiReviewRetrying] = useState(false);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [imageProgressModal, setImageProgressModal] = useState<{
    open: boolean;
    current: number;
    total: number;
    label: string;
  }>({ open: false, current: 0, total: 0, label: '' });

  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const refreshAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const PAGE = 1000;
      let allProducts: Product[] = [];
      let from = 0;
      let keep = true;
      while (keep) {
        if (ctrl.signal.aborted) return;
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_CATEGORIZE_COLUMNS)
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        allProducts = allProducts.concat(data as any[]);
        from += PAGE;
        keep = data.length === PAGE;
      }

      if (ctrl.signal.aborted) return;

      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (!ctrl.signal.aborted) {
        if (!catError && catData) setCategories(catData || []);
        const seen = new Set<string>();
        const deduped = allProducts.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProducts(deduped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ya tenemos initialProducts. Solo traemos categories al montar.
    const loadCategories = async () => {
      try {
        const { data } = await supabase.from('categories').select('*').order('name');
        setCategories(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadCategories();
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

  const filteredProducts = products.filter(p => {
    // Búsqueda por texto
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(searchTerm.toLowerCase());

    // Tab (pendiente/categorizado/todos)
    const matchTab =
      viewTab === 'all' ? true :
      viewTab === 'pending' ? !p.ai_categorized_at :
      !!p.ai_categorized_at;

    // Categoría general
    const matchGeneral = !filterGeneral || (Array.isArray(p.category_general) && p.category_general.includes(filterGeneral));

    // Categoría específica
    const matchSpecific = !filterSpecific || (Array.isArray(p.category_specific) && p.category_specific.includes(filterSpecific));

    // Especie/raza
    const matchSpecies = !filterSpecies ||
      (Array.isArray(p.category_species) && p.category_species.includes(filterSpecies));

    // Marca
    const matchBrand = !filterBrand || p.category_brand === filterBrand;

    // Estado de activación
    const matchActive =
      !filterActive ? true :
      filterActive === 'active' ? p.active === true :
      p.active === false;

    // Stock
    const matchStock =
      !filterStock ? true :
      filterStock === 'con_stock' ? p.stock > 0 :
      p.stock === 0;

    return matchSearch && matchTab && matchGeneral && matchSpecific &&
           matchSpecies && matchBrand && matchActive && matchStock;
  });

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

  const emptyCellClass = (value: any) => {
    const isEmpty = value === undefined || value === null || value === '' || 
                    (Array.isArray(value) && value.length === 0);
    return isEmpty ? 'ring-2 ring-red-400 bg-red-50 rounded p-1' : '';
  };

  const handleAddSpecific = async (name: string) => {
    const { data: generals } = await supabase.from('categories').select('id, name').eq('type', 'general');
    const generalMap = new Map((generals || []).map(g => [g.name.toLowerCase(), g.id]));
    await supabase.from('categories').insert([{
      name,
      type: 'specific',
      parent_id: null,
    }]);
    const { data: updated } = await supabase.from('categories').select('*').order('name');
    setCategories(updated || []);
  };

  const handleAddBrand = async (name: string) => {
    await supabase.from('categories').insert([{ name, type: 'brand' }]);
    const { data: updated } = await supabase.from('categories').select('*').order('name');
    setCategories(updated || []);
  };

  const handleAddSubSpecific = async (name: string, aiResultId: string) => {
    const aiRes = aiResults.find(r => r.id === aiResultId);
    if (!aiRes) return;
    const specCats = Array.isArray(aiRes.category_specific) ? aiRes.category_specific : (aiRes.category_specific ? [aiRes.category_specific] : []);
    const specCat = categories.find(c => c.type === 'specific' && specCats.includes(c.name));
    await supabase.from('categories').insert([{
      name,
      type: 'sub_specific',
      parent_id: specCat?.id || null
    }]);
    const { data: updated } = await supabase.from('categories').select('*').order('name');
    setCategories(updated || []);
    const currentSub = Array.isArray(aiRes.category_sub_specific) ? aiRes.category_sub_specific : [];
    handleReviewChange(aiResultId, 'category_sub_specific', [...currentSub, name]);
  };

  const handleAIAddDetail = async (name: string, parentSubSpecName: string) => {
    // Buscar la sub_specific para asignarla como padre
    const parentSubSpec = categories.find(
      c => c.type === 'sub_specific' && c.name === parentSubSpecName
    );
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        name,
        type: 'detail',
        parent_id: parentSubSpec?.id || null
      }])
      .select()
      .single();
    if (!error && data) {
      const { data: updated } = await supabase.from('categories').select('*').order('name');
      setCategories(updated || []);
    }
  };

  const handleAIAddSubSpecific = async (name: string, parentSpecificName: string) => {
    const parentSpec = categories.find(c => c.type === 'specific' && c.name === parentSpecificName);
    const { data, error } = await supabase.from('categories').insert([{
      name, type: 'sub_specific', parent_id: parentSpec?.id || null
    }]).select().single();
    if (!error && data) {
      const { data: updated } = await supabase.from('categories').select('*').order('name');
      setCategories(updated || []);
    }
  };

  const handleAIAddFlat = async (name: string, type: 'species' | 'age' | 'condition' | 'brand') => {
    const { data, error } = await supabase.from('categories').insert([{
      name, type, parent_id: null
    }]).select().single();
    if (!error && data) {
      const { data: updated } = await supabase.from('categories').select('*').order('name');
      setCategories(updated || []);
    }
  };

  const optimizeImage = async (input: File | string): Promise<Blob | null> => {
    try {
      if (typeof input === 'string') {
        const res = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: input }),
        });
        if (!res.ok) throw new Error('Error en conversión WebP con URL');
        return await res.blob();
      } else {
        const res = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': input.type },
          body: input,
        });
        if (!res.ok) throw new Error('Error en conversión WebP con archivo');
        return await res.blob();
      }
    } catch (err) {
      console.error('optimizeImage error:', err);
      return null;
    }
  };

  const handleImproveWithAI = async (id: string) => {
    const res = aiResults.find(r => r.id === id);
    if (!res) return;
    if (!res.categorizationDone) {
      alert('Antes de mejorar con IA, marcá el checkbox "Terminé" para confirmar que terminaste de categorizar este producto. Esto asegura que toda la metadata se envíe a la IA.');
      return;
    }
    if (!res.pendingImageFile && !res.pendingImageUrl && !res.imagePreview) {
      alert('Cargá una imagen primero'); return;
    }
    const { data: ctxRefSettings } = await supabase
      .from('ai_image_context_settings')
      .select('send_metadata, use_reference_images, ai_model, credits_per_use')
      .eq('context', 'categorizar')
      .maybeSingle();
    const creditsNeeded = ctxRefSettings?.credits_per_use ?? 1;

    if (aiCredits < creditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${aiCredits}.`);
      return;
    }

    setAiResults(prev => prev.map(r => r.id === id ? { ...r, isAiImproving: true } : r));
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'categorizar')
        .order('sort_order', { ascending: true });
      if (!blocks || blocks.length === 0) {
        const fallback = await supabase
          .from('ai_image_config')
          .select('prompt_block')
          .eq('active', true)
          .eq('context', 'products')
          .order('sort_order', { ascending: true });
        blocks = fallback.data || [];
      }
      const prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Professional e-commerce product photo, pure white background, centered, soft studio lighting, sharp focus, 1:1 square format';

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');

      if (res.pendingImageFile) {
        form.append('image', res.pendingImageFile);
      } else {
        form.append('imageUrl', res.pendingImageUrl || res.imagePreview);
      }

      const shouldSendMeta = ctxRefSettings?.send_metadata ?? true;

      const shouldUseRefImages = ctxRefSettings?.use_reference_images ?? true;
      const selectedModel = ctxRefSettings?.ai_model ?? 'gpt-image-1.5';

      let referenceImageUrlsToSend: string[] = [];
      if (shouldUseRefImages) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'categorizar')
          .order('sort_order', { ascending: true })
          .limit(2);
        if (refImgs && refImgs.length > 0) {
          referenceImageUrlsToSend = refImgs.map(r => r.image_url);
        }
      }

      if (shouldSendMeta) {
        const productMetadata = {
          name: res.name,
          brand: res.category_brand,
          category_general: res.category_general,
          category_specific: res.category_specific,
          category_sub_specific: res.category_sub_specific,
          category_detail: res.category_detail,
          category_species: res.category_species,
          category_age: res.category_age,
          category_condition: res.category_condition,
          tags: res.tags,
        };
        form.append('productMetadata', JSON.stringify(productMetadata));
      }

      if (referenceImageUrlsToSend.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrlsToSend));
      }

      form.append('model', selectedModel);

      const apiRes = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await apiRes.json();
      if (data.error) throw new Error(data.error);

      // byteString converting code...
      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const aiBlob = new Blob([ab], { type: 'image/png' });
      const aiFile = new File([aiBlob], `ai-improved-${Date.now()}.png`, { type: 'image/png' });

      setAiReviewOriginalUrl(res.imagePreview);
      setAiReviewImprovedUrl(URL.createObjectURL(aiFile));
      setAiReviewFile(aiFile);
      setAiReviewProductId(id);
      setAiReviewOpen(true);

      setAiResults(prev => prev.map(r => r.id === id ? { ...r, isAiImproving: false } : r));

      // Descontar crédito según costo
      const newCredits = Math.max(0, aiCredits - creditsNeeded);
      await supabase
        .from('settings')
        .update({ value: String(newCredits), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      setAiCredits(newCredits);
    } catch (err: any) {
      alert('Error al mejorar con IA: ' + (err.message || 'Desconocido'));
      setAiResults(prev => prev.map(r => r.id === id ? { ...r, isAiImproving: false } : r));
    }
  };

  const handleAiRetryInRevision = async (corrections: string) => {
    if (!aiReviewFile) return;

    const { data: ctxRefSettings } = await supabase
      .from('ai_image_context_settings')
      .select('send_metadata, use_reference_images, ai_model, credits_per_use')
      .eq('context', 'categorizar')
      .maybeSingle();
    const creditsNeeded = ctxRefSettings?.credits_per_use ?? 1;

    if (aiCredits < creditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${aiCredits}.`);
      return;
    }

    setAiReviewRetrying(true);
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'categorizar')
        .order('sort_order', { ascending: true });
      if (!blocks || blocks.length === 0) {
        const fallback = await supabase
          .from('ai_image_config')
          .select('prompt_block')
          .eq('active', true)
          .eq('context', 'products')
          .order('sort_order', { ascending: true });
        blocks = fallback.data || [];
      }

      let prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Professional e-commerce product photo, pure white background, centered, soft studio lighting, sharp focus, 1:1 square format';

      prompt = `${prompt}. IMPORTANT corrections from user: ${corrections}`;

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('image', aiReviewFile);

      const shouldSendMeta = ctxRefSettings?.send_metadata ?? true;

      const shouldUseRefImages = ctxRefSettings?.use_reference_images ?? true;
      const selectedModel = ctxRefSettings?.ai_model ?? 'gpt-image-1.5';

      let referenceImageUrlsToSend: string[] = [];
      if (shouldUseRefImages) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'categorizar')
          .order('sort_order', { ascending: true })
          .limit(2);
        if (refImgs && refImgs.length > 0) {
          referenceImageUrlsToSend = refImgs.map(r => r.image_url);
        }
      }

      if (shouldSendMeta && aiReviewProductId) {
        const reviewedProduct = aiResults.find(r => r.id === aiReviewProductId);
        if (reviewedProduct) {
          const productMetadata = {
            name: reviewedProduct.name,
            brand: reviewedProduct.category_brand,
            category_general: reviewedProduct.category_general,
            category_specific: reviewedProduct.category_specific,
            category_sub_specific: reviewedProduct.category_sub_specific,
            category_detail: reviewedProduct.category_detail,
            category_species: reviewedProduct.category_species,
            category_age: reviewedProduct.category_age,
            category_condition: reviewedProduct.category_condition,
            tags: reviewedProduct.tags,
          };
          form.append('productMetadata', JSON.stringify(productMetadata));
        }
      }

      if (referenceImageUrlsToSend.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrlsToSend));
      }

      form.append('model', selectedModel);

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const newBlob = new Blob([ab], { type: 'image/png' });
      const newFile = new File([newBlob], `ai-retry-${Date.now()}.png`, { type: 'image/png' });

      setAiReviewFile(newFile);
      setAiReviewImprovedUrl(URL.createObjectURL(newFile));

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

  const handleAiAcceptInRevision = () => {
    if (aiReviewFile && aiReviewProductId) {
      setAiResults(prev => prev.map(r => r.id === aiReviewProductId ? {
        ...r,
        pendingImageFile: aiReviewFile,
        pendingImageUrl: '',
        imagePreview: URL.createObjectURL(aiReviewFile),
        aiImproved: true,
      } : r));
    }
    setAiReviewOpen(false);
    setAiReviewFile(null);
    setAiReviewProductId('');
  };

  const handleAiCancelInRevision = () => {
    setAiReviewOpen(false);
    setAiReviewFile(null);
    setAiReviewProductId('');
    if (aiReviewImprovedUrl) URL.revokeObjectURL(aiReviewImprovedUrl);
    setAiReviewImprovedUrl('');
    setAiReviewOriginalUrl('');
  };

  const startCategorization = async () => {
    setIsConfirmOpen(false);
    setIsProcessing(true);
    setCurrentBatch(0);
    setAiResults([]);
    cancelRef.current = false;

    const selected = products.filter(p => selectedIds.has(p.id));
    const BATCH_SIZE = 20;
    const batches: Product[][] = [];
    for (let i = 0; i < selected.length; i += BATCH_SIZE) {
      batches.push(selected.slice(i, i + BATCH_SIZE));
    }
    setTotalBatches(batches.length);

    // Procesamos lote por lote, esperando revisión manual entre cada uno
    for (let i = 0; i < batches.length; i++) {
      setCurrentBatch(i + 1);
      setIsProcessing(true);

      if (cancelRef.current) {
        setIsProcessing(false);
        break;
      }

      const batch = batches[i];

      const { data: latestCats } = await supabase.from('categories').select('*');
      const cats = latestCats || [];

      const generales = Array.from(new Set(cats.filter(c => c.type === 'general').map(c => c.name)));
      const especies = Array.from(new Set(cats.filter(c => c.type === 'species').map(c => c.name)));
      const edades = Array.from(new Set(cats.filter(c => c.type === 'age').map(c => c.name)));
      const condiciones = Array.from(new Set(cats.filter(c => c.type === 'condition').map(c => c.name)));
      const categoriasEspecificas = Array.from(new Set(cats.filter(c => c.type === 'specific').map(c => c.name)));
      const marcas = Array.from(new Set(cats.filter(c => c.type === 'brand').map(c => c.name)));

      setCurrentBatchProducts(batch);

      try {
        const response = await fetch('/api/categorizar-productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productos: batch.map(p => ({ id: p.id, nombre: p.name, codigo: p.product_code })),
            categorias_generales: generales,
            categorias_especificas: categoriasEspecificas,
            especies,
            edades,
            condiciones,
            marcas,
          }),
        });

        if (!response.ok) throw new Error('Error al conectar con el servidor de IA');

        const data = await response.json();
        const resultados: any[] = Array.isArray(data) ? data : (data.output || data.items || []);

        const batchResults: AIResult[] = resultados.map((res: any) => {
          const original = batch.find(p => p.id === res.id);

          const aiAge = Array.isArray(res.category_age)
            ? res.category_age.filter(Boolean)
            : [];
          const category_age = aiAge.length > 0 ? aiAge : ['Todas las edades'];
          const ageIsDefault = aiAge.length === 0;

          const aiCondition = Array.isArray(res.category_condition)
            ? res.category_condition.filter(Boolean)
            : [];
          const category_condition = aiCondition.length > 0 ? aiCondition : ['Sin condición'];
          const conditionIsDefault = aiCondition.length === 0;

          const rawSpecies = Array.isArray(res.category_species)
            ? res.category_species
            : [];

          // Filtramos valores que consideramos "sin especie real":
          // vacío, "N/A", "Otros" → caen al default
          const ESPECIES_IGNORADAS = ['N/A', 'Otros', 'otros', 'n/a', 'Todos', 'todos', 'Todas', 'todas', ''];
          const aiSpecies = rawSpecies.filter(
            (s: string) => Boolean(s) && !ESPECIES_IGNORADAS.includes(s.trim())
          );

          const speciesIsDefault = aiSpecies.length === 0;
          const category_species = speciesIsDefault ? ['Perros', 'Gatos'] : aiSpecies;

          // category_general viene del producto original (no la decide la IA)
          const origCG = original?.category_general;
          const cgArray: string[] = Array.isArray(origCG) 
            ? origCG 
            : (origCG ? [origCG as string] : (res.category_general ? [res.category_general] : []));

          // Soportar tanto string (n8n legacy) como array (nativo)
          const ceRaw = Array.isArray(res.category_specific)
            ? (res.category_specific[0] || '')
            : (res.category_specific || '');
          const ceFromAI = String(ceRaw).trim();
          const ceArray: string[] = ceFromAI ? [ceFromAI] : [];

          return {
            id: res.id,
            name: original?.name || 'Producto desconocido',
            product_code: original?.product_code || '',
            external_code: original?.external_code || '',
            image_url: original?.uploaded_image_url || original?.image_url || '',
            category_general: cgArray,
            category_specific: ceArray,
            category_sub_specific: Array.isArray(res.category_sub_specific)
              ? res.category_sub_specific
              : (res.category_sub_specific ? [res.category_sub_specific] : []),
            category_detail: Array.isArray(original?.category_detail) 
              ? original!.category_detail 
              : [],
            original_image_url: original?.image_url || '',
            category_species,
            category_brand: res.category_brand || '',
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
            imageInputMethod: 'url' as const,
            categorizationDone: false,
          };
        });

        setIsProcessing(false);
        setAiResults(batchResults);
        setBatchIndex(i);

        // Esperamos que el usuario confirme antes de continuar
        await new Promise<void>((resolve) => {
          setBatchResolve(() => resolve);
          setIsReviewOpen(true);
        });

      } catch (error) {
        console.error(error);
        alert('Error durante el procesamiento. Por favor reintentá.');
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(false);
    alert('✅ Todos los lotes han sido categorizados y revisados.');
    setSelectedIds(new Set());
  };

  const handleReviewChange = (id: string, field: keyof AIResult, value: any) => {
    setAiResults(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'category_age') updated.ageIsDefault = false;
      if (field === 'category_condition') updated.conditionIsDefault = false;
      if (field === 'category_species') updated.speciesIsDefault = false;
      return updated;
    }));
  };

  const toggleCategorizationDone = (id: string) => {
    setAiResults(prev => prev.map(r => 
      r.id === id ? { ...r, categorizationDone: !r.categorizationDone } : r
    ));
  };

  const handleSaveAll = async () => {
    setSaveLoading(true);
    try {
      // ── Pipeline de imágenes pendientes ──
      const imageUrlUpdates: Record<string, string> = {};
      const productsWithImages = aiResults.filter(r => r.pendingImageFile || r.pendingImageUrl);

      if (productsWithImages.length > 0) {
        setImageProgressModal({ open: true, current: 0, total: productsWithImages.length, label: 'Iniciando...' });

        for (let i = 0; i < productsWithImages.length; i++) {
          const r = productsWithImages[i];
          setImageProgressModal({
            open: true,
            current: i + 1,
            total: productsWithImages.length,
            label: `Optimizando imagen ${i + 1} de ${productsWithImages.length}: ${r.name}`,
          });

          const input: File | string = r.pendingImageFile ? r.pendingImageFile : r.pendingImageUrl;
          const webpBlob = await optimizeImage(input);

          if (!webpBlob) {
            throw new Error(
              `No se pudo optimizar la imagen de "${r.name}" a WebP. ` +
              `Se canceló el guardado del lote completo — ningún producto de esta ` +
              `tanda se guardó todavía. Reintentá cuando el servicio esté disponible.`
            );
          }

          const filename = `product-main-${Date.now()}-${r.id.slice(0, 8)}.webp`;
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .upload(filename, webpBlob, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });
          if (storageError) throw storageError;

          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);
          imageUrlUpdates[r.id] = urlData.publicUrl;
        }

        setImageProgressModal({ open: false, current: 0, total: 0, label: '' });
      }

      const { data: existingCats } = await supabase.from('categories').select('name, type');
      const existingSpecific = (existingCats || []).filter(c => c.type === 'specific').map(c => c.name.toLowerCase());
      const existingBrands = (existingCats || []).filter(c => c.type === 'brand').map(c => c.name.toLowerCase());

      const newSpecific = Array.from(new Set(
        aiResults.flatMap(r => Array.isArray(r.category_specific) ? r.category_specific : (r.category_specific ? [r.category_specific] : []))
      )).filter(name => !existingSpecific.includes(name.toLowerCase()));

      const newBrands = Array.from(new Set(aiResults.map(r => r.category_brand).filter(Boolean)))
        .filter(name => !existingBrands.includes(name.toLowerCase()));

      if (newSpecific.length > 0) {
        const { data: generals } = await supabase.from('categories').select('id, name').eq('type', 'general');
        const generalMap = new Map((generals || []).map(g => [g.name.toLowerCase(), g.id]));
        await supabase.from('categories').insert(
          newSpecific.map(name => {
            const result = aiResults.find(r => Array.isArray(r.category_specific) ? r.category_specific.includes(name) : r.category_specific === name);
            const parentName = Array.isArray(result?.category_general) ? result.category_general[0] : result?.category_general;
            return {
              name,
              type: 'specific',
              parent_id: parentName
                ? generalMap.get(parentName.toLowerCase()) || null
                : null,
            };
          })
        );
      }

      if (newBrands.length > 0) {
        await supabase.from('categories').insert(
          newBrands.map(name => ({ name, type: 'brand' }))
        );
      }

      const updatePromises = aiResults.map(res =>
        supabase.from('products').update({
          ...(imageUrlUpdates[res.id] ? {
            uploaded_image_url: imageUrlUpdates[res.id],
            image_url: '',
          } : {}),
          category_general: Array.isArray(res.category_general) 
            ? res.category_general 
            : (res.category_general ? [res.category_general] : []),
          category_specific: Array.isArray(res.category_specific) 
            ? res.category_specific 
            : (res.category_specific ? [res.category_specific] : []),
          category_sub_specific: Array.isArray(res.category_sub_specific)
            ? res.category_sub_specific : [],
          category_detail: (res.category_detail as string[] | undefined) || [],
          category_species: res.category_species.length > 0 ? res.category_species : [],
          category_brand: res.category_brand || null,
          category_age: res.category_age.length > 0 ? res.category_age : [],
          category_condition: res.category_condition.length > 0 ? res.category_condition : [],
          is_bulk: res.is_bulk,
          is_prescription: res.is_prescription,
          requires_prescription: res.requires_prescription || false,
          local_only: res.local_only || false,
          requires_refrigeration: res.requires_refrigeration || false,
          active: res.active,
          tags: res.tags.length > 0 ? res.tags : [],
          ai_categorized_at: new Date().toISOString(),
        }).eq('id', res.id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) console.error('Algunos updates fallaron:', errors);

      // Compute local state changes and apply a single mutation
      const updatedProductsMap = new Map<string, Partial<Product>>();
      aiResults.forEach(res => {
        updatedProductsMap.set(res.id, {
          ...(imageUrlUpdates[res.id] ? {
            uploaded_image_url: imageUrlUpdates[res.id],
            image_url: '',
          } : {}),
          category_general: Array.isArray(res.category_general) 
            ? res.category_general 
            : (res.category_general ? [res.category_general] : []),
          category_specific: Array.isArray(res.category_specific) 
            ? res.category_specific 
            : (res.category_specific ? [res.category_specific] : []),
          category_sub_specific: Array.isArray(res.category_sub_specific)
            ? res.category_sub_specific : [],
          category_detail: (res.category_detail as string[] | undefined) || [],
          category_species: res.category_species.length > 0 ? res.category_species : [],
          category_brand: res.category_brand || undefined,
          category_age: res.category_age.length > 0 ? res.category_age : [],
          category_condition: res.category_condition.length > 0 ? res.category_condition : [],
          is_bulk: res.is_bulk,
          is_prescription: res.is_prescription,
          requires_prescription: res.requires_prescription || false,
          local_only: res.local_only || false,
          requires_refrigeration: res.requires_refrigeration || false,
          active: res.active,
          tags: res.tags.length > 0 ? res.tags : [],
          ai_categorized_at: new Date().toISOString(),
        });
      });

      setProducts(prev => prev.map(p => {
        const changes = updatedProductsMap.get(p.id);
        return changes ? { ...p, ...changes } : p;
      }));

      setIsReviewOpen(false);
      setAiResults([]);

      // Resolvemos la promesa para que continúe el siguiente lote
      if (batchResolve) {
        batchResolve();
        setBatchResolve(null);
      }

    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Error al guardar los cambios.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRecategorize = async () => {
    if (!currentBatchProducts.length) return;
    setIsRecategorizing(true);
    setAiResults([]);

    try {
      const { data: latestCats } = await supabase.from('categories').select('*');
      const cats = latestCats || [];

      const generales = Array.from(new Set(cats.filter(c => c.type === 'general').map(c => c.name)));
      const especies = Array.from(new Set(cats.filter(c => c.type === 'species').map(c => c.name)));
      const edades = Array.from(new Set(cats.filter(c => c.type === 'age').map(c => c.name)));
      const condiciones = Array.from(new Set(cats.filter(c => c.type === 'condition').map(c => c.name)));
      const categoriasEspecificas = Array.from(new Set(cats.filter(c => c.type === 'specific').map(c => c.name)));
      const marcas = Array.from(new Set(cats.filter(c => c.type === 'brand').map(c => c.name)));

      const response = await fetch('/api/categorizar-productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productos: currentBatchProducts.map(p => ({ id: p.id, nombre: p.name, codigo: p.product_code })),
          categorias_generales: generales,
          categorias_especificas: categoriasEspecificas,
          especies,
          edades,
          condiciones,
          marcas,
        }),
      });

      if (!response.ok) throw new Error('Error al conectar con el servidor de IA');

      const data = await response.json();
      const resultados: any[] = Array.isArray(data) ? data : (data.output || data.items || []);

      const batchResults: AIResult[] = resultados.map((res: any) => {
        const original = currentBatchProducts.find(p => p.id === res.id);

        const aiAge = Array.isArray(res.category_age)
          ? res.category_age.filter(Boolean)
          : [];
        const category_age = aiAge.length > 0 ? aiAge : ['Todas las edades'];
        const ageIsDefault = aiAge.length === 0;

        const aiCondition = Array.isArray(res.category_condition)
          ? res.category_condition.filter(Boolean)
          : [];
        const category_condition = aiCondition.length > 0 ? aiCondition : ['Sin condición'];
        const conditionIsDefault = aiCondition.length === 0;

        const rawSpecies = Array.isArray(res.category_species)
          ? res.category_species
          : [];

        // Filtramos valores que consideramos "sin especie real":
        // vacío, "N/A", "Otros" → caen al default
        const ESPECIES_IGNORADAS = ['N/A', 'Otros', 'otros', 'n/a', 'Todos', 'todos', 'Todas', 'todas', ''];
        const aiSpecies = rawSpecies.filter(
          (s: string) => Boolean(s) && !ESPECIES_IGNORADAS.includes(s.trim())
        );

        const speciesIsDefault = aiSpecies.length === 0;
        const category_species = speciesIsDefault ? ['Perros', 'Gatos'] : aiSpecies;

        // category_general viene del producto original (no la decide la IA)
        const origCG = original?.category_general;
        const cgArray: string[] = Array.isArray(origCG) 
          ? origCG 
          : (origCG ? [origCG as string] : (res.category_general ? [res.category_general] : []));

        // Soportar tanto string (n8n legacy) como array (nativo)
        const ceRaw = Array.isArray(res.category_specific)
          ? (res.category_specific[0] || '')
          : (res.category_specific || '');
        const ceFromAI = String(ceRaw).trim();
        const ceArray: string[] = ceFromAI ? [ceFromAI] : [];

        return {
          id: res.id,
          name: original?.name || 'Producto desconocido',
          product_code: original?.product_code || '',
          external_code: original?.external_code || '',
          image_url: original?.uploaded_image_url || original?.image_url || '',
          category_general: cgArray,
          category_specific: ceArray,
          category_sub_specific: Array.isArray(res.category_sub_specific)
            ? res.category_sub_specific
            : (res.category_sub_specific ? [res.category_sub_specific] : []),
          category_detail: Array.isArray(original?.category_detail) 
            ? original!.category_detail 
            : [],
          category_species,
          category_brand: res.category_brand || '',
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
          imageInputMethod: 'url' as const,
          categorizationDone: false,
        };
      });

      setAiResults(batchResults);
    } catch (error) {
      console.error(error);
      alert('Error al recategorizar. Por favor reintentá.');
    } finally {
      setIsRecategorizing(false);
    }
  };

  const handleTerminar = () => {
    cancelRef.current = true;
    setIsReviewOpen(false);
    setAiResults([]);
    setCurrentBatchProducts([]);
    if (batchResolve) {
      batchResolve();
      setBatchResolve(null);
    }
    setIsProcessing(false);
    setSelectedIds(new Set());
  };

  const pendingCount = products.filter(p => !p.ai_categorized_at).length;
  const doneCount = products.filter(p => !!p.ai_categorized_at).length;

  return (
    <div className="space-y-6 font-sans text-gray-900">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" /> Categorización con IA
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Asigná categorías a tus productos usando inteligencia artificial</p>
        </div>
        <button
          onClick={() => selectedIds.size > 0 ? setIsConfirmOpen(true) : alert('Seleccioná al menos un producto')}
          disabled={selectedIds.size === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Brain className="w-4 h-4" /> Categorizar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total productos</p>
        </div>
        <div className="bg-white rounded-lg border border-orange-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sin categorizar</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{doneCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Categorizados</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

        {/* Search + Tabs */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['pending', 'done', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${viewTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'pending' ? `Pendientes (${pendingCount})` : tab === 'done' ? `Categorizados (${doneCount})` : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros avanzados */}
        <div className="px-4 pb-3 border-b border-gray-200 flex flex-wrap gap-2 items-center">

          <select
            value={filterGeneral}
            onChange={e => setFilterGeneral(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las generales</option>
            {categories.filter(c => c.type === 'general').map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterSpecific}
            onChange={e => setFilterSpecific(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las específicas</option>
            {categories.filter(c => c.type === 'specific').map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterSpecies}
            onChange={e => setFilterSpecies(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las especies</option>
            {categories.filter(c => c.type === 'species').map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterBrand}
            onChange={e => setFilterBrand(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las marcas</option>
            {categories.filter(c => c.type === 'brand').sort((a,b) => a.name.localeCompare(b.name)).map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cualquier estado</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <select
            value={filterStock}
            onChange={e => setFilterStock(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cualquier stock</option>
            <option value="con_stock">Con stock</option>
            <option value="sin_stock">Sin stock</option>
          </select>

          {(filterGeneral || filterSpecific || filterSpecies || filterBrand || filterActive || filterStock) && (
            <button
              onClick={() => {
                setFilterGeneral('');
                setFilterSpecific('');
                setFilterSpecies('');
                setFilterBrand('');
                setFilterActive('');
                setFilterStock('');
              }}
              className="text-xs px-2 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              Limpiar filtros
            </button>
          )}

          <span className="text-xs text-gray-400 ml-auto">
            {filteredProducts.length} producto(s) encontrado(s)
          </span>

        </div>

        {/* Tabla lista */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">C. Específica</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Especie/Raza</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Marca</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Cargando productos...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No se encontraron productos</td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <p className="text-xs font-medium text-gray-900">{p.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{p.product_code}</p>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-600">{p.category_specific || <span className="text-gray-300 italic">—</span>}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-600">
                    {Array.isArray(p.category_species) && p.category_species.length > 0
                      ? p.category_species.join(', ')
                      : <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-600">{p.category_brand || <span className="text-gray-300 italic">—</span>}</td>
                  <td className="px-3 py-1.5 text-center">
                    {p.ai_categorized_at
                      ? <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"><CheckCircle size={10} /> OK</span>
                      : <span className="inline-flex items-center gap-1 text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium"><Clock size={10} /> Pendiente</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmación */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Confirmar categorización?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vas a enviar <span className="font-semibold text-gray-900">{selectedIds.size} producto(s)</span> para ser analizados por IA en lotes de 20.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-blue-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={14} /> Podrás revisar y corregir los resultados antes de guardar.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirmOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">Cancelar</button>
              <button onClick={startCategorization} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">Confirmar y enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Procesando */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-sm p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="font-bold text-gray-900 text-lg">Analizando con IA</p>
            <p className="text-gray-400 text-sm mt-1">Procesando lote {currentBatch} de {totalBatches}...</p>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalBatches > 0 ? (currentBatch / totalBatches) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0}%</p>
          </div>
        </div>
      )}

      {/* Modal Revisión */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full flex flex-col" style={{ maxHeight: '95vh', maxWidth: '98vw' }}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Revisión de categorización</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lote {batchIndex + 1} de {totalBatches} — productos {batchIndex * 20 + 1} a {Math.min((batchIndex + 1) * 20, selectedIds.size)} de {selectedIds.size}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Verificá las asignaciones antes de guardar. El siguiente lote se procesará automáticamente al confirmar.</p>
              </div>
              {!saveLoading && (
                <button onClick={handleTerminar} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              )}
            </div>

            {/* Tabla resultados */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[260px]">Producto</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[140px]">General</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[160px]">C. Específica</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[160px]">C. Sub-Esp</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-amber-500 uppercase min-w-[140px]">
                      C. Detalle
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[180px]">Especie/Raza</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[140px]">Marca</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[140px]">Edad</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[180px]">Condición</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase min-w-[60px]">Granel</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase min-w-[80px]">Prescripción</th>
                    <th className="px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider min-w-[100px]">
                      Requiere receta
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase" title="Solo venta en local">🏪 Local</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase" title="Requiere refrigeración">❄️ Frío</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase min-w-[80px]">Visible</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase min-w-[280px]">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aiResults.map(res => (
                    <tr key={res.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 min-w-[260px]">
                        <div className="flex flex-col gap-2">

                          {/* Nombre y códigos */}
                          <div className="flex gap-2 items-start">
                            <div className="relative inline-block flex-shrink-0">
                              <div className="w-14 h-14 rounded border border-gray-200 overflow-hidden bg-gray-100">
                                {res.imagePreview ? (
                                  <img
                                    src={res.imagePreview}
                                    alt={res.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-gray-300 text-[10px] text-center px-1">Sin imagen</span>
                                  </div>
                                )}
                                {res.aiImproved && !res.imagePreview && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-purple-600/90 text-white text-[8px] text-center py-0.5 font-medium">✨ IA</div>
                                )}
                              </div>
                              {res.imagePreview && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm('¿Eliminar la imagen de este producto?')) return;
                                    
                                    // Si hay imagen pendiente (mejora pendiente de guardar)
                                    if (res.pendingImageFile || res.pendingImageUrl) {
                                      setAiResults(prev => prev.map(r =>
                                        r.id === res.id
                                          ? { ...r, imagePreview: '', pendingImageFile: null, pendingImageUrl: '', aiImproved: false }
                                          : r
                                      ));
                                      return;
                                    }
                                    
                                    // Si es imagen ya guardada en DB
                                    const { error } = await supabase
                                      .from('products')
                                      .update({ image_url: null, uploaded_image_url: null })
                                      .eq('id', res.id);
                                    if (error) {
                                      alert('Error: ' + error.message);
                                      return;
                                    }
                                    // Actualizar el estado local
                                    setAiResults(prev => prev.map(r =>
                                      r.id === res.id
                                        ? { ...r, imagePreview: '', pendingImageFile: null, pendingImageUrl: '', aiImproved: false }
                                        : r
                                    ));
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm z-10"
                                  title="Eliminar imagen"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <p className="text-xs font-medium text-gray-900 leading-tight">{res.name}</p>
                              {res.product_code && <p className="text-[10px] text-gray-400 font-mono">Cód: {res.product_code}</p>}
                              {res.external_code && <p className="text-[10px] text-gray-400 font-mono">EAN: {res.external_code}</p>}
                            </div>
                          </div>

                          {/* Controles de imagen */}
                          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 space-y-1.5">
                            {/* Tabs */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => setAiResults(prev => prev.map(r => r.id === res.id ? { ...r, imageInputMethod: 'url' } : r))}
                                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${res.imageInputMethod === 'url' ? 'bg-white border border-gray-300 text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              >URL</button>
                              <button
                                onClick={() => setAiResults(prev => prev.map(r => r.id === res.id ? { ...r, imageInputMethod: 'file' } : r))}
                                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${res.imageInputMethod === 'file' ? 'bg-white border border-gray-300 text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                              >Archivo</button>
                            </div>

                            {/* Input */}
                            {res.imageInputMethod === 'url' ? (
                              <input
                                type="url"
                                placeholder="https://..."
                                defaultValue={res.pendingImageUrl}
                                onBlur={e => {
                                  const url = e.target.value.trim();
                                  if (url) {
                                    setAiResults(prev => prev.map(r => r.id === res.id ? {
                                      ...r, pendingImageUrl: url, pendingImageFile: null, imagePreview: url, aiImproved: false
                                    } : r));
                                  }
                                }}
                                className="w-full text-[10px] px-2 py-1 border border-gray-200 rounded bg-white outline-none focus:border-blue-400 font-mono"
                              />
                            ) : (
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setAiResults(prev => prev.map(r => r.id === res.id ? {
                                    ...r,
                                    pendingImageFile: file,
                                    pendingImageUrl: '',
                                    imagePreview: URL.createObjectURL(file),
                                    aiImproved: false,
                                  } : r));
                                }}
                                className="w-full text-[10px] text-gray-500"
                              />
                            )}

                            {/* Botón IA */}
                            <div className="relative group flex items-center gap-1">
                              <label
                                className="flex items-center gap-1 cursor-pointer text-[9px] text-gray-600 hover:text-gray-900 whitespace-nowrap"
                                title="Marcar antes de mejorar con IA para enviar la metadata configurada"
                              >
                                <input
                                  type="checkbox"
                                  checked={res.categorizationDone}
                                  onChange={() => toggleCategorizationDone(res.id)}
                                  className="rounded w-3 h-3 text-purple-600"
                                />
                                <span>Terminé</span>
                              </label>
                              <button
                                onClick={() => handleImproveWithAI(res.id)}
                                disabled={!res.categorizationDone || res.isAiImproving || aiCredits <= 0 || (!res.pendingImageFile && !res.pendingImageUrl && !res.imagePreview)}
                                className="flex-1 flex items-center justify-center gap-1 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-[10px] font-semibold transition-colors"
                              >
                                {res.isAiImproving
                                  ? <><Loader2 size={10} className="animate-spin" /> Procesando...</>
                                  : <>✨ Mejorar con IA</>
                                }
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiConfigOpen(true)}
                                className="p-1 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 rounded transition-colors flex-shrink-0"
                                title="Configurar prompts IA"
                              >
                                <Settings2 size={10} />
                              </button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-800 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                {aiCredits} mejoras con IA disponibles
                              </div>
                            </div>
                          </div>

                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className={emptyCellClass(res.category_general)}>
                          <SearchableCheckboxList
                            options={categories.filter(c => c.type === 'general').map(c => c.name)}
                            selectedValues={Array.isArray(res.category_general) 
                              ? res.category_general 
                              : (res.category_general ? [res.category_general as any as string] : [])}
                            onChange={updated => handleReviewChange(res.id, 'category_general', updated)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className={emptyCellClass(res.category_specific)}>
                          <SearchableCheckboxList
                            options={(() => {
                              // Filtrar específicas según las generales seleccionadas en este res
                              const selectedGenerals = categories.filter(c => 
                                c.type === 'general' && 
                                (Array.isArray(res.category_general) 
                                  ? res.category_general.includes(c.name) 
                                  : c.name === res.category_general)
                              );
                              const ids = selectedGenerals.map(g => g.id);
                              if (ids.length === 0) {
                                // Si no hay generales seleccionadas, mostrar todas las específicas
                                return categories.filter(c => c.type === 'specific').map(c => c.name);
                              }
                              return categories
                                .filter(c => c.type === 'specific' && c.parent_id && ids.includes(c.parent_id))
                                .map(c => c.name);
                            })()}
                            selectedValues={Array.isArray(res.category_specific) 
                              ? res.category_specific 
                              : (res.category_specific ? [res.category_specific as any as string] : [])}
                            onChange={updated => handleReviewChange(res.id, 'category_specific', updated)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 min-w-[160px]">
                        <div className={emptyCellClass(res.category_sub_specific)}>
                          {((Array.isArray(res.category_specific) ? res.category_specific : (res.category_specific ? [res.category_specific] : [])).length > 0) ? (
                            <CheckboxListWithAdd
                              selected={Array.isArray(res.category_sub_specific)
                                ? res.category_sub_specific
                                : (res.category_sub_specific ? [res.category_sub_specific] : [])}
                              options={(() => {
                                // res.category_specific ahora es array; tomar TODAS las sub_specific cuyos parents 
                                // estén en ese conjunto de specifics
                                const ceArr = Array.isArray(res.category_specific) ? res.category_specific : (res.category_specific ? [res.category_specific] : []);
                                const specCats = categories.filter(c => c.type === 'specific' && ceArr.includes(c.name));
                                const specIds = specCats.map(s => s.id);
                                if (specIds.length === 0) return [];
                                return categories
                                  .filter(c => c.type === 'sub_specific' && c.parent_id && specIds.includes(c.parent_id))
                                  .map(c => c.name);
                              })()}
                              onChange={updated => handleReviewChange(res.id, 'category_sub_specific', updated)}
                              onAdd={async (val) => {
                                const ceArr = Array.isArray(res.category_specific) ? res.category_specific : (res.category_specific ? [res.category_specific] : []);
                                const firstSpec = ceArr[0] || '';
                                if (!firstSpec) {
                                  alert('Elegí una C. Específica primero para anidar la nueva sub-específica');
                                  return;
                                }
                                await handleAIAddSubSpecific(val, firstSpec);
                                handleReviewChange(res.id, 'category_sub_specific', [
                                  ...((res.category_sub_specific as string[]) || []),
                                  val
                                ]);
                              }}
                              emptyText="Elegí C. Específica primero o agregá"
                            />
                          ) : (
                            <p className="text-[9px] text-gray-400 italic px-1">Elegí CE primero</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 min-w-[140px]">
                        {(Array.isArray(res.category_sub_specific) && res.category_sub_specific.length > 0) ? (
                          <div className={emptyCellClass(res.category_detail)}>
                            <CheckboxListWithAdd
                              selected={(res.category_detail as string[]) || []}
                              options={(() => {
                                const selectedSubSpecs = categories.filter(c =>
                                  c.type === 'sub_specific' &&
                                  (Array.isArray(res.category_sub_specific)
                                    ? res.category_sub_specific.includes(c.name)
                                    : c.name === res.category_sub_specific)
                                );
                                const subSpecIds = selectedSubSpecs.map(s => s.id);
                                return categories
                                  .filter(c => c.type === 'detail' && c.parent_id && subSpecIds.includes(c.parent_id))
                                  .map(c => c.name);
                              })()}
                              onChange={updated => handleReviewChange(res.id, 'category_detail', updated)}
                              onAdd={async (val) => {
                                // Usar la primera sub_specific seleccionada como padre
                                const firstSubSpec = Array.isArray(res.category_sub_specific)
                                  ? res.category_sub_specific[0]
                                  : res.category_sub_specific || '';
                                await handleAIAddDetail(val, firstSubSpec);
                                handleReviewChange(res.id, 'category_detail', [
                                  ...((res.category_detail as string[]) || []),
                                  val
                                ]);
                              }}
                              emptyText="Elegí Sub-esp. primero o agregá una nueva"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic px-1">
                            Elegí Sub-esp. primero
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="max-w-[180px]">
                          <div className={
                            res.category_species.length === 0
                              ? 'ring-2 ring-red-400 rounded p-1'
                              : res.speciesIsDefault
                              ? 'ring-2 ring-yellow-400 bg-yellow-50 rounded p-1'
                              : 'rounded p-1'
                          }>
                            <CheckboxListWithAdd
                              selected={(res.category_species as string[]) || []}
                              options={categories.filter(c => c.type === 'species').map(c => c.name)}
                              onChange={updated => handleReviewChange(res.id, 'category_species', updated)}
                              onAdd={async (val) => {
                                await handleAIAddFlat(val, 'species');
                                handleReviewChange(res.id, 'category_species', [
                                  ...((res.category_species as string[]) || []),
                                  val
                                ]);
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className={emptyCellClass(res.category_brand)}>
                          <SearchableSelectWithAdd
                            value={res.category_brand}
                            onChange={val => handleReviewChange(res.id, 'category_brand', val)}
                            options={categories.filter(c => c.type === 'brand').map(c => c.name)}
                            onAdd={handleAddBrand}
                            placeholder="Marca..."
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className={
                          res.category_age.length === 0
                            ? 'ring-2 ring-red-400 rounded p-1'
                            : res.ageIsDefault
                            ? 'ring-2 ring-yellow-400 bg-yellow-50 rounded p-1'
                            : 'rounded p-1'
                        }>
                          <CheckboxListWithAdd
                            selected={(res.category_age as string[]) || []}
                            options={categories.filter(c => c.type === 'age').map(c => c.name)}
                            onChange={updated => handleReviewChange(res.id, 'category_age', updated)}
                            onAdd={async (val) => {
                              await handleAIAddFlat(val, 'age');
                              handleReviewChange(res.id, 'category_age', [
                                ...((res.category_age as string[]) || []),
                                val
                              ]);
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className={
                          res.category_condition.length === 0
                            ? 'ring-2 ring-red-400 rounded p-1'
                            : res.conditionIsDefault
                            ? 'ring-2 ring-yellow-400 bg-yellow-50 rounded p-1'
                            : 'rounded p-1'
                        }>
                          <CheckboxListWithAdd
                            selected={(res.category_condition as string[]) || []}
                            options={categories.filter(c => c.type === 'condition').map(c => c.name)}
                            onChange={updated => handleReviewChange(res.id, 'category_condition', updated)}
                            onAdd={async (val) => {
                              await handleAIAddFlat(val, 'condition');
                              handleReviewChange(res.id, 'category_condition', [
                                ...((res.category_condition as string[]) || []),
                                val
                              ]);
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className={emptyCellClass(res.is_bulk)}>
                          <input
                            type="checkbox"
                            checked={res.is_bulk}
                            onChange={e => handleReviewChange(res.id, 'is_bulk', e.target.checked)}
                            className="rounded text-blue-600 w-4 h-4"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className={emptyCellClass(res.is_prescription)}>
                          <input
                            type="checkbox"
                            checked={res.is_prescription}
                            onChange={e => handleReviewChange(res.id, 'is_prescription', e.target.checked)}
                            className="rounded text-blue-600 w-4 h-4"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={res.requires_prescription || false}
                          onChange={e => handleReviewChange(res.id, 'requires_prescription', e.target.checked)}
                          className="rounded text-red-600 w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={res.local_only || false}
                          onChange={e => handleReviewChange(res.id, 'local_only', e.target.checked)}
                          className="rounded text-blue-600 w-4 h-4"
                          title="Solo venta en local"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={res.requires_refrigeration || false}
                          onChange={e => handleReviewChange(res.id, 'requires_refrigeration', e.target.checked)}
                          className="rounded text-cyan-600 w-4 h-4"
                          title="Requiere refrigeración"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleReviewChange(res.id, 'active', !res.active)}
                          className={`px-3 py-1 rounded text-[10px] font-bold transition-colors ${res.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {res.active ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                      </td>
                      <td className="px-4 py-2 min-w-[280px]">
                        <div className={emptyCellClass(res.tags)}>
                          <TagInput
                            tags={res.tags}
                            onChange={(newTags) => handleReviewChange(res.id, 'tags', newTags)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-500">{aiResults.length} producto(s) listos para guardar</span>
              <div className="flex gap-3">

                <button
                  onClick={handleTerminar}
                  disabled={saveLoading || isRecategorizing}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 text-sm font-medium disabled:opacity-40"
                >
                  Terminar categorización
                </button>

                <button
                  onClick={handleRecategorize}
                  disabled={saveLoading || isRecategorizing}
                  className="px-4 py-2 border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50 text-sm font-medium flex items-center gap-2 disabled:opacity-40"
                >
                  {isRecategorizing ? <Loader2 size={15} className="animate-spin" /> : null}
                  {isRecategorizing ? 'Recategorizando...' : 'Recategorizar'}
                </button>

                <button
                  onClick={handleSaveAll}
                  disabled={saveLoading || isRecategorizing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-40"
                >
                  {saveLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Guardar categorización
                </button>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal progreso de imágenes */}
      {imageProgressModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="font-bold text-gray-900 text-base">Procesando imágenes</p>
            <p className="text-gray-500 text-sm mt-1">{imageProgressModal.label}</p>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${imageProgressModal.total > 0 ? (imageProgressModal.current / imageProgressModal.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">
              {imageProgressModal.current} de {imageProgressModal.total}
            </p>
          </div>
        </div>
      )}

      <AIImageReviewModal
        open={aiReviewOpen}
        onClose={handleAiCancelInRevision}
        originalUrl={aiReviewOriginalUrl}
        improvedUrl={aiReviewImprovedUrl}
        onAccept={handleAiAcceptInRevision}
        onRetry={handleAiRetryInRevision}
        isRetrying={aiReviewRetrying}
      />

      <AIPromptConfigModal
        open={aiConfigOpen}
        onClose={() => setAiConfigOpen(false)}
        context="categorizar"
        contextLabel="Imágenes en categorización con IA"
      />

    </div>
  );
}
