'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, Product, Category, assertNoBase64 } from '../../lib/supabase';
import { Edit, Trash2, ChevronDown, ChevronUp, X, Save, Loader2, Users, Upload, Sparkles, Settings2, X as XIcon } from 'lucide-react';
import { generateSlug } from '../../lib/urlSlug';
import { toTitleCase } from '../../lib/textFormat';
import { handleFormattedPaste } from '../../lib/richTextPaste';
import AIImageReviewModal from './AIImageReviewModal';
import AIPromptConfigModal from './AIPromptConfigModal';
import LazyHoverImage from './LazyHoverImage';
import { detectBoxPresentation } from '../../lib/boxPresentation';

type GruposPanelProps = {
  products: Product[];
  onUpdate: () => void;
  categories: Category[];
};

type GrupoWithChildren = Product & {
  children: Product[];
};

async function createImageCollage(imageUrls: string[]): Promise<File> {
  const urls = imageUrls.filter(Boolean).slice(0, 4);
  const canvas = document.createElement('canvas');
  const cellSize = 512;
  const cols = urls.length <= 2 ? urls.length : 2;
  const rows = Math.ceil(urls.length / cols);
  canvas.width = cellSize * cols;
  canvas.height = cellSize * rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  for (let i = 0; i < urls.length; i++) {
    try {
      const img = await loadImage(urls[i]);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellSize;
      const y = row * cellSize;
      
      const padding = 30;
      const availSize = cellSize - padding * 2;
      const scale = Math.min(availSize / img.width, availSize / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = x + (cellSize - drawW) / 2;
      const drawY = y + (cellSize - drawH) / 2;
      
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } catch {
      // Si una imagen falla en cargar, dejar la celda en blanco
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], 'collage.png', { type: 'image/png' }));
      }
    }, 'image/png');
  });
}

export default function GruposPanel({ products, onUpdate, categories }: GruposPanelProps) {
  const [grupos, setGrupos] = useState<GrupoWithChildren[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);
  const [isGeneratingEnhanced, setIsGeneratingEnhanced] = useState<string | null>(null);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [variantLabelEdits, setVariantLabelEdits] = useState<Record<string, string>>({});

  const [uploadingChildImageId, setUploadingChildImageId] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  const [togglingParentActiveId, setTogglingParentActiveId] = useState<string | null>(null);
  const [improvingChildId, setImprovingChildId] = useState<string | null>(null);
  const [childAiReviewOpen, setChildAiReviewOpen] = useState(false);
  const [childAiReviewChildId, setChildAiReviewChildId] = useState<string | null>(null);
  const [childAiReviewOriginalUrl, setChildAiReviewOriginalUrl] = useState('');
  const [childAiReviewImprovedUrl, setChildAiReviewImprovedUrl] = useState('');
  const [childAiReviewFile, setChildAiReviewFile] = useState<File | null>(null);
  const [childAiReviewRetrying, setChildAiReviewRetrying] = useState(false);

  const [groupImagePreview, setGroupImagePreview] = useState<string>('');
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [groupImageRemoved, setGroupImageRemoved] = useState(false);
  const [isImprovingGroupImage, setIsImprovingGroupImage] = useState(false);
  const [groupAiCredits, setGroupAiCredits] = useState<number>(0);
  const [groupAiReviewOpen, setGroupAiReviewOpen] = useState(false);
  const [groupAiReviewOriginal, setGroupAiReviewOriginal] = useState('');
  const [groupAiReviewImproved, setGroupAiReviewImproved] = useState('');
  const [groupAiReviewFile, setGroupAiReviewFile] = useState<File | null>(null);
  const [groupAiRetrying, setGroupAiRetrying] = useState(false);
  const [applyBrandSeal, setApplyBrandSeal] = useState(false);
  const [groupImageProgress, setGroupImageProgress] = useState<{
    open: boolean; label: string; step: number; totalSteps: number;
  }>({ open: false, label: '', step: 0, totalSteps: 0 });

  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [groupStockFilter, setGroupStockFilter] = useState<'all' | 'with_stock' | 'without_stock'>('all');

  const filteredGrupos = grupos.filter(g => {
    const matchSearch = !groupSearchTerm ||
      g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
      g.url_slug?.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
      g.children.some(c => c.name.toLowerCase().includes(groupSearchTerm.toLowerCase()));

    const hasStock = g.children.some(c => (c.stock || 0) > 0);
    const matchStock =
      groupStockFilter === 'all' ? true :
      groupStockFilter === 'with_stock' ? hasStock :
      !hasStock;

    return matchSearch && matchStock;
  });

  const [useChildrenContext, setUseChildrenContext] = useState(false);

  const [childSearchTerm, setChildSearchTerm] = useState('');
  const [boxSearch, setBoxSearch] = useState('');
  const [boxSearchResults, setBoxSearchResults] = useState<any[]>([]);
  const [boxAddingSaving, setBoxAddingSaving] = useState<string | null>(null);
  const [addingChildId, setAddingChildId] = useState<string | null>(null);
  const [removingChildId, setRemovingChildId] = useState<string | null>(null);

  const availableToAdd = products.filter(p =>
    !p.is_parent &&
    !p.parent_product_id &&
    (childSearchTerm === '' ||
      p.name.toLowerCase().includes(childSearchTerm.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(childSearchTerm.toLowerCase()))
  ).slice(0, 20);

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'ai_image_credits').maybeSingle()
      .then(({ data }) => setGroupAiCredits(parseInt(data?.value || '0', 10) || 0));
  }, []);

  // Construir grupos con sus hijos
  useEffect(() => {
    const parents = products.filter(p => p.is_parent);
    const children = products.filter(p => p.parent_product_id);

    const gruposWithChildren: GrupoWithChildren[] = parents.map(parent => ({
      ...parent,
      children: children
        .filter(c => c.parent_product_id === parent.id)
        .sort((a, b) => (a.price || 0) - (b.price || 0)),
    }));

    // Ordenar grupos por nombre
    gruposWithChildren.sort((a, b) => a.name.localeCompare(b.name));
    setGrupos(gruposWithChildren);
  }, [products]);

  const handleEdit = (grupo: GrupoWithChildren) => {
    setEditingId(grupo.id);
    setGroupImagePreview(grupo.uploaded_image_url || grupo.image_url || '');
    setGroupImageFile(null);
    setGroupImageRemoved(false);
    setUseChildrenContext(false);
    setEditForm({
      name: grupo.name,
      url_slug: grupo.url_slug,
      description: grupo.description || '',
      description_ai_enhanced: grupo.description_ai_enhanced || '',
      seo_title: grupo.seo_title || '',
      seo_description: grupo.seo_description || '',
      // Categorías: unión de TODAS las categorías de los hijos
      category_general: Array.from(new Set(grupo.children.flatMap(c => c.category_general || []))),
      category_specific: Array.from(new Set(grupo.children.flatMap(c => c.category_specific || []))),
      category_sub_specific: Array.from(new Set(grupo.children.flatMap(c => {
        if (!c.category_sub_specific) return [];
        if (Array.isArray(c.category_sub_specific)) return c.category_sub_specific;
        const s = String(c.category_sub_specific).trim();
        if (s === '[]' || s === 'null' || s === '""') return [];
        return s.split(',').map(item => item.trim()).filter(Boolean);
      }))),
      category_detail: Array.from(new Set(grupo.children.flatMap(c => c.category_detail || []))),
      tags: Array.from(new Set(grupo.children.flatMap(c => c.tags || []))),
    });

    const initialLabels: Record<string, string> = {};
    grupo.children.forEach(c => {
      initialLabels[c.id] = c.variant_label || '';
    });
    setVariantLabelEdits(initialLabels);
  };

  const handleImproveGroupImageWithAI = async (grupo: GrupoWithChildren) => {
    const { data: ctxRefSettings } = await supabase
      .from('ai_image_context_settings')
      .select('use_reference_images, ai_model, credits_per_use')
      .eq('context', 'groups')
      .maybeSingle();
    const creditsNeeded = ctxRefSettings?.credits_per_use ?? 1;

    if (groupAiCredits < creditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${groupAiCredits}.`);
      return;
    }

    setIsImprovingGroupImage(true);
    try {
      let sourceFile: File;
      let promptSuffix = '';

      if (useChildrenContext && grupo.children.length > 0) {
        const childImageUrls = grupo.children
          .map(c => c.uploaded_image_url || c.image_url || '')
          .filter(Boolean)
          .slice(0, 4);
        
        if (childImageUrls.length === 0) {
          alert('Las variantes no tienen imágenes para usar como referencia.');
          setIsImprovingGroupImage(false);
          return;
        }
        
        sourceFile = await createImageCollage(childImageUrls);
        promptSuffix = '. The reference image shows multiple package size variants of the same product side by side. Generate ONE unified, professional product photo that represents the product line as a whole — NOT a collage, a single clean hero shot suitable as the main image for the product group.';
      } else if (groupImageFile) {
        sourceFile = groupImageFile;
      } else if (groupImagePreview && !groupImageRemoved) {
        const res = await fetch(groupImagePreview);
        const blob = await res.blob();
        sourceFile = new File([blob], 'group-image.png', { type: blob.type || 'image/png' });
      } else {
        alert('No hay imagen para procesar. Subí una imagen o activá el contexto de variantes.');
        setIsImprovingGroupImage(false);
        return;
      }

      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'groups')
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
      
      prompt += promptSuffix;

      const shouldUseRefImages = ctxRefSettings?.use_reference_images ?? true;
      const selectedModel = ctxRefSettings?.ai_model ?? 'gpt-image-1.5';

      let referenceImageUrlsToSend: string[] = [];
      if (shouldUseRefImages) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'groups')
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
      form.append('image', sourceFile);

      if (referenceImageUrlsToSend.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrlsToSend));
      }

      form.append('model', selectedModel);

      const apiRes = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await apiRes.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const newBlob = new Blob([ab], { type: 'image/png' });
      const newFile = new File([newBlob], `group-ai-${Date.now()}.png`, { type: 'image/png' });

      setGroupAiReviewOriginal(useChildrenContext ? URL.createObjectURL(sourceFile) : groupImagePreview);
      setGroupAiReviewImproved(URL.createObjectURL(newFile));
      setGroupAiReviewFile(newFile);
      setGroupAiReviewOpen(true);

      const newCredits = Math.max(0, groupAiCredits - creditsNeeded);
      await supabase.from('settings').update({ value: String(newCredits), updated_at: new Date().toISOString() }).eq('key', 'ai_image_credits');
      setGroupAiCredits(newCredits);
    } catch (err: any) {
      alert('Error al mejorar imagen: ' + (err.message || 'desconocido'));
    } finally {
      setIsImprovingGroupImage(false);
    }
  };

  const handleGroupAiRetry = async (corrections: string) => {
    if (!groupAiReviewFile) return;

    const { data: ctxRefSettings } = await supabase
      .from('ai_image_context_settings')
      .select('use_reference_images, ai_model, credits_per_use')
      .eq('context', 'groups')
      .maybeSingle();
    const creditsNeeded = ctxRefSettings?.credits_per_use ?? 1;

    if (groupAiCredits < creditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${groupAiCredits}.`);
      return;
    }

    setGroupAiRetrying(true);
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'groups')
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
        : 'Professional e-commerce product photo, pure white background, centered';
      prompt = `${prompt}. IMPORTANT corrections from user: ${corrections}`;

      const shouldUseRefImages = ctxRefSettings?.use_reference_images ?? true;
      const selectedModel = ctxRefSettings?.ai_model ?? 'gpt-image-1.5';

      let referenceImageUrlsToSend: string[] = [];
      if (shouldUseRefImages) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'groups')
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
      form.append('image', groupAiReviewFile);

      if (referenceImageUrlsToSend.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrlsToSend));
      }

      form.append('model', selectedModel);

      const apiRes = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await apiRes.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const newBlob = new Blob([ab], { type: 'image/png' });
      const newFile = new File([newBlob], `group-ai-retry-${Date.now()}.png`, { type: 'image/png' });

      setGroupAiReviewFile(newFile);
      setGroupAiReviewImproved(URL.createObjectURL(newFile));

      const newCredits = Math.max(0, groupAiCredits - creditsNeeded);
      await supabase.from('settings').update({ value: String(newCredits), updated_at: new Date().toISOString() }).eq('key', 'ai_image_credits');
      setGroupAiCredits(newCredits);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'desconocido'));
    } finally {
      setGroupAiRetrying(false);
    }
  };

  const handleGroupAiAccept = async () => {
    if (!groupAiReviewFile) {
      setGroupAiReviewOpen(false);
      return;
    }

    let finalFile = groupAiReviewFile;

    if (applyBrandSeal) {
      try {
        const form = new FormData();
        form.append('image', groupAiReviewFile);
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

    setGroupImageFile(finalFile);
    setGroupImagePreview(URL.createObjectURL(finalFile));
    setGroupImageRemoved(false);
    setGroupAiReviewOpen(false);
    setGroupAiReviewFile(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      let finalImageUrl: string | null | undefined = undefined;
      let finalUploadedUrl: string | null | undefined = undefined;

      if (groupImageRemoved) {
        finalImageUrl = null;
        finalUploadedUrl = null;
      } else if (groupImageFile) {
        setGroupImageProgress({ open: true, label: 'Optimizando a WebP...', step: 1, totalSteps: 2 });

        const webpRes = await fetch('/api/convert-to-webp', {
          method: 'POST',
          headers: { 'Content-Type': groupImageFile.type },
          body: groupImageFile,
        });

        if (!webpRes.ok) {
          throw new Error('No se pudo optimizar la imagen a WebP. La imagen NO se guardó — reintentá en unos segundos o probá con otra imagen.');
        }

        const webpBlob = await webpRes.blob();
        if (!webpBlob || !webpBlob.type.startsWith('image/')) {
          throw new Error('No se pudo optimizar la imagen a WebP. La imagen NO se guardó — reintentá en unos segundos o probá con otra imagen.');
        }

        setGroupImageProgress(prev => ({ ...prev, label: 'Subiendo imagen...', step: 2 }));

        const webpFileName = `group-${editingId}-${Date.now()}.webp`;
        const { error: webpUploadErr } = await supabase.storage
          .from('product-images')
          .upload(webpFileName, webpBlob, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });

        if (webpUploadErr) throw webpUploadErr;

        const { data: webpUrlData } = supabase.storage.from('product-images').getPublicUrl(webpFileName);
        finalUploadedUrl = webpUrlData.publicUrl;
        finalImageUrl = webpUrlData.publicUrl;

        setGroupImageProgress(prev => ({ ...prev, label: 'Guardando grupo...', step: 2, totalSteps: 2 }));
      }

      const updatePayload: any = {
        name: editForm.name?.trim() || '',
        public_name: editForm.name?.trim() || '',
        url_slug: editForm.url_slug?.trim() || generateSlug(editForm.name || ''),
        description: editForm.description?.trim() || null,
        description_ai_enhanced: editForm.description_ai_enhanced?.trim() || null,
        seo_title: editForm.seo_title?.trim() || null,
        seo_description: editForm.seo_description?.trim() || null,
        category_general: editForm.category_general || [],
        category_specific: editForm.category_specific || [],
        category_sub_specific: Array.isArray(editForm.category_sub_specific) && editForm.category_sub_specific.length > 0
          ? editForm.category_sub_specific.filter(Boolean).join(', ')
          : null,
        category_detail: editForm.category_detail || [],
        tags: editForm.tags || [],
      };

      // Si el grupo queda con categorías completas, marcarlo como categorizado
      // para que no aparezca como "Pendiente" en /owner/categorizar-productos
      if ((updatePayload.category_general?.length || 0) > 0 && (updatePayload.category_specific?.length || 0) > 0) {
        updatePayload.ai_categorized_at = new Date().toISOString();
      }

      if (finalImageUrl !== undefined) updatePayload.image_url = finalImageUrl;
      if (finalUploadedUrl !== undefined) updatePayload.uploaded_image_url = finalUploadedUrl;

      // Guardar variant_label de cada hijo si cambió
      const grupoActual = grupos.find(g => g.id === editingId);
      if (grupoActual) {
        const labelUpdates = grupoActual.children
          .map(c => ({
            id: c.id,
            oldLabel: c.variant_label || '',
            newLabel: (variantLabelEdits[c.id] ?? '').trim(),
          }))
          .filter(u => u.oldLabel !== u.newLabel);
        
        for (const u of labelUpdates) {
          await supabase
            .from('products')
            .update({ variant_label: u.newLabel || null })
            .eq('id', u.id);
        }
      }

      assertNoBase64(updatePayload);

      const { error } = await supabase.from('products').update(updatePayload).eq('id', editingId);
      if (error) throw error;

      setEditingId(null);
      setVariantLabelEdits({});
      setGroupImageFile(null);
      setGroupImageRemoved(false);
      onUpdate();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
      setGroupImageProgress({ open: false, label: '', step: 0, totalSteps: 0 });
    }
  };

  const handleUploadChildImage = async (child: Product, file: File) => {
    setUploadingChildImageId(child.id);
    try {
      const res = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('El servicio de optimización devolvió un error');
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('La conversión no devolvió una imagen válida');

      const fileName = `products/${child.id}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const { error: updErr } = await supabase
        .from('products')
        .update({ uploaded_image_url: urlData.publicUrl })
        .eq('id', child.id);
      if (updErr) throw updErr;

      onUpdate();
    } catch (err: any) {
      alert('Error al subir imagen: ' + (err.message || 'desconocido'));
    } finally {
      setUploadingChildImageId(null);
    }
  };

  const handleRemoveChildImage = async (child: Product) => {
    if (!confirm('¿Quitar la foto de este producto?')) return;
    try {
      await supabase.from('products').update({ uploaded_image_url: null }).eq('id', child.id);
      onUpdate();
    } catch (err: any) {
      alert('Error al quitar imagen: ' + (err.message || 'desconocido'));
    }
  };

  const handleImproveChildWithAI = async (child: Product) => {
    const childImage = child.uploaded_image_url || child.image_url;
    if (!childImage) {
      alert('Este producto no tiene imagen para mejorar. Subí una foto primero.');
      return;
    }
    setImprovingChildId(child.id);
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'products')
        .order('sort_order', { ascending: true });
      const prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Professional e-commerce product photo, white background, centered.';

      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model, use_reference_images, send_metadata, credits_per_use')
        .eq('context', 'products')
        .maybeSingle();

      const creditsNeeded = ctxSettings?.credits_per_use ?? 1;
      const { data: creditsRow } = await supabase
        .from('settings').select('value').eq('key', 'ai_image_credits').maybeSingle();
      const currentCredits = parseInt(creditsRow?.value || '0', 10);
      if (currentCredits < creditsNeeded) {
        alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${currentCredits}.`);
        setImprovingChildId(null);
        return;
       }

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('imageUrl', childImage);
      form.append('model', ctxSettings?.ai_model ?? 'gpt-image-1.5');

      if (ctxSettings?.send_metadata ?? true) {
        form.append('productMetadata', JSON.stringify({
          name: child.name,
          brand: child.category_brand,
          category_general: child.category_general,
          category_specific: child.category_specific,
          category_species: child.category_species,
          tags: child.tags,
        }));
      }

      if (ctxSettings?.use_reference_images ?? true) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'products')
          .order('sort_order', { ascending: true })
          .limit(2);
        if (refImgs && refImgs.length > 0) {
          form.append('referenceImageUrls', JSON.stringify(refImgs.map(r => r.image_url)));
        }
      }

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const aiBlob = new Blob([ab], { type: 'image/png' });
      const aiFile = new File([aiBlob], `child-improved-${Date.now()}.png`, { type: 'image/png' });

      setChildAiReviewOriginalUrl(childImage);
      setChildAiReviewImprovedUrl(URL.createObjectURL(aiFile));
      setChildAiReviewFile(aiFile);
      setChildAiReviewChildId(child.id);
      setChildAiReviewOpen(true);

      const newCredits = Math.max(0, currentCredits - creditsNeeded);
      await supabase.from('settings').update({ value: String(newCredits), updated_at: new Date().toISOString() }).eq('key', 'ai_image_credits');
    } catch (err: any) {
      alert('Error al mejorar con IA: ' + (err.message || 'desconocido'));
    } finally {
      setImprovingChildId(null);
    }
  };

  const handleChildAiAccept = async () => {
    if (!childAiReviewFile || !childAiReviewChildId) { setChildAiReviewOpen(false); return; }
    try {
      const res = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': childAiReviewFile.type },
        body: childAiReviewFile,
      });
      if (!res.ok) throw new Error('Error al optimizar');
      const optimized = await res.blob();
      if (!optimized.type.startsWith('image/')) throw new Error('Conversión inválida');

      const fileName = `products/${childAiReviewChildId}-ai-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, optimized, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      await supabase.from('products').update({ uploaded_image_url: urlData.publicUrl }).eq('id', childAiReviewChildId);

      setChildAiReviewOpen(false);
      setChildAiReviewFile(null);
      setChildAiReviewChildId(null);
      onUpdate();
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'desconocido'));
    }
  };

  const handleChildAiRetry = async (corrections: string) => {
    if (!childAiReviewFile) return;
    setChildAiReviewRetrying(true);
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'products')
        .order('sort_order', { ascending: true });
      let prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Professional e-commerce product photo, white background, centered.';
      prompt = `${prompt}. IMPORTANT corrections from user: ${corrections}`;

      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model')
        .eq('context', 'products')
        .maybeSingle();

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('image', childAiReviewFile);
      form.append('model', ctxSettings?.ai_model ?? 'gpt-image-1.5');

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const newBlob = new Blob([ab], { type: 'image/png' });
      const newFile = new File([newBlob], `child-retry-${Date.now()}.png`, { type: 'image/png' });

      setChildAiReviewFile(newFile);
      setChildAiReviewImprovedUrl(URL.createObjectURL(newFile));
    } catch (err: any) {
      alert('Error al reenviar: ' + (err.message || 'desconocido'));
    } finally {
      setChildAiReviewRetrying(false);
    }
  };

  function guessVariantLabelLocal(name: string): string {
    const match = name.match(/(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?)?\s*(?:KG|G|L|ML|CC|CM|MT|MTS|UN|UNIDADES?))/i);
    return match ? match[0].replace(/\s+/g, ' ').trim().toUpperCase() : '';
  }

  const handleAddChild = async (grupo: GrupoWithChildren, childProduct: Product) => {
    setAddingChildId(childProduct.id);
    try {
      const label = childProduct.variant_label || guessVariantLabelLocal(childProduct.name);
      const { error } = await supabase
        .from('products')
        .update({
          parent_product_id: grupo.id,
          is_parent: false,
          variant_label: label || null,
        })
        .eq('id', childProduct.id);
      if (error) throw error;
      onUpdate();
      setChildSearchTerm('');
    } catch (err: any) {
      alert('Error al agregar: ' + err.message);
    } finally {
      setAddingChildId(null);
    }
  };

  const handleToggleChildActive = async (child: Product) => {
    setTogglingActiveId(child.id);
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !child.active })
        .eq('id', child.id);
      if (error) throw error;
      onUpdate();
    } catch (err: any) {
      alert('Error al cambiar estado: ' + (err.message || 'desconocido'));
    } finally {
      setTogglingActiveId(null);
    }
  };

  const handleToggleParentActive = async (grupo: GrupoWithChildren) => {
    setTogglingParentActiveId(grupo.id);
    const newActive = !grupo.active;
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: newActive })
        .eq('id', grupo.id);
      if (error) throw error;
      
      setGrupos(prev => prev.map(g => g.id === grupo.id ? { ...g, active: newActive } : g));
      onUpdate();
    } catch (err: any) {
      alert('Error al cambiar estado del grupo: ' + (err.message || 'desconocido'));
    } finally {
      setTogglingParentActiveId(null);
    }
  };

  const handleRemoveChild = async (child: Product) => {
    if (!confirm(`¿Quitar "${child.name}" de este grupo? Volverá a ser un producto independiente.`)) return;
    setRemovingChildId(child.id);
    try {
      const { error } = await supabase
        .from('products')
        .update({ parent_product_id: null, variant_label: null })
        .eq('id', child.id);
      if (error) throw error;
      onUpdate();
    } catch (err: any) {
      alert('Error al quitar: ' + err.message);
    } finally {
      setRemovingChildId(null);
    }
  };

  const handleDelete = async (grupo: GrupoWithChildren) => {
    if (!confirm(
      `¿Eliminar el grupo "${grupo.name}"?\n\n` +
      `Sus ${grupo.children.length} variantes quedarán como productos independientes.`
    )) return;

    // Desvincular hijos primero
    await supabase.from('products')
      .update({ parent_product_id: null, variant_label: null })
      .eq('parent_product_id', grupo.id);

    // Eliminar el contenedor padre
    await supabase.from('products').delete().eq('id', grupo.id);
    onUpdate();
  };

  const handleGenerateDescription = async (grupo: GrupoWithChildren) => {
    setGenerating(grupo.id);
    try {
      // Preparar contexto con los datos de TODOS los hijos
      const childrenContext = grupo.children.map(c => ({
        name: c.name,
        public_name: c.public_name,
        category_brand: c.category_brand,
        category_general: c.category_general,
        category_specific: c.category_specific,
        category_sub_specific: c.category_sub_specific,
        category_species: c.category_species,
        category_age: c.category_age,
        category_condition: c.category_condition,
        is_prescription: c.is_prescription,
        tags: c.tags,
        variant_label: c.variant_label,
      }));

      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: grupo.name,
            public_name: grupo.name,
            category_brand: grupo.children[0]?.category_brand,
            category_general: Array.from(new Set(grupo.children.flatMap(c => c.category_general || []))),
            category_specific: Array.from(new Set(grupo.children.flatMap(c => c.category_specific || []))),
            category_species: Array.from(new Set(grupo.children.flatMap(c => c.category_species || []))),
            category_age: Array.from(new Set(grupo.children.flatMap(c => c.category_age || []))),
            category_condition: Array.from(new Set(grupo.children.flatMap(c => c.category_condition || []))),
            tags: Array.from(new Set(grupo.children.flatMap(c => c.tags || []))),
            _group_context: childrenContext,
          },
        }),
      });
      const data = await res.json();
      if (data.description) {
        setEditForm(prev => ({ ...prev, description: data.description }));
      }
    } catch (err: any) {
      alert('Error al generar descripción: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateEnhancedDescription = async (grupo: any) => {
    if (!editForm.description?.trim()) {
      alert('Completá o generá primero el campo "Descripción" antes de mejorarla.');
      return;
    }
    setIsGeneratingEnhanced(grupo.id);
    try {
      const res = await fetch('/api/generate-enhanced-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editForm.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setEditForm(prev => ({ ...prev, description_ai_enhanced: data.description_ai_enhanced }));
    } catch (err: any) {
      alert('Error al generar descripción mejorada: ' + (err.message || 'desconocido'));
    } finally {
      setIsGeneratingEnhanced(null);
    }
  };

  const handleSyncCategories = (grupo: GrupoWithChildren) => {
    setEditForm(prev => ({
      ...prev,
      category_general: Array.from(new Set(grupo.children.flatMap(c => c.category_general || []))),
      category_specific: Array.from(new Set(grupo.children.flatMap(c => c.category_specific || []))),
      category_sub_specific: Array.from(new Set(grupo.children.flatMap(c => {
        if (!c.category_sub_specific) return [];
        if (Array.isArray(c.category_sub_specific)) return c.category_sub_specific;
        const s = String(c.category_sub_specific).trim();
        if (s === '[]' || s === 'null' || s === '""') return [];
        return s.split(',').map(item => item.trim()).filter(Boolean);
      }))),
      category_detail: Array.from(new Set(grupo.children.flatMap(c => c.category_detail || []))),
      tags: Array.from(new Set(grupo.children.flatMap(c => c.tags || []))),
    }));
  };

  if (grupos.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
        <div className="text-6xl mb-4">🗂️</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">No hay grupos aún</h3>
        <p className="text-gray-500 text-sm">
          Seleccioná varios productos en la pestaña "Productos" y usá el botón "Agrupar".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={groupSearchTerm}
            onChange={e => setGroupSearchTerm(e.target.value)}
            placeholder="Buscar grupo por nombre, slug o variante..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          {groupSearchTerm && (
            <button
              onClick={() => setGroupSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={groupStockFilter}
          onChange={e => setGroupStockFilter(e.target.value as any)}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">Todos los grupos</option>
          <option value="with_stock">Con stock</option>
          <option value="without_stock">Sin stock</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{filteredGrupos.length}</span> grupos
          {groupSearchTerm || groupStockFilter !== 'all' ? ` (de ${grupos.length} totales)` : ''} · 
          <span className="font-bold text-gray-900 ml-1">
            {filteredGrupos.reduce((s, g) => s + g.children.length, 0)}
          </span> variantes
        </p>
      </div>

      {filteredGrupos.length === 0 && grupos.length > 0 && (
        <div className="text-center py-12 text-gray-400 mt-4 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <p className="text-sm">No se encontraron grupos con ese criterio.</p>
          <button
            onClick={() => { setGroupSearchTerm(''); setGroupStockFilter('all'); }}
            className="text-xs text-indigo-600 hover:underline mt-2 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {filteredGrupos.map(grupo => {
        const isEditing = editingId === grupo.id;
        const isExpanded = expandedIds.has(grupo.id);
        const parentImg = grupo.uploaded_image_url || grupo.image_url;
        const displayImg = parentImg || grupo.children[0]?.uploaded_image_url || grupo.children[0]?.image_url;
        const hasStock = grupo.children.some(c => (c.stock || 0) > 0);
        const totalStock = grupo.children.reduce((s, c) => s + (c.stock || 0), 0);

        return (
          <div
            key={grupo.id}
            className={`bg-white rounded-2xl border-2 transition-colors ${
              isEditing ? 'border-indigo-300 shadow-lg' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            {/* Header del grupo */}
            <div className="flex items-center gap-4 p-4">
              {/* Imagen */}
              <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                {displayImg ? (
                  <LazyHoverImage 
                    src={displayImg} 
                    alt={grupo.name}
                    className="w-full h-full"
                  />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900">
                    {toTitleCase(grupo.public_name || grupo.name)}
                  </h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                    hasStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {hasStock ? `Stock: ${totalStock}` : 'Sin stock'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleParentActive(grupo); }}
                    disabled={togglingParentActiveId === grupo.id}
                    className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                      grupo.active ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-300 focus:ring-gray-400'
                    }`}
                    title={grupo.active ? 'Grupo activo — click para desactivar' : 'Grupo inactivo — click para activar'}
                  >
                    <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full shadow transition-transform ${
                      grupo.active ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">{grupo.url_slug}</p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Users size={10} /> {grupo.children.length} variante{grupo.children.length !== 1 ? 's' : ''}:
                  {' '}{grupo.children.map(c => c.variant_label || c.name).join(', ')}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpandedIds(prev => {
                    const next = new Set(prev);
                    next.has(grupo.id) ? next.delete(grupo.id) : next.add(grupo.id);
                    return next;
                  })}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Ver variantes"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => isEditing ? setEditingId(null) : handleEdit(grupo)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar grupo"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(grupo)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar grupo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Lista de variantes expandida */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Variantes</p>
                <div className="space-y-1.5">
                  {grupo.children.map(child => (
                    <div key={child.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="w-8 h-8 bg-white rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                        {(child.uploaded_image_url || child.image_url) ? (
                          <LazyHoverImage 
                            src={child.uploaded_image_url || child.image_url} 
                            alt=""
                            className="w-full h-full"
                          />
                        ) : <span className="text-xs">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{child.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {child.variant_label && <span className="text-indigo-600 font-bold mr-2">{child.variant_label}</span>}
                          Gs. {(child.price || 0).toLocaleString('es-PY')} · Stock: {child.stock || 0}
                        </p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${(child.stock || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {(child.stock || 0) > 0 ? 'Con stock' : 'Sin stock'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario de edición */}
            {isEditing && (
              <div className="border-t border-indigo-100 px-4 pb-4 pt-4 space-y-4 bg-indigo-50/30 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-indigo-900">Editar grupo</h4>
                  <button onClick={() => { setEditingId(null); setVariantLabelEdits({}); }} className="p-1 hover:bg-indigo-100 rounded">
                    <X size={14} className="text-indigo-600" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                      Imagen del grupo (opcional — si no se define, se usa la del primer hijo)
                    </label>
                    <div className="flex items-start gap-3 p-3 bg-white/60 border border-gray-100 rounded-xl">
                      <div className="relative w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {groupImagePreview && !groupImageRemoved ? (
                          <>
                            <img src={groupImagePreview} alt="" className="w-full h-full object-contain p-2" />
                            <button
                              type="button"
                              onClick={() => {
                                setGroupImagePreview('');
                                setGroupImageFile(null);
                                setGroupImageRemoved(true);
                              }}
                              className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all shadow-md z-10"
                              title="Eliminar imagen"
                            >
                              <XIcon size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="text-3xl text-gray-300">📦</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-colors w-fit">
                          <Upload size={12} /> Subir imagen
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setGroupImageFile(file);
                              setGroupImageRemoved(false);
                              setGroupImagePreview(URL.createObjectURL(file));
                            }}
                          />
                        </label>

                        <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useChildrenContext}
                            onChange={e => setUseChildrenContext(e.target.checked)}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          Usar imágenes de variantes como referencia
                        </label>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleImproveGroupImageWithAI(grupo)}
                            disabled={isImprovingGroupImage || groupAiCredits <= 0 || (!groupImagePreview && !useChildrenContext)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors w-fit"
                          >
                            {isImprovingGroupImage ? (
                              <><Loader2 size={12} className="animate-spin" /> Procesando...</>
                            ) : (
                              <><Sparkles size={12} /> Mejorar con IA</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiConfigOpen(true)}
                            className="p-1.5 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 rounded-md transition-colors"
                            title="Configurar prompts de IA para grupos"
                          >
                            <Settings2 size={12} />
                          </button>
                        </div>
                        <p className="text-[9px] text-gray-400">Créditos IA: {groupAiCredits}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estado del grupo */}
                  <div className="md:col-span-2 flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Estado del grupo</p>
                      <p className="text-[10px] text-gray-400">
                        Si está inactivo, el grupo completo (y todas sus variantes) desaparece del catálogo público,
                        aunque las variantes tengan stock.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleParentActive(grupo); }}
                      disabled={togglingParentActiveId === grupo.id}
                      className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
                        grupo.active ? 'bg-green-500 focus:ring-green-500' : 'bg-gray-300 focus:ring-gray-400'
                      }`}
                      title={grupo.active ? 'Grupo activo — click para desactivar' : 'Grupo inactivo — click para activar'}
                    >
                      <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full shadow transition-transform ${
                        grupo.active ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nombre del grupo</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm(prev => ({
                        ...prev,
                        name: e.target.value,
                        url_slug: generateSlug(e.target.value),
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">URL slug</label>
                    <input
                      type="text"
                      value={editForm.url_slug || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, url_slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-mono"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Descripción</label>
                      <button
                        onClick={() => handleGenerateDescription(grupo)}
                        disabled={generating === grupo.id}
                        className="text-[10px] px-2 py-1 bg-purple-600 text-white rounded font-bold disabled:opacity-50 flex items-center gap-1"
                      >
                        {generating === grupo.id ? <Loader2 size={10} className="animate-spin" /> : '✨'} Generar con IA
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={editForm.description || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      onPaste={(e) => handleFormattedPaste(e, (newValue) => 
                        setEditForm(prev => ({ ...prev, description: newValue }))
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-y"
                      placeholder="Descripción del grupo para la página pública..."
                    />

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">
                          Descripción mejorada con IA (HTML — tablas, negritas)
                        </label>
                        <button
                          type="button"
                          onClick={() => handleGenerateEnhancedDescription(grupo)}
                          disabled={isGeneratingEnhanced === grupo.id}
                          className="text-[10px] px-2 py-1 bg-indigo-600 text-white rounded font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          {isGeneratingEnhanced === grupo.id ? (
                            <><Loader2 size={10} className="animate-spin" /> Generando...</>
                          ) : (
                            <>🪄 Generar mejorada con IA</>
                          )}
                        </button>
                      </div>
                      <textarea
                        rows={5}
                        value={editForm.description_ai_enhanced || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, description_ai_enhanced: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-400 outline-none resize-y"
                        placeholder="Se genera con el botón de arriba a partir de la Descripción."
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Si tiene contenido, reemplaza a la descripción simple en la página del grupo.
                      </p>
                    </div>
                  </div>

                  {/* SEO — redirige al editor real, no duplica datos */}
                  <div className="md:col-span-2">
                    <a
                      href={`/owner/seo/edit/product/${grupo.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg text-sm font-bold text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      🔍 Editar SEO avanzado (título, descripción, IA) →
                    </a>
                  </div>

                  {/* Categorías (solo lectura pero syncable) */}
                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Categorías (de los hijos)</p>
                      <button
                        onClick={() => handleSyncCategories(grupo)}
                        className="text-[10px] px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold transition-colors"
                      >
                        🔄 Sincronizar de hijos
                      </button>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><span className="font-bold text-green-700">General:</span> {(editForm.category_general || []).join(', ') || '—'}</p>
                      <p><span className="font-bold text-blue-700">Específica:</span> {(editForm.category_specific || []).join(', ') || '—'}</p>
                      <p><span className="font-bold text-gray-500">Tags:</span> {(editForm.tags || []).join(', ') || '—'}</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">
                      Gestionar variantes ({grupo.children.length})
                    </p>
                    <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                      {grupo.children.map(child => (
                        <div key={child.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                          <div className="w-7 h-7 bg-white rounded overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                            {(child.uploaded_image_url || child.image_url) ? (
                              <LazyHoverImage 
                                src={child.uploaded_image_url || child.image_url} 
                                alt=""
                                className="w-full h-full"
                              />
                            ) : <span className="text-[10px]">📦</span>}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-medium text-gray-700 truncate">{child.name}</p>
                            <div className="flex items-center gap-1.5">
                              <label className="text-[9px] text-gray-400 font-bold uppercase">Etiqueta:</label>
                              <input
                                type="text"
                                value={variantLabelEdits[child.id] ?? (child.variant_label || '')}
                                onChange={e => setVariantLabelEdits(prev => ({ 
                                  ...prev, 
                                  [child.id]: e.target.value 
                                }))}
                                placeholder="Ej: 3KG, T0, M, 500ML..."
                                className="flex-1 px-2 py-0.5 text-[10px] border border-gray-200 rounded font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-400 outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <label
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded cursor-pointer transition-colors"
                              title="Subir foto"
                            >
                              {uploadingChildImageId === child.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Upload size={12} />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingChildImageId === child.id}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadChildImage(child, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {(child.uploaded_image_url || child.image_url) && (
                              <button
                                onClick={() => handleRemoveChildImage(child)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded transition-colors"
                                title="Quitar foto"
                              >
                                <X size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => handleImproveChildWithAI(child)}
                              disabled={improvingChildId === child.id || !(child.uploaded_image_url || child.image_url)}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Mejorar con IA (usa la configuración de Productos)"
                            >
                              {improvingChildId === child.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                            </button>
                          </div>
                          <button
                            onClick={() => handleToggleChildActive(child)}
                            disabled={togglingActiveId === child.id}
                            className={`text-[10px] px-2 py-1 rounded font-bold transition-colors disabled:opacity-50 ${
                              child.active ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-red-100 hover:bg-red-200 text-red-600'
                            }`}
                            title={child.active ? 'Click para desactivar' : 'Click para activar'}
                          >
                            {togglingActiveId === child.id ? '...' : (child.active ? 'Activo' : 'Inactivo')}
                          </button>
                          <button
                            onClick={() => handleRemoveChild(child)}
                            disabled={removingChildId === child.id}
                            className="text-[10px] px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded font-bold transition-colors disabled:opacity-50"
                          >
                            {removingChildId === child.id ? '...' : 'Quitar'}
                          </button>
                        </div>
                      ))}
                      {grupo.children.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-2">Sin variantes</p>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                        Agregar producto existente como variante
                      </label>
                      <input
                        type="text"
                        value={childSearchTerm}
                        onChange={e => setChildSearchTerm(e.target.value)}
                        placeholder="Buscar producto suelto por nombre o código..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none mb-2"
                      />
                      {childSearchTerm && (
                        <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-1.5 bg-gray-50">
                          {availableToAdd.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-3">
                              No se encontraron productos sueltos con ese término
                            </p>
                          ) : availableToAdd.map(p => (
                            <div key={p.id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5">
                              <div className="w-7 h-7 bg-gray-50 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {(p.uploaded_image_url || p.image_url) ? (
                                  <LazyHoverImage 
                                    src={p.uploaded_image_url || p.image_url} 
                                    alt=""
                                    className="w-full h-full"
                                  />
                                ) : <span className="text-[10px]">📦</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 truncate">{p.name}</p>
                                <p className="text-[10px] text-gray-400">Gs. {(p.price || 0).toLocaleString('es-PY')}</p>
                              </div>
                              <button
                                onClick={() => handleAddChild(grupo, p)}
                                disabled={addingChildId === p.id}
                                className="text-[10px] px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors disabled:opacity-50"
                              >
                                {addingChildId === p.id ? '...' : '+ Agregar'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agregar presentación de caja al grupo */}
                  <div className="md:col-span-2 border border-blue-200 bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">📦</span>
                      <h4 className="text-sm font-semibold text-blue-800">Crear y Agregar Presentación de Caja</h4>
                    </div>

                    <p className="text-xs text-blue-700 mb-4 leading-relaxed">
                      Buscá un producto suelto que tenga precios por volumen. El sistema detectará automáticamente si posee una presentación de caja (ej: Nivel 3) para que puedas crearla y agregarla a este grupo al instante.
                    </p>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={boxSearch}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setBoxSearch(val);
                          if (!val.trim()) {
                            setBoxSearchResults([]);
                            return;
                          }

                          // 1. Buscar productos sueltos
                          const { data: matchedProducts } = await supabase
                            .from('products')
                            .select('id, name, product_code, url_slug, price, cost, stock, category_brand, category_general, category_specific, category_sub_specific, category_detail, category_species, category_age, category_condition, tags, brand, location, image_url, uploaded_image_url, additional_images, public_name, description, description_ai_enhanced, parent_product_id, is_prescription, requires_prescription, local_only, requires_refrigeration')
                            .not('is_parent', 'eq', true)
                            .is('parent_product_id', 'null')
                            .ilike('name', `%${val}%`)
                            .limit(10);

                          if (!matchedProducts || matchedProducts.length === 0) {
                            setBoxSearchResults([]);
                            return;
                          }

                          // 2. Traer los volume_prices de estos productos
                          const productIds = matchedProducts.map(p => p.id);
                          const { data: prices } = await supabase
                            .from('volume_prices')
                            .select('id, product_id, price_level, min_qty, max_qty, price')
                            .in('product_id', productIds)
                            .order('price_level', { ascending: true });

                          // 3. Saneamiento y detección
                          const results = matchedProducts.map(p => {
                            const pPrices = prices?.filter(v => v.product_id === p.id) || [];
                            const detection = detectBoxPresentation(pPrices, p.price);
                            return {
                              product: p,
                              detection
                            };
                          }).filter(r => r.detection.hasBox);

                          setBoxSearchResults(results);
                        }}
                        placeholder="Buscar producto base (ej: purina)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      />

                      {boxSearch && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {boxSearchResults.length === 0 ? (
                            <p className="text-xs text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                              No se encontraron productos sueltos con presentación de caja detectada
                            </p>
                          ) : (
                            boxSearchResults.map(({ product: p, detection: d }) => (
                              <div key={p.id} className="bg-white rounded-lg p-3 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-gray-800">{p.name}</p>
                                  <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 w-fit font-semibold">
                                    Caja de {d.unitsPerBox}u a Gs. {Number(d.boxPrice).toLocaleString('es-PY')} c/u (mín. {d.unitsPerBox}u)
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm(`¿Crear la variante Caja de ${d.unitsPerBox}u para "${p.name}" y agregarla a este grupo?`)) return;

                                    setBoxAddingSaving(p.id);
                                    try {
                                      // 1. Verificar si este grupo ya posee una variante con el mismo factor
                                      const { data: existingVariants } = await supabase
                                        .from('products')
                                        .select('box_factor')
                                        .eq('parent_product_id', grupo.id);

                                      if (existingVariants?.some(ev => Number(ev.box_factor) === d.unitsPerBox)) {
                                        throw new Error(`Este grupo ya tiene una variante para el factor x${d.unitsPerBox}.`);
                                      }

                                      // 2. Crear variante caja
                                      const boxCode = `${p.product_code}-C${d.unitsPerBox}`;
                                      const boxName = `${p.name} - Caja de ${d.unitsPerBox}u`;
                                      const boxSlug = `${p.url_slug}-caja-${d.unitsPerBox}`;

                                      const boxProduct = {
                                        product_code: boxCode,
                                        name: boxName,
                                        public_name: p.public_name ? `${p.public_name} (Caja de ${d.unitsPerBox}u)` : null,
                                        description: p.description,
                                        description_ai_enhanced: p.description_ai_enhanced,
                                        price: d.boxPrice, // Precio total de la caja
                                        cost: (p.cost || 0) * d.unitsPerBox,
                                        stock: Math.floor((p.stock || 0) / d.unitsPerBox),
                                        category_general: p.category_general,
                                        category_specific: p.category_specific,
                                        category_sub_specific: p.category_sub_specific,
                                        category_detail: p.category_detail,
                                        category_species: p.category_species,
                                        category_brand: p.category_brand,
                                        category_age: p.category_age,
                                        category_condition: p.category_condition,
                                        tags: p.tags,
                                        brand: p.brand,
                                        location: p.location,
                                        image_url: p.image_url,
                                        uploaded_image_url: p.uploaded_image_url,
                                        additional_images: p.additional_images,
                                        parent_product_id: grupo.id,
                                        is_parent: false,
                                        variant_label: `Caja de ${d.unitsPerBox}u`,
                                        box_factor: d.unitsPerBox,
                                        is_bulk: true,
                                        is_prescription: p.is_prescription || false,
                                        requires_prescription: p.requires_prescription || false,
                                        local_only: p.local_only || false,
                                        requires_refrigeration: p.requires_refrigeration || false,
                                        active: false,
                                        pending_activation: true,
                                        updated_at: new Date().toISOString()
                                      };

                                      const { error: insertError } = await supabase
                                        .from('products')
                                        .insert([boxProduct]);

                                      if (insertError) throw insertError;

                                      // 3. Asociar también el producto base como variante 'Unidad' de este grupo si no tiene parent_product_id
                                      if (!p.parent_product_id) {
                                        const { error: updateBaseErr } = await supabase
                                          .from('products')
                                          .update({
                                            parent_product_id: grupo.id,
                                            variant_label: 'Unidad',
                                            box_factor: 1
                                          })
                                          .eq('id', p.id);

                                        if (updateBaseErr) throw updateBaseErr;
                                      }

                                      alert('Presentación de caja agregada al grupo con éxito.');
                                      setBoxSearch('');
                                      setBoxSearchResults([]);
                                      
                                      // Recargar estado del panel
                                      onUpdate();
                                    } catch (err: any) {
                                      console.error(err);
                                      alert('Error: ' + (err.message || 'No se pudo agregar la presentación de caja'));
                                    } finally {
                                      setBoxAddingSaving(null);
                                    }
                                  }}
                                  disabled={boxAddingSaving !== null}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors disabled:opacity-40 whitespace-nowrap flex items-center gap-1"
                                >
                                  {boxAddingSaving === p.id ? (
                                    <><Loader2 size={10} className="animate-spin" /> Agregando...</>
                                  ) : '+ Crear y Agregar'}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => { setEditingId(null); setVariantLabelEdits({}); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Guardando...' : 'Guardar grupo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <AIImageReviewModal
        open={groupAiReviewOpen}
        onClose={() => { setGroupAiReviewOpen(false); setGroupAiReviewFile(null); }}
        originalUrl={groupAiReviewOriginal}
        improvedUrl={groupAiReviewImproved}
        onAccept={handleGroupAiAccept}
        onRetry={handleGroupAiRetry}
        isRetrying={groupAiRetrying}
        showBrandSealToggle={true}
        applyBrandSeal={applyBrandSeal}
        onToggleBrandSeal={setApplyBrandSeal}
      />

      <AIImageReviewModal
        open={childAiReviewOpen}
        onClose={() => { setChildAiReviewOpen(false); setChildAiReviewFile(null); setChildAiReviewChildId(null); }}
        originalUrl={childAiReviewOriginalUrl}
        improvedUrl={childAiReviewImprovedUrl}
        onAccept={handleChildAiAccept}
        onRetry={handleChildAiRetry}
        isRetrying={childAiReviewRetrying}
      />

      <AIPromptConfigModal
        open={aiConfigOpen}
        onClose={() => setAiConfigOpen(false)}
        context="groups"
        contextLabel="Imágenes de grupos"
      />

      {groupImageProgress.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-gray-100" />
              <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900">{groupImageProgress.label}</p>
              <p className="text-xs text-gray-400 mt-1">Paso {groupImageProgress.step} de {groupImageProgress.totalSteps}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                   style={{ width: `${groupImageProgress.totalSteps > 0 ? (groupImageProgress.step / groupImageProgress.totalSteps) * 100 : 0}%` }} />
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
              ⚠️ No cierres esta ventana mientras se procesa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
