import { NextRequest, NextResponse } from 'next/server'

// Cache para imágenes de referencia con TTL de 5 minutos (evita N+1 descargas por lote)
interface CachedImage {
  blob: Blob;
  expiresAt: number;
}
const referenceImageCache = new Map<string, CachedImage>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getCachedReferenceImage(url: string): Promise<Blob> {
  const now = Date.now();
  const cached = referenceImageCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.blob;
  }

  const refRes = await fetch(url);
  if (!refRes.ok) {
    throw new Error(`Error HTTP ${refRes.status} al descargar de: ${url}`);
  }
  const blob = await refRes.blob();
  
  referenceImageCache.set(url, {
    blob,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return blob;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData()
    const mode = body.get('mode') as string        // 'edit' | 'generate'
    const prompt = body.get('prompt') as string
    const productMetadataRaw = body.get('productMetadata') as string | null
    const referenceImageUrlsRaw = body.get('referenceImageUrls') as string | null
    const quality = (body.get('quality') as string) || 'standard'
    const imageFile = body.get('image') as File | null
    const imageUrlParam = body.get('imageUrl') as string | null
    const requestedModel = (body.get('model') as string) || 'gpt-image-1.5'
    const requestedSize = (body.get('size') as string) || '1024x1024'
    const allowedModels = ['gpt-image-1.5', 'gpt-image-1-mini', 'gpt-image-2']
    const modelToUse = allowedModels.includes(requestedModel) ? requestedModel : 'gpt-image-1.5'

    let finalPrompt = prompt;
    if (productMetadataRaw) {
      try {
        const meta = JSON.parse(productMetadataRaw);
        const parts: string[] = [];
        if (meta.name) parts.push(`product name: "${meta.name}"`);
        if (meta.brand) parts.push(`brand: ${meta.brand}`);
        if (Array.isArray(meta.category_general) && meta.category_general.length)
          parts.push(`general category: ${meta.category_general.join(', ')}`);
        if (Array.isArray(meta.category_specific) && meta.category_specific.length)
          parts.push(`type: ${meta.category_specific.join(', ')}`);
        if (Array.isArray(meta.category_species) && meta.category_species.length)
          parts.push(`for: ${meta.category_species.join(', ')}`);
        if (Array.isArray(meta.category_age) && meta.category_age.length)
          parts.push(`age stage: ${meta.category_age.join(', ')}`);
        if (Array.isArray(meta.tags) && meta.tags.length)
          parts.push(`tags: ${meta.tags.slice(0, 5).join(', ')}`);

        if (parts.length > 0) {
          finalPrompt = `${prompt}\n\n--- PRODUCT CONTEXT (use to ensure visual coherence, do NOT add as text in the image) ---\n${parts.join('. ')}.`;
        }
      } catch (err) {
        console.warn('productMetadata inválida, ignorando:', err);
      }
    }

    let referenceImageBlobs: Blob[] = []
    if (referenceImageUrlsRaw) {
      try {
        const urls: string[] = JSON.parse(referenceImageUrlsRaw)
        for (const url of urls.slice(0, 2)) {
          try {
            const refBlob = await getCachedReferenceImage(url)
            referenceImageBlobs.push(refBlob)
          } catch (e) {
            console.warn('No se pudo descargar o recuperar imagen de referencia cached:', url, e)
          }
        }
      } catch (e) {
        console.warn('referenceImageUrls inválido, ignorando:', e)
      }
    }

    if (referenceImageBlobs.length > 0) {
      finalPrompt = `${finalPrompt}\n\n--- REFERENCE IMAGES NOTE ---\nThe FIRST input image is the actual product photo to edit — preserve its product/packaging with full fidelity. Any ADDITIONAL input images are STYLE AND COMPOSITION REFERENCES ONLY. Use them purely as visual inspiration for lighting, background, framing, or mood. Do NOT copy their specific objects or subjects into the final output unless the main prompt explicitly instructs you to.`
    }

    const logoImageUrlParam = body.get('logoImageUrl') as string | null
    let logoImageBlob: Blob | null = null
    if (logoImageUrlParam) {
      try {
        logoImageBlob = await getCachedReferenceImage(logoImageUrlParam)
        finalPrompt = `${finalPrompt}\n\n--- OFFICIAL LOGO NOTE ---\nThe LAST input image provided is the OFFICIAL BUSINESS LOGO. You MUST reproduce it EXACTLY as given — same shape, same colors, same text, pixel-accurate, unaltered — placed as instructed in the main prompt. Do NOT redesign, recolor, reinterpret, or replace it with your own icon/badge. This is a strict requirement, not a stylistic suggestion.`
      } catch (e) {
        console.warn('No se pudo descargar el logo:', logoImageUrlParam, e)
      }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no configurada en el servidor' }, { status: 500 })
    }

    const openAIForm = new FormData()

    if (mode === 'edit') {
      let imageBlob: Blob | null = null

      if (imageFile) {
        imageBlob = imageFile
      } else if (imageUrlParam) {
        const fetched = await fetch(imageUrlParam)
        if (!fetched.ok) throw new Error('No se pudo descargar la imagen desde la URL')
        imageBlob = await fetched.blob()
      }

      if (!imageBlob) {
        return NextResponse.json({ error: 'Se requiere una imagen en modo edit' }, { status: 400 })
      }

      openAIForm.append('model', modelToUse)
      openAIForm.append('prompt', finalPrompt)
      openAIForm.append('size', requestedSize)
      const mappedQuality = quality === 'standard' ? 'medium' : quality
      openAIForm.append('quality', mappedQuality)
      
      openAIForm.append('image[]', imageBlob, 'input.png')
      for (let i = 0; i < referenceImageBlobs.length; i++) {
        openAIForm.append('image[]', referenceImageBlobs[i], `reference-${i}.webp`)
      }
      if (logoImageBlob) {
        openAIForm.append('image[]', logoImageBlob, 'logo.png')
      }

      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: openAIForm,
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Error OpenAI' }, { status: res.status })
      return NextResponse.json({ 
        b64: data.data[0].b64_json,
        mode: 'edit',
        model: modelToUse,
        prompt: finalPrompt,
        quality,
        size: requestedSize
      })

    } else {
      // Generación pura desde prompt
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          prompt: finalPrompt,
          size: requestedSize,
          quality: quality === 'standard' ? 'medium' : quality,
          n: 1,
          response_format: 'b64_json',
        }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Error OpenAI' }, { status: res.status })
      return NextResponse.json({ 
        b64: data.data[0].b64_json,
        mode: 'generate',
        model: modelToUse,
        prompt: finalPrompt,
        quality,
        size: requestedSize
      })
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
