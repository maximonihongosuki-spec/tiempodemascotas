'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveProductSeo, generateProductSeoWithAi } from '../../../actions';
import { ArrowLeft, Sparkles } from 'lucide-react';
import OgImageGenerator from './OgImageGenerator';

type Product = {
  id: string;
  name: string;
  public_name: string | null;
  url_slug: string;
  price: number;
  special_price: number | null;
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

type SeoRow = {
  meta_title: string | null;
  meta_description: string | null;
  schema_description: string | null;
  og_image_url: string | null;
} | null;

export default function SeoEditorProduct({ product, initialSeo }: { product: Product; initialSeo: SeoRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSeo?.meta_title || '');
  const [description, setDescription] = useState(initialSeo?.meta_description || '');
  const [schemaDesc, setSchemaDesc] = useState(initialSeo?.schema_description || '');
  const [ogImage, setOgImage] = useState(initialSeo?.og_image_url || product.uploaded_image_url || product.image_url || '');
  const [isSaving, startSaving] = useTransition();
  const [isGenerating, startGenerating] = useTransition();

  const displayName = product.public_name || product.name;

  const handleGenerate = () => {
    startGenerating(async () => {
      const res = await generateProductSeoWithAi(product.id);
      if (res.success && res.data) {
        setTitle(res.data.meta_title);
        setDescription(res.data.meta_description);
        setSchemaDesc(res.data.schema_description || '');
      } else {
        alert('Error IA: ' + res.error);
      }
    });
  };

  const handleSave = (markAsOk: boolean) => {
    startSaving(async () => {
      const res = await saveProductSeo({
        productId: product.id,
        metaTitle: title,
        metaDescription: description,
        schemaDescription: schemaDesc,
        ogImageUrl: ogImage,
        status: markAsOk ? 'ok' : 'pending',
      });
      if (res.success) {
        router.push('/owner/seo');
        router.refresh();
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  const titleLen = title.length;
  const descLen = description.length;

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/owner/seo" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> Volver
      </Link>
      <h1 className="text-2xl font-bold mb-1">Editar SEO</h1>
      <p className="text-gray-500 mb-6">{displayName}</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            {isGenerating ? 'Generando con IA…' : 'Generar con IA'}
          </button>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 flex justify-between">
              Meta Title
              <span className={titleLen > 60 ? 'text-red-500' : titleLen > 55 ? 'text-amber-500' : 'text-gray-400'}>
                {titleLen} / 60
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
              maxLength={80}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 flex justify-between">
              Meta Description
              <span className={descLen > 160 ? 'text-red-500' : descLen > 155 ? 'text-amber-500' : 'text-gray-400'}>
                {descLen} / 160
              </span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 block">
              Descripción para Schema.org (opcional)
              <span className="text-xs text-gray-400 block font-normal">
                Versión neutra para Google Rich Results. Si está vacía, se usa la descripción real del producto.
              </span>
            </label>
            <textarea
              value={schemaDesc}
              onChange={e => setSchemaDesc(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
              maxLength={500}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-1 block">OG Image URL (opcional)</label>
            <input
              type="text"
              value={ogImage}
              onChange={e => setOgImage(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
              placeholder="Vacío = usa la imagen del producto"
            />
          </div>

          <OgImageGenerator product={product} onSaved={(url) => setOgImage(url)} />

          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold text-gray-700"
            >
              Guardar borrador
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || !title || !description}
              className="flex-1 py-3 bg-[#1A8A00] hover:bg-[#064E3B] disabled:opacity-50 text-white rounded-2xl font-bold"
            >
              Guardar y marcar OK
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Vista previa en Google</div>
            <div className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-600 mb-1">tiempodemascotas.com.py › {product.url_slug}</div>
              <div className="text-xl text-blue-700 mb-1 leading-tight">{title || '(sin título)'}</div>
              <div className="text-sm text-gray-700">{description || '(sin descripción)'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Vista previa en WhatsApp / Facebook</div>
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              {ogImage && <img src={ogImage} alt="" className="w-full aspect-[1.91/1] object-cover" />}
              <div className="p-4">
                <div className="text-xs text-gray-500 uppercase mb-1">tiempodemascotas.com.py</div>
                <div className="font-bold text-[#1E1B4B] mb-1 line-clamp-2">{title || '(sin título)'}</div>
                <div className="text-sm text-gray-600 line-clamp-2">{description || '(sin descripción)'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
