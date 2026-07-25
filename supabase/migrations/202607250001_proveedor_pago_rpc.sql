create or replace function insert_and_validate_pago(
  p_proveedor_id uuid,
  p_compra_id uuid,
  p_fecha date,
  p_monto numeric,
  p_forma_pago text,
  p_observaciones text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_importe_total numeric;
  v_pagado_previo numeric;
  v_saldo numeric;
  v_nuevo_pagado numeric;
  v_estado text;
  v_pago proveedor_pagos;
begin
  -- Lock the compra row to prevent concurrent modifications
  select importe_total into v_importe_total
  from proveedor_compras
  where id = p_compra_id
  for update;

  if not found then
    raise exception 'La compra asociada no existe';
  end if;

  -- Lock and sum existing payments for this compra
  select coalesce(sum(monto), 0) into v_pagado_previo
  from proveedor_pagos
  where compra_id = p_compra_id
  for update;

  v_saldo := v_importe_total - v_pagado_previo;

  if p_monto > v_saldo then
    raise exception 'El monto del pago (%) supera el saldo pendiente (%)', p_monto, v_saldo;
  end if;

  -- Insert the payment
  insert into proveedor_pagos (proveedor_id, compra_id, fecha, monto, forma_pago, observaciones)
  values (p_proveedor_id, p_compra_id, p_fecha, p_monto, p_forma_pago, p_observaciones)
  returning * into v_pago;

  -- Update compra estado atomically
  v_nuevo_pagado := v_pagado_previo + p_monto;
  v_estado := case
    when v_nuevo_pagado >= v_importe_total then 'pagada'
    when v_nuevo_pagado > 0 then 'parcial'
    else 'pendiente'
  end;

  update proveedor_compras set estado = v_estado, updated_at = now() where id = p_compra_id;

  return to_jsonb(v_pago);
end;
$$;
