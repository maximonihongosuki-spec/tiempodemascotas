'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Loader2, Sparkles, Settings2 } from 'lucide-react';
import { supabase, Category } from '../../lib/supabase';
import AIPromptConfigModal from './AIPromptConfigModal';
import AIImageReviewModal from './AIImageReviewModal';

const BUCKET = 'product-images';

async function optimizeImage(input: File | string): Promise<Blob | null> {
  try {
    let response: Response;
    if (typeof input === 'string') {
      response = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: input }),
      });
    } else {
      response = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': input.type },
        body: input,
      });
    }
    if (!response.ok) throw new Error('Error en conversión WebP');
    return await response.blob();
  } catch (e) {
    console.error('optimizeImage error:', e);
    return null;
  }
}

type TreeNodeProps = {
  category: any;
  children: any[];
  allCategories: any[];
  level: number;
  isLast: boolean;
  expandedNodes: Set<string>;
  setExpandedNodes: (s: Set<string>) => void;
  onEdit: (c: any) => void;
  onDelete: (id: string) => void;
};

function CategoryTreeNode({ category, children, allCategories, level, isLast, expandedNodes, setExpandedNodes, onEdit, onDelete }: TreeNodeProps) {
  const isExpanded = expandedNodes.has(category.id);
  const hasChildren = children.length > 0;

  const toggle = () => {
    const next = new Set(expandedNodes);
    if (isExpanded) next.delete(category.id);
    else next.add(category.id);
    setExpandedNodes(next);
  };

  const typeColors: Record<string, string> = {
    general:      'bg-green-100 text-green-700 border-green-200',
    specific:     'bg-blue-100 text-blue-700 border-blue-200',
    sub_specific: 'bg-purple-100 text-purple-700 border-purple-200',
    detail:       'bg-amber-100 text-amber-700 border-amber-200',
  };

  const typeLabels: Record<string, string> = {
    general: 'General',
    specific: 'Específica',
    sub_specific: 'Sub-esp.',
    detail: 'Detalle',
  };

  return (
    <div>
      <div className="relative flex items-center">
        
        {/* Conectores de árbol — solo para niveles > 0 */}
        {level > 0 && (
          <>
            {/* Línea vertical: baja por todos los hermanos que siguen */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(level - 1) * 20 + 10}px`,
                  top: '50%',
                  bottom: '-50%',
                  width: '1px',
                  background: '#D1D5DB',
                }}
              />
            )}
            {/* Codo: línea vertical de la mitad hacia arriba + horizontal hacia la derecha */}
            <div
              style={{
                position: 'absolute',
                left: `${(level - 1) * 20 + 10}px`,
                top: 0,
                height: '50%',
                width: '1px',
                background: '#D1D5DB',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${(level - 1) * 20 + 10}px`,
                top: '50%',
                height: '1px',
                width: '10px',
                background: '#D1D5DB',
              }}
            />
            {/* Líneas verticales de niveles superiores (los ancestros aún no terminaron) */}
            {Array.from({ length: level - 1 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${i * 20 + 10}px`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: '#D1D5DB',
                }}
              />
            ))}
          </>
        )}

        {/* Contenido del nodo */}
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded transition-colors group flex-1"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={toggle}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 text-[10px] flex-shrink-0"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1 text-sm font-medium text-gray-800">{category.name}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border flex-shrink-0 ${typeColors[category.type || 'general'] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {typeLabels[category.type || 'general'] || category.type}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(category)}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar"
            >
              <Edit size={12} />
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div className="relative">
          {children.map((child, idx) => {
            const grandChildren = allCategories.filter(c => c.parent_id === child.id);
            return (
              <CategoryTreeNode
                key={child.id}
                category={child}
                children={grandChildren}
                allCategories={allCategories}
                level={level + 1}
                isLast={idx === children.length - 1}
                expandedNodes={expandedNodes}
                setExpandedNodes={setExpandedNodes}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

type TreeViewProps = {
  categories: any[];
  expandedNodes: Set<string>;
  setExpandedNodes: (s: Set<string>) => void;
  onEdit: (c: any) => void;
  onDelete: (id: string) => void;
};

function CategoryTreeView({ categories, expandedNodes, setExpandedNodes, onEdit, onDelete }: TreeViewProps) {
  const roots = categories
    .filter(c => c.type === 'general')
    .sort((a, b) => a.name.localeCompare(b.name));
  const flatTypes = ['brand', 'species', 'age', 'condition'];
  const flatLabels: Record<string, string> = {
    brand: '🏷️ Marcas',
    species: '🐾 Especies / Razas',
    age: '🎂 Edades',
    condition: '🩺 Condiciones',
  };

  const expandAll = () => {
    const all = new Set<string>();
    categories
      .filter(c => ['general', 'specific', 'sub_specific'].includes(c.type || ''))
      .forEach(c => all.add(c.id));
    setExpandedNodes(all);
  };
  const collapseAll = () => setExpandedNodes(new Set());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={expandAll}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
        >
          ▼ Expandir todo
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
        >
          ▶ Colapsar todo
        </button>
        <span className="text-[10px] text-gray-400 ml-auto">
          {roots.length} general{roots.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Jerarquía */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">📂 Jerarquía de categorías</h3>
        {roots.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-2 py-4">No hay categorías generales.</p>
        ) : (
          roots.map((root, idx) => {
            const childrenOfRoot = categories.filter(c => c.parent_id === root.id);
            return (
              <CategoryTreeNode
                key={root.id}
                category={root}
                children={childrenOfRoot}
                allCategories={categories}
                level={0}
                isLast={idx === roots.length - 1}
                expandedNodes={expandedNodes}
                setExpandedNodes={setExpandedNodes}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })
        )}
      </div>

      {/* Categorías planas */}
      {flatTypes.map(type => {
        const flat = categories
          .filter(c => c.type === type)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (flat.length === 0) return null;
        return (
          <div key={type} className="bg-white border border-gray-200 rounded-xl p-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
              {flatLabels[type]} <span className="text-gray-400 font-normal">({flat.length})</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {flat.map(c => (
                <span
                  key={c.id}
                  className="group inline-flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs"
                >
                  {c.name}
                  <button
                    onClick={() => onEdit(c)}
                    className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit size={10} />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('general');
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  // ── Category Cards AI ──
  const [catAiConfigOpen, setCatAiConfigOpen] = useState(false);
  const [catAiReviewOpen, setCatAiReviewOpen] = useState(false);
  const [catAiReviewOriginalUrl, setCatAiReviewOriginalUrl] = useState('');
  const [catAiReviewImprovedUrl, setCatAiReviewImprovedUrl] = useState('');
  const [catAiReviewFile, setCatAiReviewFile] = useState<File | null>(null);
  const [catAiReviewRetrying, setCatAiReviewRetrying] = useState(false);
  const [catAiGenerating, setCatAiGenerating] = useState<string | null>(null); // cat.id
  const [activeCatForAi, setActiveCatForAi] = useState<any>(null);
  const [catProductsPanelId, setCatProductsPanelId] = useState<string | null>(null);
  const [catProducts, setCatProducts] = useState<any[]>([]);
  const [catProductsLoading, setCatProductsLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const categoryTypes = [
    { id: 'general', label: 'General' },
    { id: 'specific', label: 'Específica' },
    { id: 'sub_specific', label: 'Sub-específica' },
    { id: 'detail', label: 'Detalle' },
    { id: 'species', label: 'Especie/Raza' },
    { id: 'age', label: 'Edad' },
    { id: 'condition', label: 'Condición' },
    { id: 'brand', label: 'Marca' }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (data) {
      setCategories(data);
      fetchProductCounts(data);
    }
    if (error) console.error(error);
    setLoading(false);
  };

  const fetchProductCounts = async (cats: any[]) => {
    const generalCats = cats.filter((c: any) => c.type === 'general');
    if (generalCats.length === 0) return;
    const results = await Promise.all(
      generalCats.map((cat: any) =>
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('active', true)
          .contains('category_general', [cat.name])
      )
    );
    const counts: Record<string, number> = {};
    generalCats.forEach((cat: any, i: number) => {
      counts[cat.id] = results[i].count || 0;
    });
    setProductCounts(counts);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('categories').insert([{
      name: newName.trim(),
      type: newType,
      parent_id: (newType === 'specific' || newType === 'sub_specific' || newType === 'detail') ? parentCategoryId : null
    }]);
    if (!error) {
      setNewName('');
      setNewType('general');
      setParentCategoryId(null);
      setIsAdding(false);
      fetchCategories();
    } else { alert('Error al agregar categoría'); }
  };

  const handleUpdate = async (id: string) => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('categories').update({
      name: newName.trim(),
      type: newType,
      parent_id: (newType === 'specific' || newType === 'sub_specific' || newType === 'detail') ? parentCategoryId : null
    }).eq('id', id);
    if (!error) {
      setEditingId(null);
      setNewName('');
      setNewType('general');
      setParentCategoryId(null);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) fetchCategories();
  };

  const handleImageUpload = async (categoryId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      return;
    }
    setUploadingImageId(categoryId);
    try {
      // 1. Optimizar a WebP via microservicio n8n
      const blob = await optimizeImage(file);
      if (!blob) throw new Error('No se pudo optimizar la imagen');

      // 2. Subir WebP a Supabase Storage
      const fileName = `categories/category-${categoryId}-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, blob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        });
      if (uploadError) throw uploadError;

      // 3. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      // 4. Guardar URL en la categoría
      const { error: updateError } = await supabase
        .from('categories')
        .update({ image_url: urlData.publicUrl })
        .eq('id', categoryId);
      if (updateError) throw updateError;

      fetchCategories();
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen: ' + (error.message || 'Desconocido'));
    } finally {
      setUploadingImageId(null);
    }
  };

  const loadProductsForCategory = async (catName: string) => {
    setCatProductsLoading(true);
    setCatProducts([]);
    setSelectedProductIds([]);
    try {
      // FIX 1: usar .filter() con sintaxis de array PostgreSQL entre comillas
      // para que la coma en nombres como "Cuidado, Higiene y Bienestar" no rompa
      // el parser de PostgREST (que la trataría como separador de elementos).
      const pgArray = `{"${catName.replace(/"/g, '\\"')}"}`;

      // FIX 2: aceptar productos con cualquier imagen (no solo WebP),
      // ya que para referencias de IA el image_url original es suficiente.
      const { data } = await supabase
        .from('products')
        .select('id, name, public_name, uploaded_image_url, image_url')
        .eq('active', true)
        .eq('is_parent', false)
        .filter('category_general', 'cs', pgArray)
        .or('uploaded_image_url.not.is.null,image_url.not.is.null')
        .order('name', { ascending: true })
        .limit(24);

      setCatProducts(data || []);
    } catch (e) {
      console.error('Error cargando productos de categoría', e);
    } finally {
      setCatProductsLoading(false);
    }
  };

  const handleOpenCatAiPanel = (cat: any) => {
    if (catProductsPanelId === cat.id) {
      setCatProductsPanelId(null);
      return;
    }
    setActiveCatForAi(cat);
    setCatProductsPanelId(cat.id);
    loadProductsForCategory(cat.name);
  };

  const handleGenerateCategoryImage = async () => {
    if (!activeCatForAi) return;
    setCatAiGenerating(activeCatForAi.id);
    try {
      // 1. Leer config del contexto
      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model, credits_per_use, use_reference_images')
        .eq('context', 'category_cards')
        .maybeSingle();

      const model = ctxSettings?.ai_model ?? 'gpt-image-1.5';
      const creditsPerUse = ctxSettings?.credits_per_use ?? 2;
      const useRefs = ctxSettings?.use_reference_images ?? true;

      // 2. Chequear créditos
      const { data: creditRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'ai_image_credits')
        .maybeSingle();
      const available = parseInt(creditRow?.value || '0', 10);
      if (available < creditsPerUse) {
        alert(`Sin créditos de IA (disponibles: ${available}, requeridos: ${creditsPerUse}). Recargá desde /admin.`);
        return;
      }

      // 3. Armar prompt maestro
      const { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('context', 'category_cards')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      const basePrompt = (blocks || []).map((b: any) => b.prompt_block).join('. ');
      const finalPrompt = `${basePrompt}. CATEGORY BEING GENERATED: "${activeCatForAi.name}". Create a category hero image specifically representing "${activeCatForAi.name}" products for a pet store.`;

      // 4. Armar FormData
      const fd = new FormData();
      const selectedProducts = catProducts.filter(p => selectedProductIds.includes(p.id));

      if (useRefs && selectedProducts.length > 0) {
        // Modo edit: primer producto como base, resto como referencias
        fd.append('mode', 'edit');
        fd.append('imageUrl', selectedProducts[0].uploaded_image_url || selectedProducts[0].image_url);
        if (selectedProducts.length > 1) {
          fd.append('referenceImageUrls', JSON.stringify(
            selectedProducts.slice(1).map(p => p.uploaded_image_url || p.image_url).filter(Boolean)
          ));
        }
      } else {
        // Modo generate: sin imagen base
        fd.append('mode', 'generate');
      }

      fd.append('prompt', finalPrompt);
      fd.append('quality', 'medium');
      fd.append('model', model);
      fd.append('size', '1536x1024');

      // 5. Llamar a /api/ai-image
      const res = await fetch('/api/ai-image', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const result = await res.json();

      // El API route devuelve { b64: "...", mode, model, ... }
      // Convertir base64 → Blob → objectURL para mostrarlo en el modal
      let improvedUrl = result?.images?.[0] || result?.url || result?.data?.[0]?.url || '';
      let improvedFile: File | null = null;

      if (!improvedUrl && result?.b64) {
        try {
          const binaryStr = atob(result.b64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/png' });
          improvedFile = new File([blob], 'generated.png', { type: 'image/png' });
          improvedUrl = URL.createObjectURL(blob);
        } catch (convErr) {
          console.error('Error convirtiendo b64 a objectURL:', convErr);
        }
      }

      if (!improvedUrl) throw new Error('No se recibió imagen de la IA');

      // 6. Mostrar modal de revisión
      setCatAiReviewOriginalUrl(activeCatForAi.image_url || '');
      setCatAiReviewImprovedUrl(improvedUrl);
      setCatAiReviewFile(improvedFile);
      setCatAiReviewOpen(true);

    } catch (err: any) {
      alert('Error generando imagen: ' + (err.message || 'desconocido'));
    } finally {
      setCatAiGenerating(null);
    }
  };

  const handleCatAiAccept = async (file?: File | null) => {
    if (!activeCatForAi) return;
    setCatAiReviewRetrying(false);
    try {
      // Obtener el blob fuente — chequeo explícito de tipo en vez de ??
      let srcBlob: Blob | null = null;

      if (file instanceof Blob) {
        srcBlob = file;
      } else if (catAiReviewFile instanceof Blob) {
        srcBlob = catAiReviewFile;
      } else {
        try {
          const r = await fetch(catAiReviewImprovedUrl);
          srcBlob = await r.blob();
        } catch {
          throw new Error('No se pudo obtener la imagen generada');
        }
      }

      if (!srcBlob) throw new Error('No se pudo obtener la imagen generada');

      // Convertir a WebP vía Módulo 1
      let finalBlob: Blob;
      try {
        const webpRes = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': srcBlob.type || 'image/png' },
          body: srcBlob,
        });
        finalBlob = webpRes.ok ? await webpRes.blob() : srcBlob;
      } catch {
        finalBlob = srcBlob;
      }

      // Subir a Storage
      const fileName = `categories/category-${activeCatForAi.id}-ai-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, finalBlob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

      // Guardar URL en categories
      const { error: dbError } = await supabase
        .from('categories')
        .update({ image_url: urlData.publicUrl })
        .eq('id', activeCatForAi.id);
      if (dbError) throw dbError;

      // Descontar créditos
      const { data: creditRow } = await supabase
        .from('settings').select('value').eq('key', 'ai_image_credits').maybeSingle();
      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings').select('credits_per_use')
        .eq('context', 'category_cards').maybeSingle();
      const newCredits = Math.max(
        0,
        parseInt(creditRow?.value || '0', 10) - (ctxSettings?.credits_per_use ?? 2)
      );
      await supabase.from('settings')
        .update({ value: String(newCredits) })
        .eq('key', 'ai_image_credits');

      // Cerrar y refrescar
      setCatAiReviewOpen(false);
      setCatProductsPanelId(null);
      fetchCategories();
      alert(`✅ Imagen de "${activeCatForAi.name}" actualizada.`);
    } catch (err: any) {
      alert('Error guardando imagen: ' + (err.message || 'desconocido'));
    }
  };

  const handleCatAiRetry = async (correctionPrompt: string, retryFile: File | null = null) => {
    if (!activeCatForAi) return;
    setCatAiReviewRetrying(true);
    try {
      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model')
        .eq('context', 'category_cards')
        .maybeSingle();
      const model = ctxSettings?.ai_model ?? 'gpt-image-1.5';

      const fd = new FormData();
      fd.append('mode', 'edit');
      if (retryFile) {
        // El modal nos pasó el file directamente
        fd.append('image', retryFile, 'retry.png');
      } else if (catAiReviewFile) {
        // Usamos el File que generamos del b64 original
        fd.append('image', catAiReviewFile, 'retry.png');
      } else {
        // Fallback: URL http (funciona si el primer resultado era una URL real, no b64)
        fd.append('imageUrl', catAiReviewImprovedUrl);
      }
      fd.append('prompt', correctionPrompt);
      fd.append('quality', 'medium');
      fd.append('model', model);
      fd.append('size', '1536x1024');

      const res = await fetch('/api/ai-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = await res.json();
      const newUrl = result?.images?.[0] || result?.url || result?.data?.[0]?.url || '';
      if (!newUrl) throw new Error('Sin imagen en la respuesta');

      setCatAiReviewImprovedUrl(newUrl);
      setCatAiReviewFile(null);
    } catch (err: any) {
      alert('Error al reintentar: ' + (err.message || 'desconocido'));
    } finally {
      setCatAiReviewRetrying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 font-sans text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categorías</h2>
          <p className="text-gray-500 text-sm">Organización del catálogo</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vista lista"
            >
              ☰ Lista
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                viewMode === 'tree' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vista árbol"
            >
              🌳 Árbol
            </button>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Nueva Categoría
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg flex flex-col sm:flex-row gap-3 border border-gray-200 items-start sm:items-center">
          <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
            />
            <select
              value={newType}
              onChange={(e) => {
                const type = e.target.value;
                setNewType(type);
                if (type !== 'specific' && type !== 'sub_specific' && type !== 'detail') setParentCategoryId(null);
              }}
              className="px-3 py-2 rounded-md border border-gray-300 focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-white"
            >
              {categoryTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {(newType === 'specific' || newType === 'sub_specific' || newType === 'detail') && (
              <select
                value={parentCategoryId || ''}
                onChange={(e) => setParentCategoryId(e.target.value || null)}
                className="px-3 py-2 rounded-md border border-[#1A8A00] focus:ring-1 focus:ring-[#1A8A00] outline-none text-sm bg-white"
              >
                <option value="">-- Vincular a {
                  newType === 'specific' ? 'General' :
                  newType === 'sub_specific' ? 'Específica' :
                  'Sub-específica'
                } --</option>
                {categories.filter(c => c.type === (
                  newType === 'specific' ? 'general' :
                  newType === 'sub_specific' ? 'specific' :
                  'sub_specific'
                )).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleAdd} className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium">Guardar</button>
            <button onClick={() => setIsAdding(false)} className="flex-1 sm:flex-none bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 text-sm font-medium">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-md w-full"></div>)}
        </div>
      ) : (
        <>
          {viewMode === 'list' && (
            <div className="space-y-8">
              {categoryTypes.map(type => {
                const filteredCats = categories.filter(c => (c.type || 'general') === type.id);
                if (filteredCats.length === 0 && !isAdding) return null;

                return (
                  <div key={type.id} className="space-y-3">
                    <h3 className="text-sm font-bold text-[#1A8A00] uppercase tracking-wider border-b pb-1">{type.label}</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredCats.map((cat) => (
                        <React.Fragment key={cat.id}>
                          <div className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow gap-2">
                            {editingId === cat.id ? (
                              <div className="flex-1 flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-sm"
                                  />
                                  <button onClick={() => handleUpdate(cat.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded"><Save size={16} /></button>
                                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-50 p-1.5 rounded"><X size={16} /></button>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <select
                                    value={newType}
                                    onChange={(e) => {
                                      const type = e.target.value;
                                      setNewType(type);
                                      if (type !== 'specific' && type !== 'sub_specific' && type !== 'detail') setParentCategoryId(null);
                                    }}
                                    className="w-full px-2 py-1 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-xs bg-white"
                                  >
                                    {categoryTypes.map(t => (
                                      <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                  </select>
                                  {(newType === 'specific' || newType === 'sub_specific' || newType === 'detail') && (
                                    <select
                                      value={parentCategoryId || ''}
                                      onChange={(e) => setParentCategoryId(e.target.value || null)}
                                      className="w-full px-2 py-1 rounded border border-[#1A8A00] focus:ring-1 focus:ring-[#1A8A00] text-xs bg-white"
                                    >
                                      <option value="">-- Vincular a {
                                        newType === 'specific' ? 'General' :
                                        newType === 'sub_specific' ? 'Específica' :
                                        'Sub-específica'
                                      } --</option>
                                      {categories.filter(c => c.type === (
                                        newType === 'specific' ? 'general' :
                                        newType === 'sub_specific' ? 'specific' :
                                        'sub_specific'
                                      )).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium text-gray-800 text-sm">{cat.name}</span>
                                  {((cat.type as string) === 'specific' || (cat.type as string) === 'sub_specific' || (cat.type as string) === 'detail') && cat.parent_id && (
                                    <span className="text-[10px] text-[#1A8A00] font-bold uppercase block mt-1">
                                      ↳ {categories.find(c => c.id === cat.parent_id)?.name || 'Padre no encontrada'}
                                      {(cat.type as string) === 'sub_specific' && (
                                        <>
                                          {' '}
                                          <span className="text-gray-400 normal-case font-normal">(Específica)</span>
                                        </>
                                      )}
                                      {(cat.type as string) === 'detail' && (
                                        <>
                                          {' '}
                                          <span className="text-gray-400 normal-case font-normal">(Sub-específica)</span>
                                        </>
                                      )}
                                    </span>
                                  )}

                                  {/* Imagen — solo para categorías generales */}
                                  {cat.type === 'general' && (
                                    <div className="flex items-center gap-2 mt-2">
                                      {cat.image_url ? (
                                        <img
                                          src={cat.image_url}
                                          alt={cat.name}
                                          className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                                          <span className="text-[8px] text-gray-400 text-center leading-tight">Sin<br/>img</span>
                                        </div>
                                      )}
                                      <label className="cursor-pointer flex-shrink-0">
                                        {uploadingImageId === cat.id ? (
                                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <Loader2 size={10} className="animate-spin" /> Subiendo...
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-blue-600 hover:underline">
                                            {cat.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                                          </span>
                                        )}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={uploadingImageId === cat.id}
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(cat.id, file);
                                            e.target.value = '';
                                          }}
                                        />
                                      </label>
                                      {cat.type === 'general' && (
                                        <>
                                          <button
                                            onClick={() => { setActiveCatForAi(cat); setCatAiConfigOpen(true); }}
                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Configurar prompts IA para tarjetas de categoría"
                                          >
                                            <Settings2 size={14} />
                                          </button>
                                          <button
                                            onClick={() => handleOpenCatAiPanel(cat)}
                                            disabled={catAiGenerating === cat.id}
                                            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-lg border transition-colors flex-shrink-0 ${
                                              catProductsPanelId === cat.id
                                                ? 'bg-purple-100 border-purple-300 text-purple-800'
                                                : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                                            }`}
                                            title="Generar imagen con IA"
                                          >
                                            {catAiGenerating === cat.id
                                              ? <Loader2 size={12} className="animate-spin" />
                                              : <Sparkles size={12} />}
                                            {catAiGenerating === cat.id ? 'Generando...' : '✨ IA'}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Badge de conteo + toggle de visibilidad — solo para generales */}
                                {cat.type === 'general' && (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {productCounts[cat.id] !== undefined && (
                                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {productCounts[cat.id].toLocaleString('es-PY')} prods.
                                      </span>
                                    )}
                                    <label
                                      className="flex items-center gap-1.5 cursor-pointer"
                                      onClick={e => e.stopPropagation()}
                                      title={cat.is_visible !== false ? 'Visible en el sitio' : 'Oculta en el sitio'}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={cat.is_visible !== false}
                                        onChange={async (e) => {
                                          const val = e.target.checked;
                                          await supabase
                                            .from('categories')
                                            .update({ is_visible: val })
                                            .eq('id', cat.id);
                                          setCategories((prev: any[]) =>
                                            prev.map((c: any) =>
                                              c.id === cat.id ? { ...c, is_visible: val } : c
                                            )
                                          );
                                        }}
                                        className="w-3.5 h-3.5 rounded border-gray-300 accent-[#166534] cursor-pointer"
                                      />
                                      <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap select-none">
                                        Mostrar
                                      </span>
                                    </label>
                                  </div>
                                )}

                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingId(cat.id);
                                      setNewName(cat.name);
                                      setNewType(cat.type || 'general');
                                      setParentCategoryId(cat.parent_id || null);
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(cat.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {cat.type === 'general' && catProductsPanelId === cat.id && (
                            <div className="mt-2 mb-1 border border-purple-200 rounded-xl bg-purple-50/40 p-4 col-span-full">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                    ✨ Generar imagen para: <span className="text-purple-700">{cat.name}</span>
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    Seleccioná hasta 5 productos como referencia visual para la IA.
                                    {selectedProductIds.length === 0 && ' Si no elegís ninguno, se genera solo con el prompt.'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setCatProductsPanelId(null)}
                                  className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              {catProductsLoading ? (
                                <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                                  <Loader2 size={14} className="animate-spin" /> Cargando productos...
                                </div>
                              ) : catProducts.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">
                                  No hay productos activos con imagen en esta categoría todavía.
                                </p>
                              ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4 max-h-40 overflow-y-auto">
                                  {catProducts.map(p => {
                                    const imgUrl = p.uploaded_image_url || p.image_url;
                                    const isSelected = selectedProductIds.includes(p.id);
                                    return (
                                      <button
                                        key={p.id}
                                        onClick={() => {
                                          setSelectedProductIds(prev =>
                                            isSelected
                                              ? prev.filter(id => id !== p.id)
                                              : prev.length < 5 ? [...prev, p.id] : prev
                                          );
                                        }}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                          isSelected
                                            ? 'border-purple-500 ring-2 ring-purple-300'
                                            : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                        title={p.public_name || p.name}
                                      >
                                        <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                                        {isSelected && (
                                          <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                                            <span className="text-white font-black text-lg">✓</span>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-3 border-t border-purple-200">
                                <button
                                  onClick={handleGenerateCategoryImage}
                                  disabled={catAiGenerating === cat.id}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-40"
                                >
                                  {catAiGenerating === cat.id
                                    ? <><Loader2 size={13} className="animate-spin" /> Generando...</>
                                    : <><Sparkles size={13} /> Generar imagen</>}
                                </button>
                                <p className="text-[10px] text-gray-400">
                                  {selectedProductIds.length > 0
                                    ? `${selectedProductIds.length} producto${selectedProductIds.length > 1 ? 's' : ''} seleccionado${selectedProductIds.length > 1 ? 's' : ''} como referencia`
                                    : 'Sin referencia visual — generación solo por prompt'}
                                </p>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                      {filteredCats.length === 0 && (
                        <p className="col-span-full text-xs text-gray-400 italic">Sin categorías de este tipo.</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && !isAdding && (
                <p className="text-center py-10 text-gray-400 text-sm">No hay categorías registradas.</p>
              )}
            </div>
          )}

          {viewMode === 'tree' && (
            <CategoryTreeView
              categories={categories}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
              onEdit={(cat) => {
                setEditingId(cat.id);
                setNewName(cat.name);
                setNewType(cat.type || 'general');
                setParentCategoryId(cat.parent_id || null);
              }}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      <AIPromptConfigModal
        open={catAiConfigOpen}
        onClose={() => setCatAiConfigOpen(false)}
        context="category_cards"
        contextLabel="Tarjetas de Categoría"
      />

      <AIImageReviewModal
        open={catAiReviewOpen}
        onClose={() => setCatAiReviewOpen(false)}
        originalUrl={catAiReviewOriginalUrl}
        improvedUrl={catAiReviewImprovedUrl}
        onAccept={handleCatAiAccept}
        onRetry={handleCatAiRetry}
        isRetrying={catAiReviewRetrying}
      />
    </div>
  );
}
