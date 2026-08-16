'use client';
import React from 'react';
import Link from 'next/link';

type SpeciesImages = {
  perros_desktop: string | null;
  perros_mobile: string | null;
  gatos_desktop: string | null;
  gatos_mobile: string | null;
  aves_desktop: string | null;
  aves_mobile: string | null;
  roedores_desktop: string | null;
  roedores_mobile: string | null;
  tortugas_desktop: string | null;
  tortugas_mobile: string | null;
};

type SpeciesCard = {
  label: string;
  href: string;
  desktopKey: keyof SpeciesImages;
  mobileKey: keyof SpeciesImages;
  size: 'large' | 'small';
};

const SPECIES: SpeciesCard[] = [
  { label: 'Perros', href: '/productos?species=Perros', desktopKey: 'perros_desktop', mobileKey: 'perros_mobile', size: 'large' },
  { label: 'Gatos', href: '/productos?species=Gatos', desktopKey: 'gatos_desktop', mobileKey: 'gatos_mobile', size: 'large' },
  { label: 'Aves', href: '/productos?species=Aves', desktopKey: 'aves_desktop', mobileKey: 'aves_mobile', size: 'small' },
  { label: 'Roedores', href: '/productos?species=Roedores', desktopKey: 'roedores_desktop', mobileKey: 'roedores_mobile', size: 'small' },
  { label: 'Tortugas', href: '/productos?species=Tortugas', desktopKey: 'tortugas_desktop', mobileKey: 'tortugas_mobile', size: 'small' },
];

type PetCategoryCardsClientProps = {
  initialData?: SpeciesImages;
};

export default function PetCategoryCardsClient({ initialData }: PetCategoryCardsClientProps) {
  const images = initialData || {
    perros_desktop: null, perros_mobile: null,
    gatos_desktop: null, gatos_mobile: null,
    aves_desktop: null, aves_mobile: null,
    roedores_desktop: null, roedores_mobile: null,
    tortugas_desktop: null, tortugas_mobile: null,
  };

  const largeCards = SPECIES.filter(s => s.size === 'large');
  const smallCards = SPECIES.filter(s => s.size === 'small');

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-2xl md:text-4xl font-display font-black text-[#1A8A00] mb-8 uppercase tracking-tight">
          Compra por mascota:
        </h2>

        {/* Desktop bentobox — hidden on mobile */}
        <div className="hidden md:grid grid-cols-3 gap-4" style={{ gridTemplateRows: 'auto' }}>

          {/* Perros — large cuadrado */}
          <Link
            href={largeCards[0].href}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-square"
          >
            <div className="absolute inset-0 bg-[#eeee22]">
              {images[largeCards[0].desktopKey] && (
                <img
                  src={images[largeCards[0].desktopKey]!}
                  alt="Perros"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <h3 className="text-3xl font-display font-black text-white uppercase leading-tight drop-shadow-lg">
                {largeCards[0].label}
              </h3>
              <p className="text-white/80 text-sm font-display mt-1 group-hover:text-[#eeee22] transition-colors">
                Ver productos →
              </p>
            </div>
          </Link>

          {/* Gatos — large cuadrado */}
          <Link
            href={largeCards[1].href}
            className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-square"
          >
            <div className="absolute inset-0 bg-[#eeee22]">
              {images[largeCards[1].desktopKey] && (
                <img
                  src={images[largeCards[1].desktopKey]!}
                  alt="Gatos"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <h3 className="text-3xl font-display font-black text-white uppercase leading-tight drop-shadow-lg">
                {largeCards[1].label}
              </h3>
              <p className="text-white/80 text-sm font-display mt-1 group-hover:text-[#eeee22] transition-colors">
                Ver productos →
              </p>
            </div>
          </Link>

          {/* Columna derecha — Aves, Roedores, Tortugas apiladas */}
          <div className="flex flex-col gap-4">
            {smallCards.map(card => (
              <Link
                key={card.label}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex-1"
                style={{ minHeight: 0 }}
              >
                <div className="absolute inset-0 bg-[#1A8A00]">
                  {images[card.desktopKey] && (
                    <img
                      src={images[card.desktopKey]!}
                      alt={card.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center px-5">
                  <h3 className="text-xl font-display font-black text-white uppercase drop-shadow-lg group-hover:text-[#eeee22] transition-colors">
                    {card.label}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

        </div>

        {/* Mobile — stack vertical simple */}
        <div className="flex flex-col gap-4 md:hidden">
          {SPECIES.map(card => (
            <Link
              key={card.label}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 aspect-[2/1] block"
            >
              <div className="absolute inset-0 bg-[#eeee22]">
                {images[card.mobileKey] && (
                  <img
                    src={images[card.mobileKey]!}
                    alt={card.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <h3 className="text-2xl font-display font-black text-white uppercase leading-tight drop-shadow-lg">
                  {card.label}
                </h3>
                <p className="text-white/80 text-sm font-display mt-0.5 group-hover:text-[#eeee22] transition-colors">
                  Ver productos →
                </p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
