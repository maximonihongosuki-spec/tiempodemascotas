import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getMemberSession } from '../../../src/lib/memberSession';
import MiembrosLayoutClient from './MiembrosLayoutClient';

async function getLogoUrl() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase.from('site_settings').select('logo_url').single();
  return data?.logo_url || '/image.png';
}

export const dynamic = 'force-dynamic';

export default async function ProtectedMiembrosLayout({ children }: { children: React.ReactNode }) {
  const session = await getMemberSession();
  if (!session) redirect('/miembros/login');

  const logoUrl = await getLogoUrl();

  return (
    <MiembrosLayoutClient profile={session.profile} logoUrl={logoUrl}>
      {children}
    </MiembrosLayoutClient>
  );
}
