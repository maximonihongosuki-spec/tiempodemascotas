'use server';

import { createClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';

export async function submitReview(data: {
  productId: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  comment: string;
}) {
  // Validación
  if (!data.productId || !data.authorName || !data.rating || !data.comment) {
    return { success: false, error: 'Faltan campos obligatorios' };
  }
  if (data.rating < 1 || data.rating > 5) {
    return { success: false, error: 'Rating inválido' };
  }
  if (data.comment.length < 20) {
    return { success: false, error: 'El comentario debe tener al menos 20 caracteres' };
  }

  // IP para anti-spam (rate limit por IP en el futuro)
  const ip = headers().get('x-forwarded-for')?.split(',')[0] || 'unknown';

  const supabase = createClient();
  
  // Rate limit simple: no más de 3 reviews por IP en 1 hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('product_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo);

  if ((count || 0) >= 3) {
    return { success: false, error: 'Has enviado muchas reseñas recientemente. Intentá más tarde.' };
  }

  const { error } = await supabase.from('product_reviews').insert({
    product_id: data.productId,
    author_name: data.authorName,
    author_email: data.authorEmail || null,
    rating: data.rating,
    comment: data.comment,
    ip_address: ip,
    status: 'pending',
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
