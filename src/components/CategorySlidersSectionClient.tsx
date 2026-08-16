'use client';
import React from 'react';
import { Product } from '../lib/supabase';
import CategorySliderClient from './CategorySliderClient';

type SliderWithProducts = {
  slider: {
    id: string;
    title: string;
    description?: string | null;
    category_name?: string | null;
    bg_image?: string | null;
    cta_text?: string | null;
  };
  products: Product[];
};

type Props = {
  initialSliders?: SliderWithProducts[];
};

export default function CategorySlidersSectionClient({ initialSliders = [] }: Props) {
  if (initialSliders.length === 0) return null;

  return (
    <>
      {initialSliders.map(({ slider, products }) => (
        <CategorySliderClient
          key={slider.id}
          title={slider.title}
          description={slider.description}
          categoryName={slider.category_name || ''}
          bgImage={slider.bg_image}
          ctaText={slider.cta_text}
          initialProducts={products}
        />
      ))}
    </>
  );
}
