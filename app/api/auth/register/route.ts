import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name, phone, document, document_type, account_type, professional_document_url } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, contraseña y nombre son obligatorios' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener email de la dueña para notificaciones
    const { data: settings } = await supabase
      .from('site_settings')
      .select('business_email')
      .single();

    // Verificar si el email ya existe
    const { data: existingUsers } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email);
    
    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 400 });
    }

    const isProfessional = account_type === 'veterinario' || account_type === 'estudiante_veterinario';
    const role = isProfessional ? 'mayorista' : 'cliente';
    const is_active = !isProfessional;
    const pending_approval = isProfessional;
    const professional_type = isProfessional ? account_type : null;

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Error al crear usuario' }, { status: 400 });
    }

    // Crear perfil
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: authData.user.id,
      email,
      full_name,
      phone: phone || '',
      document: document || '',
      document_type: document_type || 'ci',
      role,
      active: is_active,
      pending_approval,
      points: 0,
      professional_type,
      professional_document_url: professional_document_url || null,
    });

    if (profileError) {
      // Log completo para diagnóstico en Vercel logs
      console.error('[register] profileError code:', profileError.code);
      console.error('[register] profileError message:', profileError.message);
      console.error('[register] profileError details:', profileError.details);
      console.error('[register] profileError hint:', profileError.hint);
      console.error('[register] payload que falló:', {
        role, is_active, pending_approval, professional_type,
        has_doc_url: !!professional_document_url,
      });
      
      // Limpiar auth user (con manejo de error propio para no enmascarar el original)
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteErr) {
        console.error('[register] Error al limpiar auth user:', deleteErr);
      }
      
      return NextResponse.json({
        error: 'Error al crear perfil de usuario',
        debug_code: profileError.code,
        debug_msg: profileError.message,
      }, { status: 500 });
    }

    // Notificación vía n8n (fire and forget)
    const webhookUrl = process.env.N8N_REGISTRO_WEBHOOK_URL;
    if (webhookUrl && settings?.business_email) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'nuevo_registro',
          name: full_name,
          email,
          phone: phone || '',
          document: document || '',
          document_type: document_type || 'ci',
          role,
          account_type,
          professional_document_url: professional_document_url || null,
          owner_email: settings.business_email,
        }),
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, role, pending_approval });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
