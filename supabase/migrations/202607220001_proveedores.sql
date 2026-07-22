create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  whatsapp text,
  email text,
  direccion text,
  observaciones text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proveedor_compras (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete restrict,
  fecha date not null,
  numero_factura text,
  importe_total numeric(12, 2) not null check (importe_total >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'parcial', 'pagada')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proveedor_compra_items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references proveedor_compras(id) on delete cascade,
  descripcion text not null,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  costo_unitario numeric(12, 2) not null check (costo_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists proveedor_pagos (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete restrict,
  compra_id uuid references proveedor_compras(id) on delete set null,
  fecha date not null,
  monto numeric(12, 2) not null check (monto > 0),
  forma_pago text not null check (forma_pago in ('efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proveedor_adjuntos (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references proveedor_compras(id) on delete cascade,
  tipo text not null default 'factura' check (tipo in ('factura', 'remito', 'otro')),
  nombre_original text,
  path text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_proveedores_estado on proveedores(estado);
create index if not exists idx_proveedores_nombre on proveedores(nombre);

create index if not exists idx_proveedor_compras_proveedor on proveedor_compras(proveedor_id);
create index if not exists idx_proveedor_compras_fecha on proveedor_compras(fecha desc);
create index if not exists idx_proveedor_compras_estado on proveedor_compras(estado);

create index if not exists idx_proveedor_compra_items_compra on proveedor_compra_items(compra_id);

create index if not exists idx_proveedor_pagos_proveedor on proveedor_pagos(proveedor_id);
create index if not exists idx_proveedor_pagos_compra on proveedor_pagos(compra_id);
create index if not exists idx_proveedor_pagos_fecha on proveedor_pagos(fecha desc);

create index if not exists idx_proveedor_adjuntos_compra on proveedor_adjuntos(compra_id);

alter table proveedores enable row level security;
alter table proveedor_compras enable row level security;
alter table proveedor_compra_items enable row level security;
alter table proveedor_pagos enable row level security;
alter table proveedor_adjuntos enable row level security;

create policy "Admin can read proveedores"
  on proveedores for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read proveedor_compras"
  on proveedor_compras for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read proveedor_compra_items"
  on proveedor_compra_items for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read proveedor_pagos"
  on proveedor_pagos for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));

create policy "Admin can read proveedor_adjuntos"
  on proveedor_adjuntos for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));
