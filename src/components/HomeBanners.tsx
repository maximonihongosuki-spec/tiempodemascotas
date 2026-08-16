'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type HomeBanner = {
  id: string;
  desktop_image: string;
  mobile_image: string;
  order_index: number;
};

export default function HomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      const { data } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (data) setBanners(data);
    } catch (e) {
      console.error(e);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);

  if (banners.length === 0) return null;

  return (
    <section className="w-full bg-white overflow-hidden relative group">
      <div className="w-full">
        <div className="relative w-full aspect-[4/1] md:aspect-[8/1] overflow-hidden shadow-sm">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
              <img
                src={banner.mobile_image || banner.desktop_image}
                alt={`Banner ${index + 1}`}
                className="w-full h-full object-cover md:hidden"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                {...(index === 0 ? { fetchPriority: 'high' } : {})}
              />
            {/* Desktop Image */}
            <img
              src={banner.desktop_image}
              alt={`Banner ${index + 1}`}
              className="w-full h-full object-cover hidden md:block"
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              {...(index === 0 ? { fetchPriority: 'high' } : {})}
            />
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
