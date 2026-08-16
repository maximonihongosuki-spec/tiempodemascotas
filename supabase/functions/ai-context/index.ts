// Declare Deno to fix type errors in non-Deno environments while maintaining compatibility with Supabase Edge Functions
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active AI instructions
    const { data: instructions, error: instructionsError } = await supabase
      .from('ai_instructions')
      .select('id, instruction_key, instruction_text, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('instruction_key', { ascending: true });

    if (instructionsError) {
      throw new Error(`Error fetching instructions: ${instructionsError.message}`);
    }

    // Get active products - ONLY with columns that exist
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        product_code,
        external_code,
        name,
        description,
        price,
        category,
        stock,
        image_url,
        uploaded_image_url,
        active,
        brand,
        location,
        cost,
        wholesale_price,
        supplier_id,
        url_slug,
        created_at,
        updated_at
      `)
      .eq('active', true)
      .gt('stock', 0)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    return new Response(
      JSON.stringify({
        instructions: instructions || [],
        products: products || [],
        last_updated: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in ai-context function:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        instructions: [],
        products: []
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
