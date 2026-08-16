'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { Search, ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Clock, ChevronDown } from 'lucide-react';
import { useProductVariants } from '../../../../src/hooks/useProductVariants';
import Cart from '../../../../src/components/Cart';

type Product = {
  id: string;
  name: string;
  public_name?: string | null;
  price: number;
  special_price?: number | null;
  wholesale_price?: number | null;
  differentiated_price?: number | null;
  wholesale_factor?: number | null;
  image_url: string;
  uploaded_image_url?: string;
  category_specific?: string;
  category_general?: string;
  category_species?: string[];
  url_slug?: string;
  product_code: string;
  stock: number;
  active: boolean;
  requires_prescription?: boolean | null;
  is_parent?: boolean | null;
};

type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  retail_price: number;
  quantity: number;
  image_url?: string;
  requires_prescription?: boolean;
  stock?: number;
};

function getMayoristaPrice(product: Product | any): number {
  if (product.special_price && product.special_price > 0) return product.special_price;
  if (product.wholesale_price && product.wholesale_price > 0) return product.wholesale_price;
  if (product.differentiated_price && product.differentiated_price > 0) return product.differentiated_price;
  const factor = product.wholesale_factor ?? 0.9;
  return Math.round(product.price * factor);
}

function getDisplayPrice(product: Product | any, isWholesale: boolean): number {
  if (!isWholesale) {
    return (product.special_price && product.special_price > 0) ? product.special_price : product.price;
  }
  return getMayoristaPrice(product);
}

function CascadeImages({ images }: { images: string[] }) {
  const imgs = images.filter(Boolean).slice(0, 4);
  if (imgs.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 text-2xl">📦</span>
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
            />
          </div>
        );
      })}
    </div>
  );
}

function MayoristaProductCard({ product, onAddToCart, isWholesale }: { product: any; onAddToCart: (p: any, price: number, qty?: number) => void; isWholesale: boolean }) {
  const { variants, loading } = useProductVariants(product.is_parent ? product : null);
  const [showPopover, setShowPopover] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [variantQtys, setVariantQtys] = useState<Record<string, number>>({});
  const getVariantQty = (id: string) => variantQtys[id] || 1;
  const setVariantQty = (id: string, val: number) => {
    setVariantQtys(prev => ({ ...prev, [id]: val }));
  };

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobileView) return;
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    }
    if (showPopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover, isMobileView]);

  useEffect(() => {
    if (!isMobileView || !showPopover) return;
    window.history.pushState({ variantPopover: true }, '');
    const handlePopState = () => setShowPopover(false);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPopover, isMobileView]);

  const displayPrice = getDisplayPrice(product, isWholesale);
  const discount = isWholesale && product.price > displayPrice ? Math.round((1 - displayPrice / product.price) * 100) : 0;

  if (product.is_parent) {
    const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    const allOutOfStock = variants.length > 0 && variants.every((v: any) => (v.stock || 0) <= 0);

    return (
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 flex flex-col">
        <div className="relative aspect-square bg-[#F9FAFB] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute top-2.5 left-2.5 z-20">
            <span className="text-[9px] bg-[#166534] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wide shadow-sm">
              Grupo
            </span>
          </div>
          {(() => {
            const groupOwnImage = product.uploaded_image_url || product.image_url;
            const fallbackImage = variants.length > 0 ? (variants[0].uploaded_image_url || variants[0].image_url) : '';
            const displayImg = groupOwnImage || fallbackImage;
            if (loading) {
              return <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#166534]/20 border-t-[#166534] rounded-full animate-spin" />
              </div>;
            }
            if (displayImg) {
              return <img src={displayImg} alt={product.public_name || product.name} className="w-full h-full object-contain" loading="lazy" />;
            }
            return <span className="text-5xl">📦</span>;
          })()}
        </div>

        <div className="flex flex-col flex-1 p-3">
          <h3 className="text-xs font-display font-bold text-gray-800 line-clamp-2 leading-tight mb-0.5 flex-1">
            {product.public_name || product.name}
          </h3>
          <p className="text-[10px] text-gray-400 mb-1">
            {loading ? '...' : `${variants.length} presentación${variants.length !== 1 ? 'es' : ''}`}
          </p>

          <button
            onClick={(e) => { e.stopPropagation(); setShowPopover(true); }}
            className={`mt-2 w-full py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-display font-black hover:bg-indigo-700 transition-colors active:scale-95 flex items-center justify-center gap-1 ${allOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>Ver {variants.length} opciones</span>
            <span className="text-[10px]">→</span>
          </button>
        </div>

        {showPopover && (
          <div
            ref={popoverRef}
            className={isMobileView
              ? 'fixed inset-0 z-[9999] bg-white flex flex-col p-4'
              : 'absolute inset-0 z-50 bg-white rounded-2xl p-3 shadow-2xl border-2 border-indigo-200 flex flex-col'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2 flex-shrink-0">
              <div className="min-w-0">
                <h4 className="text-xs font-display font-black text-[#1E1B4B] truncate leading-tight">
                  {product.public_name || product.name}
                </h4>
                <p className="text-[9px] text-gray-400">Seleccioná una presentación</p>
              </div>
              <button
                onClick={() => setShowPopover(false)}
                className="hidden md:flex w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 items-center justify-center text-[10px] font-bold transition-colors flex-shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
              {loading ? (
                <div className="py-6 text-center">
                  <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : variants.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-6">No hay presentaciones disponibles.</p>
              ) : (
                variants.map((variant: any) => {
                  const variantSlug = variant.url_slug || variant.product_code;
                  const vDisplayPrice = getDisplayPrice(variant, isWholesale);
                  const vRetailPrice = variant.price || 0;
                  const vDiscount = isWholesale && vRetailPrice > vDisplayPrice ? Math.round((1 - vDisplayPrice / vRetailPrice) * 100) : 0;
                  const inStock = (variant.stock || 0) > 0;
                  const variantQty = getVariantQty(variant.id);
                  return (
                    <div key={variant.id} className="flex flex-col p-2 rounded-lg bg-gray-50 border border-transparent hover:border-indigo-100 transition-colors gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            {vDiscount > 0 && (
                              <span className="flex-shrink-0 bg-orange-500 text-white text-[8px] font-black px-1 py-0.5 rounded">
                                -{vDiscount}%
                              </span>
                            )}
                            <span className="block text-[11px] font-bold text-gray-800 leading-tight truncate">
                              {variant.variant_label || variant.public_name || variant.name}
                            </span>
                          </div>
                          <span className="block text-[8px] text-gray-400 font-mono">{variant.product_code}</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xs font-black text-[#166534]">Gs. {vDisplayPrice.toLocaleString('es-PY')}</span>
                            {isWholesale && vRetailPrice > vDisplayPrice && (
                              <span className="text-[9px] text-orange-500 line-through">{vRetailPrice.toLocaleString('es-PY')}</span>
                            )}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 text-[8px] font-bold px-1 py-0.5 rounded whitespace-nowrap ${inStock ? 'text-emerald-600 bg-emerald-50' : 'text-red-400 bg-red-50'}`}>
                          {inStock ? `Stock: ${variant.stock}` : 'Sin stock'}
                        </span>
                      </div>
                      {inStock && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-md px-1 py-0.5 flex-shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); setVariantQty(variant.id, Math.max(1, variantQty - 1)); }}
                              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-[#166534] text-[11px] font-bold select-none"
                            >−</button>
                            <span className="text-[10px] font-bold text-gray-800 min-w-[14px] text-center">{variantQty}</span>
                            <button onClick={(e) => { e.stopPropagation(); setVariantQty(variant.id, Math.min(variant.stock || 99, variantQty + 1)); }}
                              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-[#166534] text-[11px] font-bold select-none">+</button>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <a href={`/${variantSlug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="text-[9px] text-indigo-500 hover:underline font-medium whitespace-nowrap flex-shrink-0">
                              Ver detalle
                            </a>
                            <button
                              onClick={(e) => { e.stopPropagation(); onAddToCart(variant, vDisplayPrice, variantQty); setVariantQty(variant.id, 1); }}
                              className="flex items-center gap-1 px-2 py-1 bg-[#166534] hover:bg-[#064E3B] text-white text-[10px] font-bold rounded-md transition-colors active:scale-95 whitespace-nowrap flex-shrink-0"
                            >
                              <ShoppingCart className="w-3 h-3 flex-shrink-0" />
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {isMobileView && (
              <div className="pt-2 mt-1 border-t border-gray-100 flex-shrink-0">
                <button onClick={() => setShowPopover(false)} className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const [qty, setQty] = useState(1);

  return (
    <div className="bg-white rounded-2xl border-2 border-transparent hover:border-[#eeee22]/40 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group">
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-3 overflow-hidden relative">
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg z-10">
            -{discount}%
          </span>
        )}
        <img
          src={product.uploaded_image_url || product.image_url}
          alt={product.public_name || product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        {product.category_specific && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#166534] bg-[#ECFDF5] px-2 py-0.5 rounded-md w-fit mb-1">
            {product.category_specific}
          </span>
        )}
        <h3 className="text-xs font-display font-bold text-gray-800 line-clamp-2 leading-tight mb-0.5 flex-1">
          {product.public_name || product.name}
        </h3>
        <p className="text-[9px] text-gray-400 font-mono mb-1">{product.product_code}</p>
        <div className="mt-auto">
          {isWholesale && product.price > displayPrice && (
            <p className="text-xs text-orange-500 line-through font-medium">
              Gs. {product.price.toLocaleString('es-PY')}
            </p>
          )}
          <p className="text-base font-display font-black text-[#166534]">
            Gs. {displayPrice.toLocaleString('es-PY')}
          </p>
          <p className={`text-[10px] font-bold mt-0.5 ${(product.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {(product.stock ?? 0) > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 border border-gray-200 rounded-full bg-gray-50 px-1 py-0.5">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#166534] text-sm font-bold select-none">−</button>
              <span className="w-5 text-center text-xs font-bold">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock ?? 99, q + 1))}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#166534] text-sm font-bold select-none">+</button>
            </div>
            <button
              onClick={() => { onAddToCart(product, displayPrice, qty); setQty(1); }}
              disabled={(product.stock ?? 0) <= 0}
              className="flex-1 py-1.5 bg-[#166534] text-white rounded-xl text-xs font-display font-black hover:bg-[#064E3B] transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {(product.stock ?? 0) > 0 ? 'Agregar' : 'Sin stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  initialProducts: any[];
  categories: string[];
  userId: string;
  isWholesale: boolean;
};

export default function CatalogoMayoristaClient({ initialProducts, categories: initialCategories, userId, isWholesale }: Props) {
  const [products] = useState<Product[]>(initialProducts);
  const [filtered, setFiltered] = useState<Product[]>(initialProducts);
  const [categories] = useState<string[]>(initialCategories);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let result = products;
    if (selectedCat !== 'all') result = result.filter(p => 
      Array.isArray(p.category_general) 
        ? p.category_general.includes(selectedCat)
        : p.category_general === selectedCat
    );
    if (search.trim()) result = result.filter(p => (p.public_name || p.name).toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [search, selectedCat, products]);

  const addToCart = (product: Product | any, overridePrice?: number, qty: number = 1) => {
    const mayorista = overridePrice !== undefined ? overridePrice : getDisplayPrice(product, isWholesale);
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => {
          if (i.product_id === product.id) {
            const maxStock = typeof product.stock === 'number' ? product.stock : Infinity;
            return { ...i, quantity: Math.min(i.quantity + qty, maxStock) };
          }
          return i;
        });
      }
      const maxStock = typeof product.stock === 'number' ? product.stock : Infinity;
      return [...prev, { 
        product_id: product.id, 
        product_name: product.variant_label || product.public_name || product.name, 
        price: mayorista, 
        retail_price: product.price, 
        quantity: Math.min(qty, maxStock), 
        image_url: product.uploaded_image_url || product.image_url,
        requires_prescription: product.requires_prescription || false,
        stock: product.stock,
      }];
    });
    setCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.product_id !== productId));
      return;
    }
    setCartItems(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const maxStock = typeof i.stock === 'number' ? i.stock : Infinity;
      return { ...i, quantity: Math.min(quantity, maxStock) };
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-black text-[#166534] uppercase tracking-tight">Catálogo Veterinario</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} productos con precios exclusivos</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-[#166534] text-white rounded-full font-display font-bold text-sm hover:bg-[#064E3B] transition-colors shadow-md"
        >
          <ShoppingCart className="w-4 h-4" />
          Carrito
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#eeee22] text-[#166534] text-xs font-black rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] focus:ring-0 outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="pl-4 pr-10 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#166534] focus:ring-0 outline-none bg-white appearance-none font-display font-bold text-gray-700"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Grid de productos */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-bold">No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered
            .filter(product => !(product as any).parent_product_id)
            .map(product => (
              <MayoristaProductCard
                key={product.id}
                product={product}
                onAddToCart={(p, price, qty) => addToCart(p, price, qty)}
                isWholesale={isWholesale}
              />
            ))}
        </div>
      )}

      {/* Carrito overlay */}
      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        orderType="mayorista"
      />
    </div>
  );
}
