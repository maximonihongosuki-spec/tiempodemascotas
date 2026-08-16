import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PawPrint, Package, CheckCircle, Truck, MapPin, Clock, ArrowLeft, MessageCircle } from 'lucide-react';
import { toTitleCase } from '../../../src/lib/textFormat';
import { buildOrderWhatsAppMessage, fetchItemsMetadata } from '../../../src/lib/orderWhatsapp';

export const revalidate = 10;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

type Props = { params: { codigo: string } };

interface TrackingStep {
  label: string;
  description: string;
  done: boolean;
  date?: string | null;
  current?: boolean;
  icon: any;
}

function formatDate(d?: string | null) {
  if (!d || !d.trim()) return null;
  try {
    return new Date(d).toLocaleDateString('es-PY', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
}

function getOrderSteps(order: any): TrackingStep[] {
  const etapa = order.status_etapa || 'creado';
  const etapas = ['creado', 'confirmado', 'preparando', 'en_camino', 'entregado'];
  const normalizedEtapa = etapa === 'para_retirar' ? 'en_camino' : etapa;
  const etapaIdx = etapas.indexOf(normalizedEtapa);
  const isParaRetirar = etapa === 'para_retirar';
  const isEnCamino = etapa === 'en_camino';
  const listoActivo = etapaIdx >= 3;

  const steps: TrackingStep[] = [
    {
      label: 'Pedido recibido',
      description: 'Tu pedido fue registrado en nuestro sistema.',
      done: etapaIdx >= 0,
      date: order.created_at,
      icon: Package,
    },
    {
      label: 'Confirmado',
      description: 'Tu pedido fue confirmado y está siendo procesado.',
      done: etapaIdx >= 1,
      icon: CheckCircle,
    },
    {
      label: 'Preparando',
      description: 'Estamos preparando tu pedido con cuidado.',
      done: etapaIdx >= 2,
      icon: Clock,
    },
    {
      label: isParaRetirar ? 'Listo para retirar 🏪' : isEnCamino ? 'En camino 🚚' : 'Listo',
      description: isParaRetirar
        ? 'Tu pedido está listo para ser retirado en nuestro local.'
        : isEnCamino
          ? 'Tu pedido está en camino hacia vos.'
          : 'Tu pedido está listo.',
      done: listoActivo,
      icon: isParaRetirar ? MapPin : Truck,
    },
    {
      label: 'Entregado ✅',
      description: '¡Tu pedido fue entregado exitosamente!',
      done: etapaIdx >= 4 || !!order.entregado_cliente_at,
      date: order.entregado_cliente_at,
      icon: CheckCircle,
    },
  ];

  const lastDoneIdx = [...steps].map((s, i) => s.done ? i : -1).filter(i => i >= 0).pop();
  if (lastDoneIdx !== undefined) steps[lastDoneIdx].current = true;

  return steps;
}

export default async function SeguimientoPage({ params }: Props) {
  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_name, customer_phone, customer_document, created_at, status, status_etapa, entregado_cliente_at, tracking_code, total, items, delivery_type, delivery_zone_name, delivery_cost, delivery_lat, delivery_lng, payment_method, payment_hash, invoice_data, payment_proof_url')
    .eq('tracking_code', params.codigo)
    .maybeSingle();

  if (!order) notFound();

  const { data: waSettings } = await supabase
    .from('site_settings')
    .select('whatsapp_number, whatsapp_enabled')
    .single();

  const itemsMeta = order.items?.length ? await fetchItemsMetadata(supabase, order.items) : {};

  const waMessage = buildOrderWhatsAppMessage(
    {
      tracking_code: order.tracking_code,
      customer_name: order.customer_name,
      customer_phone: (order as any).customer_phone,
      customer_document: (order as any).customer_document,
      items: order.items || [],
      total: order.total,
      delivery_type: (order as any).delivery_type || 'retiro',
      delivery_zone_name: (order as any).delivery_zone_name,
      delivery_cost: (order as any).delivery_cost,
      delivery_lat: (order as any).delivery_lat,
      delivery_lng: (order as any).delivery_lng,
      delivery_maps_link: null,
      payment_method: (order as any).payment_method,
      payment_hash: (order as any).payment_hash,
      invoice_data: (order as any).invoice_data || null,
      payment_proof_url: (order as any).payment_proof_url || null,
    },
    itemsMeta
  );

  const steps = getOrderSteps(order);
  const doneCount = steps.filter(s => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar simple */}
      <nav className="bg-[#166534] shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#eeee22] rounded-lg flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-[#166534]" />
            </div>
            <span className="text-white font-display font-black text-sm uppercase">Tiempo de Mascotas</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver al sitio
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header pedido */}
        <div className="bg-[#166534] rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Código de rastreo</p>
              <p className="text-2xl font-mono font-black tracking-widest text-[#eeee22]">{order.tracking_code}</p>
              <p className="text-white/70 text-sm mt-2">
                Pedido de <span className="font-bold text-white">{order.customer_name}</span>
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {formatDate(order.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-display font-black text-[#eeee22]">
                Gs. {order.total.toLocaleString('es-PY')}
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-[#eeee22] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-display font-black text-[#166534] uppercase tracking-tight text-lg mb-6">
            Estado del pedido
          </h2>
          <div className="space-y-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-4">
                  {/* Indicador */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.current
                        ? 'bg-[#166534] border-[#166534] shadow-lg shadow-[#166534]/30'
                        : step.done
                          ? 'bg-[#166534]/10 border-[#166534]'
                          : 'bg-white border-gray-200'
                    }`}>
                      {step.current && <div className="absolute w-10 h-10 rounded-full bg-[#166534]/20 animate-ping" />}
                      <Icon className={`w-4 h-4 ${step.current ? 'text-white' : step.done ? 'text-[#166534]' : 'text-gray-300'}`} />
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-0.5 h-8 mt-1 ${step.done ? 'bg-[#166534]' : 'bg-gray-100'}`} />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className={`pb-6 flex-1 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
                    <p className={`font-display font-black text-sm uppercase tracking-tight ${
                      step.current ? 'text-[#166534]' : step.done ? 'text-gray-800' : 'text-gray-300'
                    }`}>
                      {step.label}
                      {step.current && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-[#eeee22] text-[#166534] text-[10px] font-black rounded-full uppercase">
                          Estado actual
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${step.done ? 'text-gray-500' : 'text-gray-300'}`}>
                      {step.description}
                    </p>
                    {step.date && formatDate(step.date) && (
                      <p className="text-[10px] text-[#166534] font-bold mt-1">{formatDate(step.date)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items del pedido */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-display font-black text-[#166534] uppercase tracking-tight text-lg mb-4">
              Productos del pedido
            </h2>
            <div className="space-y-3">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.product_name} className="w-10 h-10 object-contain rounded-lg bg-gray-50" />
                    )}
                    <div>
                      <p className="font-display font-bold text-gray-800 text-sm">{toTitleCase(item.product_name)}</p>
                      <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-display font-black text-[#166534] text-sm">
                    Gs. {(item.price * item.quantity).toLocaleString('es-PY')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {waSettings?.whatsapp_enabled && waSettings?.whatsapp_number && (
          <a
            href={`https://wa.me/${waSettings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-2xl font-display font-black uppercase text-sm hover:bg-[#20BA5A] transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Consultar por WhatsApp
          </a>
        )}

        <p className="text-center text-xs text-gray-400">
          Esta página se actualiza automáticamente cada 10 segundos.
        </p>
      </div>
    </div>
  );
}
