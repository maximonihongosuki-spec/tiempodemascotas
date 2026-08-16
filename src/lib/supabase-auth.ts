import { createBrowserClient } from '@supabase/ssr';

export const supabaseAuth = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type UserProfile = {
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

export async function getCurrentUser() {
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function signOut() {
  await supabaseAuth.auth.signOut();
}
