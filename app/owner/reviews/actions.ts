'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function moderateReview(
  reviewId: string,
  newStatus: 'approved' | 'rejected',
  moderatorNotes?: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('product_reviews')
    .update({
      status: newStatus,
      moderator_notes: moderatorNotes || null,
    })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  // Revalidar el producto asociado para que el aggregateRating actualizado
  // aparezca en el HTML público
  const { data: review } = await supabase
    .from('product_reviews')
    .select('product:products(url_slug)')
    .eq('id', reviewId)
    .single();

  const reviewData = review as any;
  const productData = reviewData?.product;
  const url_slug = Array.isArray(productData)
    ? productData[0]?.url_slug
    : productData?.url_slug;

  if (url_slug) {
    revalidatePath(`/${url_slug}`);
  }
  revalidatePath('/owner/reviews');

  return { success: true };
}

export async function deleteReview(reviewId: string) {
  const supabase = createClient();

  const { data: review } = await supabase
    .from('product_reviews')
    .select('product:products(url_slug)')
    .eq('id', reviewId)
    .single();

  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  const reviewData = review as any;
  const productData = reviewData?.product;
  const url_slug = Array.isArray(productData)
    ? productData[0]?.url_slug
    : productData?.url_slug;

  if (url_slug) {
    revalidatePath(`/${url_slug}`);
  }
  revalidatePath('/owner/reviews');

  return { success: true };
}
