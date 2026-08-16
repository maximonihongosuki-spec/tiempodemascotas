import { SupabaseClient } from '@supabase/supabase-js';

type OrderItemSnapshot = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
};

type ItemMeta = { product_code?: string; external_code?: string; url_slug?: string };

export async function fetchItemsMetadata(
  supabaseClient: SupabaseClient,
  items: OrderItemSnapshot[]
): Promise<Record<string, ItemMeta>> {
  const ids = items.map(i => i.product_id).filter(Boolean);
  if (ids.length === 0) return {};
  const { data } = await supabaseClient
    .from('products')
    .select('id, product_code, external_code, url_slug')
    .in('id', ids);
  const map: Record<string, ItemMeta> = {};
  (data || []).forEach((p: any) => {
    map[p.id] = { product_code: p.product_code, external_code: p.external_code, url_slug: p.url_slug };
  });
  return map;
}

const SITE_URL = 'https://tiempodemascotas.com.py';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo en el local',
  transferencia: 'Transferencia bancaria',
  tarjeta: 'Tarjeta de crédito / débito (Pagopar)',
  pos: 'POS / posnet en el momento de la entrega',
};

export type OrderForMessage = {
  tracking_code: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_document?: string | null;
  items: OrderItemSnapshot[];
  total: number;
  delivery_type: 'retiro' | 'delivery';
  delivery_zone_name?: string | null;
  delivery_cost?: number | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_maps_link?: string | null;
  payment_method?: string | null;
  payment_hash?: string | null;
  invoice_data?: {
    razon_social: string;
    documento: string;
    documento_tipo: 'ci' | 'ruc';
    direccion?: string | null;
  } | null;
  payment_proof_url?: string | null;
};

export function buildOrderWhatsAppMessage(order: OrderForMessage, itemsMeta: Record<string, ItemMeta>): string {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Formato de cada línea de producto — SIN CAMBIOS, tal como estaba antes
  const lineas = order.items.map(i => {
    const meta = itemsMeta[i.product_id] || {};
    const codigo = meta.product_code || meta.external_code || 'Sin código';
    const url = meta.url_slug ? `${SITE_URL}/${meta.url_slug}` : SITE_URL;
    return (
      `${i.quantity}x - ${i.product_name}\n` +
      `Código: ${codigo}\n` +
      `Precio: ₲${(i.price * i.quantity).toLocaleString('es-PY')}\n` +
      `URL: ${url}`
    );
  }).join('\n\n');

  // Envío
  let envio: string;
  if (order.delivery_type === 'retiro') {
    envio = 'Retiro en el local';
  } else {
    const zona = order.delivery_zone_name || 'Zona no especificada';
    const costo = order.delivery_cost ? `₲${order.delivery_cost.toLocaleString('es-PY')}` : 'a confirmar';
    envio = `Delivery — ${zona} (${costo})`;
    if (order.delivery_lat && order.delivery_lng) {
      envio += `\nUbicación: https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`;
    } else if (order.delivery_maps_link) {
      envio += `\nUbicación: ${order.delivery_maps_link}`;
    }
  }

  // Pago
  const pago = PAYMENT_LABELS[order.payment_method || ''] || order.payment_method || 'No especificado';
  const referenciaPago = order.payment_method === 'tarjeta' && order.payment_hash
    ? `\nReferencia Pagopar: ${order.payment_hash}`
    : '';
  const comprobanteLink = order.payment_method === 'transferencia' && order.payment_proof_url
    ? `\nComprobante: ${order.payment_proof_url}`
    : '';

  // Facturación (opcional)
  const facturacionBloque = order.invoice_data ? (
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🧾 *DATOS DE FACTURACIÓN*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `Razón social: ${order.invoice_data.razon_social}\n` +
    `${order.invoice_data.documento_tipo.toUpperCase()}: ${order.invoice_data.documento}` +
    (order.invoice_data.direccion ? `\nDirección: ${order.invoice_data.direccion}` : '') +
    `\n\n`
  ) : '';

  return (
    `¡Hola! Acabo de hacer un pedido en *Tiempo de Mascotas* 🐾\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *DATOS DEL CLIENTE*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `Nombre: ${order.customer_name}\n` +
    `Teléfono: ${order.customer_phone || 'No especificado'}` +
    (order.customer_document ? `\nDocumento: ${order.customer_document}` : '') +
    `\nCódigo de seguimiento: *${order.tracking_code}*\n\n` +

    facturacionBloque +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 *DETALLE DEL PEDIDO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${lineas}\n\n` +

    `Subtotal: ₲${subtotal.toLocaleString('es-PY')}\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🚚 *ENTREGA*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${envio}\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `💳 *MÉTODO DE PAGO*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${pago}${referenciaPago}${comprobanteLink}\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *TOTAL: Gs. ${order.total.toLocaleString('es-PY')}*\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +

    `¡Muchas gracias! 🐶🐱`
  );
}
