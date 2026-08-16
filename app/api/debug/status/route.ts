import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from('admin_settings')
      .select('use_native_webp, use_native_categorization')
      .maybeSingle();
    
    return NextResponse.json({
      use_native_webp: data?.use_native_webp ?? false,
      use_native_categorization: data?.use_native_categorization ?? false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
