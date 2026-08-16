import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Block } from '../../../src/components/owner/landing-blocks/types';
import LandingBlockRenderer from '../../../src/components/owner/LandingBlockRenderer';
import Header from '../../../src/components/Header';
import NavTicker from '../../../src/components/NavTicker';
import Footer from '../../../src/components/Footer';
import FooterCredit from '../../../src/components/FooterCredit';

export const revalidate = 60;

const BASE_URL = 'https://tiempodemascotas.com.py';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── generateMetadata (SSR puro — independiente de MetadataUpdater) ─

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { data } = await getSupabase()
    .from('landings')
    .select('title, meta_description, og_image_url, is_indexable, status')
    .eq('slug', params.slug)
    .eq('status', 'publicada')
    .maybeSingle();

  if (!data) {
    return { title: 'Página no encontrada | Tiempo de Mascotas' };
  }

  return {
    title: `${data.title} | Tiempo de Mascotas`,
    description: data.meta_description ?? undefined,
    openGraph: {
      title: data.title,
      description: data.meta_description ?? undefined,
      url: `${BASE_URL}/promo/${params.slug}`,
      siteName: 'Tiempo de Mascotas',
      images: data.og_image_url
        ? [{ url: data.og_image_url, width: 1200, height: 630 }]
        : [],
      locale: 'es_PY',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.meta_description ?? undefined,
      images: data.og_image_url ? [data.og_image_url] : [],
    },
    robots: data.is_indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: {
      canonical: `${BASE_URL}/promo/${params.slug}`,
    },
  };
}

// ── Page component (Server Component puro) ────────────────────────

export default async function PromoPage(
  { params }: { params: { slug: string } }
) {
  const { data: landing } = await getSupabase()
    .from('landings')
    .select('title, blocks, status')
    .eq('slug', params.slug)
    .eq('status', 'publicada')
    .maybeSingle();

  if (!landing) notFound();

  const blocks = (landing.blocks ?? []) as Block[];

  return (
    <>
      <NavTicker />
      <Header />
      <main className="min-h-screen bg-white pt-[140px] md:pt-[160px] lg:pt-[200px]">
        {blocks.map((block) => (
          <LandingBlockRenderer key={block.id} block={block} />
        ))}
        {blocks.length === 0 && (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-400 text-sm">Esta página no tiene contenido todavía.</p>
          </div>
        )}
      </main>
      <Footer />
      <FooterCredit />
    </>
  );
}
