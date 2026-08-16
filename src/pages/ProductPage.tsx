'use client';
import { useState, useEffect } from 'react';
import { supabase, Product } from '../lib/supabase';
import { pgOverlaps } from '../lib/pgArrayFilter';
import { formatProductName, toTitleCase } from '../lib/textFormat';
import { ShoppingCart, Package, MessageCircle, ArrowLeft, ShieldCheck, Zap, Heart, Star, PawPrint, Info } from 'lucide-react';
import Link from 'next/link';
import ChatWidget from '../components/ChatWidget';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import Header from '../components/Header';
import { useProductVariants } from '../hooks/useProductVariants';
import { resolveParentData } from '../lib/parentFallback';
import { sanitizeDescriptionHtml } from '../lib/sanitizeHtml';

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
        {variant.variant_label && (
          <span className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit mb-2">
            {variant.variant_label}
          </span>
        )}
        
        {/* Nombre — clickeable */}
        <Link href={`/${variantSlug}`} className="block hover:text-[#1A8A00] transition-colors">
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
  // Negrita **texto**, cursiva _texto_ o *texto* (cuidando no confundir con **)
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

type ProductPageProps = {
  productCode: string;
};

export default function ProductPage({ productCode }: ProductPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [variantChildren, setVariantChildren] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  // precio directo en Guaraníes
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [pageContent, setPageContent] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const { variants, selectedVariant, setSelectedVariant } = useProductVariants(
    product?.is_parent ? product : null
  );
  const displayProduct = selectedVariant || product;
  const firstChild = product?.is_parent && variantChildren.length > 0 ? variantChildren[0] : null;
  const resolved = product ? resolveParentData(product, firstChild) : null;

  useEffect(() => {
    if (selectedVariant) {
      const parentOwnImage = product?.uploaded_image_url || product?.image_url;
      // Si el grupo tiene su propia imagen configurada, esa se mantiene fija
      // sin importar qué variante esté seleccionada. Solo si el grupo NO tiene
      // imagen propia, mostramos la de la variante seleccionada.
      if (!parentOwnImage) {
        setActiveImage(selectedVariant.uploaded_image_url || selectedVariant.image_url);
      }
    }
  }, [selectedVariant, product]);

  useEffect(() => {
    loadProduct();
    loadWhatsappSettings();
    loadPageContent();
    if(typeof window !== 'undefined') {
      const saved = localStorage.getItem('cart_items');
      if (saved) setCartItems(JSON.parse(saved));
    }
  }, [productCode]);

  useEffect(() => {
    if(typeof window !== 'undefined') {
      localStorage.setItem('cart_items', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const loadProduct = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .or(`url_slug.eq.${productCode},product_code.eq.${productCode}`)
        .eq('active', true)
        .maybeSingle();
      if (data) {
        setProduct(data);
        setActiveImage(data.uploaded_image_url || data.image_url);
        const cgArray = Array.isArray(data.category_general) ? data.category_general : (data.category_general ? [data.category_general] : []);
        loadRelatedProducts(cgArray, data.id);

        // Si es padre, cargar las variantes
        if (data.is_parent) {
          const { data: kids } = await supabase
            .from('products')
            .select('*')
            .eq('parent_product_id', data.id)
            .eq('active', true)
            .order('price', { ascending: true });
          setVariantChildren(kids || []);
        }
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPageContent = async () => {
    try {
      const { data } = await supabase
        .from('product_page_content')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      if (data) setPageContent(data);
    } catch (error) {
      console.error('Error loading page content:', error);
    }
  };

  const loadRelatedProducts = async (cgArray: string[], currentProductId: string) => {
    if (!cgArray || cgArray.length === 0) return;
    try {
      const { data } = await pgOverlaps(
        supabase
          .from('products')
          .select('*'),
        'category_general',
        cgArray
      )
        .eq('active', true)
        .is('parent_product_id', null)
        .neq('id', currentProductId)
        .limit(4);
      if (data) setRelatedProducts(data);
    } catch (error) {
      console.error('Error loading related products:', error);
    }
  };

  const loadWhatsappSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('whatsapp_enabled, whatsapp_number')
      .single();
    if (data) {
      setWhatsappEnabled(data.whatsapp_enabled);
      setWhatsappNumber(data.whatsapp_number);
    }
  };

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
        return prev.map(i => i.product_id === displayProduct.id ? {...i, quantity: i.quantity + 1} : i);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin text-[#1A8A00]"><PawPrint size={48} /></div>
            <p className="font-display font-bold text-[#1E1B4B]">Buscando la magia...</p>
        </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-10 bg-white rounded-[3rem] shadow-xl border-4 border-[#E5E7EB]">
        <h1 className="text-3xl font-display font-bold mb-4 text-[#1A8A00]">Producto no encontrado</h1>
        <p className="text-[#1E1B4B] mb-6">Parece que este producto se fue a otra aventura.</p>
        <button onClick={() => window.location.href = '/'} className="bg-[#1A8A00] text-white px-8 py-3 rounded-full font-bold uppercase text-xs shadow-md hover:bg-[#064E3B] transition-all">Volver al inicio</button>
      </div>
    </div>
  );

  const displayPrice = displayProduct ? (displayProduct.special_price || displayProduct.price) : 0;
  const gallery = displayProduct ? [displayProduct.uploaded_image_url || displayProduct.image_url, ...(displayProduct.additional_images || [])].filter(Boolean) : [];
  const whatsappMessage = `Hola Tiempo de Mascotas! ✨ Me interesa este producto: ${product ? formatProductName(product) : ''} - Gs. ${displayPrice.toLocaleString('es-PY')}`;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (product?.is_parent) {
    return (
      <>
        <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
        
        <main className="min-h-screen bg-[#FAFAFA] pt-28 pb-16">
          <div className="container mx-auto px-6 max-w-6xl">

            {/* Breadcrumb / Back */}
            <div className="mb-6">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-sm text-[#1A8A00] hover:text-[#eeee22] transition-colors font-bold uppercase text-[10px] tracking-widest bg-white px-4 py-2 rounded-full shadow-sm"
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
                {variantChildren.length} presentación{variantChildren.length !== 1 ? 'es' : ''} disponible{variantChildren.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Grid de variantes */}
            {variantChildren.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No hay variantes disponibles aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {variantChildren.map(variant => (
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
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <div className="pt-28 pb-20 container mx-auto px-6">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[#1A8A00] hover:text-[#eeee22] transition-colors font-bold uppercase text-[10px] tracking-widest mb-8 bg-white px-4 py-2 rounded-full shadow-sm inline-flex">
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </button>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Galería de Imágenes */}
          <div className="lg:col-span-7">
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 flex items-center justify-center relative overflow-hidden border-4 border-white shadow-[0_10px_40px_-10px_rgba(109,40,217,0.15)] min-h-[400px] group">
                <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-[3rem]"></div>
                <img
                  src={activeImage}
                  alt={`${formatProductName(product)} - Producto en Tiempo de Mascotas`}
                  className="max-h-[500px] w-full object-contain rounded-[2rem] drop-shadow-xl transform transition-transform duration-500 hover:scale-105"
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
              <div className="flex flex-wrap gap-2 mb-3">
                {Array.isArray(product.category_general) && product.category_general.map(cg => (
                  <span key={cg} className="px-3 py-1 bg-[#F9FEDE] text-[#1A8A00] rounded-full text-xs font-bold border border-[#D4F000]">
                    {cg}
                  </span>
                ))}
                {Array.isArray(product.category_specific) && product.category_specific.map(ce => (
                  <span key={ce} className="px-3 py-1 bg-[#ECFDF5] text-[#228B22] rounded-full text-xs font-bold border border-[#A7F3D0]">
                    {ce}
                  </span>
                ))}
                {Array.isArray(product.category_detail) && product.category_detail.map(cd => (
                  <span key={cd} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                    {cd}
                  </span>
                ))}
                {(!Array.isArray(product.category_general) || product.category_general.length === 0) && 
                 (!Array.isArray(product.category_specific) || product.category_specific.length === 0) && (
                  <span className="px-3 py-1 bg-[#F9FEDE] text-[#1A8A00] rounded-full text-xs font-bold border border-[#D4F000]">
                    {product.category || 'Producto'}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-[#1E1B4B] tracking-tight leading-[1.1] mb-2">
                {formatProductName(product)}
              </h1>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-widest">Código: {product.product_code}</p>
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

            {product?.is_parent && variants.length > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB]">
                <p className="text-xs font-black uppercase text-[#1A8A00] tracking-widest mb-3">
                  Elegí presentación
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {variants.map(v => (
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

            <div className="space-y-4 pt-4">
              <button 
                onClick={handleAddToCart}
                disabled={(displayProduct?.stock || 0) <= 0}
                className="w-full py-4 bg-[#1A8A00] text-white rounded-2xl font-display font-bold uppercase text-sm shadow-lg hover:bg-[#064E3B] hover:-translate-y-1 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3"
              >
                <ShoppingCart className="w-6 h-6" /> 
                {(displayProduct?.stock || 0) > 0 ? 'Agregar al Carrito' : 'Agotado Temporadamente'}
              </button>
              
              {whatsappEnabled && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-display font-bold uppercase text-sm shadow-[0_10px_30px_-10px_rgba(37,211,102,0.4)] hover:bg-[#20BA5A] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-6 h-6" /> Consultar por WhatsApp
                </a>
              )}
            </div>

            <div className="flex items-center gap-4 justify-center text-[#6B7280] text-xs font-bold uppercase tracking-widest mt-6">
                <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Compra Segura</span>
                <span className="flex items-center gap-1"><Package className="w-4 h-4" /> Envíos a todo el país</span>
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
                <h3 className="font-bold text-[#1E1B4B] line-clamp-2 text-sm mb-2">{formatProductName(related)}</h3>
                <p className="text-[#228B22] font-black">Gs. {related.price.toLocaleString('es-PY')}</p>
              </a>
            ))}
          </div>
        </div>
      )}

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