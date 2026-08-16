import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import LandingsManagement from '../../../src/components/owner/LandingsManagement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getLandings() {
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
    .select('id, slug, title, status, is_indexable, og_image_url, created_at, updated_at')
    .order('updated_at', { ascending: false });
  return data || [];
}

export default async function LandingsPage() {
  const landings = await getLandings();
  return <LandingsManagement initialLandings={landings} />;
}
