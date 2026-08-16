import { getUnitPriceForQty } from './volumePricing';

function getMayoristaPrice(product: any): number {
  if (product.special_price && product.special_price > 0) return product.special_price;
  if (product.wholesale_price && product.wholesale_price > 0) return product.wholesale_price;
  if (product.differentiated_price && product.differentiated_price > 0) return product.differentiated_price;
  const factor = product.wholesale_factor ?? 0.9;
  return Math.round(product.price * factor);
}

export type RawOrderItem = { product_id: string; quantity: number };

export type ValidatedOrderItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  requires_prescription: boolean;
  is_bulk: boolean;
};

/**
 * Recalcula el pedido completo del lado del servidor: precio real de cada
 * producto (considerando precio mayorista solo si isWholesale=true, que
 * viene del rol de sesión VERIFICADO, nunca de lo que mande el cliente),
 * precios por volumen, y valida stock disponible. Tira error si algo no
 * corresponde — el caller decide si rechazar el pedido entero.
 */
export async function validateAndPriceOrder(
  supabaseAdmin: any,
  rawItems: RawOrderItem[],
  isWholesale: boolean
): Promise<{ items: ValidatedOrderItem[]; subtotal: number }> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('El carrito está vacío');
  }

  const ids = rawItems.map(i => i.product_id).filter(Boolean);
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, name, public_name, price, special_price, differentiated_price, wholesale_price, wholesale_factor, stock, active, requires_prescription, is_bulk, volume_prices(id, product_id, price_level, min_qty, max_qty, price)')
    .in('id', ids);

  if (error) throw new Error('Error al validar productos del pedido');

  const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));
  const items: ValidatedOrderItem[] = [];
  let subtotal = 0;

  for (const raw of rawItems) {
    const qty = Math.max(1, Math.floor(Number(raw.quantity) || 0));
    const product = productMap.get(raw.product_id);

    if (!product || product.active === false) {
      throw new Error(`Un producto del carrito ya no está disponible.`);
    }
    if ((product.stock ?? 0) < qty) {
      throw new Error(`Sin stock suficiente de "${product.public_name || product.name}" (disponible: ${product.stock ?? 0}).`);
    }

    const unitPrice = isWholesale
      ? getMayoristaPrice(product)
      : getUnitPriceForQty(
          product.volume_prices,
          qty,
          product.special_price && product.special_price > 0 ? product.special_price : product.price
        );

    items.push({
      product_id: product.id,
      product_name: product.public_name || product.name,
      price: unitPrice,
      quantity: qty,
      requires_prescription: !!product.requires_prescription,
      is_bulk: !!product.is_bulk,
    });
    subtotal += unitPrice * qty;
  }

  return { items, subtotal };
}

/**
 * Valida el costo de delivery contra la tabla real de zonas, en vez de
 * confiar en el monto que mande el cliente.
 */
export async function validateDeliveryCost(
  supabaseAdmin: any,
  zoneName: string | null | undefined
): Promise<number> {
  if (!zoneName) return 0;
  const { data: zone } = await supabaseAdmin
    .from('delivery_zones')
    .select('price, is_active')
    .eq('name', zoneName)
    .maybeSingle();
  if (!zone || zone.is_active === false) {
    throw new Error('Zona de delivery no válida');
  }
  return zone.price || 0;
}
