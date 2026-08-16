'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  ArrowLeft, Save, ChevronUp, ChevronDown, Trash2,
  ChevronDown as ChevronDownIcon, Eye, Plus, Settings2,
  Pencil, Upload, CheckCircle, AlertCircle, Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Block, BlockType } from './landing-blocks/types';
import LandingBlockRenderer from './LandingBlockRenderer';
import BlockEditForm from './BlockEditForm';

// ── Types ──────────────────────────────────────────────────────────

interface Landing {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  og_image_url: string | null;
  is_indexable: boolean;
  status: 'borrador' | 'publicada';
  blocks: Block[];
}

// ── Slugify ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ── Default values por tipo de bloque ─────────────────────────────

const blockDefaults: Record<BlockType, Omit<Block, 'id'>> = {
  hero:            { type: 'hero', image_url: '', title: 'Título de la promo', subtitle: '', cta_text: '', cta_url: '' } as any,
  text_with_title: { type: 'text_with_title', title: 'Título', text: 'Escribí el contenido acá...', size: 'md' } as any,
  image:           { type: 'image', image_url: '', alt: '', width: 'contained' } as any,
  gallery:         { type: 'gallery', images: [] } as any,
  cta:             { type: 'cta', text: 'Ver más', url: '/', style: 'primary' } as any,
  spacer:          { type: 'spacer', size: 'md' } as any,
  banner:          { type: 'banner', image_url: '', alt: '', link_url: '' } as any,
  two_columns:     { type: 'two_columns', image_url: '', alt: '', title: 'Título', text: '', image_side: 'left' } as any,
};

const blockLabels: Record<BlockType, string> = {
  hero:            '🖼️  Hero (imagen + título + CTA)',
  text_with_title: '📝  Texto con título',
  image:           '🖼️  Imagen sola',
  gallery:         '🗂️  Galería de imágenes',
  cta:             '🔘  Botón CTA',
  spacer:          '↕️  Espaciador',
  banner:          '📣  Banner promocional',
  two_columns:     '⬛⬛  Dos columnas',
};

// ── OG image upload (misma lógica que BlockEditForm) ───────────────

async function uploadOgImage(input: File): Promise<string | null> {
  let blob: Blob | null = null;
  try {
    const res = await fetch('/api/convert-to-webp', {
      method: 'POST',
      headers: { 'Content-Type': input.type },
      body: input,
    });
    if (res.ok) blob = await res.blob();
  } catch { /* fallback below */ }

  const filename = blob
    ? `landing-og-${Date.now()}.webp`
    : `landing-og-${Date.now()}-original`;
  const fileToUpload = blob ?? input;
  const contentType = blob ? 'image/webp' : input.type;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, fileToUpload, { upsert: true, contentType, cacheControl: '31536000' });
  if (error) return null;
  return supabase.storage.from('product-images').getPublicUrl(filename).data.publicUrl;
}

// ── LandingEditor ─────────────────────────────────────────────────

export default function LandingEditor({ landing: initial }: { landing: Landing }) {
  const [title, setTitle]               = useState(initial.title);
  const [slug, setSlug]                 = useState(initial.slug);
  const [metaDesc, setMetaDesc]         = useState(initial.meta_description || '');
  const [ogUrl, setOgUrl]               = useState(initial.og_image_url || '');
  const [isIndexable, setIsIndexable]   = useState(initial.is_indexable);
  const [status, setStatus]             = useState<'borrador' | 'publicada'>(initial.status);
  const [blocks, setBlocks]             = useState<Block[]>(Array.isArray(initial.blocks) ? initial.blocks : []);

  const [isSaving, setIsSaving]         = useState(false);
  const [saveMsg, setSaveMsg]           = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [errors, setErrors]             = useState<string[]>([]);
  const [isDirty, setIsDirty]           = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu]   = useState(false);
  const [showSeo, setShowSeo]           = useState(false);
  const [slugError, setSlugError]       = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [ogLoading, setOgLoading]       = useState(false);
  const [slugAutoMode, setSlugAutoMode] = useState(
    /^landing-\d+$/.test(initial.slug)
  );

  const ogFileRef   = useRef<HTMLInputElement>(null);
  const savedState  = useRef(JSON.stringify({ title, slug, metaDesc, ogUrl, isIndexable, status, blocks }));

  // Dirty check
  useEffect(() => {
    const cur = JSON.stringify({ title, slug, metaDesc, ogUrl, isIndexable, status, blocks });
    setIsDirty(cur !== savedState.current);
  }, [title, slug, metaDesc, ogUrl, isIndexable, status, blocks]);

  // Auto-slug desde título
  useEffect(() => {
    if (slugAutoMode && title && title !== 'Landing sin título') {
      setSlug(slugify(title));
    }
  }, [title, slugAutoMode]);

  // Sincronización client-side: garantiza datos frescos desde Supabase
  // independientemente de cualquier caché del servidor
  useEffect(() => {
    const syncFromDB = async () => {
      try {
        const { data } = await supabase
          .from('landings')
          .select('*')
          .eq('id', initial.id)
          .maybeSingle();
        if (!data) return;

        const freshBlocks = Array.isArray(data.blocks) ? data.blocks : [];
        setTitle(data.title ?? '');
        setSlug(data.slug ?? '');
        setMetaDesc(data.meta_description ?? '');
        setOgUrl(data.og_image_url ?? '');
        setIsIndexable(data.is_indexable ?? true);
        setStatus(data.status ?? 'borrador');
        setBlocks(freshBlocks);

        // Actualizar savedState para que el indicador "Sin guardar" sea correcto
        savedState.current = JSON.stringify({
          title: data.title ?? '',
          slug: data.slug ?? '',
          metaDesc: data.meta_description ?? '',
          ogUrl: data.og_image_url ?? '',
          isIndexable: data.is_indexable ?? true,
          status: data.status ?? 'borrador',
          blocks: freshBlocks,
        });
        setIsDirty(false);
      } catch (err) {
        console.error('Error al sincronizar datos del editor:', err);
      }
    };
    syncFromDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  // Validar slug único
  const validateSlug = useCallback(async (value: string): Promise<boolean> => {
    if (!value) { setSlugError('El slug no puede estar vacío'); return false; }
    if (!/^[a-z0-9-]+$/.test(value)) { setSlugError('Solo letras minúsculas, números y guiones'); return false; }
    const { data } = await supabase
      .from('landings').select('id').eq('slug', value).neq('id', initial.id).maybeSingle();
    if (data) { setSlugError('Este slug ya está en uso por otra landing'); return false; }
    setSlugError('');
    return true;
  }, [initial.id]);

  // ── Block operations ─────────────────────────────────────────────

  const addBlock = (type: BlockType) => {
    const b: Block = { ...blockDefaults[type], id: crypto.randomUUID() } as Block;
    setBlocks(prev => [...prev, b]);
    setExpandedId(b.id);
    setShowAddMenu(false);
  };

  const updateBlock = (id: string, updated: Block) =>
    setBlocks(prev => prev.map(b => b.id === id ? updated : b));

  const deleteBlock = (id: string) => {
    if (!confirm('¿Eliminar este bloque?')) return;
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveBlock = (idx: number, dir: 'up' | 'down') => {
    const next = [...blocks];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  };

  // ── Save ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('El título no puede estar vacío.');
    if (status === 'publicada' && blocks.length === 0)
      errs.push('Necesitás al menos un bloque para publicar.');
    const slugOk = await validateSlug(slug);
    if (!slugOk) errs.push('El slug tiene errores — revisalo antes de guardar.');
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setIsSaving(true);
    try {
      const { data: updated, error } = await supabase.from('landings').update({
      title: title.trim(),
      slug: slug.trim(),
      meta_description: metaDesc || null,
      og_image_url: ogUrl || null,
      is_indexable: isIndexable,
      status,
      blocks,
    }).eq('id', initial.id).select('id');
    if (error) throw error;
    if (!updated || updated.length === 0) {
      throw new Error(
        'Supabase actualizó 0 filas. Posibles causas: RLS habilitado sin políticas, o ID incorrecto. ' +
        `ID usado: ${initial.id}`
      );
    }
    savedState.current = JSON.stringify({ title, slug, metaDesc, ogUrl, isIndexable, status, blocks });
    setIsDirty(false);
    setSaveMsg({ type: 'ok', text: '¡Guardado!' });
    setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      setSaveMsg({ type: 'error', text: 'Error: ' + (err.message || 'Desconocido') });
    } finally {
      setIsSaving(false);
    }
  };

  // ── OG image ──────────────────────────────────────────────────────

  const handleOgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOgLoading(true);
    const url = await uploadOgImage(file);
    if (url) setOgUrl(url);
    else alert('Error al subir la imagen OG.');
    setOgLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="-mx-6 md:-mx-8 -mt-6 md:-mt-8 flex flex-col bg-gray-50 min-h-screen">

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <a href="/owner/landings"
          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </a>

        {/* Título editable inline */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input autoFocus
              className="w-full font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none text-base max-w-md"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} title="Click para editar el título"
              className="flex items-center gap-1.5 text-base font-semibold text-gray-800 hover:text-blue-600 transition-colors truncate max-w-xs md:max-w-sm">
              <span className="truncate">{title || 'Sin título'}</span>
              <Pencil size={13} className="flex-shrink-0 text-gray-400" />
            </button>
          )}
        </div>

        {/* Estado + guardado */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isDirty && (
            <span className="text-xs text-amber-600 font-medium hidden sm:block">● Sin guardar</span>
          )}
          {saveMsg && (
            <span className={`text-xs font-medium flex items-center gap-1 ${saveMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMsg.type === 'ok' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              <span className="hidden sm:inline">{saveMsg.text}</span>
            </span>
          )}
          <select value={status} onChange={e => setStatus(e.target.value as any)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="borrador">Borrador</option>
            <option value="publicada">Publicada</option>
          </select>
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            <Save size={14} />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 space-y-0.5">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-700 flex items-center gap-1">
              <AlertCircle size={12} /> {e}
            </p>
          ))}
        </div>
      )}

      {/* ── 2 COLUMNAS ── */}
      <div className="flex flex-1">

        {/* ── PANEL IZQUIERDO ── */}
        <div className="w-full md:w-[420px] flex-shrink-0 bg-white border-r border-gray-200 md:sticky md:top-[53px] md:self-start md:max-h-[calc(100vh-53px)] md:overflow-y-auto">
          <div className="p-4 space-y-3">

            {/* Botón agregar bloque */}
            <div className="relative">
              <button onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-600 hover:text-blue-700 py-3 rounded-xl transition-colors text-sm font-medium bg-blue-50/50 hover:bg-blue-50">
                <Plus size={16} /> Agregar bloque
              </button>
              {showAddMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {(Object.keys(blockLabels) as BlockType[]).map(type => (
                    <button key={type} onClick={() => addBlock(type)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0">
                      {blockLabels[type]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de bloques */}
            {blocks.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Layers size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Agregá bloques con el botón de arriba.</p>
              </div>
            )}

            {blocks.map((block, idx) => {
              const isOpen = expandedId === block.id;
              return (
                <div key={block.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Cabecera del bloque */}
                  <div className="flex items-center gap-1 px-3 py-2.5 bg-white hover:bg-gray-50">
                    <button onClick={() => setExpandedId(isOpen ? null : block.id)}
                      className="flex-1 flex items-center gap-2 text-left text-sm font-medium text-gray-700 hover:text-blue-600 min-w-0">
                      <span className="truncate">{blockLabels[block.type]}</span>
                      <ChevronDownIcon size={13} className={`flex-shrink-0 ml-auto transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                      <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded" title="Subir">
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveBlock(idx, 'down')} disabled={idx === blocks.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded" title="Bajar">
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={() => deleteBlock(block.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {/* Formulario del bloque (acordeón) */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50">
                      <BlockEditForm block={block} onChange={updated => updateBlock(block.id, updated)} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Panel SEO */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setShowSeo(!showSeo)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-700">
                <Settings2 size={15} className="text-gray-500" />
                Configuración SEO
                <ChevronDownIcon size={13} className={`ml-auto transition-transform text-gray-400 ${showSeo ? 'rotate-180' : ''}`} />
              </button>
              {showSeo && (
                <div className="border-t border-gray-100 p-4 bg-white space-y-4">

                  {/* Slug */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Slug (URL pública)
                    </label>
                    <div className="flex items-center text-xs text-gray-400 mb-1">
                      tiempodemascotas.com.py/promo/<strong className="text-gray-600">{slug || '...'}</strong>
                    </div>
                    <input type="text" value={slug}
                      onChange={e => { setSlug(e.target.value); setSlugAutoMode(false); }}
                      onBlur={() => validateSlug(slug)}
                      className={`w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${slugError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                    {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
                  </div>

                  {/* Meta title */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Meta título</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className={`text-xs mt-1 ${title.length > 60 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {title.length}/60 caracteres
                    </p>
                  </div>

                  {/* Meta description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Meta descripción</label>
                    <textarea rows={3} value={metaDesc} onChange={e => setMetaDesc(e.target.value)}
                      placeholder="Descripción breve para Google (160 caracteres máx.)..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <p className={`text-xs mt-1 ${metaDesc.length > 160 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {metaDesc.length}/160 caracteres
                    </p>
                  </div>

                  {/* OG Image */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Imagen para compartir (OG)
                    </label>
                    <p className="text-xs text-gray-400 mb-2">
                      Aparece al compartir el link en WhatsApp / redes.
                    </p>
                    {ogUrl && (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 mb-2">
                        <Image src={ogUrl} alt="OG" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <button type="button" onClick={() => ogFileRef.current?.click()} disabled={ogLoading}
                      className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                      <Upload size={12} /> {ogLoading ? 'Subiendo...' : 'Subir imagen OG'}
                    </button>
                    <input ref={ogFileRef} type="file" accept="image/*" className="hidden" onChange={handleOgFile} />
                  </div>

                  {/* Indexable toggle */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Indexable por Google</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isIndexable ? 'Aparece en resultados de búsqueda' : 'Oculto para Google (noindex)'}
                      </p>
                    </div>
                    <button onClick={() => setIsIndexable(!isIndexable)}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isIndexable ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isIndexable ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Espacio inferior para evitar que el último bloque quede tapado */}
            <div className="h-8" />
          </div>
        </div>

        {/* ── PANEL DERECHO: PREVIEW ── */}
        <div className="hidden md:flex flex-1 flex-col">
          <div className="sticky top-[53px] max-h-[calc(100vh-53px)] overflow-y-auto">
            {/* Preview header */}
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-300 flex items-center gap-2 sticky top-0 z-10">
              <Eye size={14} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Preview en vivo</span>
              <span className="text-xs text-gray-400 font-mono">— /promo/{slug}</span>
            </div>
            {/* Preview content */}
            <div className="p-4 bg-gray-200 min-h-screen">
              <div className="bg-white shadow-lg min-h-[500px] overflow-hidden rounded-sm">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                    <Layers size={40} className="mb-3 opacity-50" />
                    <p className="text-sm">Agregá bloques para ver el preview</p>
                  </div>
                ) : (
                  blocks.map(block => (
                    <LandingBlockRenderer key={block.id} block={block} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
