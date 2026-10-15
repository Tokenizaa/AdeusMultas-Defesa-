-- VenoPag is the primary PIX gateway. The remote payment_orders table had
-- a legacy gateway check that accepted only the previous providers.
ALTER TABLE public.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_gateway_check;

ALTER TABLE public.payment_orders
  ADD CONSTRAINT payment_orders_gateway_check
  CHECK (gateway IN ('pagbank', 'ggpixapi', 'venopag'));
