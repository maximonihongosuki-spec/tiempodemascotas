'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Product = {
  id: string;
  name: string;
  public_name: string | null;
  uploaded_image_url: string | null;
  image_url: string | null;
  category_brand: string | null;
  category_general: string[] | null;
  category_specific: string[] | null;
  category_species: string[] | null;
  category_age: string[] | null;
  category_condition: string[] | null;
  tags: string[] | null;
  description: string | null;
  description_ai_enhanced: string | null;
};

type Step = 'idle' | 'generating' | 'review';

export default function OgImageGenerator({
  product,
  onSaved
}: {
  product: Product;
  onSaved: (url: string) => void;
}) {
  const [step, setStep] = useState<Step>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [usedBullets, setUsedBullets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const productImage = product.uploaded_image_url || product.image_url;
  const displayName = product.public_name || product.name;

  const handleGenerate = async () => {
    if (!productImage) {
      setError('Este producto no tiene imagen base para editar.');
      return;
    }
    setError(null);
    setStep('generating');
    try {
      // Paso 1 — extraer bullets con cascada de prioridad (automático, sin revisión)
      const bulletsRes = await fetch('/api/generate-og-bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          description: product.description_ai_enhanced || product.description,
          category_brand: product.category_brand,
          category_general: product.category_general,
          category_specific: product.category_specific,
          category_species: product.category_species,
          category_age: product.category_age,
          category_condition: product.category_condition,
          tags: product.tags,
        }),
      });
      const bulletsData = await bulletsRes.json();
      if (!bulletsRes.ok || bulletsData.error) throw new Error(bulletsData.error || 'Error al extraer bullets');
      const bullets: string[] = bulletsData.bullets;
      setUsedBullets(bullets);

      // Paso 2 — armar prompt de imagen con los bullets + logo real
      const { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('context', 'og_image')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      const basePrompt = (blocks || []).map((b: any) => b.prompt_block).join('. ');
      if (!basePrompt) throw new Error('No hay bloques de prompt configurados para OG image. Configuralos en /admin.');

      const bulletText = bullets.map(b => `"${b}"`).join(', ');
      const finalPrompt = `${basePrompt}\n\nEXACT BULLET TEXT TO RENDER (render these EXACT words verbatim, one per line, do not paraphrase, do not add periods): ${bulletText}\n\nALSO include, in small legible text near the bottom of the LEFT panel (below the bullet list, separate from it): "Visitanos en www.tiempodemascotas.com.py" — render this exact text, smaller than the bullets, as a website/contact line.`;

      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model, credits_per_use, use_reference_images')
        .eq('context', 'og_image')
        .maybeSingle();

      const { data: creditsRow } = await supabase.from('settings').select('value').eq('key', 'ai_image_credits').maybeSingle();
      const currentCredits = parseInt(creditsRow?.value || '0', 10);
      const creditsNeeded = ctxSettings?.credits_per_use ?? 1;
      if (currentCredits < creditsNeeded) {
        throw new Error(`No hay créditos de IA suficientes (necesita ${creditsNeeded}, hay ${currentCredits}).`);
      }

      let referenceImageUrls: string[] = [];
      if (ctxSettings?.use_reference_images ?? true) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'og_image')
          .order('sort_order', { ascending: true })
          .limit(2);
        referenceImageUrls = (refImgs || []).map(r => r.image_url);
      }

      const { data: siteSettings } = await supabase
        .from('site_settings')
        .select('uploaded_logo_url, logo_url')
        .maybeSingle();
      const logoUrl = siteSettings?.uploaded_logo_url || siteSettings?.logo_url || null;

      const productMetadata = {
        name: displayName,
        brand: product.category_brand,
        category_general: product.category_general,
        category_species: product.category_species,
      };

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', finalPrompt);
      form.append('imageUrl', productImage);
      form.append('productMetadata', JSON.stringify(productMetadata));
      if (referenceImageUrls.length > 0) {
        form.append('referenceImageUrls', JSON.stringify(referenceImageUrls));
      }
      if (logoUrl) {
        form.append('logoImageUrl', logoUrl);
      }
      form.append('quality', 'medium');
      form.append('model', ctxSettings?.ai_model || 'gpt-image-1.5');
      form.append('size', '1536x1024');

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al generar imagen');

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });
      const file = new File([blob], `og-${product.id}.png`, { type: 'image/png' });

      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep('review');

      await supabase.from('settings').update({ value: String(currentCredits - creditsNeeded) }).eq('key', 'ai_image_credits');
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setStep('idle');
    }
  };

  const handleAccept = async () => {
    if (!previewFile) return;
    setIsSaving(true);
    try {
      const optimizeRes = await fetch('/api/convert-to-webp?width=1200&height=630', {
        method: 'POST',
        headers: { 'Content-Type': previewFile.type },
        body: previewFile,
      });
      if (!optimizeRes.ok) throw new Error('Error al optimizar a WebP');
      const webpBlob = await optimizeRes.blob();

      const fileName = `og-image-${product.id}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, webpBlob, { contentType: 'image/webp', upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

      await supabase.from('product_seo').upsert({
        product_id: product.id,
        og_image_url: urlData.publicUrl,
        og_image_ai_generated_at: new Date().toISOString(),
        updated_by: 'ai',
      }, { onConflict: 'product_id' });

      onSaved(urlData.publicUrl);
      setStep('idle');
      setPreviewUrl(null);
      setPreviewFile(null);
      setUsedBullets([]);
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-purple-100 rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
        <span>🎨</span> Generar imagen OG con IA
      </h3>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">{error}</div>
      )}

      {step === 'idle' && (
        <button
          onClick={handleGenerate}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold transition-all text-sm cursor-pointer shadow-sm"
        >
          Generar imagen OG
        </button>
      )}

      {step === 'generating' && (
        <p className="text-sm text-gray-500 animate-pulse">Analizando producto y generando imagen…</p>
      )}

      {step === 'review' && previewUrl && (
        <div className="space-y-3">
          {usedBullets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {usedBullets.map((b, i) => (
                <span key={i} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  {b}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Original</p>
              <div className="relative aspect-[1.91/1] rounded-xl overflow-hidden border border-gray-200">
                <img src={productImage || ''} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Generada (IA)</p>
              <div className="relative aspect-[1.91/1] rounded-xl overflow-hidden border-2 border-purple-400 shadow-md">
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => { setStep('idle'); setPreviewUrl(null); setPreviewFile(null); }} className="flex-1 min-w-[120px] py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 text-sm">
              Descartar
            </button>
            <button onClick={handleGenerate} className="flex-1 min-w-[120px] py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 text-sm">
              Reintentar
            </button>
            <button onClick={handleAccept} disabled={isSaving} className="flex-1 min-w-[120px] py-2.5 bg-[#1A8A00] hover:bg-[#156e00] text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {isSaving ? 'Guardando…' : 'Aceptar y usar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
