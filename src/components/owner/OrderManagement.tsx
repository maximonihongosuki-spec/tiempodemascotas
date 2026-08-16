import { useState } from 'react';
import { CheckCircle, Clock, XCircle, FileText, Trash2, Phone, Mail } from 'lucide-react';
import { supabase, Order } from '../../lib/supabase';
import { format } from 'date-fns';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia bancaria',
  tarjeta: 'Tarjeta (Pagopar)',
  pos: 'POS / posnet en el momento',
};

const ETAPAS = [
  { key: 'creado', label: '📋 Pedido creado' },
  { key: 'confirmado', label: '✔️ Confirmado' },
  { key: 'preparando', label: '📦 Preparando' },
  { key: 'en_camino', label: '🚚 En camino' },
  { key: 'para_retirar', label: '🏪 Para retirar' },
  { key: 'entregado', label: '✅ Entregado' },
];

type OrderManagementProps = {
  orders: Order[];
  onUpdate: () => void;
  onCreateSale?: (order: Order) => void;
};

export default function OrderManagement({ orders, onUpdate, onCreateSale }: OrderManagementProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [onlyUnnotified, setOnlyUnnotified] = useState(false);

  const visibleOrders = onlyUnnotified
    ? orders.filter(o => !(o as any).whatsapp_notified_at)
    : orders;

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
      onUpdate();
    } catch (error: any) { alert('Error al actualizar estado'); }
  };

  const handleSetEtapa = async (orderId: string, etapa: string) => {
    const updates: any = { status_etapa: etapa, updated_at: new Date().toISOString() };
    if (etapa === 'entregado') {
      updates.entregado_cliente_at = new Date().toISOString();
      updates.status = 'completed';
    }
    try {
      const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
      if (error) throw error;
      onUpdate();
    } catch { alert('Error al actualizar etapa'); }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) newSelected.delete(orderId); else newSelected.add(orderId);
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(orders.map(o => o.id)));
  };

  const deleteSelectedOrders = async () => {
    if (selectedOrders.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedOrders.size} pedido(s)?`)) return;
    try {
      const orderIds = Array.from(selectedOrders);
      // Clean up related data first if needed (logic kept from original)
      const { data: salesData } = await supabase.from('sales').select('id').in('order_id', orderIds);
      if (salesData && salesData.length > 0) {
        const saleIds = salesData.map(s => s.id);
        await supabase.from('credit_payments').delete().in('sale_id', saleIds);
        await supabase.from('sale_items').delete().in('sale_id', saleIds);
        await supabase.from('sales').delete().in('id', saleIds);
      }
      const { error } = await supabase.from('orders').delete().in('id', orderIds);
      if (error) throw error;
      setSelectedOrders(new Set());
      onUpdate();
    } catch (error: any) { alert('Error al eliminar: ' + error.message); }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels = { pending: 'Pendiente', completed: 'Completado', cancelled: 'Cancelado' };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="font-sans text-gray-900">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Pedidos Web</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyUnnotified(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              onlyUnnotified ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {onlyUnnotified ? '⚠️ Mostrando solo sin avisar' : 'Mostrar solo sin avisar'}
          </button>
          {selectedOrders.size > 0 && (
            <button onClick={deleteSelectedOrders} className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">
              <Trash2 className="w-4 h-4" /> <span>Eliminar ({selectedOrders.size})</span>
            </button>
          )}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" checked={selectedOrders.size === orders.length} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-600">Seleccionar todos</span>
        </div>
      )}

      <div className="space-y-4">
        {visibleOrders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleSelectOrder(order.id)} className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-900">{order.customer_name}</h3>
                    {getStatusBadge(order.status)}
                    {(order as any).payment_method === 'tarjeta' && (order as any).payment_status !== 'pagado' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wide border border-orange-200">
                        ⏳ Pago pendiente
                      </span>
                    )}
                    {(order as any).order_type === 'mayorista' && (
                      <span className="px-2 py-0.5 text-xs font-black bg-purple-100 text-purple-700 rounded-full border border-purple-200">VETERINARIO</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    <p className="flex items-center gap-1"><Clock size={12}/> {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    {order.customer_phone && <p className="flex items-center gap-1"><Phone size={12}/> {order.customer_phone}</p>}
                    {order.customer_email && <p className="flex items-center gap-1"><Mail size={12}/> {order.customer_email}</p>}
                    {(order as any).tracking_code && (
                      <p className="flex items-center gap-1 font-mono text-xs text-[#166534] font-bold">
                        🔍 {(order as any).tracking_code}
                      </p>
                    )}
                    {(order as any).whatsapp_notified_at ? (
                      <p className="text-[10px] font-bold text-green-600">
                        ✅ Avisado {format(new Date((order as any).whatsapp_notified_at), 'dd/MM HH:mm')}
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-orange-500">⚠️ Sin avisar</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">₲ {order.total.toLocaleString('es-PY')}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-3 mb-4 border border-gray-100 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Método de pago</p>
                <p className="font-semibold text-gray-800">
                  {PAYMENT_METHOD_LABELS[(order as any).payment_method] || (order as any).payment_method || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Estado del pago</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black uppercase border ${
                  ['pagado', 'confirmed', 'confirmado'].includes((order as any).payment_status)
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                }`}>
                  {(order as any).payment_status || 'pending'}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Entrega</p>
                <p className="font-semibold text-gray-800">
                  {(order as any).delivery_type === 'delivery'
                    ? `Delivery${(order as any).delivery_zone_name ? ` — ${(order as any).delivery_zone_name}` : ''}`
                    : 'Retiro en el local'}
                </p>
                {(order as any).delivery_type === 'delivery' && (order as any).delivery_lat && (order as any).delivery_lng && (
                  <a
                    href={`https://www.google.com/maps?q=${(order as any).delivery_lat},${(order as any).delivery_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-1"
                  >
                    📍 Ver ubicación marcada en el mapa ↗
                  </a>
                )}
                {(order as any).delivery_type === 'delivery' && (order as any).delivery_maps_link && (
                  <a
                    href={(order as any).delivery_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-bold text-blue-600 hover:underline mt-1"
                  >
                    🔗 Link de Google Maps del cliente ↗
                  </a>
                )}
                {(order as any).delivery_type === 'delivery' && !(order as any).delivery_lat && !(order as any).delivery_maps_link && (
                  <p className="text-xs text-gray-400 italic mt-1">Sin ubicación marcada</p>
                )}
              </div>

              {(order as any).customer_document && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Documento</p>
                  <p className="font-semibold text-gray-800">{(order as any).customer_document}</p>
                </div>
              )}

              {(order as any).prescription_url && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Receta médica</p>
                  <a
                    href={(order as any).prescription_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Ver receta subida ↗
                  </a>
                </div>
              )}

              {(order as any).prescription_physical && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Receta médica</p>
                  <p className="text-xs font-bold text-amber-600">🩺 Cliente entrega la receta física</p>
                </div>
              )}

              {(order as any).invoice_data && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Facturación</p>
                  <p className="text-xs text-gray-700">
                    {(order as any).invoice_data.razon_social} — {(order as any).invoice_data.documento_tipo?.toUpperCase()} {(order as any).invoice_data.documento}
                  </p>
                </div>
              )}

              {(order as any).payment_method === 'transferencia' && (order as any).payment_proof_url && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Comprobante</p>
                  <a
                    href={(order as any).payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Ver comprobante ↗
                  </a>
                </div>
              )}

              {(order as any).payment_method === 'tarjeta' && (order as any).payment_hash && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Referencia Pagopar</p>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText((order as any).payment_hash)}
                    title="Copiar referencia completa"
                    className="font-mono text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded px-2 py-1 hover:bg-purple-100"
                  >
                    {(order as any).payment_hash.slice(0, 16)}… 📋
                  </button>
                </div>
              )}

              {(order as any).payment_confirmed_at && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Pago confirmado</p>
                  <p className="font-semibold text-gray-800 text-xs">
                    {format(new Date((order as any).payment_confirmed_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-md p-3 mb-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Detalle del Pedido</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">{item.quantity} x {item.product_name}</span>
                    <span className="text-gray-500">₲ {(item.price * item.quantity).toLocaleString('es-PY')}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.notes && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-100">
                <strong>Nota:</strong> {order.notes}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 items-center">
              <select
                value={(order as any).status_etapa || 'creado'}
                onChange={(e) => handleSetEtapa(order.id, e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white font-medium text-gray-700 focus:ring-1 focus:ring-[#166534] outline-none"
              >
                {ETAPAS.map(e => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
              {order.status === 'pending' && (
                <>
                  <button onClick={() => handleStatusChange(order.id, 'completed')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">
                    <CheckCircle className="w-3.5 h-3.5" /> Completar
                  </button>
                  <button onClick={() => handleStatusChange(order.id, 'cancelled')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50">
                    <XCircle className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </>
              )}
              {onCreateSale && (order.status === 'pending' || order.status === 'completed') && (
                <button onClick={() => onCreateSale(order)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 ml-auto">
                  <FileText className="w-3.5 h-3.5" /> Generar Venta
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No hay pedidos pendientes.</div>}
      </div>
    </div>
  );
}