'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  type: string;
  image_url?: string | null;
  is_visible?: boolean | null;
};

const HOME_CARD_GEN_MAP: Record<string, string> = {
  'Salud y Farmacia Veterinaria': 'Salud y Farmacia Veterinaria|Medicina y Cuidado',
  'Accesorios': 'Accesorios|Accesorios Varios',
};

export default function CategoryCards() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('id, name, type, image_url, is_visible')
          .eq('type', 'general')
          .not('image_url', 'is', null)
          .eq('is_visible', true)
          .order('name');
        if (data) setCategories(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [categories]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-[#FAFFD1]/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-none w-[260px] aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-[#FAFFD1]/30">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-block px-4 py-1 bg-[#eeee22] text-[#1A8A00] text-xs font-display font-bold uppercase tracking-wider mb-3 rounded-full">
              Explorá por categoría
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-[#1A8A00] uppercase tracking-tight leading-none">
              ¿Qué estás<br />buscando?
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {/* Botones de navegación desktop */}
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-[#166534]" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-[#166534]" />
            </button>
            <Link
              href="/productos"
              className="flex items-center gap-2 text-[#1A8A00] font-display font-bold text-sm hover:text-[#064E3B] transition-colors ml-2"
            >
              Ver todo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
        >
          {categories.map(cat => (
            <Link
              key={cat.id}
              href={`/productos?cat_gen=${encodeURIComponent(HOME_CARD_GEN_MAP[cat.name] || cat.name)}`}
              className="group relative overflow-hidden rounded-2xl flex-none w-[220px] md:w-[280px] lg:w-[300px] aspect-[4/3] block shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Imagen de fondo */}
              <Image
                src={cat.image_url!}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />

              {/* Overlay gradiente */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/80 via-[#111111]/20 to-transparent transition-opacity duration-300 z-10" />

              {/* Nombre */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="text-white font-display font-black text-lg md:text-xl uppercase leading-tight drop-shadow-md group-hover:text-[#eeee22] transition-colors duration-300">
                  {cat.name}
                </h3>
                <div className="flex items-center gap-1 text-white/70 text-xs font-display mt-0.5 group-hover:text-[#eeee22]/80 transition-colors">
                  <span>Ver productos</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Ver todo mobile */}
        <div className="mt-5 text-center md:hidden">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-[#1A8A00] font-display font-bold text-sm"
          >
            Ver todos los productos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
