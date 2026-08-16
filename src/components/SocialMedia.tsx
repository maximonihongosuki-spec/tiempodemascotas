'use client';
import { useState, useEffect } from 'react';
import { Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type SocialMediaSettings = {
  facebook_enabled: boolean;
  facebook_url: string;
  instagram_enabled: boolean;
  instagram_url: string;
  tiktok_enabled: boolean;
  tiktok_url: string;
  x_enabled: boolean;
  x_url: string;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
};

export default function SocialMedia() {
  const [settings, setSettings] = useState<SocialMediaSettings>({
    facebook_enabled: false,
    facebook_url: '',
    instagram_enabled: false,
    instagram_url: '',
    tiktok_enabled: false,
    tiktok_url: '',
    x_enabled: false,
    x_url: '',
    whatsapp_enabled: false,
    whatsapp_number: ''
  });

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('social_media_changes')
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
      .select('facebook_url, instagram_enabled, instagram_url, tiktok_enabled, tiktok_url, x_enabled, x_url, whatsapp_enabled, whatsapp_number')
      .single();

    if (data && !error) {
      setSettings({
        ...data,
        facebook_enabled: !!data.facebook_url
      });
    }
  };

  const hasAnySocialMedia =
    settings.facebook_enabled ||
    settings.instagram_enabled ||
    settings.tiktok_enabled ||
    settings.x_enabled ||
    settings.whatsapp_enabled;

  if (!hasAnySocialMedia) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-display font-black text-center text-[#1A8A00] mb-8 uppercase tracking-tight">
          Nuestras Redes
        </h2>

        <div className="flex justify-center items-center space-x-6">
          {settings.facebook_enabled && settings.facebook_url && (
            <a
              href={settings.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#eeee22] p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border-4 border-white"
              aria-label="Facebook"
            >
              <Facebook className="w-8 h-8 text-[#1A8A00]" />
            </a>
          )}

          {settings.instagram_enabled && settings.instagram_url && (
            <a
              href={settings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#eeee22] p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border-4 border-white"
              aria-label="Instagram"
            >
              <Instagram className="w-8 h-8 text-[#1A8A00]" />
            </a>
          )}

          {settings.tiktok_enabled && settings.tiktok_url && (
            <a
              href={settings.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
              aria-label="TikTok"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
          )}

          {settings.x_enabled && settings.x_url && (
            <a
              href={settings.x_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-8 h-8 text-[#000000]" />
            </a>
          )}

          {settings.whatsapp_enabled && settings.whatsapp_number && (
            <a
              href={`https://wa.me/${settings.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-8 h-8 text-[#25D366]" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
