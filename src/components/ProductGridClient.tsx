'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../lib/supabase';
import { formatProductName } from '../lib/textFormat';
import { ShoppingCart, ArrowRight, Info, ChevronLeft } from 'lucide-react';
import { useProductVariants } from '../hooks/useProductVariants';
import { useCart } from './CartProvider';
import VolumePriceBadge from './VolumePriceBadge';
import { SpeciesIconRow } from './SpeciesIcons';

function CascadeImages({ images }: { images: string[] }) {
  const imgs = images.filter(Boolean).slice(0, 4);
  if (imgs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <span className="text-indigo-400 text-2xl">📦</span>
        </div>
      </div>
    );
  }
  if (imgs.length === 1) {
    return (
      <img
        src={imgs[0]}
        alt=""
        className="w-full h-full object-contain p-4 drop-shadow-md"
        loading="lazy"
        decoding="async"
      />
    );
  }

  const positions: Record<number, Array<{ top: string; left: string; size: string; zIndex: number; rotate: string }>> = {
    2: [
      { top: '5%',  left: '20%', size: '72%', zIndex: 1, rotate: '4deg' },
      { top: '5%',  left: '5%',  size: '72%', zIndex: 2, rotate: '-2deg' },
    ],
    3: [
      { top: '0%',  left: '20%', size: '68%', zIndex: 1, rotate: '6deg' },
      { top: '3%',  left: '12%', size: '68%', zIndex: 2, rotate: '2deg' },
      { top: '8%',  left: '4%',  size: '68%', zIndex: 3, rotate: '-3deg' },
    ],
    4: [
      { top: '0%',  left: '22%', size: '64%', zIndex: 1, rotate: '8deg' },
      { top: '3%',  left: '15%', size: '64%', zIndex: 2, rotate: '4deg' },
      { top: '7%',  left: '8%',  size: '64%', zIndex: 3, rotate: '0deg' },
      { top: '12%', left: '2%',  size: '64%', zIndex: 4, rotate: '-4deg' },
    ],
  };

  const pos = positions[imgs.length] || positions[4];

  return (
    <div className="relative w-full h-full">
      {imgs.map((img, idx) => {
        const p = pos[idx];
        return (
          <div
            key={idx}
            className="absolute bg-white rounded-xl overflow-hidden"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              zIndex: p.zIndex,
              transform: `rotate(${p.rotate})`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              padding: '6px',
            }}
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        );
      })}
    </div>
  );
}

export function ProductGridCard({ product, onAddToCart }: { product: Product; onAddToCart?: (p: Product) => void }) {
  const { variants, loading } = useProductVariants(
    product.is_parent ? product : null
  );

  const handleCardClick = () => {
    if (typeof window !== 'undefined') {
      const slug = product.url_slug || product.product_code;
      window.location.href = `/${slug}`;
    }
  };

  if (!product.is_parent) {
    const displayProduct = product;
    return (
      <div
        className="bg-white rounded-2xl md:rounded-[2rem] p-2 md:p-4 shadow-sm md:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border md:border-2 border-gray-100 md:border-transparent hover:border-[#1A8A00]/30 md:hover:border-[#eeee22]/30 hover:shadow-md md:hover:shadow-lg transition-all duration-300 flex flex-col relative group cursor-pointer hover:-translate-y-1 md:hover:-translate-y-2"
        onClick={handleCardClick}
      >
        {/* Imagen */}
        <div className="aspect-square bg-[#F9FAFB] rounded-xl md:rounded-[1.5rem] flex items-center justify-center p-2 md:p-6 overflow-hidden mb-2 md:mb-4 relative">
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          <img
            src={displayProduct.uploaded_image_url || displayProduct.image_url}
            alt={formatProductName(displayProduct)}
            className="w-full h-full object-contain rounded-lg md:rounded-2xl transform group-hover:scale-105 md:group-hover:scale-110 transition-transform duration-300 md:duration-500 md:drop-shadow-md"
            loading="lazy"
            decoding="async"
            width={300}
            height={300}
          />
          <div className="absolute bottom-1 md:bottom-1.5 right-1 md:right-1.5 z-10" onClick={e => e.stopPropagation()}>
            <div className="relative group/tooltip">
              <div className="w-4 h-4 md:w-5 md:h-5 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center cursor-help transition-colors backdrop-blur-sm">
                <Info size={9} className="text-white md:hidden" />
                <Info size={11} className="text-white hidden md:block" />
              </div>
              <div className="absolute bottom-full right-0 mb-1 md:mb-1.5 w-32 md:w-40 bg-gray-900 text-white text-[9px] md:text-[10px] leading-snug rounded-md md:rounded-lg px-2 md:px-2.5 py-1 md:py-1.5 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-150 z-20 shadow-lg">
                <span className="md:hidden">Imagen ilustrativa</span>
                <span className="hidden md:inline">Imagen ilustrativa — representación referencial del producto</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-1 md:bottom-1.5 left-1 md:left-1.5 z-10">
            <VolumePriceBadge
              volumePrices={(displayProduct as any).volume_prices}
              basePrice={(displayProduct as any).special_price || displayProduct.price || 0}
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex flex-col flex-1 px-1 md:px-2">
          {/* Etiquetas */}
          <div className="mb-1 flex flex-wrap gap-1">
            {(() => {
              const catName = (Array.isArray(product.category_general) && product.category_general[0]) || (product as any).category || 'Producto';
              return catName !== 'Producto' ? (
                <a
                  href={`/productos?cat_gen=${encodeURIComponent(catName)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-[#1A8A00] md:text-[#228B22] bg-[#ECFDF5] px-1.5 md:px-2 py-0.5 rounded md:rounded-md w-fit truncate max-w-full hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {catName}
                </a>
              ) : (
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-[#1A8A00] md:text-[#228B22] bg-[#ECFDF5] px-1.5 md:px-2 py-0.5 rounded md:rounded-md w-fit truncate max-w-full">
                  {catName}
                </span>
              );
            })()}
            {Array.isArray(product.category_detail) && product.category_detail.length > 0 && (
              <a
                href={`/productos?cat_sub_spec=${encodeURIComponent(product.category_detail[0])}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1 md:px-1.5 py-0.5 rounded md:rounded-md w-fit hidden md:inline-block hover:bg-amber-100 transition-colors cursor-pointer"
              >
                {product.category_detail[0]}
              </a>
            )}
            {displayProduct.is_bulk && (
              <span className="text-[8px] md:text-[9px] bg-orange-500 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide w-fit">
                A Granel
              </span>
            )}
          </div>
          <SpeciesIconRow species={displayProduct.category_species as string[]} />
          <h3 className="text-xs md:text-lg font-display font-bold text-[#1E1B4B] line-clamp-2 leading-tight mb-0.5 md:mb-1 group-hover:text-[#1A8A00] transition-colors">
            {formatProductName(product)}
          </h3>
          {product.product_code && (
            <p className="text-[9px] md:text-[10px] text-gray-400 font-mono mb-1 md:mb-1.5">
              {product.product_code}
            </p>
          )}

          <div className="mt-auto pt-1 md:pt-2">
            {typeof displayProduct.stock === 'number' && (
              <p className={`text-[9px] md:text-[10px] font-bold mb-0.5 md:mb-1 ${(displayProduct.stock || 0) > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                {(displayProduct.stock || 0) > 0 ? `Stock: ${displayProduct.stock}` : 'Sin stock'}
              </p>
            )}
            <div className="flex items-center justify-between gap-1 md:gap-2">
              <span className="text-sm md:text-2xl font-display font-black text-[#1A8A00] leading-none">
                Gs. {((displayProduct as any).special_price || displayProduct.price || 0).toLocaleString('es-PY')}
              </span>
              {onAddToCart && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(displayProduct);
                  }}
                  className="w-7 h-7 md:w-10 md:h-10 flex-shrink-0 bg-[#1A8A00] text-white rounded-full flex items-center justify-center hover:bg-[#064E3B] transition-all shadow-sm md:shadow-md active:scale-90"
                >
                  <ShoppingCart className="w-3.5 h-3.5 md:w-5 md:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [variantQtys, setVariantQtys] = useState<Record<string, number>>({});
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getVariantQty = (id: string) => variantQtys[id] || 1;
  const setVariantQty = (id: string, val: number) => {
    setVariantQtys(prev => ({ ...prev, [id]: val }));
  };

  useEffect(() => {
    if (isMobileView) return;
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover, isMobileView]);

  useEffect(() => {
    if (!isMobileView || !showPopover) return;
    window.history.pushState({ variantPopover: true }, '');
    const handlePopState = () => setShowPopover(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPopover, isMobileView]);

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const allOutOfStock = variants.length > 0 && variants.every(v => (v.stock || 0) <= 0);

  const prices = variants.map(v => (v as any).special_price || v.price || 0).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : (product.price || 0);

  return (
    <div
      className="bg-white rounded-2xl md:rounded-[2rem] p-2 md:p-4 shadow-sm md:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border md:border-2 border-indigo-100 md:border-transparent hover:border-indigo-500/30 hover:shadow-md md:hover:shadow-lg transition-all duration-300 flex flex-col relative group cursor-pointer hover:-translate-y-1 md:hover:-translate-y-2"
      onClick={handleCardClick}
    >
      {/* Badge "Grupo" */}
      <div className="absolute top-2 md:top-3 left-2 md:left-3 z-10" onClick={e => e.stopPropagation()}>
        <span className="text-[8px] md:text-[9px] bg-indigo-600 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide shadow-sm">
          Grupo
        </span>
        {allOutOfStock && (
          <span className="text-[8px] md:text-[9px] bg-red-600 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide ml-1 shadow-sm">
            Agotado
          </span>
        )}
        {variants.some(v => v.is_bulk) && (
          <span className="text-[8px] md:text-[9px] bg-orange-500 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide ml-1 shadow-sm">
            A Granel
          </span>
        )}
      </div>

      {/* Imagen */}
      <div className="aspect-square bg-[#F9FAFB] rounded-xl md:rounded-[1.5rem] flex items-center justify-center p-2 md:p-6 overflow-hidden mb-2 md:mb-4 relative">
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
        {(() => {
          const groupOwnImage = product.uploaded_image_url || product.image_url;
          const fallbackImage = variants.length > 0
            ? (variants[0].uploaded_image_url || variants[0].image_url)
            : null;
          const img = groupOwnImage || fallbackImage;
          return img ? (
            <img
              src={img}
              alt={formatProductName(product)}
              className="w-full h-full object-contain rounded-lg md:rounded-2xl transform group-hover:scale-105 md:group-hover:scale-110 transition-transform duration-300 md:duration-500 md:drop-shadow-md"
              loading="lazy"
              decoding="async"
              width={300}
              height={300}
            />
          ) : (
            <div className="text-gray-300 text-xs md:text-sm">Sin imagen</div>
          );
        })()}
        <div className="absolute bottom-1 md:bottom-1.5 right-1 md:right-1.5 z-10" onClick={e => e.stopPropagation()}>
          <div className="relative group/tooltip">
            <div className="w-4 h-4 md:w-5 md:h-5 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center cursor-help transition-colors backdrop-blur-sm">
              <Info size={9} className="text-white md:hidden" />
              <Info size={11} className="text-white hidden md:block" />
            </div>
            <div className="absolute bottom-full right-0 mb-1 md:mb-1.5 w-32 md:w-40 bg-gray-900 text-white text-[9px] md:text-[10px] leading-snug rounded-md md:rounded-lg px-2 md:px-2.5 py-1 md:py-1.5 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-150 z-20 shadow-lg">
              <span className="md:hidden">Imagen ilustrativa</span>
              <span className="hidden md:inline">Imagen ilustrativa — representación referencial del producto</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-1 md:bottom-1.5 left-1 md:left-1.5 z-10">
          <VolumePriceBadge
            volumePrices={(product as any).volume_prices}
            basePrice={product.price || 0}
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 px-1 md:px-2">
        {/* Etiquetas */}
        <div className="mb-1 flex flex-wrap gap-1">
          {(() => {
            const catName = (Array.isArray(product.category_general) && product.category_general[0]) || (product as any).category || 'Producto';
            return catName !== 'Producto' ? (
              <a
                href={`/productos?cat_gen=${encodeURIComponent(catName)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-[#1A8A00] md:text-[#228B22] bg-[#ECFDF5] px-1.5 md:px-2 py-0.5 rounded md:rounded-md w-fit truncate max-w-full hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {catName}
              </a>
            ) : (
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-[#1A8A00] md:text-[#228B22] bg-[#ECFDF5] px-1.5 md:px-2 py-0.5 rounded md:rounded-md w-fit truncate max-w-full">
                {catName}
              </span>
            );
          })()}
          {Array.isArray(product.category_detail) && product.category_detail.length > 0 && (
            <a
              href={`/productos?cat_sub_spec=${encodeURIComponent(product.category_detail[0])}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1 md:px-1.5 py-0.5 rounded md:rounded-md w-fit hidden md:inline-block hover:bg-amber-100 transition-colors cursor-pointer"
            >
              {product.category_detail[0]}
            </a>
          )}
        </div>

        <SpeciesIconRow species={variants.flatMap(v => v.category_species || [])} />

        <h3 className="text-[11px] md:text-base font-display font-bold text-[#1E1B4B] line-clamp-2 leading-tight mb-1 md:mb-2 group-hover:text-indigo-600 transition-colors">
          {formatProductName(product)}
        </h3>

        {product.product_code && (
          <p className="text-[9px] md:text-[10px] text-gray-400 font-mono mb-1 md:mb-1.5 truncate">
            {product.product_code}
          </p>
        )}

        <div className="mt-auto pt-1 md:pt-2">
          <p className="text-[9px] md:text-[10px] font-bold text-gray-500 mb-0.5 md:mb-1">
            {loading ? 'Cargando...' : `${variants.length} variante${variants.length !== 1 ? 's' : ''} · Stock: ${totalStock}`}
          </p>

          <div className="flex items-center justify-between flex-wrap gap-y-2 gap-x-1 md:gap-2">
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase leading-none mb-0.5">Precio desde</span>
              <span className="text-sm md:text-2xl font-display font-black text-[#1A8A00] leading-none">
                Gs. {minPrice.toLocaleString('es-PY')}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPopover(true);
              }}
              className={`px-2.5 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white rounded-full text-[9px] md:text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm active:scale-95 flex items-center gap-1 ${
                allOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>Ver {variants.length} opciones</span>
              <span className="text-[10px]">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Popover / Panel flotante de variantes */}
      {showPopover && (() => {
        const panelContent = (
          <div
            ref={popoverRef}
            className={isMobileView
              ? 'fixed inset-0 z-[9999] bg-white flex flex-col p-4 animate-in slide-in-from-bottom duration-200'
              : 'absolute inset-0 z-50 bg-white rounded-2xl md:rounded-[2rem] p-3 md:p-4 shadow-2xl border-2 border-indigo-200 flex flex-col animate-in fade-in duration-200'
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
              <div className="min-w-0">
                <h4 className="text-xs md:text-sm font-display font-black text-[#1E1B4B] truncate leading-tight">
                  {formatProductName(product)}
                </h4>
                <p className="text-[9px] text-gray-400">Seleccioná una presentación</p>
              </div>
              <button
                onClick={() => setShowPopover(false)}
                className="hidden md:flex w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 items-center justify-center text-xs font-bold transition-colors flex-shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            {/* Lista de variantes */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : variants.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-8">No hay presentaciones disponibles.</p>
              ) : (
                variants.map((variant) => {
                  const variantSlug = variant.url_slug || variant.product_code;
                  const variantPrice = (variant as any).special_price || variant.price || 0;
                  const inStock = (variant.stock || 0) > 0;
                  const variantQty = getVariantQty(variant.id);
                  return (
                    <div
                      key={variant.id}
                      className="flex flex-col p-2.5 rounded-xl bg-gray-50 border border-transparent hover:border-indigo-100 transition-colors gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-gray-800 leading-tight">
                            {variant.variant_label || formatProductName(variant)}
                          </span>
                          {variant.product_code && (
                            <span className="block text-[9px] text-gray-400 font-mono mt-0.5">
                              {variant.product_code}
                            </span>
                          )}
                          <span className="block text-sm font-black text-[#1A8A00] mt-0.5">
                            Gs. {variantPrice.toLocaleString('es-PY')}
                          </span>
                        </div>
                        <VolumePriceBadge
                          volumePrices={(variant as any).volume_prices}
                          basePrice={variantPrice}
                          className="flex-shrink-0"
                        />
                        <div className="flex-shrink-0">
                          {inStock ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                              Stock: {variant.stock}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded-md">
                              Sin stock
                            </span>
                          )}
                        </div>
                      </div>
                      {inStock && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setVariantQty(variant.id, Math.max(1, variantQty - 1)); }}
                              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-[#1A8A00] text-sm font-bold select-none"
                            >−</button>
                            <span className="text-xs font-bold text-gray-800 min-w-[16px] text-center">{variantQty}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setVariantQty(variant.id, Math.min(99, variantQty + 1)); }}
                              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-[#1A8A00] text-sm font-bold select-none"
                            >+</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/${variantSlug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-indigo-500 hover:underline font-medium"
                            >
                              Ver detalle
                            </a>
                            {onAddToCart && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  for (let i = 0; i < variantQty; i++) { onAddToCart(variant); }
                                  setVariantQty(variant.id, 1);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A8A00] hover:bg-[#064E3B] text-white text-xs font-bold rounded-lg transition-colors active:scale-95"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Agregar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {isMobileView && (
              <div className="pt-3 mt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowPopover(false)}
                  className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #FF4D00, #FF8C00)' }}
                >
                  <span className="absolute inset-0 opacity-0 active:opacity-20 bg-white transition-opacity" />
                  <ChevronLeft className="w-5 h-5 text-white drop-shadow" />
                  <span className="text-white drop-shadow-md tracking-[0.2em]">← VOLVER AL CATÁLOGO</span>
                </button>
              </div>
            )}
          </div>
        );

        if (isMobileView) {
          return createPortal(
            <>
              <div
                className="fixed inset-0 bg-black/60 z-[9998]"
                onClick={() => setShowPopover(false)}
              />
              {panelContent}
            </>,
            document.body
          );
        }

        return panelContent;
      })()}
    </div>
  );
}

export default function ProductGridClient({ initialProducts = [] }: { initialProducts?: Product[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { handleAddToCart } = useCart();

  const categories = Array.from(new Set(initialProducts.map(p => p.category)));

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 gap-6 text-center md:text-left">
          <div>
            <div className="inline-block px-4 py-1 bg-[#F9FEDE] text-[#1A8A00] text-xs font-display font-bold uppercase tracking-wider mb-3 rounded-full border border-[#D4F000]">
              Los más buscados
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black text-[#1A8A00] mb-2 leading-tight uppercase tracking-tight">
              PRODUCTOS <span className="text-[#064E3B]">DESTACADOS</span>
            </h2>
          </div>

          <div className="flex overflow-x-auto pb-2 md:pb-0 w-full md:w-auto gap-2 no-scrollbar justify-center md:justify-end">
            <div className="flex gap-2 bg-white p-2 rounded-2xl border border-[#F0F0F0] shrink-0 shadow-sm">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-2 rounded-xl text-sm font-display font-bold transition-all ${
                  selectedCategory === 'all' 
                    ? 'bg-[#eeee22] text-[#1A8A00] shadow-md' 
                    : 'text-[#9CA3AF] hover:text-[#1E1B4B] hover:bg-[#FAFFD1]'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-xl text-sm font-display font-bold transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[#228B22] text-white shadow-md' 
                      : 'text-[#9CA3AF] hover:text-[#1E1B4B] hover:bg-[#ECFDF5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {initialProducts
            .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
            .map((product) => (
              <ProductGridCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
        </div>

        <div className="mt-16 text-center">
          <button
            onClick={() => { if(typeof window !== 'undefined') window.location.href = '/productos'; }}
            className="inline-flex items-center gap-3 px-10 py-4 bg-[#1A8A00] text-[#FFFFFF] rounded-full hover:bg-[#064E3B] transition-all font-display font-bold text-base shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            Ver todos los productos
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
