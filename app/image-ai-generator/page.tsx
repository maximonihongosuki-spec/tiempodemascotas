'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Mode = 'edit' | 'generate'
type Quality = 'low' | 'medium' | 'high'
type InputMethod = 'file' | 'url'

interface DebugPayload {
  mode: Mode
  prompt: string
  quality: Quality
  size: string
  model: string
  hasImage: boolean
  imageSource: 'file' | 'url' | null
}

interface DebugResponse {
  b64?: string
  mode?: string
  model?: string
  prompt?: string
  quality?: string
  size?: string
  error?: string
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ImageAIGeneratorPage() {
  // Config
  const [mode, setMode] = useState<Mode>('edit')
  const [quality, setQuality] = useState<Quality>('medium')
  const [prompt, setPrompt] = useState(
    'Professional e-commerce photo, clean white background, centered product, soft natural lighting, sharp focus, 1:1 square format'
  )

  // Input de imagen
  const [inputMethod, setInputMethod] = useState<InputMethod>('file')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Debug
  const [sentPayload, setSentPayload] = useState<DebugPayload | null>(null)
  const [receivedPayload, setReceivedPayload] = useState<DebugResponse | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  // ─── Handlers de imagen ──────────────────────────────────────────────────

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('El archivo debe ser una imagen'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Máximo 20MB'); return }
    setImageFile(file)
    setPreviewSrc(URL.createObjectURL(file))
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }, [])

  const handleUrlLoad = async () => {
    if (!imageUrl.trim()) return
    setError(null)
    setPreviewSrc(imageUrl)
    setImageFile(null)
  }

  const clearImage = () => {
    setImageFile(null)
    setPreviewSrc(null)
    setImageUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Escribí un prompt'); return }
    if (mode === 'edit' && !imageFile && !imageUrl) { setError('En modo Edición necesitás cargar una imagen'); return }

    setLoading(true)
    setError(null)
    setResultImage(null)
    setReceivedPayload(null)

    const start = Date.now()

    // Construir payload de debug (lo que se muestra en la UI)
    const debugPayload: DebugPayload = {
      mode,
      prompt,
      quality,
      size: '1024x1024',
      model: 'gpt-image-1',
      hasImage: !!(imageFile || imageUrl),
      imageSource: imageFile ? 'file' : imageUrl ? 'url' : null,
    }
    setSentPayload(debugPayload)

    try {
      const form = new FormData()
      form.append('mode', mode)
      form.append('prompt', prompt)
      form.append('quality', quality)

      if (mode === 'edit') {
        if (imageFile) {
          form.append('image', imageFile)
        } else if (imageUrl) {
          // El servidor fetchea la URL — evita el bloqueo de CSP
          form.append('imageUrl', imageUrl)
        }
      }

      const res = await fetch('/api/ai-image', { method: 'POST', body: form })
      const data: DebugResponse = await res.json()

      setElapsed(Date.now() - start)
      setReceivedPayload(data)

      if (data.error) {
        setError(data.error)
      } else if (data.b64) {
        setResultImage(`data:image/png;base64,${data.b64}`)
      }
    } catch (err: any) {
      setError(err.message || 'Error de red')
      setElapsed(Date.now() - start)
    } finally {
      setLoading(false)
    }
  }

  const downloadResult = () => {
    if (!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage
    a.download = `ai-image-${Date.now()}.png`
    a.click()
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <h1 className="text-lg font-semibold tracking-tight">AI Image Generator</h1>
            <span className="text-xs text-white/30 font-mono">debug / dev tool</span>
          </div>
          <p className="text-sm text-white/40 mt-1 ml-5">
            Pipeline: Imagen → OpenAI (gpt-image-1) → WebP → Supabase Storage
          </p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ─── Columna izquierda: Controles ─── */}
          <div className="space-y-5">

            {/* Modo */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Modo</label>
              <div className="flex gap-2">
                {(['edit', 'generate'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      mode === m
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {m === 'edit' ? '✏️ Editar imagen' : '🪄 Generar desde prompt'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30">
                {mode === 'edit'
                  ? 'Toma tu imagen y la reformatea: fondo blanco, centrada, formato 1:1.'
                  : 'Genera una imagen de producto desde cero con el prompt.'}
              </p>
            </div>

            {/* Calidad */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Calidad</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as Quality[]).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      quality === q
                        ? 'bg-violet-600 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {q === 'low' ? 'Low — más rápido' : q === 'medium' ? 'Medium — recomendado' : 'High — máx calidad'}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-violet-500 font-mono"
                placeholder="Describí cómo querés la imagen..."
              />
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'E-commerce básico', prompt: 'Professional e-commerce product photo, pure white background, centered, soft studio lighting, sharp focus, 1:1 square format' },
                  { label: 'Fondo transparente', prompt: 'Product photo with transparent background, centered, professional lighting, sharp edges, e-commerce ready, 1:1 square format' },
                  { label: 'Lifestyle', prompt: 'Lifestyle product photo, natural light, clean minimal environment, centered product, professional quality, 1:1 square format' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setPrompt(preset.prompt)}
                    className="text-xs px-2 py-1 rounded bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all border border-white/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input de imagen */}
            {(mode === 'edit' || true) && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Imagen de entrada {mode === 'generate' && <span className="text-white/20">(opcional en modo Generar)</span>}
                </label>

                {/* Tabs */}
                <div className="flex gap-2">
                  {(['file', 'url'] as InputMethod[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setInputMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        inputMethod === m
                          ? 'bg-white/15 text-white'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      {m === 'file' ? '📁 Desde dispositivo' : '🔗 Desde URL'}
                    </button>
                  ))}
                </div>

                {inputMethod === 'file' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    <p className="text-sm text-white/40">Arrastrá una imagen o hacé click</p>
                    <p className="text-xs text-white/20 mt-1">JPG, PNG, WebP — máx. 20MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500 font-mono"
                    />
                    <button
                      onClick={handleUrlLoad}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white transition-all"
                    >
                      Cargar
                    </button>
                  </div>
                )}

                {/* Preview de imagen cargada */}
                {previewSrc && (
                  <div className="relative inline-block">
                    <img src={previewSrc} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-white/20" />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                    <span className="block text-xs text-white/30 mt-1">
                      {imageFile ? `${imageFile.name} (${(imageFile.size / 1024).toFixed(0)} KB)` : 'Desde URL'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botón */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generando... (puede tardar 15-40 seg)
                </>
              ) : (
                <>✨ Generar imagen</>
              )}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                ❌ {error}
              </div>
            )}
          </div>

          {/* ─── Columna derecha: Debug + Resultado ─── */}
          <div className="space-y-5">

            {/* Imágenes: antes y después */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Comparación</label>
                {elapsed && <span className="text-xs text-white/30 font-mono">{(elapsed / 1000).toFixed(1)}s</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-white/30 text-center">Imagen enviada</p>
                  <div className="aspect-square bg-black/40 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                    {previewSrc
                      ? <img src={previewSrc} alt="Input" className="w-full h-full object-contain" />
                      : <span className="text-xs text-white/20">Sin imagen</span>
                    }
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-white/30 text-center">Imagen recibida</p>
                  <div className="aspect-square bg-black/40 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                    {loading
                      ? <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                      : resultImage
                        ? <img src={resultImage} alt="Output" className="w-full h-full object-contain" />
                        : <span className="text-xs text-white/20">Esperando...</span>
                    }
                  </div>
                </div>
              </div>
              {resultImage && (
                <button
                  onClick={downloadResult}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-all"
                >
                  ⬇ Descargar resultado
                </button>
              )}
            </div>

            {/* Payload enviado */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Payload enviado</label>
              <pre className="bg-black/60 rounded-lg p-3 text-xs font-mono text-green-400 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {sentPayload ? JSON.stringify(sentPayload, null, 2) : '// Vacío — generá una imagen primero'}
              </pre>
            </div>

            {/* Payload recibido */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Payload recibido</label>
              <pre className="bg-black/60 rounded-lg p-3 text-xs font-mono text-blue-400 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {receivedPayload
                  ? JSON.stringify(
                      { ...receivedPayload, b64: receivedPayload.b64 ? `[base64 ${Math.round((receivedPayload.b64.length * 3) / 4 / 1024)} KB]` : undefined },
                      null, 2
                    )
                  : '// Vacío — generá una imagen primero'
                }
              </pre>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
