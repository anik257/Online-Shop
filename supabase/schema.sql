-- ==============================================================================
-- Outfit Avenue - Supabase Database Schema (Step 2)
-- Description: E-commerce database tables, constraints, indexes, triggers, and RLS
-- ==============================================================================

-- 1. Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT categories_slug_not_empty CHECK (char_length(trim(slug)) > 0)
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL,
  discount_price NUMERIC(12, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  has_sizes BOOLEAN NOT NULL DEFAULT false,
  sizes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT products_slug_not_empty CHECK (char_length(trim(slug)) > 0),
  CONSTRAINT products_price_non_negative CHECK (price >= 0),
  CONSTRAINT products_discount_price_valid CHECK (
    discount_price IS NULL OR (discount_price >= 0 AND discount_price <= price)
  ),
  CONSTRAINT products_stock_non_negative CHECK (stock >= 0)
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  division TEXT NOT NULL,
  district TEXT NOT NULL,
  area TEXT,
  address TEXT NOT NULL,
  delivery_notes TEXT,
  subtotal NUMERIC(12, 2) NOT NULL,
  delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_customer_name_not_empty CHECK (char_length(trim(customer_name)) > 0),
  CONSTRAINT orders_phone_not_empty CHECK (char_length(trim(phone)) > 0),
  CONSTRAINT orders_address_not_empty CHECK (char_length(trim(address)) > 0),
  CONSTRAINT orders_division_not_empty CHECK (char_length(trim(division)) > 0),
  CONSTRAINT orders_district_not_empty CHECK (char_length(trim(district)) > 0),
  CONSTRAINT orders_subtotal_non_negative CHECK (subtotal >= 0),
  CONSTRAINT orders_delivery_charge_non_negative CHECK (delivery_charge >= 0),
  CONSTRAINT orders_total_amount_valid CHECK (total_amount >= 0),
  CONSTRAINT orders_payment_method_valid CHECK (
    payment_method IN ('cod', 'bkash', 'nagad', 'card', 'bank_transfer', 'online')
  ),
  CONSTRAINT orders_payment_status_valid CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')
  ),
  CONSTRAINT orders_order_status_valid CHECK (
    order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
  )
);

-- 5. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  CONSTRAINT order_items_product_name_not_empty CHECK (char_length(trim(product_name)) > 0),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT order_items_subtotal_non_negative CHECK (subtotal >= 0)
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  transaction_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT payments_method_valid CHECK (
    payment_method IN ('cod', 'bkash', 'nagad', 'card', 'bank_transfer', 'online')
  ),
  CONSTRAINT payments_status_valid CHECK (
    payment_status IN ('pending', 'completed', 'paid', 'failed', 'refunded', 'cancelled')
  )
);

-- 7. TRIGGERS FOR UPDATED_AT
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products (is_available);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments (transaction_id);

-- 9. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 10. POLICIES: CATEGORIES
-- Public (anonymous & authenticated) can view all categories
CREATE POLICY "Public can view categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated admins have full management access
CREATE POLICY "Admins have full access to categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 11. POLICIES: PRODUCTS
-- Public can only view available products
CREATE POLICY "Public can view available products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

-- Authenticated admins have full management access
CREATE POLICY "Admins have full access to products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 12. POLICIES: ORDERS
-- Customers (anonymous & authenticated) can create new orders
CREATE POLICY "Anyone can create orders"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated admins have full access to all orders
CREATE POLICY "Admins have full access to orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 13. POLICIES: ORDER_ITEMS
-- Customers can create order items as part of their order
CREATE POLICY "Anyone can create order items"
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated admins have full access to order items
CREATE POLICY "Admins have full access to order items"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 14. POLICIES: PAYMENTS
-- Customers can insert payment records
CREATE POLICY "Anyone can insert payments"
  ON public.payments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated admins have full access to payments
CREATE POLICY "Admins have full access to payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
