import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import Header from '../../src/components/Header';
import NavTicker from '../../src/components/NavTicker';
import Footer from '../../src/components/Footer';
import FooterCredit from '../../src/components/FooterCredit';
import AboutFull from '../../src/components/AboutFull';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = getSupabase();
  const { data: seo } = await supabase
    .from('page_seo')
    .select('meta_title, meta_description, og_image_url')
    .eq('page_key', 'nosotros')
    .maybeSingle();

  const title = seo?.meta_title || 'Nosotros | Tiempo de Mascotas';
  const description = seo?.meta_description || 'Conocé a Tiempo de Mascotas: veterinaria y petshop comprometidos con el bienestar de tus mascotas en Paraguay.';
  const ogImage = seo?.og_image_url;

  return {
    title,
    description,
    alternates: { canonical: 'https://tiempodemascotas.com.py/nosotros' },
    ...(ogImage && {
      openGraph: { title, description, images: [{ url: ogImage, width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    }),
  };
}

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavTicker />
      <Header />
      <main className="pt-24 md:pt-32">
        <AboutFull />
      </main>
      <Footer />
      <FooterCredit />
    </div>
  );
}
