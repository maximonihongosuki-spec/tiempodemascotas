import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validarTokenWebhook } from '../../../../src/lib/pagopar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resultado = body?.resultado?.[0];

    if (!resultado?.hash_pedido || !resultado?.token) {
      // Payload mal formado — respondemos 200 igual para que Pagopar no reintente indefinidamente
      // por algo que nunca se va a resolver solo.
      return NextResponse.json({ error: 'Payload inválido' }, { status: 200 });
    }

    const tokenValido = validarTokenWebhook(resultado.hash_pedido, resultado.token);
    if (!tokenValido) {
      // No tocar la base de datos si el token no coincide.
      console.error('Webhook Pagopar: token no coincide para hash', resultado.hash_pedido);
      return NextResponse.json({ error: 'Token no coincide' }, { status: 401 });
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, payment_status')
      .eq('payment_hash', resultado.hash_pedido)
      .maybeSingle();

    if (!order) {
      // No encontramos el pedido localmente — igual respondemos 200 para no generar reintentos infinitos.
      console.error('Webhook Pagopar: pedido no encontrado para hash', resultado.hash_pedido);
      return NextResponse.json(body.resultado, { status: 200 });
    }

    if (resultado.pagado === true) {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'completado',
          status_etapa: 'confirmado',
          payment_status: 'pagado',
          payment_confirmed_at: resultado.fecha_pago || new Date().toISOString(),
        })
        .eq('id', order.id);
    } else if (resultado.pagado === false) {
      await supabaseAdmin
        .from('orders')
        .update({
          status: resultado.cancelado ? 'cancelado' : 'pending',
          payment_status: resultado.cancelado ? 'cancelado' : 'pendiente',
        })
        .eq('id', order.id);
    }

    // Devolver exactamente el mismo array "resultado" que envió Pagopar, con código 200.
    return NextResponse.json(body.resultado, { status: 200 });
  } catch (error: any) {
    console.error('Error en webhook de Pagopar:', error);
    // Siempre 200: un error nuestro no debe generar reintentos indefinidos de Pagopar.
    return NextResponse.json({ error: 'Error interno' }, { status: 200 });
  }
}
