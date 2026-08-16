import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { CheckCircle, Clock, XCircle, Package } from 'lucide-react';
import { consultarPedido } from '../../../src/lib/pagopar';
import RedirectCountdown from '../../../src/components/RedirectCountdown';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = 'force-dynamic';

async function getOrderByHash(hash: string) {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, tracking_code, total, payment_status, status_etapa')
    .eq('payment_hash', hash)
    .maybeSingle();
  return data;
}

export default async function PagoFinalizadoPage({ params }: { params: { hash: string } }) {
  const { hash } = params;

  let order = await getOrderByHash(hash);

  // Si todavía no está confirmado localmente, consultamos directo a Pagopar como respaldo del webhook
  if (order && order.payment_status !== 'pagado') {
    try {
      const resultado = await consultarPedido(hash);
      if (resultado?.pagado === true) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'completado',
            status_etapa: 'confirmado',
            payment_status: 'pagado',
            payment_confirmed_at: resultado.fecha_pago || new Date().toISOString(),
          })
          .eq('id', order.id);
        order = await getOrderByHash(hash);
      } else if (resultado?.cancelado === true) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelado', payment_status: 'cancelado' })
          .eq('id', order.id);
        order = await getOrderByHash(hash);
      }
    } catch (e) {
      console.error('Error consultando estado en Pagopar:', e);
      // Si falla la consulta, mostramos igual el estado que tengamos guardado localmente
    }
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <XCircle className="w-14 h-14 text-red-400 mx-auto" />
          <h1 className="text-xl font-display font-black text-gray-900">No encontramos este pedido</h1>
          <p className="text-sm text-gray-500">Si ya realizaste el pago y ves este mensaje, escribinos por WhatsApp con el número de referencia.</p>
          <Link href="/" className="inline-block mt-2 px-5 py-2.5 bg-[#166534] text-white rounded-xl font-bold text-sm">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const estado = order.payment_status === 'pagado' ? 'pagado'
    : order.payment_status === 'cancelado' ? 'cancelado'
    : 'pendiente';

  const config = {
    pagado: {
      icon: CheckCircle, color: 'text-[#166534]', bg: 'bg-[#166534]/10',
      title: '¡Pago confirmado!',
      desc: 'Tu pedido fue registrado y ya estamos preparándolo.',
    },
    cancelado: {
      icon: XCircle, color: 'text-red-500', bg: 'bg-red-50',
      title: 'El pago no se completó',
      desc: 'Tu pedido fue cancelado. Si creés que es un error, contactanos.',
    },
    pendiente: {
      icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50',
      title: 'Estamos confirmando tu pago',
      desc: 'Puede demorar hasta 2 minutos. Actualizá esta página en un momento.',
    },
  }[estado];

  const Icon = config.icon;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
        <div className={`w-16 h-16 rounded-full ${config.bg} flex items-center justify-center mx-auto`}>
          <Icon className={`w-9 h-9 ${config.color}`} />
        </div>
        <h1 className="text-xl font-display font-black text-gray-900">{config.title}</h1>
        <p className="text-sm text-gray-500">{config.desc}</p>

        {order.tracking_code && (
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-700">Código: {order.tracking_code}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {order.tracking_code && (
            <Link href={`/seguimiento/${order.tracking_code}`}
              className="px-5 py-2.5 bg-[#166534] text-white rounded-xl font-bold text-sm">
              Ver seguimiento de mi pedido
            </Link>
          )}
          <Link href="/" className="px-5 py-2.5 text-gray-500 font-bold text-sm">
            Volver al inicio
          </Link>
        </div>

        {estado === 'pagado' && order.tracking_code && (
          <RedirectCountdown to={`/seguimiento/${order.tracking_code}`} seconds={4} />
        )}
      </div>
    </div>
  );
}
