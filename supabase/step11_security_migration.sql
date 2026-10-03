-- ==============================================================================
-- Outfit Avenue – Step 11 Security Migration
-- Apply via: Supabase Dashboard → SQL Editor → paste and run
-- ==============================================================================

-- FIX 1: Remove overly permissive anonymous SELECT on orders
-- This policy exposed ALL orders (customer PII) to unauthenticated users.
DROP POLICY IF EXISTS "Public can view orders by order_number" ON public.orders;

-- FIX 2: Remove overly permissive anonymous SELECT on order_items
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;

-- FIX 3: Remove direct anon INSERT on orders
-- All customer order creation MUST go through place_customer_order RPC (SECURITY DEFINER)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- FIX 4: Remove direct anon INSERT on order_items
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- FIX 5: Remove direct anon INSERT on payments
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;

-- FIX 6: Correct record_payment_verification RPC signature
DROP FUNCTION IF EXISTS public.record_payment_verification(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.record_payment_verification(
  p_order_id uuid,
  p_payment_method text,
  p_transaction_id text,
  p_payment_status text,
  p_verified_amount numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_norm_status TEXT;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order has already been marked as paid.',
      'order_id', p_order_id
    );
  END IF;

  v_norm_status := lower(trim(p_payment_status));

  IF v_norm_status = 'paid' THEN
    UPDATE orders
    SET payment_status = 'paid',
        order_status   = 'confirmed',
        updated_at     = now()
    WHERE id = p_order_id;

    UPDATE payments
    SET payment_status = 'completed',
        transaction_id = COALESCE(p_transaction_id, transaction_id),
        paid_at        = now()
    WHERE order_id = p_order_id;

  ELSIF v_norm_status = 'failed' THEN
    UPDATE orders
    SET payment_status = 'failed',
        updated_at     = now()
    WHERE id = p_order_id;

    UPDATE payments
    SET payment_status = 'failed',
        transaction_id = COALESCE(p_transaction_id, transaction_id)
    WHERE order_id = p_order_id;

  ELSIF v_norm_status IN ('cancelled', 'refunded') THEN
    UPDATE payments
    SET payment_status = 'refunded',
        transaction_id = COALESCE(p_transaction_id, transaction_id)
    WHERE order_id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'order_id',       p_order_id,
    'order_number',   v_order.order_number,
    'payment_status', v_norm_status,
    'transaction_id', p_transaction_id
  );
END;
$$;

-- FIX 7: Ensure customer-facing RPCs are SECURITY DEFINER
ALTER FUNCTION public.get_order_by_number(text) SECURITY DEFINER;
ALTER FUNCTION public.switch_order_to_cod(uuid) SECURITY DEFINER;
ALTER FUNCTION public.update_order_status_admin(uuid, text, text) SECURITY DEFINER;

-- FIX 8: Add max quantity constraint on order items
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_quantity_max;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_max CHECK (quantity <= 500);

-- Verify: show remaining policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
