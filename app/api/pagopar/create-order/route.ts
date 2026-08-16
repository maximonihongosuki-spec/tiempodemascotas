import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { iniciarTransaccion } from '../../../../src/lib/pagopar';
import { getMemberSession } from '../../../../src/lib/memberSession';
import { validateAndPriceOrder, validateDeliveryCost } from '../../../../src/lib/orderPricing';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generarTrackingCode(): string {
  return 'TM' + Math.random().toString(36).substring(2, 6).toUpperCase() +
    Date.now().toString(36).slice(-4).toUpperCase();
}

export async function POST(req: NextRequest) {
  let orderId: string | null = null;
  try {
    const body = await req.json();

    if (!body.customer_name?.trim() || !body.customer_phone?.trim()) {
      return NextResponse.json({ error: 'Faltan datos del cliente' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }
    if (!body.total || body.total <= 0) {
      return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
    }

    const trackingCode = generarTrackingCode();

    // Rol verificado del lado del servidor — nunca confiar en lo que mande el cliente
    const session = await getMemberSession();
    const isWholesale = session?.profile?.role === 'mayorista';

    let validated;
    try {
      validated = await validateAndPriceOrder(
        supabaseAdmin,
        body.items.map((i: any) => ({ product_id: i.product_id, quantity: i.quantity })),
        isWholesale
      );
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    let deliveryCost = 0;
    if (body.delivery_type === 'delivery' && body.delivery_zone_name) {
      try {
        deliveryCost = await validateDeliveryCost(supabaseAdmin, body.delivery_zone_name);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

    const serverTotal = validated.subtotal + deliveryCost;

    const orderPayload: any = {
      customer_name: body.customer_name.trim(),
      customer_phone: body.customer_phone.trim(),
      customer_email: body.customer_email?.trim() || '',
      customer_document: body.customer_document?.trim() || '',
      customer_address: '',
      notes: body.notes?.trim() || '',
      items: validated.items,
      total: serverTotal,
      status: 'pending',
      status_etapa: 'creado',
      tracking_code: trackingCode,
      order_type: isWholesale ? 'mayorista' : (body.order_type || 'retail'),
      payment_method: 'tarjeta',
      payment_status: 'pendiente',
      delivery_type: body.delivery_type,
      user_id: session?.userId || body.user_id || null,
      prescription_url: body.prescription_url || null,
      prescription_physical: body.prescription_physical || false,
    };

    if (body.delivery_type === 'delivery' && body.delivery_zone_name) {
      orderPayload.delivery_zone_name = body.delivery_zone_name;
      orderPayload.delivery_cost = deliveryCost;
      if (body.delivery_lat && body.delivery_lng) {
        orderPayload.delivery_lat = body.delivery_lat;
        orderPayload.delivery_lng = body.delivery_lng;
      }
      if (body.delivery_maps_link) {
        orderPayload.delivery_maps_link = body.delivery_maps_link;
      }
    }

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert([orderPayload])
      .select('id, tracking_code')
      .single();

    console.log('[Pagopar] Orden creada en Supabase:', JSON.stringify({ order, insertError }));

    if (insertError || !order || !order.id) {
      console.error('Error creando orden o id ausente:', insertError, order);
      return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 });
    }

    orderId = order.id;

    const pagoparItems = validated.items.map((i: any) => ({
      nombre: i.product_name,
      cantidad: i.quantity,
      precioUnitario: i.price,
      idProducto: i.product_id,
      imagenUrl: '',
    }));

    if (body.delivery_type === 'delivery' && deliveryCost > 0) {
      pagoparItems.push({
        nombre: 'Costo de envío',
        cantidad: 1,
        precioUnitario: deliveryCost,
        idProducto: 'delivery-cost',
        imagenUrl: '',
      });
    }

    const { hashPedido } = await iniciarTransaccion({
      idPedidoComercio: String(Date.now()),
      montoTotal: serverTotal,
      comprador: {
        email: body.customer_email?.trim() || 'sin-email@tiempodemascotas.com.py',
        nombre: body.customer_name.trim(),
        telefono: body.customer_phone.trim(),
        documento: body.customer_document?.trim() || '0',
      },
      items: pagoparItems,
    });

    await supabaseAdmin
      .from('orders')
      .update({ payment_hash: hashPedido })
      .eq('id', order.id);

    return NextResponse.json({
      redirectUrl: `https://www.pagopar.com/pagos/${hashPedido}`,
      trackingCode: order.tracking_code,
    });
  } catch (error: any) {
    console.error('Error en create-order:', error);
    // Si la orden se creó pero Pagopar falló, la eliminamos: no se generó ningún cobro real
    if (orderId) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
    }
    return NextResponse.json({ error: error.message || 'Error al iniciar el pago' }, { status: 500 });
  }
}
