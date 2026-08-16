import { cache } from 'react';
import { createSupabaseServerClient } from './supabase-server';

export type MemberProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  document?: string;
  document_type?: string;
  role: 'admin' | 'owner' | 'mayorista' | 'cliente';
  active: boolean;
  pending_approval?: boolean;
  points: number;
  created_at: string;
  updated_at: string;
};

/**
 * cache() de React dedupea automáticamente: si layout.tsx y page.tsx llaman
 * esto en el mismo request, la consulta a Supabase corre UNA sola vez, no dos.
 * Esto es intencionalmente dinámico (usa cookies) — nunca cachear esta función
 * con unstable_cache ni ponerle revalidate, es data por-usuario.
 */
export const getMemberSession = cache(async (): Promise<{ userId: string; profile: MemberProfile } | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.active) return null;

  return { userId: user.id, profile: profile as MemberProfile };
});
