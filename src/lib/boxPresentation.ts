import { VolumePrice } from './supabase';

/**
 * Resultado de detectBoxPresentation().
 * hasBox: false → el producto no tiene presentación de caja detectada.
 * hasBox: true  → se detectó una presentación de caja con sus datos.
 *   dataIsComplete: true  → datos completos (nivel 3 estándar con rangos definidos).
 *   dataIsComplete: false → datos parciales (nivel 2 sin rangos, precio inferido).
 */
export type BoxDetectionResult =
  | { hasBox: false }
  | {
      hasBox: true;
      boxLevel: number;      // price_level donde está el precio de caja (2 o 3)
      boxPrice: number;      // precio total de la caja
      unitsPerBox: number;   // cuántas unidades trae la caja
      unitPriceInBox: number; // precio unitario al comprar en caja
      dataIsComplete: boolean;
    };

/**
 * Analiza los volume_prices de un producto y detecta si existe una
 * "presentación de caja": un nivel cuyo precio total equivale al precio
 * unitario del nivel anterior multiplicado por la cantidad mínima de ese nivel.
 *
 * Patrón confirmado con datos reales (julio 2026):
 *   Nivel N (caja): price > basePrice
 *   Nivel N-1 (unidades con descuento): min_qty = unidades por caja, price = precio unitario
 *   Verificación: nivel_N.price ≈ nivel_N-1.min_qty × nivel_N-1.price (tolerancia 5%)
 *
 * Ejemplos reales:
 *   AKIO ARENA 3KG: niv1 1-3×42000, niv2 4-999×39000, niv3 1-9999×156000
 *     → 4 × 39000 = 156000 ✓ → caja de 4 unidades
 *   AFFORD DERMIL: niv1 1-9×20000, niv2 10-9999×15500, niv3 1-9999×155000
 *     → 10 × 15500 = 155000 ✓ → caja de 10 unidades
 *
 * Distribución real en la DB (julio 2026): 223 en nivel 3, 16 en nivel 2.
 * Los 16 de nivel 2 tienen min_qty=0 y max_qty=0 → dataIsComplete=false.
 */
export function detectBoxPresentation(
  volumePrices: VolumePrice[] | undefined | null,
  basePrice: number
): BoxDetectionResult {
  if (!volumePrices || volumePrices.length === 0 || basePrice <= 0) {
    return { hasBox: false };
  }

  // Separar niveles válidos (unidades reales) de candidatos a caja
  const validUnitLevels = volumePrices
    .filter(v => v.min_qty > 0 && v.max_qty > 0 && v.price > 0 && v.price <= basePrice)
    .sort((a, b) => a.price_level - b.price_level);

  const boxCandidates = volumePrices
    .filter(v => v.price > basePrice)
    .sort((a, b) => a.price_level - b.price_level);

  // CASO A: niveles de caja con rangos definidos (nivel 3 estándar)
  for (const candidate of boxCandidates) {
    if (candidate.min_qty <= 0 || candidate.max_qty <= 0) continue;

    // Buscar el último nivel de unidades antes de este candidato
    const prevLevel = [...validUnitLevels]
      .filter(v => v.price_level < candidate.price_level)
      .pop();

    if (!prevLevel) continue;

    const unitsPerBox = prevLevel.min_qty;
    const expectedBoxPrice = unitsPerBox * prevLevel.price;
    const tolerance = expectedBoxPrice * 0.05; // 5%

    if (Math.abs(candidate.price - expectedBoxPrice) <= tolerance) {
      return {
        hasBox: true,
        boxLevel: candidate.price_level,
        boxPrice: candidate.price,
        unitsPerBox,
        unitPriceInBox: prevLevel.price,
        dataIsComplete: true,
      };
    }
  }

  // CASO B: nivel 2 sin rangos (min_qty=0, max_qty=0) — 16 casos reales
  // Se intenta inferir unidades por caja como múltiplo limpio del precio base
  for (const candidate of boxCandidates) {
    if (candidate.min_qty !== 0 || candidate.max_qty !== 0) continue;
    if (candidate.price <= 0) continue;

    const multiple = Math.round(candidate.price / basePrice);
    if (multiple < 2) continue;

    const expectedPrice = multiple * basePrice;
    const tolerance = expectedPrice * 0.05;

    if (Math.abs(candidate.price - expectedPrice) <= tolerance) {
      return {
        hasBox: true,
        boxLevel: candidate.price_level,
        boxPrice: candidate.price,
        unitsPerBox: multiple,
        unitPriceInBox: basePrice,
        dataIsComplete: false, // datos parciales: sin rangos de cantidad definidos
      };
    }
  }

  return { hasBox: false };
}

/**
 * Versión simplificada para verificación rápida sin calcular todos los datos.
 * Útil para filtrar listas de productos que tienen caja disponible.
 */
export function hasBoxPresentation(
  volumePrices: VolumePrice[] | undefined | null,
  basePrice: number
): boolean {
  return detectBoxPresentation(volumePrices, basePrice).hasBox;
}
