import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [bannerData, setBannerData] = useState<{
    image: string;
    whatsappNumber: string;
  } | null>(null);

  useEffect(() => {
    loadBannerData();
  }, []);

  const loadBannerData = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('promo_banner_image_url, promo_banner_uploaded_image, whatsapp_number')
        .single();

      if (data && !error) {
        const imageUrl = data.promo_banner_uploaded_image || data.promo_banner_image_url;
        if (imageUrl) {
          setBannerData({
            image: imageUrl,
            whatsappNumber: data.whatsapp_number || ''
          });
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  };

  const handleWhatsAppClick = () => {
    if (bannerData?.whatsappNumber) {
      const message = encodeURIComponent('Hola, vi la promoción y me interesa saber más.');
      window.open(`https://wa.me/${bannerData.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  if (!isVisible || !bannerData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <img
          src={bannerData.image}
          alt="Promoción"
          className="w-full h-auto rounded-t-lg"
        />

        {bannerData.whatsappNumber && (
          <div className="p-6">
            <button
              onClick={handleWhatsAppClick}
              className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-[#25D366] text-white rounded-lg hover:bg-[#20BA5A] transition-colors text-lg font-semibold"
            >
              <MessageCircle className="w-6 h-6" />
              <span>Consultar por WhatsApp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
