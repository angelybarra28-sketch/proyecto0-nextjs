/**
 * Representa el estado general de la venta u orden de compra.
 * Útil para controlar el flujo logístico y comercial de los productos.
 */
export enum SaleStatus {
  /** Venta en proceso, pendiente de entrega o verificación */
  PENDING = 'PENDING',
  
  /** Venta completada con éxito y productos entregados al cliente */
  COMPLETED = 'COMPLETED',
  
  /** Venta anulada o cancelada (por devolución, arrepentimiento o falta de stock) */
  CANCELLED = 'CANCELLED'
}

/**
 * Representa el estado de cobranza global de una venta financiada.
 * Permite segmentar la cartera de clientes según su comportamiento de pago.
 */
export enum CollectionStatus {
  /** Al día: El cliente está al corriente con sus obligaciones de pago */
  UP_TO_DATE = 'UP_TO_DATE',
  
  /** Pendiente de pago: Existe un saldo deudor pero ninguna cuota está vencida */
  PENDING = 'PENDING',
  
  /** Vencida / En Mora: El cliente tiene al menos una cuota vencida e impaga */
  OVERDUE = 'OVERDUE',
  
  /** Totalmente pagada: La deuda restante de la venta es $0 */
  PAID = 'PAID'
}

/**
 * Representa el estado individual de cada cuota mensual del financiamiento.
 * Esencial para el control de vencimientos del Excel migrado.
 */
export enum InstallmentStatus {
  /** Pendiente: Cuota no pagada que aún no ha alcanzado su fecha de vencimiento */
  PENDING = 'PENDING',
  
  /** Pagada: La cuota fue saldada en su totalidad ($0 restantes) */
  PAID = 'PAID',
  
  /** Pagada parcialmente: El cliente realizó un abono pero no completó el monto total de la cuota */
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  
  /** Vencida: La fecha límite de pago expiró y la cuota sigue impaga o parcial */
  OVERDUE = 'OVERDUE'
}

/**
 * Representa los métodos de pago aceptados para las transacciones y cuotas.
 * Permite la conciliación de caja diaria y estadísticas de canales de recaudación.
 */
export enum PaymentMethod {
  /** Dinero en efectivo (cobro presencial o en local) */
  CASH = 'CASH',
  
  /** Transferencia bancaria (CBU / Alias) */
  BANK_TRANSFER = 'BANK_TRANSFER',
  
  /** Tarjeta de débito */
  DEBIT_CARD = 'DEBIT_CARD',
  
  /** Tarjeta de crédito */
  CREDIT_CARD = 'CREDIT_CARD',
  
  /** Plataformas digitales (Mercado Pago, e-wallets, etc.) */
  MERCADO_PAGO = 'MERCADO_PAGO',
  
  /** Cualquier otro medio no listado */
  OTHER = 'OTHER'
}
