-- ==============================================================================
-- Outfit Avenue – Fix Admin Order Payment Status Update
-- ==============================================================================

-- 1. Ensure payments check constraint accepts 'paid' alongside 'completed'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_valid 
  CHECK (payment_status IN ('pending', 'completed', 'paid', 'failed', 'refunded', 'cancelled'));

-- 2. Update update_order_status_admin RPC
CREATE OR REPLACE FUNCTION public.update_order_status_admin(
  p_order_id uuid,
  p_order_status text,
  p_payment_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_restored BOOLEAN := FALSE;
  v_new_order_status TEXT;
  v_new_payment_status TEXT;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with ID % not found.', p_order_id;
  END IF;

  v_new_order_status := lower(trim(p_order_status));

  -- Validate order status against allowed values:
  IF v_new_order_status NOT IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status: %', p_order_status;
  END IF;

  IF p_payment_status IS NOT NULL AND trim(p_payment_status) <> '' THEN
    v_new_payment_status := lower(trim(p_payment_status));
    IF v_new_payment_status NOT IN ('pending', 'paid', 'failed', 'refunded') THEN
      RAISE EXCEPTION 'Invalid payment status: %', p_payment_status;
    END IF;
  ELSE
    v_new_payment_status := v_order.payment_status;
  END IF;

  -- If status is changing to cancelled, and stock has not been restored yet:
  IF v_new_order_status = 'cancelled' AND (v_order.stock_restored IS FALSE OR v_order.stock_restored IS NULL) THEN
    FOR v_item IN 
      SELECT product_id, quantity 
      FROM order_items 
      WHERE order_id = p_order_id AND product_id IS NOT NULL 
    LOOP
      UPDATE products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id;
    END LOOP;

    v_restored := TRUE;
  END IF;

  -- Update order record
  UPDATE orders
  SET order_status = v_new_order_status,
      payment_status = v_new_payment_status,
      stock_restored = CASE WHEN v_restored THEN TRUE ELSE coalesce(v_order.stock_restored, FALSE) END,
      updated_at = now()
  WHERE id = p_order_id;

  -- Update payment record if exists
  UPDATE payments
  SET payment_status = v_new_payment_status,
      paid_at = CASE 
        WHEN v_new_payment_status = 'paid' AND paid_at IS NULL THEN now() 
        ELSE paid_at 
      END
  WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_status', v_new_order_status,
    'payment_status', v_new_payment_status,
    'stock_restored', CASE WHEN v_restored THEN true ELSE coalesce(v_order.stock_restored, false) END,
    'stock_restored_now', v_restored
  );
END;
$$;

-- 3. Grant execute permissions to authenticated admin sessions and service_role
GRANT EXECUTE ON FUNCTION public.update_order_status_admin(uuid, text, text) TO authenticated, service_role;
