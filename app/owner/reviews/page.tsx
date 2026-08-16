import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import ReviewsClient from './ReviewsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerReviewsPage() {
  noStore();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options = {}) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );

  const [pendingRes, approvedRes, rejectedRes, reviewsRes] = await Promise.all([
    supabase.from('product_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('product_reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('product_reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('product_reviews')
      .select(`
        id, product_id, author_name, author_email, rating, comment, 
        verified_purchase, status, moderator_notes, created_at,
        products (name, url_slug)
      `)
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  return (
    <ReviewsClient
      initialReviews={(reviewsRes.data as any[]) || []}
      counts={{
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0
      }}
    />
  );
}
