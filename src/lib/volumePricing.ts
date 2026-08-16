import { VolumePrice } from './supabase';

/**
 * Filtra únicamente los niveles de volume_prices que representan un tramo de
 * cantidad real y aplicable en el carrito. Descarta:
 * - Niveles sin rango real (min_qty <= 0 o max_qty <= 0)
 * - Niveles cuyo precio es mayor al precio de venta normal del producto
 *   (son "listas de precio" internas del sistema externo, no descuentos —
 *   ver reporte ÉTER Sync v1.1.5 y verificación sobre ~150 productos reales)
 */
export function getValidVolumeLevels(
  volumePrices: VolumePrice[] | undefined | null,
  basePrice: number
): VolumePrice[] {
  if (!volumePrices || volumePrices.length === 0) return [];
  return volumePrices.filter(
    v => v.min_qty > 0 && v.max_qty > 0 && v.price > 0 && v.price <= basePrice
  );
}

/**
 * Dado un array de volume_prices y una cantidad, devuelve el precio unitario
 * que corresponde aplicar. Si no hay ningún nivel válido que matchee la
 * cantidad, devuelve el basePrice sin modificar.
 */
export function getUnitPriceForQty(
  volumePrices: VolumePrice[] | undefined | null,
  qty: number,
  basePrice: number
): number {
  const validLevels = getValidVolumeLevels(volumePrices, basePrice);
  const match = validLevels.find(v => qty >= v.min_qty && qty <= v.max_qty);
  return match ? match.price : basePrice;
}

/**
 * Igual que getValidVolumeLevels pero pensado para el badge/tooltip de las
 * tarjetas de producto: además ordena por price_level para mostrar los
 * tramos en orden ascendente de cantidad.
 */
export function getDisplayVolumeLevels(
  volumePrices: VolumePrice[] | undefined | null,
  basePrice: number
): VolumePrice[] {
  return getValidVolumeLevels(volumePrices, basePrice)
    .sort((a, b) => a.price_level - b.price_level);
}
