'use client';
import React, { useRef } from 'react';
import Image from 'next/image';
import { Upload, Link as LinkIcon, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  Block, HeroBlock, TextWithTitleBlock, ImageBlock,
  GalleryBlock, CtaBlock, SpacerBlock, BannerBlock, TwoColumnsBlock,
} from './landing-blocks/types';

// ── Image upload pipeline (igual a ProductManagement.tsx) ──────────

async function optimizeImage(input: File | string): Promise<Blob | null> {
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
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return blob;
  } catch (err) {
    console.error('optimizeImage error:', err);
    return null;
  }
}

async function uploadImage(input: File | string, prefix: string): Promise<string | null> {
  const blob = await optimizeImage(input);
  if (blob) {
    const filename = `landing-${prefix}-${Date.now()}.webp`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filename, blob, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });
    if (error) { console.error('Storage error:', error); return null; }
    return supabase.storage.from('product-images').getPublicUrl(filename).data.publicUrl;
  }
  // Fallback: si n8n falla con archivo → subir original al bucket
  if (typeof input !== 'string') {
    const filename = `landing-${prefix}-${Date.now()}-original`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filename, input, { upsert: true, contentType: input.type, cacheControl: '31536000' });
    if (error) return null;
    return supabase.storage.from('product-images').getPublicUrl(filename).data.publicUrl;
  }
  // Fallback: si n8n falla con URL → usar la URL directamente
  return input;
}

// ── ImagePicker: componente reutilizable de carga de imagen ────────

function ImagePicker({
  currentUrl, onUpload, isLoading, setIsLoading, prefix,
}: {
  currentUrl: string;
  onUpload: (url: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  prefix: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = React.useState('');
  const [showUrl, setShowUrl] = React.useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const url = await uploadImage(file, prefix);
    if (url) onUpload(url);
    else alert('Error al subir la imagen. Verificá el webhook n8n e intentá de nuevo.');
    setIsLoading(false);
  };

  const handleUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      alert('La URL debe comenzar con http:// o https://\nNo se aceptan URLs de tipo data: ni rutas relativas.');
      return;
    }
    setIsLoading(true);
    const url = await uploadImage(trimmed, prefix);
    if (url) { onUpload(url); setUrlInput(''); setShowUrl(false); }
    else alert('Error al procesar la URL. Verificá que sea una URL de imagen pública y accesible.');
    setIsLoading(false);
  };

  return (
    <div className="space-y-2">
      {currentUrl && (
        <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          <Image src={currentUrl} alt="preview" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={isLoading}
          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
          <Upload size={12} /> {isLoading ? 'Subiendo...' : 'Subir archivo'}
        </button>
        <button type="button" onClick={() => setShowUrl(!showUrl)} disabled={isLoading}
          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors">
          <LinkIcon size={12} /> Desde URL
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {showUrl && (
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            placeholder="https://..." onKeyDown={e => e.key === 'Enter' && handleUrl()}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={handleUrl} disabled={isLoading}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg disabled:opacity-50">
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helpers de UI ──────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>
);
const Inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
);
const Txta = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none" />
);
const Sel = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
);

// ── Formularios por tipo de bloque ─────────────────────────────────

function HeroForm({ block, onChange }: { block: HeroBlock; onChange: (b: HeroBlock) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="space-y-3">
      <div><Label>Imagen de fondo</Label>
        <ImagePicker currentUrl={block.image_url} onUpload={url => onChange({ ...block, image_url: url })}
          isLoading={loading} setIsLoading={setLoading} prefix="hero" />
      </div>
      <div><Label>Título</Label>
        <Inp value={block.title} placeholder="Título principal" onChange={e => onChange({ ...block, title: e.target.value })} />
      </div>
      <div><Label>Subtítulo</Label>
        <Inp value={block.subtitle} placeholder="Subtítulo opcional" onChange={e => onChange({ ...block, subtitle: e.target.value })} />
      </div>
      <div><Label>Texto del botón CTA (opcional)</Label>
        <Inp value={block.cta_text || ''} placeholder="Ej: Ver promoción" onChange={e => onChange({ ...block, cta_text: e.target.value })} />
      </div>
      <div><Label>URL del botón CTA (opcional)</Label>
        <Inp value={block.cta_url || ''} placeholder="https://..." onChange={e => onChange({ ...block, cta_url: e.target.value })} />
      </div>
    </div>
  );
}

function TextWithTitleForm({ block, onChange }: { block: TextWithTitleBlock; onChange: (b: TextWithTitleBlock) => void }) {
  return (
    <div className="space-y-3">
      <div><Label>Título</Label>
        <Inp value={block.title} placeholder="Título de sección" onChange={e => onChange({ ...block, title: e.target.value })} />
      </div>
      <div><Label>Texto</Label>
        <Txta rows={4} value={block.text} placeholder="Contenido..." onChange={e => onChange({ ...block, text: e.target.value })} />
      </div>
      <div><Label>Tamaño de texto</Label>
        <Sel value={block.size} onChange={e => onChange({ ...block, size: e.target.value as 'sm' | 'md' | 'lg' })}>
          <option value="sm">Pequeño</option>
          <option value="md">Mediano</option>
          <option value="lg">Grande</option>
        </Sel>
      </div>
    </div>
  );
}

function ImageForm({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="space-y-3">
      <div><Label>Imagen</Label>
        <ImagePicker currentUrl={block.image_url} onUpload={url => onChange({ ...block, image_url: url })}
          isLoading={loading} setIsLoading={setLoading} prefix="img" />
      </div>
      <div><Label>Texto alternativo (alt)</Label>
        <Inp value={block.alt} placeholder="Descripción de la imagen" onChange={e => onChange({ ...block, alt: e.target.value })} />
      </div>
      <div><Label>Ancho</Label>
        <Sel value={block.width} onChange={e => onChange({ ...block, width: e.target.value as 'contained' | 'full' })}>
          <option value="contained">Contenido (max-width)</option>
          <option value="full">Ancho completo</option>
        </Sel>
      </div>
    </div>
  );
}

function GalleryForm({ block, onChange }: { block: GalleryBlock; onChange: (b: GalleryBlock) => void }) {
  const [loadingIdx, setLoadingIdx] = React.useState<number | null>(null);
  const update = (i: number, field: 'url' | 'alt', value: string) => {
    const imgs = [...block.images];
    imgs[i] = { ...imgs[i], [field]: value };
    onChange({ ...block, images: imgs });
  };
  return (
    <div className="space-y-3">
      {block.images.map((img, i) => (
        <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Imagen {i + 1}</span>
            <button type="button" onClick={() => onChange({ ...block, images: block.images.filter((_, idx) => idx !== i) })}
              className="text-red-400 hover:text-red-600"><X size={14} /></button>
          </div>
          <ImagePicker currentUrl={img.url} onUpload={url => update(i, 'url', url)}
            isLoading={loadingIdx === i} setIsLoading={v => setLoadingIdx(v ? i : null)} prefix={`gallery${i}`} />
          <Inp value={img.alt} placeholder="Texto alternativo" onChange={e => update(i, 'alt', e.target.value)} />
        </div>
      ))}
      {block.images.length < 4 && (
        <button type="button" onClick={() => onChange({ ...block, images: [...block.images, { url: '', alt: '' }] })}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={12} /> Agregar imagen ({block.images.length}/4)
        </button>
      )}
    </div>
  );
}

function CtaForm({ block, onChange }: { block: CtaBlock; onChange: (b: CtaBlock) => void }) {
  return (
    <div className="space-y-3">
      <div><Label>Texto del botón</Label>
        <Inp value={block.text} placeholder="Ej: Ver ofertas" onChange={e => onChange({ ...block, text: e.target.value })} />
      </div>
      <div><Label>URL destino</Label>
        <Inp value={block.url} placeholder="https://..." onChange={e => onChange({ ...block, url: e.target.value })} />
      </div>
      <div><Label>Estilo</Label>
        <Sel value={block.style} onChange={e => onChange({ ...block, style: e.target.value as 'primary' | 'secondary' })}>
          <option value="primary">Principal (verde)</option>
          <option value="secondary">Secundario (amarillo)</option>
        </Sel>
      </div>
    </div>
  );
}

function SpacerForm({ block, onChange }: { block: SpacerBlock; onChange: (b: SpacerBlock) => void }) {
  return (
    <div><Label>Tamaño del espaciado</Label>
      <Sel value={block.size} onChange={e => onChange({ ...block, size: e.target.value as 'sm' | 'md' | 'lg' })}>
        <option value="sm">Pequeño (32px)</option>
        <option value="md">Mediano (64px)</option>
        <option value="lg">Grande (96px)</option>
      </Sel>
    </div>
  );
}

function BannerForm({ block, onChange }: { block: BannerBlock; onChange: (b: BannerBlock) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="space-y-3">
      <div><Label>Imagen del banner</Label>
        <ImagePicker currentUrl={block.image_url} onUpload={url => onChange({ ...block, image_url: url })}
          isLoading={loading} setIsLoading={setLoading} prefix="banner" />
      </div>
      <div><Label>Texto alternativo (alt)</Label>
        <Inp value={block.alt} placeholder="Descripción del banner" onChange={e => onChange({ ...block, alt: e.target.value })} />
      </div>
      <div><Label>URL (opcional — hace el banner clickeable)</Label>
        <Inp value={block.link_url || ''} placeholder="https://..." onChange={e => onChange({ ...block, link_url: e.target.value })} />
      </div>
    </div>
  );
}

function TwoColumnsForm({ block, onChange }: { block: TwoColumnsBlock; onChange: (b: TwoColumnsBlock) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="space-y-3">
      <div><Label>Imagen</Label>
        <ImagePicker currentUrl={block.image_url} onUpload={url => onChange({ ...block, image_url: url })}
          isLoading={loading} setIsLoading={setLoading} prefix="twocol" />
      </div>
      <div><Label>Texto alternativo (alt)</Label>
        <Inp value={block.alt} placeholder="Descripción de la imagen" onChange={e => onChange({ ...block, alt: e.target.value })} />
      </div>
      <div><Label>Título</Label>
        <Inp value={block.title} placeholder="Título de la sección" onChange={e => onChange({ ...block, title: e.target.value })} />
      </div>
      <div><Label>Texto</Label>
        <Txta rows={3} value={block.text} placeholder="Descripción..." onChange={e => onChange({ ...block, text: e.target.value })} />
      </div>
      <div><Label>Posición de la imagen</Label>
        <Sel value={block.image_side} onChange={e => onChange({ ...block, image_side: e.target.value as 'left' | 'right' })}>
          <option value="left">Imagen a la izquierda</option>
          <option value="right">Imagen a la derecha</option>
        </Sel>
      </div>
    </div>
  );
}

// ── Export principal ───────────────────────────────────────────────

export default function BlockEditForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case 'hero':            return <HeroForm block={block} onChange={onChange as any} />;
    case 'text_with_title': return <TextWithTitleForm block={block} onChange={onChange as any} />;
    case 'image':           return <ImageForm block={block} onChange={onChange as any} />;
    case 'gallery':         return <GalleryForm block={block} onChange={onChange as any} />;
    case 'cta':             return <CtaForm block={block} onChange={onChange as any} />;
    case 'spacer':          return <SpacerForm block={block} onChange={onChange as any} />;
    case 'banner':          return <BannerForm block={block} onChange={onChange as any} />;
    case 'two_columns':     return <TwoColumnsForm block={block} onChange={onChange as any} />;
    default:                return null;
  }
}
