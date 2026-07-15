-- Fix: Crear cuotas faltantes para la venta e2f750f3-60d1-484c-9115-e7d2cc6ade4d
-- 8 cuotas de $8500, vencimiento mensual desde hoy (15/07/2026)
-- Ejecutar desde el SQL Editor de Supabase Dashboard

INSERT INTO installments (sale_id, installment_number, due_date, original_amount, paid_amount, remaining_amount, status)
VALUES
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 1, '2026-08-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 2, '2026-09-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 3, '2026-10-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 4, '2026-11-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 5, '2026-12-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 6, '2027-01-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 7, '2027-02-15', 8500, 0, 8500, 'PENDING'),
  ('e2f750f3-60d1-484c-9115-e7d2cc6ade4d', 8, '2027-03-15', 8500, 0, 8500, 'PENDING');
