import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image as ImageIcon, Plus, Trash2, Save, Globe, ChevronUp, ChevronDown, Settings2, Sparkles, Loader2 } from 'lucide-react';
import AIPromptConfigModal from './AIPromptConfigModal';
import AIImageReviewModal from './AIImageReviewModal';
import SpeciesIconManager from './SpeciesIconManager';

const BUCKET = 'product-images';

type HomeContent = {
  id: string;
  card_1_image: string | null;
  card_1_text: string | null;
  card_2_image: string | null;
  card_2_text: string | null;
  card_3_image: string | null;
  card_3_text: string | null;
  card_4_image?: string | null;
  card_4_text?: string | null;
  dog_card_image?: string | null;
  cat_card_image?: string | null;
  perros_desktop?: string | null;
  perros_mobile?: string | null;
  gatos_desktop?: string | null;
  gatos_mobile?: string | null;
  aves_desktop?: string | null;
  aves_mobile?: string | null;
  roedores_desktop?: string | null;
  roedores_mobile?: string | null;
  tortugas_desktop?: string | null;
  tortugas_mobile?: string | null;
  ticker_fixed_text?: string | null;
};

type HomeBanner = {
  id: string;
  desktop_image: string;
  mobile_image: string;
  cta_url?: string;
  cta_text?: string;
  order_index: number;
  is_active: boolean;
};

type PromoBannerType = {
  id: string;
  desktop_image: string;
  mobile_image: string;
  cta_url?: string;
  order_index: number;
  is_active: boolean;
};

export default function HomeContentManagement() {
  type CategorySliderConfig = {
    id: string;
    title: string;
    description: string;
    category_name: string;
    bg_image: string | null;
    cta_text: string;
    order_index: number;
    is_active: boolean;
  };

  const [content, setContent] = useState<HomeContent>({
    id: '00000000-0000-0000-0000-000000000001',
    card_1_image: null,
    card_1_text: '',
    card_2_image: null,
    card_2_text: '',
    card_3_image: null,
    card_3_text: '',
    card_4_image: null,
    card_4_text: '',
    dog_card_image: null,
    cat_card_image: null,
  });
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBannerType[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [categorySliders, setCategorySliders] = useState<CategorySliderConfig[]>([]);

  const [heroAiConfigOpen, setHeroAiConfigOpen] = useState(false);
  const [petCardsAiConfigOpen, setPetCardsAiConfigOpen] = useState(false);
  const [generatingSpeciesMobileField, setGeneratingSpeciesMobileField] = useState<string | null>(null);
  const [improvingHeroBannerId, setImprovingHeroBannerId] = useState<string | null>(null);
  const [heroAiReviewOpen, setHeroAiReviewOpen] = useState(false);
  const [heroAiReviewBannerId, setHeroAiReviewBannerId] = useState<string | null>(null);
  const [heroAiReviewOriginalUrl, setHeroAiReviewOriginalUrl] = useState('');
  const [heroAiReviewImprovedUrl, setHeroAiReviewImprovedUrl] = useState('');
  const [heroAiReviewFile, setHeroAiReviewFile] = useState<File | null>(null);
  const [heroAiReviewRetrying, setHeroAiReviewRetrying] = useState(false);
  const [generatingMobileFromDesktopId, setGeneratingMobileFromDesktopId] = useState<string | null>(null);
  const [heroAiCredits, setHeroAiCredits] = useState(0);

  useEffect(() => {
    const loadHeroCredits = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'ai_image_credits')
        .maybeSingle();
      const val = parseInt(data?.value || '0', 10);
      setHeroAiCredits(isNaN(val) ? 0 : val);
    };
    loadHeroCredits();
  }, []);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [sliderUploading, setSliderUploading] = useState<string | null>(null);
  type TickerItem = { id: string; text: string; emoji: string; order_index: number; is_active: boolean; position: 'top' | 'bottom'; };
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [tickerLoading, setTickerLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load Home Content
      const { data: contentData } = await supabase
        .from('home_content')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (contentData) setContent(contentData);

      // Load Hero Banners
      const { data: bannersData } = await supabase
        .from('home_banners')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (bannersData) setBanners(bannersData);

      // Load Promo Banners (8:1)
      const { data: promoData } = await supabase
        .from('promo_banners')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (promoData) setPromoBanners(promoData);

      // Load category sliders
      const { data: slidersData } = await supabase
        .from('home_category_sliders')
        .select('*')
        .order('order_index', { ascending: true });
      if (slidersData) setCategorySliders(slidersData);

      // Load general categories
      const { data: catsData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'general')
        .order('name');
      if (catsData) setCategories(catsData);

      // Load ticker items
      const { data: tickerData } = await supabase
        .from('ticker_items')
        .select('*')
        .order('order_index', { ascending: true });
      if (tickerData) setTickerItems(tickerData);
    } catch (error) {
      console.error('Error in loadData:', error);
    }
  };

  // ... (keeping image upload helper)
  const handleBannerImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    field: 'desktop_image' | 'mobile_image',
    table: 'home_banners' | 'promo_banners' = 'home_banners'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      e.target.value = '';
      return;
    }

    setUploadingField(`${table}-${id}-${field}`);
    try {
      const fileName = `${table}/${id}-${field}-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, fileName);

      if (table === 'home_banners') {
        await handleUpdateBanner(id, { [field]: url });
      } else {
        await handleUpdatePromoBanner(id, { [field]: url });
      }
    } catch (err: any) {
      console.error('Error subiendo banner:', err);
      alert('No se pudo guardar la imagen: ' + (err.message || 'desconocido') +
            '\n\nVolvé a intentarlo. La imagen NO se guardó.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleContentImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'dog_card_image' | 'cat_card_image'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      e.target.value = '';
      return;
    }

    setUploadingField(field);
    try {
      const fileName = `home-content/${field}-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, fileName);

      const { error: updateError } = await supabase
        .from('home_content')
        .update({ [field]: url })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      if (updateError) throw updateError;

      setContent(prev => ({ ...prev, [field]: url }));
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      alert('No se pudo guardar la imagen: ' + (err.message || 'desconocido') +
            '\n\nVolvé a intentarlo. La imagen NO se guardó.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleSpeciesImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      e.target.value = '';
      return;
    }

    setUploadingField(field);
    try {
      const fileName = `species/${field}-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, fileName);

      const { error: updateError } = await supabase
        .from('home_content')
        .update({ [field]: url })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      if (updateError) throw updateError;

      setContent(prev => ({ ...prev, [field]: url }));
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      alert('No se pudo guardar la imagen: ' + (err.message || 'desconocido') +
            '\n\nVolvé a intentarlo. La imagen NO se guardó.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  /**
   * Sube una imagen al bucket SOLO si pasó por conversión efectiva a WebP.
   * Si la conversión falla por cualquier motivo, lanza Error — nunca sube
   * un original etiquetado como WebP ni un blob corrupto.
   *
   * @param input File (subida manual) o Blob (resultado de IA ya en memoria)
   * @param path  ruta destino en el bucket product-images (debe terminar en .webp)
   * @returns URL pública de la imagen WebP subida
   * @throws Error si la conversión o la subida fallan
   */
  const safeOptimizeAndUpload = async (
    input: File | Blob,
    path: string
  ): Promise<string> => {
    if (!path.endsWith('.webp')) {
      throw new Error('safeOptimizeAndUpload: el path destino debe terminar en .webp');
    }

    // Paso 1: pedir conversión a WebP
    let res: Response;
    try {
      res = await fetch('/api/convert-to-webp', {
        method: 'POST',
        headers: { 'Content-Type': input.type || 'application/octet-stream' },
        body: input,
      });
    } catch (networkErr: any) {
      throw new Error(
        `No se pudo contactar el servicio de optimización WebP: ${networkErr?.message || 'error de red'}`
      );
    }

    // Paso 2: verificar que la respuesta sea exitosa
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(
        `El servicio de optimización WebP devolvió error ${res.status}. ` +
        (detail ? `Detalle: ${detail.slice(0, 200)}` : '')
      );
    }

    // Paso 3: leer el blob y verificar que sea una imagen real
    const optimizedBlob = await res.blob();
    if (!optimizedBlob.type.startsWith('image/')) {
      throw new Error(
        `El servicio de optimización WebP devolvió contenido no-imagen ` +
        `(content-type: ${optimizedBlob.type || 'desconocido'}). ` +
        `La imagen no se va a guardar en este estado.`
      );
    }

    // Paso 4: subir el blob WebP verificado al bucket
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, optimizedBlob, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      });
    if (uploadErr) {
      throw new Error(`Error al subir al bucket: ${uploadErr.message}`);
    }

    // Paso 5: devolver URL pública
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleAddBanner = async () => {
    const newBanner = { desktop_image: '', mobile_image: '', cta_url: '', cta_text: 'Ver más', order_index: banners.length, is_active: true };
    try {
      const { data, error } = await supabase.from('home_banners').insert([newBanner]).select().single();
      if (error) throw error;
      if (data) setBanners([...banners, data]);
    } catch (error) {
      console.error('Error adding banner:', error);
      alert('Error al añadir banner.');
    }
  };

  const handleUpdateBanner = async (id: string, updates: Partial<HomeBanner>) => {
    try {
      const { error } = await supabase.from('home_banners').update(updates).eq('id', id);
      if (error) throw error;
      setBanners(banners.map(b => b.id === id ? { ...b, ...updates } : b));
    } catch (error) {
      console.error('Error updating banner:', error);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      const { error } = await supabase.from('home_banners').delete().eq('id', id);
      if (error) throw error;
      setBanners(banners.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const handleImproveHeroDesktop = async (banner: any) => {
    if (!banner.desktop_image) {
      alert('Subí primero una imagen de escritorio antes de mejorarla con IA.');
      return;
    }

    const { data: ctxSettings } = await supabase
      .from('ai_image_context_settings')
      .select('ai_model, use_reference_images, credits_per_use')
      .eq('context', 'hero_desktop')
      .maybeSingle();
    const heroModel = ctxSettings?.ai_model ?? 'gpt-image-1.5';
    const heroCreditsNeeded = ctxSettings?.credits_per_use ?? 1;

    if (heroAiCredits < heroCreditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${heroCreditsNeeded} crédito(s) y tenés ${heroAiCredits}.`);
      return;
    }

    setImprovingHeroBannerId(banner.id);
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'hero_desktop')
        .order('sort_order', { ascending: true });

      const prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Enhance this hero banner image for a pet store website, improving lighting and color while preserving composition. Keep 3:1 wide format.';

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('imageUrl', banner.desktop_image);

      form.append('model', heroModel);

      const heroSize = heroModel === 'gpt-image-2' ? '1536x512' : '1536x1024';
      form.append('size', heroSize);

      if (ctxSettings?.use_reference_images ?? true) {
        const { data: refImgs } = await supabase
          .from('ai_reference_images')
          .select('image_url')
          .eq('context', 'hero_desktop')
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
      const aiFile = new File([aiBlob], `hero-improved-${Date.now()}.png`, { type: 'image/png' });

      setHeroAiReviewOriginalUrl(banner.desktop_image);
      setHeroAiReviewImprovedUrl(URL.createObjectURL(aiFile));
      setHeroAiReviewFile(aiFile);
      setHeroAiReviewBannerId(banner.id);
      setHeroAiReviewOpen(true);

      const newCredits = Math.max(0, heroAiCredits - heroCreditsNeeded);
      await supabase
        .from('settings')
        .update({ value: String(newCredits), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      setHeroAiCredits(newCredits);
    } catch (err: any) {
      alert('Error al mejorar con IA: ' + (err.message || 'desconocido'));
    } finally {
      setImprovingHeroBannerId(null);
    }
  };

  const handleHeroAiRetry = async (corrections: string) => {
    if (!heroAiReviewFile || !heroAiReviewBannerId) return;
    setHeroAiReviewRetrying(true);
    try {
      let { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'hero_desktop')
        .order('sort_order', { ascending: true });

      let prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Enhance this hero banner image, keep 3:1 wide format.';
      prompt = `${prompt}. IMPORTANT corrections from user: ${corrections}`;

      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model')
        .eq('context', 'hero_desktop')
        .maybeSingle();

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('image', heroAiReviewFile);
      form.append('model', ctxSettings?.ai_model ?? 'gpt-image-1.5');

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const newBlob = new Blob([ab], { type: 'image/png' });
      const newFile = new File([newBlob], `hero-retry-${Date.now()}.png`, { type: 'image/png' });

      setHeroAiReviewFile(newFile);
      setHeroAiReviewImprovedUrl(URL.createObjectURL(newFile));
    } catch (err: any) {
      alert('Error al reenviar a IA: ' + (err.message || 'desconocido'));
    } finally {
      setHeroAiReviewRetrying(false);
    }
  };

  const handleHeroAiAccept = async () => {
    if (!heroAiReviewFile || !heroAiReviewBannerId) {
      setHeroAiReviewOpen(false);
      return;
    }
    try {
      const filename = `home_banners/${heroAiReviewBannerId}-desktop-ai-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(heroAiReviewFile, filename);
      await handleUpdateBanner(heroAiReviewBannerId, { desktop_image: url });

      setHeroAiReviewOpen(false);
      setHeroAiReviewFile(null);
      setHeroAiReviewBannerId(null);
    } catch (err: any) {
      console.error('Error guardando imagen IA:', err);
      alert('No se pudo guardar la imagen mejorada: ' + (err.message || 'desconocido') +
            '\n\nLa imagen mejorada sigue en el modal — podés reintentarlo o pedir más correcciones.');
    }
  };

  const HERO_MOBILE_FIXED_PROMPT = 
    'Reformat this wide banner image from a 3:1 aspect ratio into a perfect 1:1 ' +
    'square format. This is NOT a crop — preserve the same visual content, ' +
    'subjects, colors, text elements and overall composition. Recompose and ' +
    'extend the canvas as needed (extend background, reposition elements within ' +
    'the frame) so the result is a complete square image telling the same visual ' +
    'story as the original, without cutting off or losing any important visual ' +
    'element. Output must be exactly 1:1 square.';

  const handleGenerateMobileFromDesktop = async (banner: any) => {
    if (!banner.desktop_image) {
      alert('Subí primero la imagen de escritorio (3:1) — la versión móvil se genera a partir de ella.');
      return;
    }

    const { data: mobileCtxSettings } = await supabase
      .from('ai_image_context_settings')
      .select('credits_per_use')
      .eq('context', 'hero_desktop')
      .maybeSingle();
    const mobileCreditsNeeded = mobileCtxSettings?.credits_per_use ?? 1;

    if (heroAiCredits < mobileCreditsNeeded) {
      alert(`No tenés suficientes créditos de IA. Esta acción necesita ${mobileCreditsNeeded} crédito(s) y tenés ${heroAiCredits}.`);
      return;
    }

    if (!confirm('Esto va a generar una versión 1:1 a partir de la imagen de escritorio actual y REEMPLAZAR la imagen móvil. ¿Continuar?')) return;

    setGeneratingMobileFromDesktopId(banner.id);
    try {
      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', HERO_MOBILE_FIXED_PROMPT);
      form.append('quality', 'medium');
      form.append('imageUrl', banner.desktop_image);
      form.append('size', '1024x1024');

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });
      const file = new File([blob], `hero-mobile-${banner.id}-${Date.now()}.png`, { type: 'image/png' });

      const filename = `home_banners/${banner.id}-mobile-ai-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, filename);
      await handleUpdateBanner(banner.id, { mobile_image: url });

      const newCredits = Math.max(0, heroAiCredits - mobileCreditsNeeded);
      await supabase
        .from('settings')
        .update({ value: String(newCredits), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      setHeroAiCredits(newCredits);

      alert('✅ Versión móvil generada y guardada.');
    } catch (err: any) {
      alert('Error al generar versión móvil: ' + (err.message || 'desconocido'));
    } finally {
      setGeneratingMobileFromDesktopId(null);
    }
  };

  const handleGenerateSpeciesMobile = async (
    desktopField: string,
    mobileField: string,
    label: string
  ) => {
    const desktopUrl = (content as any)[desktopField];
    if (!desktopUrl) {
      alert(`Subí primero la imagen de escritorio de "${label}" — la versión móvil se genera a partir de ella.`);
      return;
    }

    setGeneratingSpeciesMobileField(mobileField);
    try {
      const { data: ctxSettings } = await supabase
        .from('ai_image_context_settings')
        .select('ai_model, credits_per_use')
        .eq('context', 'pet_cards')
        .maybeSingle();
      const model = ctxSettings?.ai_model ?? 'gpt-image-1.5';
      const creditsNeeded = ctxSettings?.credits_per_use ?? 1;

      if (heroAiCredits < creditsNeeded) {
        alert(`No tenés suficientes créditos de IA. Esta acción necesita ${creditsNeeded} crédito(s) y tenés ${heroAiCredits}.`);
        return;
      }

      if (!confirm(`Esto va a generar una versión móvil de "${label}" a partir de la de escritorio actual y REEMPLAZAR la versión móvil existente. ¿Continuar?`)) {
        return;
      }

      const { data: blocks } = await supabase
        .from('ai_image_config')
        .select('prompt_block')
        .eq('active', true)
        .eq('context', 'pet_cards')
        .order('sort_order', { ascending: true });
      const prompt = blocks && blocks.length > 0
        ? blocks.map((b: any) => b.prompt_block).join('. ')
        : 'Reformat this image into a 2:1 landscape format (800x400px), preserving all visual content.';

      const size = model === 'gpt-image-2' ? '1536x512' : '1536x1024';

      const form = new FormData();
      form.append('mode', 'edit');
      form.append('prompt', prompt);
      form.append('quality', 'medium');
      form.append('imageUrl', desktopUrl);
      form.append('model', model);
      form.append('size', size);

      const res = await fetch('/api/ai-image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const byteString = atob(data.b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });
      const file = new File([blob], `species-mobile-${mobileField}-${Date.now()}.png`, { type: 'image/png' });

      const filename = `bento/${mobileField}-ai-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, filename);

      const { error: updateError } = await supabase
        .from('home_content')
        .update({ [mobileField]: url })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      if (updateError) throw updateError;

      setContent(prev => ({ ...prev, [mobileField]: url }));

      const newCredits = Math.max(0, heroAiCredits - creditsNeeded);
      await supabase
        .from('settings')
        .update({ value: String(newCredits), updated_at: new Date().toISOString() })
        .eq('key', 'ai_image_credits');
      setHeroAiCredits(newCredits);

      alert(`✅ Versión móvil de "${label}" generada y guardada con éxito.`);
    } catch (err: any) {
      alert('Error al generar versión móvil: ' + (err.message || 'desconocido'));
    } finally {
      setGeneratingSpeciesMobileField(null);
    }
  };

  // Promo Banners Handlers (8:1)
  const handleAddPromoBanner = async () => {
    const newBanner = { desktop_image: '', mobile_image: '', cta_url: '', order_index: promoBanners.length, is_active: true };
    try {
      const { data, error } = await supabase.from('promo_banners').insert([newBanner]).select().single();
      if (error) {
        console.error('Supabase error detail:', error);
        throw error;
      }
      if (data) setPromoBanners([...promoBanners, data]);
    } catch (error: any) {
      console.error('Error adding promo banner:', error);
      alert(`Error al añadir banner promocional: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleUpdatePromoBanner = async (id: string, updates: Partial<PromoBannerType>) => {
    try {
      const { error } = await supabase.from('promo_banners').update(updates).eq('id', id);
      if (error) throw error;
      setPromoBanners(promoBanners.map(b => b.id === id ? { ...b, ...updates } : b));
    } catch (error) {
      console.error('Error updating promo banner:', error);
    }
  };

  const handleDeletePromoBanner = async (id: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      const { error } = await supabase.from('promo_banners').delete().eq('id', id);
      if (error) throw error;
      setPromoBanners(promoBanners.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting promo banner:', error);
    }
  };

  const handleAddSlider = async () => {
    const { data, error } = await supabase
      .from('home_category_sliders')
      .insert([{
        title: 'Nuevo slider',
        description: '',
        category_name: categories[0]?.name || '',
        cta_text: 'Ver todos',
        order_index: categorySliders.length,
        is_active: true,
      }])
      .select()
      .single();
    if (!error && data) setCategorySliders(prev => [...prev, data]);
  };

  const handleUpdateSlider = async (id: string, updates: Partial<CategorySliderConfig>) => {
    const { error } = await supabase
      .from('home_category_sliders')
      .update(updates)
      .eq('id', id);
    if (!error) {
      setCategorySliders(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const handleDeleteSlider = async (id: string) => {
    if (!confirm('¿Eliminar este slider?')) return;
    const { error } = await supabase.from('home_category_sliders').delete().eq('id', id);
    if (!error) setCategorySliders(prev => prev.filter(s => s.id !== id));
  };

  const handleSliderImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sliderId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      e.target.value = '';
      return;
    }

    setSliderUploading(sliderId);
    try {
      const fileName = `sliders/slider-${sliderId}-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, fileName);
      await handleUpdateSlider(sliderId, { bg_image: url });
    } catch (err: any) {
      console.error('Error subiendo slider:', err);
      alert('No se pudo guardar la imagen: ' + (err.message || 'desconocido') +
            '\n\nVolvé a intentarlo. La imagen NO se guardó.');
    } finally {
      setSliderUploading(null);
      e.target.value = '';
    }
  };

  const handleBentoImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      e.target.value = '';
      return;
    }

    setUploadingField(field);
    try {
      const fileName = `bento/${field}-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, fileName);

      const { error } = await supabase
        .from('home_content')
        .update({ [field]: url })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;

      setContent(prev => ({ ...prev, [field]: url }));
    } catch (err: any) {
      console.error('Error subiendo bento:', err);
      alert('No se pudo guardar la imagen: ' + (err.message || 'desconocido') +
            '\n\nVolvé a intentarlo. La imagen NO se guardó.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleAddTickerItem = async (position: 'top' | 'bottom') => {
    const itemsInPosition = tickerItems.filter(t => t.position === position);
    const { data, error } = await supabase
      .from('ticker_items')
      .insert([{ text: 'Nuevo item', emoji: '✦', order_index: itemsInPosition.length, is_active: true, position }])
      .select().single();
    if (!error && data) setTickerItems(prev => [...prev, data]);
  };

  const handleUpdateTickerItem = async (id: string, updates: Partial<TickerItem>) => {
    const { error } = await supabase.from('ticker_items').update(updates).eq('id', id);
    if (!error) setTickerItems(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTickerItem = async (id: string) => {
    if (!confirm('¿Eliminar este item?')) return;
    const { error } = await supabase.from('ticker_items').delete().eq('id', id);
    if (!error) setTickerItems(prev => prev.filter(t => t.id !== id));
  };

  const handlePaymentLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10MB');
      e.target.value = '';
      return;
    }

    setUploadingField(field);
    try {
      const fileName = `payments/${field}-${Date.now()}.webp`;
      const url = await safeOptimizeAndUpload(file, fileName);

      const { error } = await supabase
        .from('home_content')
        .update({ [field]: url })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;

      setContent(prev => ({ ...prev, [field]: url }));
    } catch (err: any) {
      console.error('Error subiendo logo de pago:', err);
      alert('No se pudo guardar la imagen: ' + (err.message || 'desconocido') +
            '\n\nVolvé a intentarlo. La imagen NO se guardó.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleSaveContent = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('home_content').upsert(content);
      if (error) throw error;
      alert('Contenido guardado correctamente.');
    } catch (error) {
      alert('Error al guardar el contenido.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contenido de Inicio</h1>
            <p className="text-sm text-gray-500 mt-1">
              Personaliza el carrusel de banners, las imágenes de mascotas, promociones y cintas de la página de inicio.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleSaveContent}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Save size={16} />
              {isSaving ? 'Guardando...' : 'Guardar Todo'}
            </button>
          </div>
        </div>

        {/* HERO BANNERS */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Banners Hero (Carrusel Principal)</h2>
              <p className="text-sm text-gray-500 mt-1">Proporción recomendada: 3:1 (Desktop) y 1:1 (Móvil/Tablet).</p>
            </div>
            <button
              onClick={handleAddBanner}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto"
            >
              <Plus size={16} />
              Añadir Banner Hero
            </button>
          </div>

          <div className="space-y-6">
            {banners.map((banner) => (
              <div key={banner.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 flex flex-col gap-5">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Versión Escritorio (3:1)</label>
                    <div className="w-full aspect-[3/1] bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative group">
                      {banner.desktop_image ? (
                        <img src={banner.desktop_image} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-gray-300 w-8 h-8" />
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                        <ImageIcon className="text-white w-6 h-6 mb-1" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Subir Imagen (3:1)</span>
                        <input type="file" accept="image/*" onChange={(e) => handleBannerImageUpload(e, banner.id, 'desktop_image', 'home_banners')} className="hidden" />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleImproveHeroDesktop(banner)}
                        disabled={improvingHeroBannerId === banner.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {improvingHeroBannerId === banner.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        Mejorar con IA
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroAiConfigOpen(true)}
                        className="p-1.5 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 rounded-md transition-colors"
                        title="Configurar prompts de IA para Hero Desktop"
                      >
                        <Settings2 size={13} />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Créditos IA: {heroAiCredits}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Versión Móvil (1:1)</label>
                    <div className="w-full aspect-square max-w-[180px] bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative group">
                      {banner.mobile_image ? (
                        <img src={banner.mobile_image} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-gray-300 w-8 h-8" />
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                        <ImageIcon className="text-white w-6 h-6 mb-1" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Subir Imagen (1:1)</span>
                        <input type="file" accept="image/*" onChange={(e) => handleBannerImageUpload(e, banner.id, 'mobile_image', 'home_banners')} className="hidden" />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateMobileFromDesktop(banner)}
                      disabled={generatingMobileFromDesktopId === banner.id}
                      className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 w-full justify-center max-w-[180px]"
                      title="Genera la versión 1:1 a partir de la imagen de escritorio actual"
                    >
                      {generatingMobileFromDesktopId === banner.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} />
                      )}
                      Mejorar con IA
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Texto del Botón (CTA)</label>
                    <input
                      type="text"
                      value={banner.cta_text || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { cta_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-350 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Enlace (URL) de Destino</label>
                    <input
                      type="text"
                      value={banner.cta_url || ''}
                      onChange={(e) => handleUpdateBanner(banner.id, { cta_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-350 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={banner.is_active}
                      onChange={(e) => handleUpdateBanner(banner.id, { is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Activo</span>
                  </label>
                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 size={14} /> Eliminar Banner
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PROMO BANNERS (8:1) */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Banners Promocionales (8:1)</h2>
              <p className="text-sm text-gray-500 mt-1">Banners horizontales que aparecen debajo de la sección principal. Proporción 8:1 (Desktop).</p>
            </div>
            <button
              onClick={handleAddPromoBanner}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto"
            >
              <Plus size={16} />
              Añadir Banner 8:1
            </button>
          </div>

          <div className="space-y-6">
            {promoBanners.map((banner) => (
              <div key={banner.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 flex flex-col gap-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Versión Escritorio (8:1)</label>
                    <div className="w-full aspect-[8/1] bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative group">
                      {banner.desktop_image ? (
                        <img src={banner.desktop_image} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-gray-300 w-8 h-8" />
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                        <ImageIcon className="text-white w-6 h-6 mb-1" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Subir Imagen (8:1)</span>
                        <input type="file" accept="image/*" onChange={(e) => handleBannerImageUpload(e, banner.id, 'desktop_image', 'promo_banners')} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Versión Móvil/Tablet (4:1)</label>
                    <div className="w-full aspect-[4/1] md:aspect-[8/1] bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative group">
                      {banner.mobile_image ? (
                        <img src={banner.mobile_image} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-gray-300 w-8 h-8" />
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                        <ImageIcon className="text-white w-6 h-6 mb-1" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">Subir Imagen Móvil</span>
                        <input type="file" accept="image/*" onChange={(e) => handleBannerImageUpload(e, banner.id, 'mobile_image', 'promo_banners')} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={banner.is_active}
                      onChange={(e) => handleUpdatePromoBanner(banner.id, { is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Activo</span>
                  </label>
                  <button
                    onClick={() => handleDeletePromoBanner(banner.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 size={14} /> Eliminar Banner Promocional
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPRAR POR MASCOTA — BENTOBOX */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Comprar por Mascota — Bentobox</h2>
            <p className="text-sm text-gray-500 mt-1">Sube la portada para cada especie (Desktop y Mobile). Las imágenes pasan por el optimizador WebP automáticamente.</p>
          </div>

          <div className="grid gap-6">
            {(() => {
              const slots = [
                {
                  label: 'Perros',
                  desktopField: 'perros_desktop',
                  mobileField: 'perros_mobile',
                  desktopAspect: 'aspect-square',
                  desktopDims: '600 × 600 px (1:1)',
                  mobileDims: '800 × 400 px (2:1)',
                },
                {
                  label: 'Gatos',
                  desktopField: 'gatos_desktop',
                  mobileField: 'gatos_mobile',
                  desktopAspect: 'aspect-square',
                  desktopDims: '600 × 600 px (1:1)',
                  mobileDims: '800 × 400 px (2:1)',
                },
                {
                  label: 'Aves',
                  desktopField: 'aves_desktop',
                  mobileField: 'aves_mobile',
                  desktopAspect: 'aspect-[3/1]',
                  desktopDims: '600 × 200 px (3:1)',
                  mobileDims: '800 × 400 px (2:1)',
                },
                {
                  label: 'Roedores',
                  desktopField: 'roedores_desktop',
                  mobileField: 'roedores_mobile',
                  desktopAspect: 'aspect-[3/1]',
                  desktopDims: '600 × 200 px (3:1)',
                  mobileDims: '800 × 400 px (2:1)',
                },
                {
                  label: 'Tortugas',
                  desktopField: 'tortugas_desktop',
                  mobileField: 'tortugas_mobile',
                  desktopAspect: 'aspect-[3/1]',
                  desktopDims: '600 × 200 px (3:1)',
                  mobileDims: '800 × 400 px (2:1)',
                },
              ];

              return slots.map(slot => (
                <div key={slot.label} className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">{slot.label}</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Desktop */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Escritorio — {slot.desktopDims}
                      </label>
                      <div className={`w-full ${slot.desktopAspect} bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative group`}>
                        {(content as any)[slot.desktopField] ? (
                          <img src={(content as any)[slot.desktopField]} className="w-full h-full object-cover" alt={slot.label} />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <ImageIcon className="text-gray-300 w-8 h-8" />
                            <span className="text-[10px] text-gray-400">{slot.desktopDims}</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                          {uploadingField === slot.desktopField ? (
                            <span className="text-white text-xs font-black animate-pulse">Subiendo...</span>
                          ) : (
                            <>
                              <ImageIcon className="text-white w-6 h-6 mb-1" />
                              <span className="text-white text-[10px] font-bold uppercase">Subir Desktop</span>
                              <span className="text-white/70 text-[9px] mt-0.5">{slot.desktopDims}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingField === slot.desktopField}
                            onChange={(e) => handleSpeciesImageUpload(e, slot.desktopField)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Móvil — {slot.mobileDims}
                      </label>
                      <div className="w-full aspect-[2/1] bg-white border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative group">
                        {(content as any)[slot.mobileField] ? (
                          <img src={(content as any)[slot.mobileField]} className="w-full h-full object-cover" alt={`${slot.label} mobile`} />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <ImageIcon className="text-gray-300 w-8 h-8" />
                            <span className="text-[10px] text-gray-400">{slot.mobileDims}</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                          {uploadingField === slot.mobileField ? (
                            <span className="text-white text-xs font-black animate-pulse">Subiendo...</span>
                          ) : (
                            <>
                              <ImageIcon className="text-white w-6 h-6 mb-1" />
                              <span className="text-white text-[10px] font-bold uppercase">Subir Mobile</span>
                              <span className="text-white/70 text-[9px] mt-0.5">{slot.mobileDims}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingField === slot.mobileField}
                            onChange={(e) => handleSpeciesImageUpload(e, slot.mobileField)}
                          />
                        </label>
                      </div>

                      {/* AI Generation Button */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleGenerateSpeciesMobile(slot.desktopField, slot.mobileField, slot.label)}
                          disabled={generatingSpeciesMobileField !== null}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingSpeciesMobileField === slot.mobileField ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Generando con IA...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} />
                              <span>Generar versión móvil con IA</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setPetCardsAiConfigOpen(true)}
                          className="p-2 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                          title="Configurar prompts de Bentobox"
                        >
                          <Settings2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveContent}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Guardando...' : 'Guardar Todo el Contenido'}
            </button>
          </div>
        </section>

        {/* BENTO PROMOCIONAL */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bento Promocional</h2>
              <p className="text-sm text-gray-500 mt-1">Configuración de las 3 tarjetas de promoción. Se visualizan si las 3 tienen una imagen. Proporción sugerida: Tarjeta grande 4:3, tarjetas pequeñas 2:1.</p>
            </div>
            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={(content as any).promo_bento_visible ?? true}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setContent(prev => ({ ...prev, promo_bento_visible: val }));
                  await supabase.from('home_content')
                    .update({ promo_bento_visible: val })
                    .eq('id', '00000000-0000-0000-0000-000000000001');
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Mostrar en el home</span>
            </label>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { imgField: 'promo_bento_1_image', urlField: 'promo_bento_1_url', label: 'Tarjeta Grande (izq)', aspect: 'aspect-[4/3]' },
              { imgField: 'promo_bento_2_image', urlField: 'promo_bento_2_url', label: 'Tarjeta Chica 1', aspect: 'aspect-[2/1]' },
              { imgField: 'promo_bento_3_image', urlField: 'promo_bento_3_url', label: 'Tarjeta Chica 2', aspect: 'aspect-[2/1]' },
            ].map(slot => (
              <div key={slot.imgField} className="space-y-3">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">{slot.label}</label>
                <div className={`w-full ${slot.aspect} bg-white border border-gray-200 rounded-xl overflow-hidden relative group flex items-center justify-center`}>
                  {(content as any)[slot.imgField] ? (
                    <img src={(content as any)[slot.imgField]} className="w-full h-full object-cover" alt={slot.label} />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="text-gray-300 w-8 h-8" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                    <ImageIcon className="text-white w-5 h-5 mb-1" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">Subir Imagen</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleBentoImageUpload(e, slot.imgField)} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enlace de Destino</label>
                  <input
                    type="text"
                    placeholder="URL (ej: /productos)"
                    value={(content as any)[slot.urlField] || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setContent(prev => ({ ...prev, [slot.urlField]: val }));
                      await supabase.from('home_content').update({ [slot.urlField]: val }).eq('id', '00000000-0000-0000-0000-000000000001');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CINTA DE TARJETAS */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pasarela de Beneficios (Tarjetas)</h2>
            <p className="text-sm text-gray-500 mt-1">Configura hasta 4 tarjetas destacadas con beneficio, ícono, texto explicativo y enlace. Se muestran sólo las que tienen un título asignado.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 space-y-4">
                <h3 className="text-sm font-semibold text-gray-950">Tarjeta de Beneficio {n}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
                    <input type="text" placeholder="Ej: Envíos rápidos"
                      value={(content as any)[`ribbon_${n}_title`] || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setContent(prev => ({ ...prev, [`ribbon_${n}_title`]: val }));
                        await supabase.from('home_content').update({ [`ribbon_${n}_title`]: val }).eq('id', '00000000-0000-0000-0000-000000000001');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ícono</label>
                    <select
                      value={(content as any)[`ribbon_${n}_icon`] || 'PawPrint'}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setContent(prev => ({ ...prev, [`ribbon_${n}_icon`]: val }));
                        await supabase.from('home_content').update({ [`ribbon_${n}_icon`]: val }).eq('id', '00000000-0000-0000-0000-000000000001');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                      {['Truck','Shield','Star','Heart','Award','Zap','Gift','Clock','PawPrint','ShoppingBag','Phone','MapPin','Percent','Tag','CheckCircle','Sparkles'].map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
                    <input type="text" placeholder="Descripción breve"
                      value={(content as any)[`ribbon_${n}_text`] || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setContent(prev => ({ ...prev, [`ribbon_${n}_text`]: val }));
                        await supabase.from('home_content').update({ [`ribbon_${n}_text`]: val }).eq('id', '00000000-0000-0000-0000-000000000001');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Enlace (URL)</label>
                    <input type="text" placeholder="/productos"
                      value={(content as any)[`ribbon_${n}_url`] || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setContent(prev => ({ ...prev, [`ribbon_${n}_url`]: val }));
                        await supabase.from('home_content').update({ [`ribbon_${n}_url`]: val }).eq('id', '00000000-0000-0000-0000-000000000001');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SLIDERS DE CATEGORÍA */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sliders de Categorías de Productos</h2>
              <p className="text-sm text-gray-500 mt-1">Destaca productos de una categoría específica con una imagen de fondo de portada lateral.</p>
            </div>
            <button onClick={handleAddSlider}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto">
              <Plus size={16} /> Agregar Slider
            </button>
          </div>
          <div className="space-y-6">
            {categorySliders.length === 0 && (
              <p className="text-center py-10 text-gray-400 text-sm italic">No hay sliders configurados. Agregue uno con el botón superior.</p>
            )}
            {categorySliders.map((slider) => (
              <div key={slider.id} className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{slider.title || 'Sin título'}</h3>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={slider.is_active}
                        onChange={(e) => handleUpdateSlider(slider.id, { is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Activo
                    </label>
                    <button onClick={() => handleDeleteSlider(slider.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-0 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                      <input type="text" value={slider.title}
                        onChange={(e) => handleUpdateSlider(slider.id, { title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea value={slider.description || ''}
                        onChange={(e) => handleUpdateSlider(slider.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría Asociada</label>
                        <select value={slider.category_name || ''}
                          onChange={(e) => handleUpdateSlider(slider.id, { category_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Texto del Botón (CTA)</label>
                        <input type="text" value={slider.cta_text || 'Ver todos'}
                          onChange={(e) => handleUpdateSlider(slider.id, { cta_text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Portada (Sugerido 280×400px)</label>
                    <div className="w-full aspect-[7/10] bg-white border border-gray-200 rounded-xl overflow-hidden relative group max-w-[180px] flex items-center justify-center">
                      {slider.bg_image ? (
                        <img src={slider.bg_image} className="w-full h-full object-cover" alt="bg" />
                      ) : (
                        <ImageIcon className="text-gray-300 w-8 h-8" />
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                        {sliderUploading === slider.id ? (
                          <span className="text-white text-xs animate-pulse">Subiendo...</span>
                        ) : (
                          <>
                            <ImageIcon className="text-white w-6 h-6 mb-1" />
                            <span className="text-white text-[10px] font-bold uppercase tracking-wider">Subir Portada</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden"
                          disabled={sliderUploading === slider.id}
                          onChange={(e) => handleSliderImageUpload(e, slider.id)} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CINTA DE TEXTO — TICKER */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Cintas de Contenido Desplazables (Ticker)</h2>
            <p className="text-sm text-gray-500 mt-1">Introduce avisos importantes fijos de barra de cabecera y define elementos decorativos que rotan.</p>
          </div>

          {/* Cinta Superior (fija, arriba de todo) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-md font-bold text-gray-800">Cinta superior (fija, arriba de todo)</h3>
                <p className="text-xs text-gray-500">Avisos importantes que se muestran en la barra superior fija.</p>
              </div>
              <button
                onClick={() => handleAddTickerItem('top')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto"
              >
                <Plus size={14} /> Agregar Item (Superior)
              </button>
            </div>

            <div className="space-y-3">
              {tickerItems.filter(item => item.position === 'top' || !item.position).length === 0 && (
                <p className="text-center py-6 text-gray-400 text-sm italic">No hay ítems configurados para la cinta superior.</p>
              )}
              {tickerItems.filter(item => item.position === 'top' || !item.position).map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-16">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ícono</label>
                      <input
                        type="text"
                        value={item.emoji}
                        onChange={(e) => handleUpdateTickerItem(item.id, { emoji: e.target.value })}
                        className="w-full text-center px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={2}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mensaje</label>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleUpdateTickerItem(item.id, { text: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Texto del aviso..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={(e) => handleUpdateTickerItem(item.id, { is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Activo
                    </label>
                    <button onClick={() => handleDeleteTickerItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cinta Inferior (debajo del banner promocional) */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-md font-bold text-gray-800">Cinta inferior (debajo del banner promocional)</h3>
                <p className="text-xs text-gray-500">Avisos importantes que se muestran debajo del banner de promociones.</p>
              </div>
              <button
                onClick={() => handleAddTickerItem('bottom')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto"
              >
                <Plus size={14} /> Agregar Item (Inferior)
              </button>
            </div>

            <div className="space-y-3">
              {tickerItems.filter(item => item.position === 'bottom').length === 0 && (
                <p className="text-center py-6 text-gray-400 text-sm italic">No hay ítems configurados para la cinta inferior.</p>
              )}
              {tickerItems.filter(item => item.position === 'bottom').map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-16">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ícono</label>
                      <input
                        type="text"
                        value={item.emoji}
                        onChange={(e) => handleUpdateTickerItem(item.id, { emoji: e.target.value })}
                        className="w-full text-center px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={2}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mensaje</label>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleUpdateTickerItem(item.id, { text: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Texto del aviso..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        onChange={(e) => handleUpdateTickerItem(item.id, { is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Activo
                    </label>
                    <button onClick={() => handleDeleteTickerItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ICONOS DE ESPECIE */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <SpeciesIconManager />
        </section>

        {/* MÉTODOS DE PAGO */}
        <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pasarelas y Métodos de Pago</h2>
            <p className="text-sm text-gray-500 mt-1">Logos que se despliegan en la franja informativa inferior. Recomendado: logotipos limpios con fondo transparente o blanco.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(n => (
              <div key={n} className="space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50/30 flex flex-col items-center">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase text-center">Método {n}</label>
                <div className="w-full aspect-[2/1] bg-white border border-gray-200 rounded-lg overflow-hidden relative group flex items-center justify-center">
                  {(content as any)[`payment_logo_${n}`] ? (
                    <img src={(content as any)[`payment_logo_${n}`]} className="w-full h-full object-contain p-2" alt={`Pago ${n}`} />
                  ) : (
                    <ImageIcon className="text-gray-300 w-5 h-5" />
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
                    <ImageIcon className="text-white w-4 h-4 mb-1" />
                    <span className="text-white text-[9px] font-bold uppercase">Subir</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => handlePaymentLogoUpload(e, `payment_logo_${n}`)} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <AIPromptConfigModal
          open={heroAiConfigOpen}
          onClose={() => setHeroAiConfigOpen(false)}
          context="hero_desktop"
          contextLabel="Banners Hero — Desktop"
        />
        <AIPromptConfigModal
          open={petCardsAiConfigOpen}
          onClose={() => setPetCardsAiConfigOpen(false)}
          context="pet_cards"
          contextLabel="Bentobox Mascotas"
        />
        <AIImageReviewModal
          open={heroAiReviewOpen}
          onClose={() => { setHeroAiReviewOpen(false); setHeroAiReviewFile(null); setHeroAiReviewBannerId(null); }}
          originalUrl={heroAiReviewOriginalUrl}
          improvedUrl={heroAiReviewImprovedUrl}
          onAccept={handleHeroAiAccept}
          onRetry={handleHeroAiRetry}
          isRetrying={heroAiReviewRetrying}
        />
      </div>
    </div>
  );
}
