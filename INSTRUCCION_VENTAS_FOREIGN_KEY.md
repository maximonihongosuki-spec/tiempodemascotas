# Instrucción: Manejo de Foreign Keys en Ventas/Facturas

## Problema Común

Al crear ventas/facturas desde pedidos en sistemas e-commerce, es común encontrar errores de foreign key constraint cuando se intenta insertar `sale_items` con referencias a productos que no existen o con IDs incorrectos.

**Error típico:**
```
Error: insert or update on table "sale_items" violates foreign key constraint "sale_items_product_id_fkey"
Detail: Key is not present in table 'products'
```

## Causa Raíz

Los items del carrito/pedido generalmente contienen:
- `product_name`: Nombre del producto (string)
- `quantity`: Cantidad
- `price`: Precio
- `product_id`: Puede estar ausente, ser null, o tener un valor incorrecto

Cuando se crea la venta, NO se puede simplemente copiar el `product_id` del item del pedido, porque:
1. El producto pudo haber sido eliminado de la base de datos
2. El `product_id` puede ser null o inválido
3. El producto pudo haber sido modificado

## Solución

**SIEMPRE** buscar los productos reales en la base de datos antes de crear los `sale_items`:

```typescript
// 1. Obtener los nombres de todos los productos del pedido
const productNames = order.items.map(item => item.product_name);

// 2. Buscar los productos en la base de datos
const { data: productsData, error: productsError } = await supabase
  .from('products')
  .select('id, name, product_code')
  .in('name', productNames);

if (productsError) {
  console.error('Products fetch error:', productsError);
}

// 3. Crear un mapa de nombres a IDs para búsqueda rápida
const productMap = new Map(
  (productsData || []).map(p => [p.name, { id: p.id, code: p.product_code || '' }])
);

// 4. Construir los sale_items con product_id correcto
const saleItems = order.items.map(item => {
  const productInfo = productMap.get(item.product_name);

  // Log si el producto no se encuentra (opcional pero útil)
  if (!productInfo) {
    console.warn(`Product not found in database: ${item.product_name}`);
  }

  return {
    sale_id: sale.id,
    product_id: productInfo?.id || null,  // NULL si no existe
    product_name: item.product_name,
    product_code: productInfo?.code || '',
    quantity: item.quantity,
    unit_price: item.price,
    tax_exempt: false,
    tax_rate: 0.10,
    subtotal: item.quantity * item.price
  };
});

// 5. Insertar con logging para debugging
console.log('Inserting sale items:', saleItems);

const { error: itemsError } = await supabase
  .from('sale_items')
  .insert(saleItems);

if (itemsError) {
  console.error('Items error:', itemsError);
  throw new Error('Error al guardar los items de la venta: ' + itemsError.message);
}
```

## Requisitos de la Base de Datos

La tabla `sale_items` debe permitir `product_id` NULL:

```sql
ALTER TABLE sale_items
ALTER COLUMN product_id DROP NOT NULL;

-- Y el constraint debe ser ON DELETE SET NULL o CASCADE
ALTER TABLE sale_items
DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey,
ADD CONSTRAINT sale_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE SET NULL;
```

## Beneficios de Este Enfoque

✅ **Resiliencia**: Las ventas se pueden crear aunque el producto haya sido eliminado
✅ **Integridad**: Siempre se usan IDs válidos cuando el producto existe
✅ **Trazabilidad**: Se preserva el nombre y precio del producto al momento de la venta
✅ **Debugging**: Los logs permiten identificar productos faltantes
✅ **Auditoría**: Se mantiene el historial de ventas completo

## Aplicación en Otros Contextos

Este mismo patrón se aplica a:
- Creación de cotizaciones desde carritos
- Duplicación de pedidos
- Importación de ventas desde otros sistemas
- Migración de datos históricos
- Generación de reportes con productos eliminados

**Regla General**: NUNCA confíes en IDs almacenados en objetos del frontend o en datos históricos. SIEMPRE verifica que los IDs existan en la base de datos antes de crear relaciones con foreign keys.
