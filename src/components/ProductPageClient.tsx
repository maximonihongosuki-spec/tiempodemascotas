'use client';
import { useState, useEffect } from 'react';
import { Product } from '../lib/supabase';
import { formatProductName } from '../lib/textFormat';
import { ShoppingCart, Package, MessageCircle, ArrowLeft, ShieldCheck, Zap, Heart, Star, PawPrint, Info, Copy, Share2, Send, Mail } from 'lucide-react';
import Link from 'next/link';
import ChatWidget from './ChatWidget';
import Footer from './Footer';
import Cart from './Cart';
import Header from './Header';
import NavTicker from './NavTicker';
import { useProductVariants } from '../hooks/useProductVariants';
import { resolveParentData } from '../lib/parentFallback';
import { sanitizeDescriptionHtml } from '../lib/sanitizeHtml';
import { SpeciesIconRow } from './SpeciesIcons';
import ReviewForm from './ReviewForm';

type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
  is_bulk?: boolean;
  requires_prescription?: boolean;
  stock?: number;
};

function VariantCard({ variant, onAddToCart }: { variant: Product; onAddToCart: (v: Product) => void }) {
  const displayPrice = (variant as any).special_price || variant.price || 0;
  const inStock = (variant.stock || 0) > 0;
  const variantSlug = variant.url_slug || variant.product_code;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 hover:border-[#1A8A00]/30 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
      {/* Imagen — clickeable */}
      <Link href={`/${variantSlug}`} className="block">
        <div className="aspect-square bg-[#F9FAFB] flex items-center justify-center p-6 overflow-hidden hover:opacity-90 transition-opacity relative">
          {variant.uploaded_image_url || variant.image_url ? (
            <>
              <img
                src={variant.uploaded_image_url || variant.image_url}
                alt={variant.public_name || variant.name}
                className="w-full h-full object-contain rounded-xl"
                loading="lazy"
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
            </>
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="text-gray-300" size={32} />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        {/* Etiqueta / nombre */}
        <div className="flex flex-wrap gap-1 mb-2">
          {variant.variant_label && (
            <span className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">
              {variant.variant_label}
            </span>
          )}
          {variant.is_bulk && (
            <span className="text-[8px] md:text-[9px] bg-orange-500 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide w-fit">
              A Granel
            </span>
          )}
        </div>
        
        {/* Nombre — clickeable */}
        <Link href={`/${variantSlug}`} className="block hover:text-[#1A8A00] transition-colors">
          <div className="mb-1">
            <SpeciesIconRow species={variant.category_species as string[]} />
          </div>
          <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2 mb-0.5">
            {variant.public_name || variant.name}
          </h3>
        </Link>
        <p className="text-[10px] text-gray-400 font-mono mb-2">{variant.product_code}</p>

        {/* Precio */}
        <div className="mt-auto">
          <p className="text-2xl font-display font-black text-[#1A8A00]">
            Gs. {displayPrice.toLocaleString('es-PY')}
          </p>
          {!inStock && (
            <p className="text-xs text-red-500 font-bold mt-0.5">Sin stock</p>
          )}

          {/* Botón agregar */}
          <button
            onClick={() => onAddToCart(variant)}
            disabled={!inStock}
            className="w-full mt-3 py-2.5 bg-[#1A8A00] hover:bg-[#166534] disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            {inStock ? 'Agregar al carrito' : 'Sin stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderInlineFormatting(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={j}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={j}>{part.slice(1, -1)}</em>;
    }
    return <span key={j}>{part}</span>;
  });
}

function parseTableBlock(block: string): string[][] {
  return block
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(row => row.split('\t').map(cell => cell.trim()));
}

function ProseTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto my-3 rounded-2xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-[#F0FDF4]">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left font-bold text-[#166534] border-b border-gray-200">
                {renderInlineFormatting(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-b border-gray-100 align-top">
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProseContent({ text }: { text: string }) {
  if (!text) return null;

  const segments = text.split(/\[\[TABLA\]\]([\s\S]*?)\[\[\/TABLA\]\]/g);

  const renderProse = (chunk: string, keyPrefix: string) => {
    const lines = chunk.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = (key: string) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={key} className="list-disc pl-5 space-y-1 my-1">
            {currentList.map((item, idx) => (
              <li key={idx}>{renderInlineFormatting(item)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      const bulletMatch = trimmed.match(/^[-•]\s+(.*)/);

      if (bulletMatch) {
        currentList.push(bulletMatch[1]);
        return;
      }

      flushList(`${keyPrefix}-list-${i}`);

      if (trimmed === '') {
        elements.push(<div key={`${keyPrefix}-${i}`} className="h-2" />);
      } else {
        elements.push(<p key={`${keyPrefix}-${i}`}>{renderInlineFormatting(line)}</p>);
      }
    });
    flushList(`${keyPrefix}-list-end`);

    return elements;
  };

  const allElements: React.ReactNode[] = [];
  segments.forEach((segment, idx) => {
    const isTable = idx % 2 === 1;
    if (isTable) {
      allElements.push(<ProseTable key={`table-${idx}`} rows={parseTableBlock(segment)} />);
    } else {
      allElements.push(...renderProse(segment, `prose-${idx}`));
    }
  });

  return <div className="text-gray-700 leading-relaxed space-y-1">{allElements}</div>;
}

type Props = {
  product: Product;
  firstChild: Product | null;
  variants?: Product[];
  relatedProducts?: Product[];
  siteSettings: { whatsapp_enabled: boolean; whatsapp_number: string } | null;
  pageContent: any;
  breadcrumbs?: React.ReactNode;
  reviews?: any[];
};

export default function ProductPageClient({
  product,
  firstChild: initialFirstChild,
  variants: initialVariants = [],
  relatedProducts = [],
  siteSettings,
  pageContent,
  breadcrumbs,
  reviews = [],
}: Props) {
  const [activeImage, setActiveImage] = useState(product.uploaded_image_url || product.image_url || '');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback silencioso si el navegador bloquea el clipboard
    }
  };

  const displayName = product.public_name || product.name;
  const shareText = `Mirá ${displayName} en Tiempo de Mascotas`;

  const { variants: resolvedVariants, selectedVariant, setSelectedVariant } = useProductVariants(
    product.is_parent ? product : null,
    initialVariants
  );

  const displayProduct = selectedVariant || product;
  const shareSlug = displayProduct.url_slug || displayProduct.product_code;
  const shareUrl = `https://tiempodemascotas.com.py/${shareSlug}`;
  const firstChild = product.is_parent && initialVariants.length > 0 ? initialVariants[0] : null;
  const resolved = product ? resolveParentData(product, firstChild) : null;

  useEffect(() => {
    setActiveImage(product.uploaded_image_url || product.image_url || '');
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart_items');
      if (saved) {
        try {
          setCartItems(JSON.parse(saved));
        } catch (e) {
          console.error('Error parsing cart items', e);
        }
      }
    }
  }, [product.id, product.uploaded_image_url, product.image_url]);

  useEffect(() => {
    if (selectedVariant) {
      const parentOwnImage = product.uploaded_image_url || product.image_url;
      if (!parentOwnImage) {
        setActiveImage(selectedVariant.uploaded_image_url || selectedVariant.image_url || '');
      }
    }
  }, [selectedVariant, product.uploaded_image_url, product.image_url]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart_items', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const handleAddToCart = () => {
    if (!displayProduct) return;
    const maxStock = typeof displayProduct.stock === 'number' ? displayProduct.stock : Infinity;
    if (maxStock <= 0) {
      alert(`"${displayProduct.public_name || displayProduct.name}" no tiene stock disponible.`);
      return;
    }
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === displayProduct.id);
      if (existing) {
        if (existing.quantity >= maxStock) {
          alert(`Solo hay ${maxStock} unidad(es) en stock de "${displayProduct.public_name || displayProduct.name}".`);
          return prev;
        }
        return prev.map(i => i.product_id === displayProduct.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: displayProduct.id,
        product_name: displayProduct.public_name || displayProduct.name,
        price: displayProduct.special_price || displayProduct.price,
        quantity: 1,
        image_url: displayProduct.uploaded_image_url || displayProduct.image_url,
        is_bulk: displayProduct.is_bulk || false,
        requires_prescription: displayProduct.requires_prescription || false,
        stock: displayProduct.stock
      }];
    });
    setIsCartOpen(true);
  };

  const displayPrice = displayProduct ? (displayProduct.special_price || displayProduct.price) : 0;
  const gallery = displayProduct ? [displayProduct.uploaded_image_url || displayProduct.image_url, ...(displayProduct.additional_images || [])].filter(Boolean) : [];
  const whatsappEnabled = siteSettings?.whatsapp_enabled ?? false;
  const whatsappNumber = siteSettings?.whatsapp_number ?? '';
  const whatsappMessage = `Hola Tiempo de Mascotas! ✨ Me interesa este producto: ${product ? formatProductName(product) : ''} - Gs. ${displayPrice.toLocaleString('es-PY')}`;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (product.is_parent) {
    return (
      <>
        <NavTicker />
        <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
        
        <main className="min-h-screen bg-[#FAFAFA] pt-28 md:pt-32 lg:pt-48 pb-16">
          <div className="container mx-auto px-6 max-w-6xl">

            {/* Breadcrumb / Back */}
            <div className="mb-6 flex flex-col gap-2">
              {breadcrumbs}
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-sm text-[#1A8A00] hover:text-[#eeee22] transition-colors font-bold uppercase text-[10px] tracking-widest bg-white px-4 py-2 rounded-full shadow-sm w-fit"
              >
                <ArrowLeft size={12} /> Volver al catálogo
              </button>
            </div>

            {/* Nombre del grupo */}
            <div className="mb-8">
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                Grupo de productos
              </span>
              <h1 className="text-4xl lg:text-5xl font-display font-black text-[#1E1B4B] mt-3 leading-tight">
                {formatProductName(product)}
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                {initialVariants.length} presentación{initialVariants.length !== 1 ? 'es' : ''} disponible{initialVariants.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Grid de variantes */}
            {initialVariants.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No hay variantes disponibles aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {initialVariants.map(variant => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    onAddToCart={(v) => {
                      const maxStock = typeof v.stock === 'number' ? v.stock : Infinity;
                      if (maxStock <= 0) {
                        alert(`"${v.public_name || v.name}" no tiene stock disponible.`);
                        return;
                      }
                      setCartItems(prev => {
                        const existing = prev.find(i => i.product_id === v.id);
                        if (existing) {
                          if (existing.quantity >= maxStock) {
                            alert(`Solo hay ${maxStock} unidad(es) en stock de "${v.public_name || v.name}".`);
                            return prev;
                          }
                          return prev.map(i => i.product_id === v.id
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                          );
                        }
                        return [...prev, {
                          product_id: v.id,
                          product_name: v.public_name || v.name,
                          price: (v as any).special_price || v.price || 0,
                          quantity: 1,
                          image_url: v.uploaded_image_url || v.image_url,
                          is_bulk: v.is_bulk,
                          requires_prescription: v.requires_prescription,
                          stock: v.stock,
                        }];
                      });
                      setIsCartOpen(true);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Descripción del grupo — ahora debajo del grid de variantes */}
            {(product.description_ai_enhanced?.trim() || resolved?.description || product.description) && (
              <div className="mt-8 prose prose-sm prose-green text-[#4B5563] font-medium leading-relaxed bg-white/50 p-6 rounded-3xl border border-white">
                {product.description_ai_enhanced?.trim() ? (
                  <div
                    className="prose-tm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(product.description_ai_enhanced) }}
                  />
                ) : (
                  <ProseContent text={resolved?.description || product.description || ''} />
                )}
              </div>
            )}

            {/* Botones de Compartir para Grupo */}
            <div className="flex flex-col items-center gap-2 mt-8 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm max-w-md mx-auto">
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">Compartir Grupo de Productos</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({ title: shareText, url: shareUrl });
                      } catch {
                        // El usuario canceló el share nativo, no hacer nada
                      }
                    }}
                    aria-label="Compartir"
                    className="w-9 h-9 rounded-full bg-[#1A8A00] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir por WhatsApp"
                  className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en Facebook"
                  className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-90 transition-opacity font-black text-sm"
                >
                  f
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en X"
                  className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center hover:opacity-90 transition-opacity font-black text-sm"
                >
                  X
                </a>
                <a
                  href={`https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir por Telegram"
                  className="w-9 h-9 rounded-full bg-[#26A5E4] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en LinkedIn"
                  className="w-9 h-9 rounded-full bg-[#0A66C2] text-white flex items-center justify-center hover:opacity-90 transition-opacity font-black text-sm"
                >
                  in
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`}
                  aria-label="Compartir por Email"
                  className="w-9 h-9 rounded-full bg-gray-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Mail className="w-4 h-4" />
                </a>
                <button
                  onClick={handleCopyLink}
                  aria-label="Copiar enlace"
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {linkCopied && (
                  <span className="text-xs font-bold text-[#1A8A00] w-full text-center">¡Copiado!</span>
                )}
              </div>
            </div>

            {/* Sección de Reseñas para Grupo */}
            {reviews && reviews.length > 0 && (
              <div className="mt-12 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm max-w-4xl mx-auto">
                <h2 className="text-2xl font-display font-bold text-[#1E1B4B] mb-6">
                  Reseñas de clientes ({(product as any).review_count || 0}) · ★ {((product as any).avg_rating || 0).toFixed(1)}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="bg-white rounded-2xl border p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-[#1E1B4B]">{r.author_name}</div>
                        <div className="text-yellow-400">
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{r.comment}</p>
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(r.created_at).toLocaleDateString('es-PY')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 max-w-4xl mx-auto">
              <ReviewForm productId={product.id} productName={product.public_name || product.name} />
            </div>
          </div>
        </main>

        <Cart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={(id, qty) => setCartItems(prev =>
            qty <= 0 ? prev.filter(i => i.product_id !== id)
                     : prev.map(i => {
                       if (i.product_id !== id) return i;
                       const maxStock = typeof i.stock === 'number' ? i.stock : Infinity;
                       return { ...i, quantity: Math.min(qty, maxStock) };
                     })
          )}
          onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.product_id !== id))}
          onClearCart={() => setCartItems([])}
        />
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1E1B4B] selection:bg-[#eeee22] selection:text-[#1A8A00]">
      <NavTicker />
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <div className="pt-28 md:pt-32 lg:pt-48 pb-20 container mx-auto px-6">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[#1A8A00] hover:text-[#eeee22] transition-colors font-bold uppercase text-[10px] tracking-widest mb-8 bg-white px-4 py-2 rounded-full shadow-sm inline-flex">
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </button>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Galería de Imágenes */}
          <div className="lg:col-span-7">
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-3 md:p-4 flex items-center justify-center relative overflow-hidden border border-[#E5E7EB] shadow-[0_10px_40px_-10px_rgba(109,40,217,0.15)] aspect-square group">
                <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                <img
                  src={activeImage}
                  alt={`${formatProductName(product)} - Producto en Tiempo de Mascotas`}
                  className="w-full h-full object-contain drop-shadow-xl transform transition-transform duration-500 hover:scale-105"
                  loading="eager"
                  width={600}
                  height={600}
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
                {product.is_featured && (
                    <div className="absolute top-6 right-6 bg-[#FDE047] text-[#B45309] p-3 rounded-full shadow-lg">
                        <Star className="w-6 h-6 fill-current" />
                    </div>
                )}
              </div>
              
              {gallery.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-3xl border-4 transition-all overflow-hidden bg-white ${activeImage === img ? 'border-[#eeee22] shadow-lg scale-105' : 'border-white opacity-70 hover:opacity-100'}`}
                    >
                      <img 
                        src={img} 
                        className="w-full h-full object-cover" 
                        alt={`Vista ${idx + 1}`}
                        loading="lazy"
                        width={100}
                        height={100}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Información del Producto */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              {breadcrumbs}
              <div className="flex flex-wrap gap-2 mb-3 mt-3">
                {Array.isArray(product.category_general) && product.category_general.map(cg => (
                  <a
                    key={cg}
                    href={`/productos?cat_gen=${encodeURIComponent(cg)}`}
                    className="px-3 py-1 bg-[#F9FEDE] text-[#1A8A00] rounded-full text-xs font-bold border border-[#D4F000] hover:bg-[#EEFFD0] transition-colors cursor-pointer"
                  >
                    {cg}
                  </a>
                ))}
                {Array.isArray(product.category_specific) && product.category_specific.map(ce => (
                  <a
                    key={ce}
                    href={`/productos?cat_spec=${encodeURIComponent(ce)}`}
                    className="px-3 py-1 bg-[#ECFDF5] text-[#228B22] rounded-full text-xs font-bold border border-[#A7F3D0] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                  >
                    {ce}
                  </a>
                ))}
                {Array.isArray(product.category_detail) && product.category_detail.map(cd => (
                  <a
                    key={cd}
                    href={`/productos?cat_sub_spec=${encodeURIComponent(cd)}`}
                    className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    {cd}
                  </a>
                ))}
                {(!Array.isArray(product.category_general) || product.category_general.length === 0) && 
                 (!Array.isArray(product.category_specific) || product.category_specific.length === 0) && (
                  <a
                    href={`/productos?q=${encodeURIComponent(product.category || 'Producto')}`}
                    className="px-3 py-1 bg-[#F9FEDE] text-[#1A8A00] rounded-full text-xs font-bold border border-[#D4F000] hover:bg-[#EEFFD0] transition-colors cursor-pointer"
                  >
                    {product.category || 'Producto'}
                  </a>
                )}
                {displayProduct.is_bulk && (
                  <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold uppercase tracking-wide">
                    A Granel
                  </span>
                )}
              </div>
              <div className="mb-2">
                <SpeciesIconRow species={displayProduct.category_species as string[]} />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-[#1E1B4B] tracking-tight leading-[1.1] mb-2">
                {formatProductName(product)}
              </h1>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">Código: {product.product_code}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleAddToCart}
                disabled={(displayProduct?.stock || 0) <= 0}
                className="py-2.5 bg-[#1A8A00] text-white rounded-xl font-display font-bold uppercase text-xs shadow-md hover:bg-[#064E3B] hover:-translate-y-0.5 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> 
                {(displayProduct?.stock || 0) > 0 ? 'Agregar' : 'Agotado'}
              </button>
              
              {whatsappEnabled && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  className="py-2.5 bg-[#25D366] text-white rounded-xl font-display font-bold uppercase text-xs shadow-md hover:bg-[#20BA5A] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>

            <div className="bg-white p-6 rounded-[2rem] border-2 border-[#E5E7EB] shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs text-[#228B22] font-bold uppercase mb-1">Precio Especial</p>
                    <div className="text-4xl font-display font-black text-[#228B22] tracking-tighter">
                    Gs. {displayPrice.toLocaleString('es-PY')}
                    </div>
                </div>
                <div className="bg-[#FAFFD1] p-3 rounded-full">
                    <Heart className="w-8 h-8 text-[#228B22]" />
                </div>
            </div>

            {product.is_parent && resolvedVariants.length > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB]">
                <p className="text-xs font-black uppercase text-[#1A8A00] tracking-widest mb-3">
                  Elegí presentación
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {resolvedVariants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={(v.stock || 0) === 0}
                      className={`px-3 py-2 rounded-xl border-2 transition-all text-left ${
                        selectedVariant?.id === v.id
                          ? 'border-[#1A8A00] bg-[#ECFDF5]'
                          : 'border-gray-200 bg-white hover:border-[#1A8A00]/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {v.variant_label || v.name}
                      </p>
                      <p className="text-sm font-black text-[#1A8A00]">
                        Gs. {v.price.toLocaleString('es-PY')}
                      </p>
                      {(v.stock || 0) === 0 && (
                        <p className="text-[9px] text-red-500 font-bold">Sin stock</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="prose prose-sm prose-green text-[#4B5563] font-medium leading-relaxed bg-white/50 p-6 rounded-3xl border border-white">
              {(() => {
                const desc = buildProductDescription(displayProduct || product);
                const targetProd = displayProduct || product;
                const isHtml = desc === targetProd.description_ai_enhanced;
                if (isHtml && desc) {
                  return (
                    <div
                      className="prose-tm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeDescriptionHtml(desc)
                      }}
                    />
                  );
                } else if (desc === targetProd.description && desc) {
                  return <ProseContent text={desc} />;
                } else {
                  return <p>{desc}</p>;
                }
              })()}
            </div>



            <div className="flex items-center gap-4 justify-center text-[#6B7280] text-xs font-bold uppercase tracking-widest mt-6">
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Compra Segura</span>
                <span className="flex items-center gap-1"><Package className="w-4 h-4" /> Envíos a todo el país</span>
            </div>

            <div className="flex flex-col items-center gap-2 mt-6">
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">Compartir</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={async () => {
                      try {
                        await navigator.share({ title: shareText, url: shareUrl });
                      } catch {
                        // El usuario canceló el share nativo, no hacer nada
                      }
                    }}
                    aria-label="Compartir"
                    className="w-9 h-9 rounded-full bg-[#1A8A00] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir por WhatsApp"
                  className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en Facebook"
                  className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-90 transition-opacity font-black text-sm"
                >
                  f
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en X"
                  className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center hover:opacity-90 transition-opacity font-black text-sm"
                >
                  X
                </a>
                <a
                  href={`https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir por Telegram"
                  className="w-9 h-9 rounded-full bg-[#26A5E4] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en LinkedIn"
                  className="w-9 h-9 rounded-full bg-[#0A66C2] text-white flex items-center justify-center hover:opacity-90 transition-opacity font-black text-sm"
                >
                  in
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`}
                  aria-label="Compartir por Email"
                  className="w-9 h-9 rounded-full bg-gray-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Mail className="w-4 h-4" />
                </a>
                <button
                  onClick={handleCopyLink}
                  aria-label="Copiar enlace"
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {linkCopied && (
                  <span className="text-xs font-bold text-[#1A8A00] w-full text-center">¡Copiado!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Publicitario */}
      {pageContent && (pageContent.bottom_banner_desktop || pageContent.bottom_banner_mobile) && (
        <div className="w-full mb-16">
          {pageContent.bottom_banner_desktop && (
            <div className="hidden md:block w-full aspect-[8/1]">
              <img src={pageContent.bottom_banner_desktop} alt="Banner Publicitario" className="w-full h-full object-cover" />
            </div>
          )}
          {pageContent.bottom_banner_mobile && (
            <div className="block md:hidden w-full aspect-[2/1]">
              <img src={pageContent.bottom_banner_mobile} alt="Banner Publicitario" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Productos Relacionados */}
      {relatedProducts.length > 0 && (
        <div className="container mx-auto px-6 mb-20">
          <h2 className="text-3xl font-display font-bold text-[#1E1B4B] mb-8 text-center">Productos Relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map(related => (
              <a key={related.id} href={`/${related.url_slug || related.product_code}`} className="bg-white rounded-3xl p-4 shadow-sm border-2 border-[#E5E7EB] hover:shadow-md hover:-translate-y-1 transition-all group">
                <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                  <img src={related.uploaded_image_url || related.image_url} alt={formatProductName(related)} className="w-full h-full object-contain rounded-xl p-4 group-hover:scale-110 transition-transform duration-500" />
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
                <div className="mb-1.5 flex flex-wrap gap-1 items-center justify-between">
                  <SpeciesIconRow species={related.category_species as string[]} />
                  {related.is_bulk && (
                    <span className="text-[8px] md:text-[9px] bg-orange-500 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black uppercase tracking-wide w-fit">
                      A Granel
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[#1E1B4B] line-clamp-2 text-sm mb-2">{formatProductName(related)}</h3>
                <p className="text-[#228B22] font-black">Gs. {related.price.toLocaleString('es-PY')}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sección de Reseñas */}
      {reviews && reviews.length > 0 && (
        <div className="container mx-auto px-6 mb-8 max-w-6xl">
          <h2 className="text-2xl font-display font-bold text-[#1E1B4B] mb-6">
            Reseñas de clientes ({(product as any).review_count || 0}) · ★ {((product as any).avg_rating || 0).toFixed(1)}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-white rounded-2xl border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-[#1E1B4B]">{r.author_name}</div>
                  <div className="text-yellow-400">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{r.comment}</p>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(r.created_at).toLocaleDateString('es-PY')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 mb-20 max-w-6xl">
        <ReviewForm productId={product.id} productName={product.public_name || product.name} />
      </div>

      <Footer />
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={(id, qty) => {
           if(qty <= 0) setCartItems(prev => prev.filter(i => i.product_id !== id));
           else setCartItems(prev => prev.map(i => {
             if (i.product_id !== id) return i;
             const maxStock = typeof i.stock === 'number' ? i.stock : Infinity;
             return { ...i, quantity: Math.min(qty, maxStock) };
           }));
        }}
        onRemoveItem={(id) => setCartItems(prev => prev.filter(i => i.product_id !== id))}
        onClearCart={() => setCartItems([])}
      />
      <ChatWidget />
    </div>
  );
}

function buildProductDescription(product: Product): string {
  const real = product.description_ai_enhanced || product.description;
  if (real && !isUselessDescription(real, product.name)) return real;

  const displayName = product.public_name || product.name;
  const brand = product.category_brand && product.category_brand !== 'Otros' ? product.category_brand : null;
  const species = product.category_species?.[0];
  const priceFmt = new Intl.NumberFormat('es-PY').format(
    product.special_price && product.special_price > 0 ? product.special_price : product.price
  );

  const parts: string[] = [];
  parts.push(`${displayName}`);
  if (brand) parts.push(`de la marca ${brand}`);
  if (species) parts.push(`para ${species.toLowerCase()}`);
  parts.push(`disponible en Tiempo de Mascotas, tu petshop y veterinaria en Asunción, Paraguay`);
  if (product.stock > 0) parts.push(`Stock disponible: Gs. ${priceFmt}`);
  parts.push(`Envíos a todo el país. Consultá por WhatsApp para asesoramiento`);

  return parts.join('. ') + '.';
}

function isUselessDescription(desc: string, productName: string): boolean {
  const d = desc.trim().toLowerCase();
  const n = productName.toLowerCase();
  if (d.length < 30) return true;
  if (d === n || d.startsWith(n.substring(0, 20))) return true;
  const uselessPhrases = [
    'sin descripción',
    'consultar precio',
    'ver imagen',
    'producto importado',
    'ideal para el bienestar de tu mascota',
    'calidad garantizada para los mejores amigos',
  ];
  return uselessPhrases.some(p => d.includes(p));
}
