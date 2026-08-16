'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function FooterCredit() {
  const [creditImage, setCreditImage] = useState('');

  useEffect(() => {
    loadCreditImage();

    const channel = supabase
      .channel('admin_settings_footer_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings' },
        () => {
          loadCreditImage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCreditImage = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('footer_credit_image_url, footer_credit_uploaded_image')
        .single();

      if (error) {
        console.error('Error loading footer credit:', error);
        return;
      }

      if (data) {
        const imageUrl = data.footer_credit_uploaded_image || data.footer_credit_image_url;
        console.log('Footer credit image loaded:', imageUrl ? 'Image found' : 'No image');
        setCreditImage(imageUrl || '');
      }
    } catch (error) {
      console.error('Error loading footer credit:', error);
    }
  };

  if (!creditImage) return null;

  return (
    <div className="w-full bg-gray-100 border-t border-gray-200 py-2 px-4">
      <div className="container mx-auto flex items-center justify-start space-x-3">
        <span className="text-xs text-gray-600">Esta web fue creada por</span>
        <img
          src={creditImage}
          alt="Creado por"
          className="h-6 object-contain"
        />
      </div>
    </div>
  );
}
