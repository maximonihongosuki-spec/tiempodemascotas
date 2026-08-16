import Link from 'next/link';
import { ShoppingBag, Package, ChevronRight, Clock, CheckCircle, Truck, MapPin } from 'lucide-react';
import { getMemberSession } from '../../../../src/lib/memberSession';
import { createSupabaseServerClient } from '../../../../src/lib/supabase-server';
import { toTitleCase } from '../../../../src/lib/textFormat';

export const dynamic = 'force-dynamic';

const ETAPA_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  creado:       { label: 'Pedido recibido',    icon: Package,     bg: 'bg-gray-100',  text: 'text-gray-500' },
  confirmado:   { label: 'Confirmado',          icon: CheckCircle, bg: 'bg-blue-50',   text: 'text-blue-600' },
  preparando:   { label: 'Preparando',          icon: Clock,       bg: 'bg-yellow-50', text: 'text-yellow-600' },
  en_camino:    { label: 'En camino',           icon: Truck,       bg: 'bg-orange-50', text: 'text-orange-600' },
  para_retirar: { label: 'Listo para retirar', icon: MapPin,      bg: 'bg-purple-50', text: 'text-purple-600' },
  entregado:    { label: 'Entregado',           icon: CheckCircle, bg: 'bg-green-50',  text: 'text-[#166534]' },
};

export default async function PedidosPage() {
  const session = await getMemberSession();
  const supabase = await createSupabaseServerClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, tracking_code, total, status, status_etapa, created_at, items')
    .eq('user_id', session!.userId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
        <p className="text-gray-400 text-sm mt-0.5">Historial y seguimiento de tus compras</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-bold text-gray-400 text-sm">No tenés pedidos aún</p>
          <Link href="/miembros/catalogo"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] text-white rounded-full text-sm font-semibold hover:bg-[#064E3B] transition-colors">
            Ver catálogo <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const etapa = order.status_etapa || 'creado';
            const config = ETAPA_CONFIG[etapa] || ETAPA_CONFIG.creado;
            const Icon = config.icon;
            return (
              <div key={order.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-[#166534]/20 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-800 text-sm">
                        #{order.tracking_code || order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {new Date(order.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {order.items?.slice(0, 2).map((item: any, i: number) => (
                        <span key={i} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-gray-500 font-medium">
                          {item.quantity}× {toTitleCase(item.product_name)}
                        </span>
                      ))}
                      {order.items?.length > 2 && (
                        <span className="text-xs text-gray-400 px-2 py-1">+{order.items.length - 2} más</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-[#166534] text-base">
                      Gs. {order.total.toLocaleString('es-PY')}
                    </p>
                    {order.tracking_code && (
                      <Link href={`/seguimiento/${order.tracking_code}`}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[#166534] hover:underline font-semibold">
                        Rastrear <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
