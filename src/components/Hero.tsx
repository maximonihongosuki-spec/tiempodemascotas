'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, ShoppingBag, PawPrint } from 'lucide-react';
import Link from 'next/link';

type HomeContent = {
  card_1_image: string | null;
  card_1_text: string | null;
  card_2_image: string | null;
  card_2_text: string | null;
  card_3_image: string | null;
  card_3_text: string | null;
  card_4_image: string | null;
  card_4_text: string | null;
};

import HomeBannerSlider from './HomeBannerSlider';

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if(typeof window !== 'undefined') window.location.href = `/productos?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <section className="relative min-h-fit flex flex-col items-center bg-mesh overflow-hidden pt-[140px] md:pt-[160px] lg:pt-[200px]">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FAFFD1] rounded-full blur-[100px] -z-10"></div>
      
      {/* Full Width Banner Slider */}
      <div className="w-full relative">
        <HomeBannerSlider />
      </div>
    </section>
  );
}