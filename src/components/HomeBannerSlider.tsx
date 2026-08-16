'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type HomeBanner = {
  id: string;
  desktop_image: string;
  mobile_image: string;
  cta_url?: string;
  cta_text?: string;
  order_index: number;
};

export default function HomeBannerSlider() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await supabase
        .from('home_banners')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (data) setBanners(data);
    } catch (e) {
      console.error("Error fetching banners", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [banners, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (loading) return <div className="w-full aspect-square md:aspect-[3/1] bg-gray-100 animate-pulse" />;
  if (banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden group">
      <div className="relative w-full aspect-square md:aspect-[3/1]">
        <AnimatePresence mode="wait">
          <motion.div
            key={banners[currentIndex].id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Desktop Image */}
            <img 
              src={banners[currentIndex].desktop_image} 
              alt={`Banner ${currentIndex + 1}`} 
              className="hidden md:block w-full h-full object-cover"
              loading={currentIndex === 0 ? "eager" : "lazy"}
              {...(currentIndex === 0 ? { fetchPriority: 'high' } : {})}
            />
            {/* Mobile Image */}
            <img 
              src={banners[currentIndex].mobile_image || banners[currentIndex].desktop_image} 
              alt={`Banner ${currentIndex + 1}`} 
              className="block md:hidden w-full h-full object-cover"
              loading={currentIndex === 0 ? "eager" : "lazy"}
              {...(currentIndex === 0 ? { fetchPriority: 'high' } : {})}
            />

            {/* CTA Overlay */}
            {banners[currentIndex].cta_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                <a 
                  href={banners[currentIndex].cta_url}
                  className="pointer-events-auto bg-[#eeee22] text-[#1A8A00] px-8 py-3 rounded-full font-display font-black uppercase text-sm md:text-base hover:bg-white transition-all transform hover:scale-105 shadow-xl"
                >
                  {banners[currentIndex].cta_text || 'Ver más'}
                </a>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {banners.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white hover:text-[#1A8A00] transition-all opacity-0 group-hover:opacity-100 z-20"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white hover:text-[#1A8A00] transition-all opacity-0 group-hover:opacity-100 z-20"
          >
            <ChevronRight size={24} />
          </button>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${currentIndex === i ? 'bg-[#eeee22] w-8' : 'bg-white/50 hover:bg-white'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
