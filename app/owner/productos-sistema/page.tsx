import { createClient } from '@supabase/supabase-js';
import ProductosSistemaClient from './ProductosSistemaClient';

const COLUMNS = 'id,product_code,name,active,archived,deactivated_reason,stock,price,updated_at';

async function getProductosSistema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase
    .from('products')
    .select(COLUMNS)
    .not('deactivated_reason', 'is', null)
    .order('updated_at', { ascending: false });
  return data || [];
}

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function ProductosSistemaPage() {
  const productos = await getProductosSistema();
  return <ProductosSistemaClient initialProductos={productos} />;
}
