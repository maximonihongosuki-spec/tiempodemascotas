'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, Product } from '../lib/supabase';
import { pgOverlaps } from '../lib/pgArrayFilter';
import { ChevronLeft, ChevronRight, ShoppingCart, ArrowRight, Info } from 'lucide-react';
import { categoryToSlug } from '../lib/categoryUtils';
import { formatProductName } from '../lib/textFormat';
import { sortAlphabeticalStockLast } from '../lib/productSort';

type CategorySliderProps = {
  title: string;
  description?: string | null;
  categoryName: string;
  bgImage?: string | null;
  ctaText?: string | null;
  onAddToCart?: (product: Product) => void;
};

export default function CategorySlider({
  title,
  description,
  categoryName,
  bgImage,
  ctaText = 'Ver todos',
  onAddToCart,
}: CategorySliderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Buscar categorías específicas que pertenecen a esta categoría general
        const { data: cats } = await supabase
          .from('categories')
          .select('name, parent_id')
          .eq('type', 'specific');

        const { data: generalCat } = await supabase
          .from('categories')
          .select('id')
          .eq('type', 'general')
          .eq('name', categoryName)
          .single();

        if (!generalCat) { setLoading(false); return; }

        const specificNames = (cats || [])
          .filter(c => c.parent_id === generalCat.id)
          .map(c => c.name);

        if (specificNames.length === 0) { setLoading(false); return; }

        const { data: settings } = await supabase.from('site_settings').select('show_out_of_stock').single();
        const showOutOfStock = settings?.show_out_of_stock ?? false;

        let query = supabase
          .from('products')
          .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, requires_prescription, category_brand, category_specific')
          .eq('active', true)
          .eq('is_parent', false);

        if (!showOutOfStock) {
          query = query.gt('stock', 0);
        }

        const { data } = await pgOverlaps(query, 'category_specific', specificNames)
          .order('created_at', { ascending: false })
          .limit(16);

        if (data) setProducts(sortAlphabeticalStockLast(data as Product[]));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [categoryName]);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    setIsCollapsed(el.scrollLeft > 8);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 220;
    el.scrollBy({ left: direction === 'right' ? cardWidth * 2 : -cardWidth * 2, behavior: 'smooth' });
  };

  if (loading || products.length === 0) return null;

  const slug = categoryToSlug(categoryName);

  return (
    <section className="py-8 md:py-12 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex gap-4 md:gap-6 items-stretch">

          {/* Tarjeta fija izquierda — colapsable en mobile */}
          <div
            className={`relative flex-shrink-0 rounded-2xl overflow-hidden shadow-lg transition-all duration-400 ease-in-out
              ${isCollapsed ? 'w-[64px]' : 'w-[78vw] max-w-[300px]'} md:w-[280px]`}
          >
            {/* Imagen de fondo — SIEMPRE visible, sin overlay total */}
            {bgImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${bgImage})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-[#1A8A00]" />
            )}

            {/* Panel esmerilado — MOBILE */}
            <div
              className="md:hidden absolute bottom-0 left-0 right-0 backdrop-blur-md transition-all duration-400"
              style={{
                height: isCollapsed ? '100%' : '34%',
                background: isCollapsed
                  ? 'linear-gradient(to top, rgba(26,138,0,0.60) 0%, rgba(26,138,0,0.40) 60%, rgba(26,138,0,0.10) 100%)'
                  : 'linear-gradient(to top, rgba(26,138,0,0.70) 0%, rgba(26,138,0,0.50) 50%, rgba(26,138,0,0) 100%)',
              }}
            />

            {/* Panel esmerilado — DESKTOP (más alto para contener badge+título+descripción+CTA) */}
            <div
              className="hidden md:block absolute bottom-0 left-0 right-0 backdrop-blur-md"
              style={{
                height: '62%',
                background: 'linear-gradient(to top, rgba(26,138,0,0.70) 0%, rgba(26,138,0,0.45) 55%, rgba(26,138,0,0) 100%)',
              }}
            />

            {/* ── Contenido: HORIZONTAL (estado full size) ── */}
            {!isCollapsed && (
              <div className="relative z-10 flex flex-col h-full p-3 md:p-6 justify-end min-h-[280px] animate-fade-in">
                <div className="inline-block px-3 py-1 bg-[#eeee22] text-[#1A8A00] text-[10px] font-display font-black uppercase tracking-wider rounded-full mb-3 w-fit">
                  {categoryName}
                </div>
                <h3 className="text-lg md:text-2xl font-display font-black text-white uppercase leading-tight mb-2 drop-shadow-md">
                  {title}
                </h3>
                {description && (
                  <p className="text-white/90 text-xs font-display leading-relaxed mb-3 drop-shadow-sm hidden md:block">
                    {description}
                  </p>
                )}
                <Link
                  href={`/categoria/${slug}`}
                  className="inline-flex items-center gap-2 bg-[#eeee22] text-[#1A8A00] px-4 py-2.5 rounded-xl font-display font-black text-sm hover:bg-white transition-colors group w-fit"
                >
                  {ctaText}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}

            {/* ── Contenido: VERTICAL (estado columna, solo mobile) ── */}
            {isCollapsed && (
              <Link
                href={`/categoria/${slug}`}
                className="relative z-10 flex md:hidden flex-col items-center justify-center gap-6 h-full py-4 px-1 min-h-[280px] animate-fade-in"
              >
                <h3
                  className="text-white font-display font-black uppercase text-sm tracking-wide drop-shadow-md flex-1 flex items-center justify-center text-center"
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                  {title}
                </h3>
                <div className="w-7 h-7 bg-[#eeee22] text-[#1A8A00] rounded-full flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}

            {/* En desktop, si por alguna razón isCollapsed quedó true, forzar contenido horizontal siempre */}
            {isCollapsed && (
              <div className="relative z-10 hidden md:flex flex-col h-full p-6 justify-end min-h-[280px]">
                <div className="inline-block px-3 py-1 bg-[#eeee22] text-[#1A8A00] text-[10px] font-display font-black uppercase tracking-wider rounded-full mb-3 w-fit">
                  {categoryName}
                </div>
                <h3 className="text-2xl font-display font-black text-white uppercase leading-tight mb-2 drop-shadow-md">
                  {title}
                </h3>
                {description && (
                  <p className="text-white/90 text-xs font-display leading-relaxed mb-3 drop-shadow-sm">
                    {description}
                  </p>
                )}
                <Link
                  href={`/categoria/${slug}`}
                  className="inline-flex items-center gap-2 bg-[#eeee22] text-[#1A8A00] px-4 py-2.5 rounded-xl font-display font-black text-sm hover:bg-white transition-colors group w-fit"
                >
                  {ctaText}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>

          {/* Slider de productos */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">

            {/* Controles */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="w-8 h-8 rounded-full border-2 border-[#1A8A00] flex items-center justify-center text-[#1A8A00] hover:bg-[#1A8A00] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="w-8 h-8 rounded-full border-2 border-[#1A8A00] flex items-center justify-center text-[#1A8A00] hover:bg-[#1A8A00] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Productos */}
            <div
              ref={scrollRef}
              onScroll={updateScrollButtons}
              className="flex gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar flex-1"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {products.map(product => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[180px] md:w-[200px]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <Link
                    href={`/${product.url_slug || product.product_code}`}
                    className="group bg-white rounded-2xl border-2 border-transparent hover:border-[#eeee22]/40 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1 h-full"
                  >
                    <div className="aspect-square bg-gray-50 flex items-center justify-center p-3 overflow-hidden relative">
                      <img
                        src={product.uploaded_image_url || product.image_url}
                        alt={formatProductName(product)}
                        className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                        width={200}
                        height={200}
                      />
                      <div className="absolute bottom-1 right-1 z-10" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                        <div className="relative group/tooltip">
                          <div className="w-4 h-4 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center cursor-help transition-colors backdrop-blur-sm">
                            <Info size={9} className="text-white" />
                          </div>
                          <div className="absolute bottom-full right-0 mb-1 w-32 bg-gray-900 text-white text-[9px] leading-snug rounded-lg px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-150 z-20 shadow-lg">
                            Imagen ilustrativa — referencial
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5 flex flex-col flex-1">
                      <h3 className="text-xs font-display font-bold text-[#1E1B4B] line-clamp-2 leading-tight mb-1.5 group-hover:text-[#1A8A00] transition-colors flex-1">
                        {formatProductName(product)}
                      </h3>
                      <div className="mt-auto pt-1">
                        {typeof product.stock === 'number' && (
                          <p className={`text-[10px] font-bold mb-1 ${(product.stock || 0) > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                            {(product.stock || 0) > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-display font-black text-[#1A8A00]">
                            Gs. {product.price.toLocaleString('es-PY')}
                          </span>
                          {onAddToCart && (
                            <button
                              onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
                              className="w-7 h-7 bg-[#1A8A00] text-white rounded-full flex items-center justify-center hover:bg-[#064E3B] transition-all active:scale-90 flex-shrink-0"
                              aria-label="Agregar al carrito"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
