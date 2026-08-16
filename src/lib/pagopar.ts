import crypto from 'crypto';

const PAGOPAR_PRIVATE_KEY = process.env.PAGOPAR_PRIVATE_KEY!;
const PAGOPAR_PUBLIC_KEY = process.env.PAGOPAR_PUBLIC_KEY!;

export function generarTokenIniciarTransaccion(idPedido: string, montoTotal: number): string {
  return crypto
    .createHash('sha1')
    .update(PAGOPAR_PRIVATE_KEY + idPedido + String(parseFloat(String(montoTotal))))
    .digest('hex');
}

export function validarTokenWebhook(hashPedido: string, tokenRecibido: string): boolean {
  const tokenEsperado = crypto
    .createHash('sha1')
    .update(PAGOPAR_PRIVATE_KEY + hashPedido)
    .digest('hex');
  return tokenEsperado === tokenRecibido;
}

type PagoparComprador = {
  ruc?: string;
  email: string;
  nombre: string;
  telefono: string;
  documento: string;
  direccion?: string;
};

type PagoparItem = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  idProducto: string;
  imagenUrl?: string;
};

export async function iniciarTransaccion(params: {
  idPedidoComercio: string;
  montoTotal: number;
  comprador: PagoparComprador;
  items: PagoparItem[];
}): Promise<{ hashPedido: string }> {
  const token = generarTokenIniciarTransaccion(params.idPedidoComercio, params.montoTotal);

  const fechaLimite = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');

  const payload = {
    token,
    comprador: {
      ruc: params.comprador.ruc || '',
      email: params.comprador.email,
      ciudad: '1',
      nombre: params.comprador.nombre,
      telefono: params.comprador.telefono,
      direccion: params.comprador.direccion || '',
      documento: params.comprador.documento,
      coordenadas: '',
      razon_social: params.comprador.nombre,
      tipo_documento: 'CI',
      direccion_referencia: null,
    },
    public_key: PAGOPAR_PUBLIC_KEY,
    monto_total: params.montoTotal,
    tipo_pedido: 'VENTA-COMERCIO',
    compras_items: params.items.map(item => ({
      ciudad: '1',
      nombre: item.nombre,
      cantidad: item.cantidad,
      categoria: '909',
      public_key: PAGOPAR_PUBLIC_KEY,
      url_imagen: item.imagenUrl || '',
      descripcion: item.nombre,
      id_producto: item.idProducto,
      precio_total: item.precioUnitario * item.cantidad,
      vendedor_telefono: '',
      vendedor_direccion: '',
      vendedor_direccion_referencia: '',
      vendedor_direccion_coordenadas: '',
    })),
    fecha_maxima_pago: fechaLimite,
    id_pedido_comercio: Number(params.idPedidoComercio),
    descripcion_resumen: '',
  };

  console.log('[Pagopar] Enviando iniciar-transaccion:', JSON.stringify({ id_pedido_comercio: payload.id_pedido_comercio, monto_total: payload.monto_total }));

  const res = await fetch('https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  console.log('[Pagopar] Respuesta recibida:', JSON.stringify(data));

  if (!data.respuesta || !data.resultado?.[0]?.data) {
    console.error('[Pagopar] Transacción rechazada. Respuesta completa:', JSON.stringify(data));
    throw new Error(data.resultado?.[0]?.mensaje || 'Pagopar rechazó la transacción');
  }

  return { hashPedido: data.resultado[0].data };
}

export async function consultarPedido(hashPedido: string) {
  const token = crypto.createHash('sha1').update(PAGOPAR_PRIVATE_KEY + 'CONSULTA').digest('hex');

  const res = await fetch('https://api.pagopar.com/api/pedidos/1.1/traer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash_pedido: hashPedido, token, token_publico: PAGOPAR_PUBLIC_KEY }),
  });

  const data = await res.json();
  return data?.resultado?.[0] || null;
}
