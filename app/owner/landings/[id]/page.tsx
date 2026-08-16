import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import LandingEditor from '../../../../src/components/owner/LandingEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getLanding(id: string) {
  noStore();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
  const { data } = await supabase
    .from('landings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export default async function LandingEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const landing = await getLanding(params.id);
  if (!landing) notFound();
  return <LandingEditor landing={landing} />;
}
