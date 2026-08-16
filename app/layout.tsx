import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { createClient } from '@supabase/supabase-js';
import { OrgLocalBusinessSchema } from '../src/components/OrgLocalBusinessSchema';

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = getSupabase();

  const [{ data: settingsData }, { data: seo }] = await Promise.all([
    supabase.from('site_settings').select('favicon_url').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle(),
    supabase.from('page_seo').select('meta_title, meta_description, og_image_url').eq('page_key', 'home').maybeSingle()
  ]);

  const favicon = settingsData?.favicon_url || '/icon.png';
  const title = seo?.meta_title || 'Tiempo de Mascotas — Petshop y Farmacia Veterinaria en Paraguay';
  const description = seo?.meta_description || 'Petshop online en Paraguay. Comprá alimentos, medicamentos, juguetes y accesorios para perros, gatos, aves y roedores. Delivery en Asunción y retiro en el local.';
  const ogImage = seo?.og_image_url || 'https://acvsdhysykaybcoctdhc.supabase.co/storage/v1/object/public/product-images/site-assets/og-image-1200x630.webp';

  return {
    title,
    description,
    icons: { icon: favicon, apple: favicon },
    alternates: { canonical: 'https://tiempodemascotas.com.py/' },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: 'https://tiempodemascotas.com.py/',
      siteName: 'Tiempo de Mascotas',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Tiempo de Mascotas' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <head />
      <body className={jakarta.className}>
        <OrgLocalBusinessSchema />
        {children}
      </body>
    </html>
  );
}

