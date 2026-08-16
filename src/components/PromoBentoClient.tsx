'use client';
import React from 'react';
import Link from 'next/link';

type PromoBentoData = {
  promo_bento_1_image: string | null;
  promo_bento_1_url: string | null;
  promo_bento_2_image: string | null;
  promo_bento_2_url: string | null;
  promo_bento_3_image: string | null;
  promo_bento_3_url: string | null;
};

type PromoBentoClientProps = {
  initialData?: PromoBentoData;
};

export default function PromoBentoClient({ initialData }: PromoBentoClientProps) {
  const visible = (initialData as any)?.promo_bento_visible ?? true;
  if (!visible) return null;
  if (!initialData || !initialData.promo_bento_1_image || !initialData.promo_bento_2_image || !initialData.promo_bento_3_image) {
    return null;
  }

  const cards = [
    { image: initialData.promo_bento_1_image, url: initialData.promo_bento_1_url || '#', large: true },
    { image: initialData.promo_bento_2_image, url: initialData.promo_bento_2_url || '#', large: false },
    { image: initialData.promo_bento_3_image, url: initialData.promo_bento_3_url || '#', large: false },
  ];

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gridTemplateRows: 'auto' }}>

          {/* Tarjeta grande — ocupa toda la columna izquierda */}
          <Link
            href={cards[0].url}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 md:row-span-2 aspect-[8/3] md:aspect-auto"
          >
            <img
              src={cards[0].image}
              alt="Promoción destacada"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          {/* Tarjeta 2 */}
          <Link
            href={cards[1].url}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-[4/1]"
          >
            <img
              src={cards[1].image}
              alt="Promoción 2"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          {/* Tarjeta 3 */}
          <Link
            href={cards[2].url}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-[4/1]"
          >
            <img
              src={cards[2].image}
              alt="Promoción 3"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

        </div>
      </div>
    </section>
  );
}
