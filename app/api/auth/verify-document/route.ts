import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { document, password } = await req.json();
    if (!document?.trim() || !password?.trim()) {
      return NextResponse.json({ found: false, matched: false });
    }

    // Cliente admin para buscar el usuario por documento
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar el perfil por documento
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, full_name, phone, email, document_type')
      .eq('document', document.trim())
      .eq('active', true)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ found: false, matched: false });
    }

    // Verificar contraseña con un cliente separado (no afecta sesión del browser)
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await verifier.auth.signInWithPassword({
      email: profile.email,
      password: password.trim(),
    });

    if (error) {
      return NextResponse.json({ found: true, matched: false });
    }

    // Contraseña correcta → devolver datos
    return NextResponse.json({
      found: true,
      matched: true,
      name: profile.full_name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      document_type: profile.document_type || 'ci',
    });
  } catch {
    return NextResponse.json({ found: false, matched: false }, { status: 500 });
  }
}
