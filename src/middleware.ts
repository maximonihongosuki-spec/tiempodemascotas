import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache in-process (por instancia Edge) por 30 segundos
const profileCache = new Map<string, { role: string; active: boolean; pending_approval?: boolean; expires: number }>();

async function getProfile(supabase: any, userId: string) {
  const cached = profileCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached;
  const { data } = await supabase
    .from('user_profiles')
    .select('role, active, pending_approval')
    .eq('id', userId)
    .single();
  if (data) {
    const entry = { ...data, expires: Date.now() + 30_000 };
    profileCache.set(userId, entry);
    return entry;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAuth = pathname.startsWith('/admin') || pathname.startsWith('/owner') || pathname.startsWith('/miembros');
  if (!needsAuth) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protección /admin
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    const profile = await getProfile(supabase, user.id);
    if (!profile || !profile.active || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protección /owner
  if (pathname.startsWith('/owner') && !pathname.startsWith('/owner/login')) {
    if (!user) return NextResponse.redirect(new URL('/owner/login', request.url));
    const profile = await getProfile(supabase, user.id);
    if (!profile || !profile.active || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/owner/login', request.url));
    }
  }

  // Protección /miembros
  if (pathname.startsWith('/miembros') && !pathname.startsWith('/miembros/login') && !pathname.startsWith('/miembros/registro') && !pathname.startsWith('/miembros/pendiente')) {
    if (!user) return NextResponse.redirect(new URL('/miembros/login', request.url));
    const profile = await getProfile(supabase, user.id);
    if (!profile) return NextResponse.redirect(new URL('/miembros/login', request.url));
    // Si es mayorista pendiente de aprobación → redirigir a página de espera
    if (profile.role === 'mayorista' && profile.pending_approval) {
      return NextResponse.redirect(new URL('/miembros/pendiente', request.url));
    }
    // Solo permiten roles válidos y usuarios activos
    if (!profile.active || !['mayorista', 'cliente'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/miembros/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Aplica a /admin, /owner, /miembros y sus subrutas,
    // pero excluye archivos con extensión (assets) y rutas de Next internal.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
