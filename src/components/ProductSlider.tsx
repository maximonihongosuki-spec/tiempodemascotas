'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, Product } from '../lib/supabase';
import { ChevronLeft, ChevronRight, ShoppingCart, Info } from 'lucide-react';
import { sortAlphabeticalStockLast } from '../lib/productSort';

type ProductSliderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  mode: 'featured' | 'newest';
  onAddToCart?: (product: Product) => void;
};

export default function ProductSlider({ title, subtitle, badge, mode, onAddToCart }: ProductSliderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data: settings } = await supabase.from('site_settings').select('show_out_of_stock').single();
        const showOutOfStock = settings?.show_out_of_stock ?? false;

        let query = supabase
          .from('products')
          .select('id, name, public_name, price, special_price, differentiated_price, image_url, uploaded_image_url, stock, url_slug, product_code, is_featured, requires_prescription, category_brand, category_specific')
          .eq('active', true)
          .eq('is_parent', false);

        if (!showOutOfStock) {
          query = query.gt('stock', 0);
        }

        query = query.limit(16);

        if (mode === 'featured') {
          query = query.eq('is_featured', true).order('created_at', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data } = await query;
        if (data) setProducts(sortAlphabeticalStockLast(data as Product[]));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [mode]);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('div[data-card]')?.clientWidth || 280;
    const scrollAmount = cardWidth * 2 + 16;
    el.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex-shrink-0 w-[260px] h-[340px] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            {badge && (
              <div className="inline-block px-4 py-1 bg-[#eeee22] text-[#1A8A00] text-xs font-display font-bold uppercase tracking-wider mb-3 rounded-full">
                {badge}
              </div>
            )}
            <h2 className="text-3xl md:text-5xl font-display font-black text-[#1A8A00] uppercase tracking-tight leading-none">
              {title}
            </h2>
            {subtitle && (
              <p className="text-gray-500 font-display mt-1 text-sm">{subtitle}</p>
            )}
          </div>

          {/* Botones prev/next */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full border-2 border-[#1A8A00] flex items-center justify-center text-[#1A8A00] hover:bg-[#1A8A00] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full border-2 border-[#1A8A00] flex items-center justify-center text-[#1A8A00] hover:bg-[#1A8A00] hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {products.map(product => (
            <div
              key={product.id}
              data-card
              className="flex-shrink-0 w-[220px] md:w-[260px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <Link
                href={`/${product.url_slug || product.product_code}`}
                className="group bg-white rounded-2xl border-2 border-transparent hover:border-[#eeee22]/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1 h-full"
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 overflow-hidden relative">
                  <img
                    src={product.uploaded_image_url || product.image_url}
                    alt={product.public_name || product.name}
                    className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                    width={260}
                    height={260}
                  />
                  <div className="absolute bottom-1.5 right-1.5 z-10" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                    <div className="relative group/tooltip">
                      <div className="w-5 h-5 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center cursor-help transition-colors backdrop-blur-sm">
                        <Info size={11} className="text-white" />
                      </div>
                      <div className="absolute bottom-full right-0 mb-1.5 w-40 bg-gray-900 text-white text-[10px] leading-snug rounded-lg px-2.5 py-1.5 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-150 z-20 shadow-lg">
                        Imagen ilustrativa — representación referencial del producto
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  {Array.isArray(product.category_specific) && product.category_specific.length > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A8A00] bg-[#ECFDF5] px-2 py-0.5 rounded-md w-fit mb-1">
                      {product.category_specific[0]}
                    </span>
                  )}
                  <h3 className="text-sm font-display font-bold text-[#1E1B4B] line-clamp-2 leading-tight mb-2 group-hover:text-[#1A8A00] transition-colors flex-1">
                    {product.public_name || product.name}
                  </h3>
                  <div className="mt-auto pt-2">
                    {typeof product.stock === 'number' && (
                      <p className={`text-[10px] font-bold mb-1 ${(product.stock || 0) > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                        {(product.stock || 0) > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-base md:text-lg font-display font-black text-[#1A8A00]">
                        Gs. {product.price.toLocaleString('es-PY')}
                      </span>
                      {onAddToCart && (
                        <button
                          onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
                          className="w-8 h-8 bg-[#1A8A00] text-white rounded-full flex items-center justify-center hover:bg-[#064E3B] transition-all shadow-sm active:scale-90 flex-shrink-0"
                          aria-label="Agregar al carrito"
                        >
                          <ShoppingCart className="w-4 h-4" />
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
    </section>
  );
}
