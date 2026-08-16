import { X, ShoppingCart, Package, MessageCircle, Calculator } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Product, supabase } from '../lib/supabase';

type ProductDetailProps = {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
};

export default function ProductDetail({ product, isOpen, onClose, onAddToCart }: ProductDetailProps) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  // precio directo en Guaraníes

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('whatsapp_enabled, whatsapp_number')
      .single();

    if (data && !error) {
      setWhatsappEnabled(data.whatsapp_enabled);
      setWhatsappNumber(data.whatsapp_number);
    }
  };

  if (!isOpen || !product) return null;

  const displayPrice = product.price;
  const whatsappMessage = `Hola! Estoy interesado en el producto: ${product.public_name || product.name} - Gs. ${displayPrice.toLocaleString('es-PY')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-bold text-black pr-2">{product.public_name || product.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
            <div className="relative">
              {(product.uploaded_image_url || product.image_url) ? (
                <img
                  src={(() => {
                    const imageUrl = product.uploaded_image_url || product.image_url;
                    return imageUrl.includes('drive.google.com/file/d/')
                      ? `https://drive.usercontent.google.com/download?id=${imageUrl.split('/d/')[1].split('/')[0]}&export=view`
                      : imageUrl;
                  })()}
                  alt={`${product.public_name || product.name} - Producto en Tiempo de Mascotas`}
                  className="w-full h-64 sm:h-80 md:h-96 object-contain rounded-lg"
                  loading="eager"
                  fetchPriority="high"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center text-9xl">🐾</div>';
                  }}
                />
              ) : (
                <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg flex items-center justify-center text-6xl sm:text-9xl">
                  🐾
                </div>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl sm:text-3xl font-bold">Agotado</span>
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 sm:mb-6">
                <span className="inline-block px-3 py-1 bg-[#F9FEDE] text-[#1A8A00] rounded-full text-sm font-medium capitalize mb-4 border border-[#D4F000]">
                  {product.category}
                </span>
                <p className="text-2xl sm:text-4xl font-bold text-[#1A8A00] mb-4">
                  Gs. {displayPrice.toLocaleString('es-PY')}
                </p>
                <div className="flex items-center space-x-2 text-gray-600 mb-6">
                  <Package className="w-5 h-5" />
                  <span>Stock disponible: {product.stock} unidades</span>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Descripción</h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.description || 'Sin descripción disponible'}
                </p>
              </div>

              {/* Financing Plans Section */}
              <div className="mb-4 sm:mb-6 bg-gradient-to-br from-[#FAFFD1] to-emerald-50 p-4 sm:p-6 rounded-lg border border-[#D4F000]">
                <div className="flex items-center mb-4">
                  <Calculator className="w-6 h-6 text-[#1A8A00] mr-2" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Planes de Financiación</h3>
                </div>

                <div className="space-y-3">
                  {/* Cash Price */}
                  <div className="bg-white p-4 rounded-lg border border-[#D4F000]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Precio al Contado</span>
                      <span className="text-xl font-bold text-[#228B22]">
                        Gs. {displayPrice.toLocaleString('es-PY')}
                      </span>
                    </div>
                  </div>

                  {/* 6 months plan */}
                  {product.interest_rate_6 && (
                    <div className="bg-white p-4 rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Plan 6 meses</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#1A8A00]">
                            Gs. {Math.round((displayPrice * (1 + product.interest_rate_6 / 100)) / 6).toLocaleString('es-PY')} / mes
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: Gs. {Math.round(displayPrice * (1 + product.interest_rate_6 / 100)).toLocaleString('es-PY')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Interés: {product.interest_rate_6}%
                      </div>
                    </div>
                  )}

                  {/* 12 months plan */}
                  {product.interest_rate_12 && (
                    <div className="bg-white p-4 rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Plan 12 meses</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#1A8A00]">
                            Gs. {Math.round((displayPrice * (1 + product.interest_rate_12 / 100)) / 12).toLocaleString('es-PY')} / mes
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: Gs. {Math.round(displayPrice * (1 + product.interest_rate_12 / 100)).toLocaleString('es-PY')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Interés: {product.interest_rate_12}%
                      </div>
                    </div>
                  )}

                  {/* 18 months plan */}
                  {product.interest_rate_18 && (
                    <div className="bg-white p-4 rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Plan 18 meses</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#1A8A00]">
                            Gs. {Math.round((displayPrice * (1 + product.interest_rate_18 / 100)) / 18).toLocaleString('es-PY')} / mes
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: Gs. {Math.round(displayPrice * (1 + product.interest_rate_18 / 100)).toLocaleString('es-PY')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Interés: {product.interest_rate_18}%
                      </div>
                    </div>
                  )}

                  {/* 24 months plan */}
                  {product.interest_rate_24 && (
                    <div className="bg-white p-4 rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Plan 24 meses</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#1A8A00]">
                            Gs. {Math.round((displayPrice * (1 + product.interest_rate_24 / 100)) / 24).toLocaleString('es-PY')} / mes
                          </div>
                          <div className="text-sm text-gray-600">
                            Total: Gs. {Math.round(displayPrice * (1 + product.interest_rate_24 / 100)).toLocaleString('es-PY')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Interés: {product.interest_rate_24}%
                      </div>
                    </div>
                  )}

                  {!product.interest_rate_6 && !product.interest_rate_12 && !product.interest_rate_18 && !product.interest_rate_24 && (
                    <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
                      <p className="text-gray-600 text-sm">
                        Planes de financiación no disponibles para este producto.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Nota:</strong> Los planes de financiación están sujetos a aprobación crediticia.
                    Consulta condiciones específicas con nuestro equipo de ventas.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    onAddToCart(product);
                    onClose();
                  }}
                  disabled={product.stock === 0}
                  className="w-full flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-[#eeee22] text-[#1A8A00] rounded-lg hover:bg-[#D4F000] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed text-base sm:text-lg font-semibold shadow-lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}</span>
                </button>

                {whatsappEnabled && whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#20BA5A] transition-colors text-base sm:text-lg font-semibold"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Consultar por WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="w-full px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Nota:</strong> Los pedidos son para retirar en tienda.
                  Te contactaremos para coordinar la entrega.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
