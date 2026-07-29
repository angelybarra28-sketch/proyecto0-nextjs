export type ProveedorEstado = 'activo' | 'inactivo';
export type CompraEstado = 'pendiente' | 'parcial' | 'pagada';
export type FormaPago = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'otro';
export type AdjuntoTipo = 'factura' | 'remito' | 'otro';

export interface ProveedorInsert {
  nombre: string;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  estado?: ProveedorEstado;
}

export interface ProveedorRow extends ProveedorInsert {
  id: string;
  estado: ProveedorEstado;
  created_at: string;
  updated_at: string;
}

export interface ProveedorCompraInsert {
  proveedor_id: string;
  fecha: string;
  numero_factura?: string | null;
  importe_total: number;
  estado?: CompraEstado;
  observaciones?: string | null;
}

export interface ProveedorCompraRow extends ProveedorCompraInsert {
  id: string;
  estado: CompraEstado;
  created_at: string;
  updated_at: string;
  proveedor_nombre?: string;
  pagado?: number;
  saldo?: number;
  ultimo_pago_fecha?: string | null;
}

export interface ProveedorCompraItemInsert {
  compra_id?: string;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

export interface ProveedorCompraItemRow extends ProveedorCompraItemInsert {
  id: string;
  compra_id: string;
  created_at: string;
}

export interface ProveedorPagoInsert {
  proveedor_id: string;
  compra_id?: string | null;
  fecha: string;
  monto: number;
  forma_pago: FormaPago;
  observaciones?: string | null;
}

export interface ProveedorPagoRow extends ProveedorPagoInsert {
  id: string;
  created_at: string;
  updated_at: string;
  proveedor_nombre?: string;
  compra_numero_factura?: string;
}

export interface ProveedorAdjuntoInsert {
  compra_id?: string | null;
  pago_id?: string | null;
  tipo?: AdjuntoTipo;
  nombre_original?: string | null;
  path: string;
  url: string;
}

export interface ProveedorAdjuntoRow extends ProveedorAdjuntoInsert {
  id: string;
  compra_id: string | null;
  pago_id: string | null;
  tipo: AdjuntoTipo;
  created_at: string;
}

export interface ProveedorDashboard {
  compras_mes: number;
  deuda_total: number;
  facturas_pendientes: number;
  total_comprado: number;
  total_pagado: number;
  ultimas_compras: {
    id: string;
    proveedor_nombre: string;
    fecha: string;
    importe_total: number;
    estado: CompraEstado;
  }[];
  proveedores: ProveedorDashboardProveedor[];
}

export interface ProveedorDeuda {
  proveedor_id: string;
  proveedor_nombre: string;
  total_comprado: number;
  total_pagado: number;
  saldo_pendiente: number;
}

export interface ProveedorDashboardProveedor {
  proveedor_id: string;
  proveedor_nombre: string;
  total_comprado: number;
  total_pagado: number;
  total_pendiente: number;
  facturas_pendientes: number;
  facturas_parciales: number;
  facturas_pagadas: number;
}

export type AlertaTipo = 'factura_pendiente' | 'saldo_pendiente' | 'sin_movimiento' | 'sin_factura_adjunto';

export interface ProveedorAlerta {
  id: string;
  tipo: AlertaTipo;
  titulo: string;
  descripcion: string;
  proveedor_id: string;
  proveedor_nombre: string;
  compra_id?: string;
  compra_fecha?: string;
  compra_importe?: number;
  link_tab: 'compras' | 'proveedores';
  link_id?: string;
}
