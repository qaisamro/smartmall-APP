export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  role: string;
}

export interface Mall {
  id: number;
  name_ar: string;
  name_en: string;
  logo: string | null;
  cover_image: string | null;
  description_ar: string | null;
  description_en: string | null;
  slug: string;
  type: string;
  is_active: boolean;
  open_time: string | null;
  close_time: string | null;
  delivery_enabled: boolean;
  enable_quantity_system: boolean;
  theme: any | null;
  categories: any[];
  branches?: any[];
}

export interface MallSection {
  id: number;
  section_id?: number | null;
  parent_id?: number | null;
  name_ar: string;
  name_en: string;
  icon?: string | null;
  bg_image?: string | null;
  is_custom?: boolean;
  product_count?: number;
  children?: MallSection[];
}

export interface Product {
  id: number;
  mall_id: number;
  category_id: number;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: string;
  discount_price: string | null;
  current_price: string;
  barcode?: string | null;
  sku?: string | null;
  unit?: string | null;
  brand?: string | null;
  image: string | null;
  link_photo: string | null;
  is_active: boolean;
  hide_stock_from_customer: boolean;
  category?: any;
  section?: any;
  mallSection?: any;
  shelves?: any[];
  barcodeOverride?: any;
}

export interface Offer {
  id: number;
  mall_id: number;
  product_id: number;
  offer_price: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  image: string | null;
  type: string;
  mall?: Mall;
  product?: Product;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  next_page_url: string | null;
  per_page: number;
  total: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_sale: string | number;
  notes?: string | null;
  product?: Pick<Product, 'id' | 'name_ar' | 'name_en' | 'image' | 'link_photo'> | null;
}

export interface Order {
  id: number;
  mall_id: number;
  status?: string | null;
  total_amount: string | number;
  tax_amount?: string | number | null;
  discount_amount?: string | number | null;
  delivery_method?: 'in-mall' | 'pickup' | 'delivery' | 'direct_purchase' | string | null;
  delivery_status?: string | null;
  delivery_fee?: string | number | null;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  general_notes?: string | null;
  created_at: string;
  mall?: Pick<Mall, 'id' | 'name_ar' | 'name_en' | 'logo'> | null;
  user?: Pick<AuthUser, 'id' | 'name' | 'email'> & { phone?: string | null };
  items?: OrderItem[];
  delivery_person?: {
    id?: number;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
  } | null;
  preparation_time?: number | null;
  approved_at?: string | null;
}
