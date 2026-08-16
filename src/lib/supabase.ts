import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type Category = {
  id: string;
  name: string;
  type: 'general' | 'specific' | 'sub_specific' | 'detail' | 'species' | 'brand' | 'age' | 'condition';
  parent_id?: string | null;
  image_url?: string | null;
  is_visible?: boolean | null;
  created_at: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  created_at: string;
};

export type HomeCategorySlider = {
  id: string;
  title: string;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  bg_image?: string | null;
  cta_text?: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
};

export type RibbonCard = {
  title: string;
  text: string;
  icon: string;
  url: string;
};

export type HomeContent = {
  id: string;
  card_1_image?: string | null;
  card_1_text?: string | null;
  card_2_image?: string | null;
  card_2_text?: string | null;
  card_3_image?: string | null;
  card_3_text?: string | null;
  card_4_image?: string | null;
  card_4_text?: string | null;
  dog_card_image?: string | null;
  cat_card_image?: string | null;
  perros_desktop?: string | null;
  perros_mobile?: string | null;
  gatos_desktop?: string | null;
  gatos_mobile?: string | null;
  aves_desktop?: string | null;
  aves_mobile?: string | null;
  roedores_desktop?: string | null;
  roedores_mobile?: string | null;
  tortugas_desktop?: string | null;
  tortugas_mobile?: string | null;
  promo_bento_1_image?: string | null;
  promo_bento_1_url?: string | null;
  promo_bento_2_image?: string | null;
  promo_bento_2_url?: string | null;
  promo_bento_3_image?: string | null;
  promo_bento_3_url?: string | null;
  ribbon_1_title?: string | null;
  ribbon_1_text?: string | null;
  ribbon_1_icon?: string | null;
  ribbon_1_url?: string | null;
  ribbon_2_title?: string | null;
  ribbon_2_text?: string | null;
  ribbon_2_icon?: string | null;
  ribbon_2_url?: string | null;
  ribbon_3_title?: string | null;
  ribbon_3_text?: string | null;
  ribbon_3_icon?: string | null;
  ribbon_3_url?: string | null;
  ribbon_4_title?: string | null;
  ribbon_4_text?: string | null;
  ribbon_4_icon?: string | null;
  ribbon_4_url?: string | null;
};

export type Product = {
  id: string;
  product_code: string;
  external_code?: string;
  name: string;
  public_name?: string | null;
  description: string;
  description_ai_enhanced?: string | null;
  price: number;
  category: string;
  category_general?: string[];
  category_specific?: string[];
  category_sub_specific?: any;
  category_species?: string[];
  category_brand?: string;
  category_age?: string[];
  category_condition?: string[];
  category_detail?: string[];
  is_bulk?: boolean;
  image_url: string;
  uploaded_image_url?: string;
  additional_images?: string[]; // Array de imágenes para galería
  stock: number;
  active: boolean;
  supplier_id: string | null;
  delivery_time_hours: number;
  brand?: string;
  location?: string;
  cost?: number;
  wholesale_price?: number;
  retail_margin?: number;
  wholesale_margin?: number;
  interest_rate_6?: number;
  interest_rate_12?: number;
  interest_rate_18?: number;
  interest_rate_24?: number;
  special_price?: number;
  differentiated_price?: number;
  url_slug?: string;
  is_featured?: boolean; // Producto Premium
  show_in_hero?: boolean; // Mostrar en el Hero Slider
  source_url?: string;
  is_prescription?: boolean;
  requires_prescription?: boolean;
  local_only?: boolean;
  requires_refrigeration?: boolean;
  archived?: boolean;
  archived_at?: string | null;
  parent_product_id?: string | null;
  is_parent?: boolean;
  variant_label?: string | null;
  box_factor?: number | null;
  tags?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  ai_categorized_at?: string;
  volume_prices?: VolumePrice[];
  created_at: string;
  updated_at: string;
};

export type VolumePrice = {
  id: string;
  product_id: string;
  price_level: number;
  min_qty: number;
  max_qty: number;
  price: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  customer_address: string;
  items: { product_id: string; product_name: string; quantity: number; price: number; image_url?: string }[];
  total: number;
  status: string;
  status_etapa?: string;
  tracking_code?: string;
  entregado_cliente_at?: string | null;
  order_type?: string;
  user_id?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'owner' | 'mayorista';
  active: boolean;
  points: number;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type ChatSession = {
  id: string;
  session_id: string;
  customer_name: string;
  messages: { role: string; content: string; timestamp: string }[];
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  order_id: string | null;
  customer_name: string;
  customer_document: string;
  customer_address: string | null;
  customer_phone: string | null;
  sale_type: 'cash' | 'credit';
  total_amount: number;
  invoice_number: string;
  invoice_date: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  product_code: string | null;
  quantity: number;
  unit_price: number;
  tax_exempt: boolean;
  tax_rate: number;
  subtotal: number;
  created_at: string;
};

export type CreditPayment = {
  id: string;
  sale_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  payment_method: string | null;
  notes: string | null;
  promissory_note_status: 'pending' | 'delivered' | 'in_possession';
  created_at: string;
  updated_at: string;
};

export type SiteSettings = {
  id: string;
  business_name: string;
  business_address: string;
  business_phones: string;
  business_email: string;
  ruc: string;
  timbrado: string;
  timbrado_start_date: string;
  invoice_establishment_code: string;
  invoice_point_of_sale: string;
  invoice_current_number: number;
  invoice_control_code: string;
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  promo_banner_text: string;
  promo_banner_active: boolean;
  logo_url: string;
  dollar_exchange_rate: number;
  created_at: string;
  updated_at: string;
};

export function assertNoBase64(payload: any): void {
  if (!payload) return;
  const IMG_FIELDS = ['image_url', 'uploaded_image_url'];
  for (const f of IMG_FIELDS) {
    if (typeof payload[f] === 'string' && payload[f].startsWith('data:')) {
      throw new Error(`Campo ${f} contiene base64. Subilo a Storage primero.`);
    }
  }
  if (Array.isArray(payload.additional_images)) {
    for (const [i, img] of payload.additional_images.entries()) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        throw new Error(`additional_images[${i}] contiene base64. Subilo a Storage primero.`);
      }
    }
  }
}

