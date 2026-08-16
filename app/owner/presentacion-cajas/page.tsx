import { createClient } from '@supabase/supabase-js';
import PresentacionCajasClient from './PresentacionCajasClient';

// Cajas ya creadas: box_factor IS NOT NULL (is_bulk no es confiable, muchas cajas reales lo tienen en false)
const CAJAS_COLS = 'id,product_code,name,price,stock,active,box_factor,parent_product_id,uploaded_image_url,image_url,pending_activation,url_slug';

// Productos con precio de caja detectable (para crear masivamente)
const SOURCE_COLS = 'id,product_code,name,price,stock,active,parent_product_id,uploaded_image_url,image_url,url_slug,box_factor,category_general,category_specific,category_sub_specific,category_detail,category_species,category_brand,category_age,category_condition,tags,brand,description,is_prescription,requires_prescription,local_only,requires_refrigeration';

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Cajas ya creadas
  const { data: cajasCreadas } = await supabase
    .from('products')
    .select(CAJAS_COLS)
    .not('box_factor', 'is', null)
    .order('name');

  // 2. Grupos disponibles para vincular
  const { data: grupos } = await supabase
    .from('products')
    .select('id,name')
    .eq('is_parent', true)
    .eq('active', true)
    .order('name');

  // 3. Productos con precio de caja (volume_prices donde price > products.price)
  //    Excluir los que ya tienen una caja creada (box_factor IS NOT NULL)
  const { data: productosConCaja } = await supabase
    .from('products')
    .select(`${SOURCE_COLS}, volume_prices(id,product_id,price_level,min_qty,max_qty,price)`)
    .eq('active', true)
    .eq('is_parent', false)
    .is('box_factor', null)
    .order('name');

  return {
    cajasCreadas: cajasCreadas || [],
    grupos: grupos || [],
    productosConCaja: (productosConCaja || []).filter((p: any) =>
      (p.volume_prices || []).some((v: any) => v.price > p.price)
    ),
  };
}

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function PresentacionCajasPage() {
  const data = await getData();
  return <PresentacionCajasClient {...data} />;
}
