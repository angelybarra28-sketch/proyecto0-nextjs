alter table proveedor_adjuntos
  alter column compra_id drop not null,
  add column pago_id uuid references proveedor_pagos(id) on delete cascade;

create index if not exists idx_proveedor_adjuntos_pago on proveedor_adjuntos(pago_id);
