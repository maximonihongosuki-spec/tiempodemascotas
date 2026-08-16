'use client';
import { useState, useEffect } from 'react';
import { supabase, Product, HomeCategorySlider } from '../lib/supabase';
import CategorySlider from './CategorySlider';

type Props = {
  onAddToCart?: (product: Product) => void;
};

export default function CategorySlidersSection({ onAddToCart }: Props) {
  const [sliders, setSliders] = useState<HomeCategorySlider[]>([]);

  useEffect(() => {
    const loadSliders = async () => {
      try {
        const { data } = await supabase
          .from('home_category_sliders')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (data) setSliders(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadSliders();
  }, []);

  if (sliders.length === 0) return null;

  return (
    <>
      {sliders.map(slider => (
        <CategorySlider
          key={slider.id}
          title={slider.title}
          description={slider.description}
          categoryName={slider.category_name || ''}
          bgImage={slider.bg_image}
          ctaText={slider.cta_text}
          onAddToCart={onAddToCart}
        />
      ))}
    </>
  );
}
