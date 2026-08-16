import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import SeoEditorPage from './SeoEditorPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function EditPageSeoPage({ params }: { params: { key: string } }) {
  const supabase = getSupabase();
  const { data: page } = await supabase
    .from('page_seo')
    .select('*')
    .eq('page_key', params.key)
    .single();

  if (!page) notFound();

  return <SeoEditorPage page={page} />;
}
