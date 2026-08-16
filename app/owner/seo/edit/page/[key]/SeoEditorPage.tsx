'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { savePageSeo } from '../../../actions';
import { ArrowLeft } from 'lucide-react';

type PageSeo = {
  page_key: string;
  page_label: string;
  page_url: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
};

export default function SeoEditorPage({ page }: { page: PageSeo }) {
  const router = useRouter();
  const [title, setTitle] = useState(page.meta_title || '');
  const [description, setDescription] = useState(page.meta_description || '');
  const [ogImage, setOgImage] = useState(page.og_image_url || '');
  const [isSaving, startSaving] = useTransition();

  const handleSave = () => {
    startSaving(async () => {
      const res = await savePageSeo({
        pageKey: page.page_key,
        metaTitle: title,
        metaDescription: description,
        ogImageUrl: ogImage,
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
    <div className="max-w-6xl mx-auto col-span-full">
      <Link href="/owner/seo" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> Volver
      </Link>
      <h1 className="text-2xl font-bold mb-1">Editar SEO — {page.page_label}</h1>
      <p className="text-gray-500 mb-6">{page.page_url}</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
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
            <label className="text-sm font-bold text-gray-700 mb-1 block">OG Image URL (opcional)</label>
            <input
              type="text"
              value={ogImage}
              onChange={e => setOgImage(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#1A8A00] outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !title || !description}
            className="w-full py-3 bg-[#1A8A00] hover:bg-[#064E3B] disabled:opacity-50 text-white rounded-2xl font-bold cursor-pointer"
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Vista previa en Google</div>
          <div className="bg-white border rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">tiempodemascotas.com.py{page.page_url}</div>
            <div className="text-xl text-blue-700 mb-1 leading-tight">{title || '(sin título)'}</div>
            <div className="text-sm text-gray-700">{description || '(sin descripción)'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
