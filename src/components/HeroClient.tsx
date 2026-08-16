'use client';
import React, { useState, useEffect } from 'react';
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

type HeroClientProps = {
  initialBanners?: HomeBanner[];
};

export default function HeroClient({ initialBanners = [] }: HeroClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (initialBanners.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [initialBanners, currentIndex]);

  const handleNext = () => {
    if (initialBanners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % initialBanners.length);
  };

  const handlePrev = () => {
    if (initialBanners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + initialBanners.length) % initialBanners.length);
  };

  if (initialBanners.length === 0) return null;

  return (
    <section className="relative min-h-fit flex flex-col items-center bg-mesh overflow-hidden pt-[140px] md:pt-[160px] lg:pt-[200px]">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FAFFD1] rounded-full blur-[100px] -z-10"></div>
      
      {/* Full Width Banner Slider */}
      <div className="w-full relative">
        <div className="relative w-full overflow-hidden group">
          <div className="relative w-full aspect-square md:aspect-[3/1]">
            <AnimatePresence mode="wait">
              <motion.div
                key={initialBanners[currentIndex].id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {/* Desktop Image */}
                <img 
                  src={initialBanners[currentIndex].desktop_image} 
                  alt={`Banner ${currentIndex + 1}`} 
                  className="hidden md:block w-full h-full object-cover"
                  loading={currentIndex === 0 ? "eager" : "lazy"}
                  {...(currentIndex === 0 ? { fetchPriority: 'high' } : {})}
                />
                {/* Mobile Image */}
                <img 
                  src={initialBanners[currentIndex].mobile_image || initialBanners[currentIndex].desktop_image} 
                  alt={`Banner ${currentIndex + 1}`} 
                  className="block md:hidden w-full h-full object-cover"
                  loading={currentIndex === 0 ? "eager" : "lazy"}
                  {...(currentIndex === 0 ? { fetchPriority: 'high' } : {})}
                />

                {/* CTA Overlay */}
                {initialBanners[currentIndex].cta_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                    <a 
                      href={initialBanners[currentIndex].cta_url}
                      className="pointer-events-auto bg-[#eeee22] text-[#1A8A00] px-8 py-3 rounded-full font-display font-black uppercase text-sm md:text-base hover:bg-white transition-all transform hover:scale-105 shadow-xl"
                    >
                      {initialBanners[currentIndex].cta_text || 'Ver más'}
                    </a>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {initialBanners.length > 1 && (
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
                {initialBanners.map((_, i) => (
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
      </div>
    </section>
  );
}
