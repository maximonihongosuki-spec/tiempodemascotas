'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Cart from './Cart';
import { formatProductName } from '../lib/textFormat';
import { SpeciesIconRow } from './SpeciesIcons';

type Category = {
  id: string;
  name: string;
  type: string;
  parent_id?: string | null;
  image_url?: string | null;
};

type Product = {
  id: string;
  name: string;
  public_name?: string | null;
  price: number;
  image_url: string;
  uploaded_image_url?: string;
  url_slug?: string;
  product_code: string;
  category_specific?: string[];
  category_detail?: string[];
  category_brand?: string;
  is_featured?: boolean;
  stock: number;
  category_species?: string[];
  is_bulk?: boolean;
};

type Props = {
  category: Category;
  specifics: Category[];
  products: Product[];
  slug: string;
};

type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
  is_bulk?: boolean;
  stock?: number;
};

export default function CategoryPageClient({ category, specifics, products, slug }: Props) {
  const [selectedSpecific, setSelectedSpecific] = useState<string>('all');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const filtered = selectedSpecific === 'all'
    ? products
    : products.filter(p => Array.isArray(p.category_specific) && p.category_specific.includes(selectedSpecific));

  const handleAddToCart = (product: Product) => {
    const maxStock = typeof product.stock === 'number' ? product.stock : Infinity;
    if (maxStock <= 0) {
      alert(`"${product.public_name || product.name}" no tiene stock disponible.`);
      return;
    }
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= maxStock) {
          alert(`Solo hay ${maxStock} unidad(es) en stock.`);
          return prev;
        }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.public_name || product.name,
        price: product.price,
        quantity: 1,
        image_url: product.uploaded_image_url || product.image_url,
        is_bulk: (product as any).is_bulk || false,
        stock: product.stock,
      }];
    });
    setIsCartOpen(true);
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-white text-[#1E1B4B]">
      <Header
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      {/* Hero de categoría */}
      <section className="relative pt-[140px] md:pt-[180px] pb-16 overflow-hidden">
        {/* Fondo con imagen */}
        {category.image_url ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{ backgroundImage: `url(${category.image_url})` }}
            />
            <div className="absolute inset-0 bg-[#1A8A00]/75 z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#1A8A00] z-0" />
        )}

        <div className="relative z-20 container mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-white/70 text-sm mb-6 font-display">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/productos" className="hover:text-white transition-colors">Productos</Link>
            <span>/</span>
            <span className="text-white font-bold">{category.name}</span>
          </nav>

          <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tight leading-none mb-4 drop-shadow-lg">
            {category.name}
          </h1>
          <p className="text-white/80 text-lg max-w-xl font-display">
            Encontrá los mejores productos de {category.name.toLowerCase()} para tu mascota en Paraguay.
          </p>

          <div className="mt-4 text-[#eeee22] font-display font-bold text-sm">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </section>

      {/* Filtro por subcategoría */}
      {specifics.length > 0 && (
        <section className="sticky top-[64px] z-30 bg-white border-b border-gray-100 shadow-sm">
          <div className="container mx-auto px-4 md:px-6 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedSpecific('all')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-display font-bold transition-all border ${
                  selectedSpecific === 'all'
                    ? 'bg-[#1A8A00] text-white border-[#1A8A00]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A8A00] hover:text-[#1A8A00]'
                }`}
              >
                Todos ({products.length})
              </button>
              {specifics.map(spec => {
                const count = products.filter(p => Array.isArray(p.category_specific) && p.category_specific.includes(spec.name)).length;
                if (count === 0) return null;
                return (
                  <button
                    key={spec.id}
                    onClick={() => setSelectedSpecific(spec.name)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-display font-bold transition-all border ${
                      selectedSpecific === spec.name
                        ? 'bg-[#1A8A00] text-white border-[#1A8A00]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A8A00] hover:text-[#1A8A00]'
                    }`}
                  >
                    {spec.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Grid de productos */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">🐾</div>
              <p className="font-display font-bold text-[#1A8A00] text-xl mb-2">No hay productos en esta categoría aún</p>
              <Link href="/productos" className="text-sm text-gray-500 hover:text-[#1A8A00] transition-colors">
                Ver todos los productos →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filtered.map(product => (
                <Link
                  key={product.id}
                  href={`/${product.url_slug || product.product_code}`}
                  className="group bg-white rounded-2xl border-2 border-transparent hover:border-[#eeee22]/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1"
                >
                  <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 overflow-hidden">
                    <img
                      src={product.uploaded_image_url || product.image_url}
                      alt={formatProductName(product)}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width={300}
                      height={300}
                    />
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Array.isArray(product.category_specific) && product.category_specific.length > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A8A00] bg-[#ECFDF5] px-2 py-0.5 rounded-md w-fit">
                          {product.category_specific[0]}
                        </span>
                      )}
                      {Array.isArray(product.category_detail) && product.category_detail.length > 0 && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md w-fit">
                          {product.category_detail[0]}
                        </span>
                      )}
                      {product.is_bulk && (
                        <span className="text-[8px] md:text-[9px] bg-orange-500 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide w-fit">
                          A Granel
                        </span>
                      )}
                    </div>
                    <div className="mb-1">
                      <SpeciesIconRow species={product.category_species as string[]} />
                    </div>
                    <h3 className="text-sm font-display font-bold text-[#1E1B4B] line-clamp-2 leading-tight mb-2 group-hover:text-[#1A8A00] transition-colors flex-1">
                      {formatProductName(product)}
                    </h3>
                    <div className="mt-auto pt-2">
                      {typeof product.stock === 'number' && (
                        <p className={`text-[10px] font-bold mb-1 ${(product.stock || 0) > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                          {(product.stock || 0) > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-display font-black text-[#1A8A00]">
                          Gs. {product.price.toLocaleString('es-PY')}
                        </span>
                        <button
                          onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                          className="w-8 h-8 bg-[#1A8A00] text-white rounded-full flex items-center justify-center hover:bg-[#064E3B] transition-all shadow-sm active:scale-90 flex-shrink-0"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 text-[#1A8A00] font-display font-bold hover:text-[#064E3B] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver todos los productos
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={(id, qty) => {
          if (qty <= 0) {
            setCartItems(prev => prev.filter(i => i.product_id !== id));
          } else {
            setCartItems(prev => prev.map(i => {
              if (i.product_id !== id) return i;
              const maxStock = typeof i.stock === 'number' ? i.stock : Infinity;
              return { ...i, quantity: Math.min(qty, maxStock) };
            }));
          }
        }}
        onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.product_id !== id))}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
