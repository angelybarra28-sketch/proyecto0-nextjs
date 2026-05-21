import type { Sale } from './sale';
import type { Payment } from './payment';

/**
 * Representa el estado individual de una cuota del plan de financiamiento.
 */
export enum InstallmentStatus {
  /** Pendiente: La cuota aún no ha sido pagada y la fecha de vencimiento no ha pasado */
  PENDING = 'PENDING',
  
  /** Pagada: Se cubrió el 100% del monto de la cuota */
  PAID = 'PAID',
  
  /** Pagada parcialmente: El cliente realizó un abono pero no canceló la cuota completa */
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  
  /** Vencida: La fecha de vencimiento ya pasó y no se ha cubierto el monto de la cuota */
  OVERDUE = 'OVERDUE'
}

/**
 * Interfaz que representa la entidad plana de una Cuota en la base de datos.
 */
export interface Installment {
  /** Identificador único de la cuota */
  id: string;
  
  /** ID de la venta a la cual pertenece esta cuota (Relación Foreign Key) */
  saleId: string;
  
  /** Número de cuota correlativo (ej. 1 para la cuota 1, 2 para la cuota 2, etc.) */
  installmentNumber: number;
  
  /** Monto total original que debe abonarse por esta cuota */
  amount: number;
  
  /** Monto restante por pagar de esta cuota específica (soporta pagos parciales) */
  remainingAmount: number;
  
  /** Fecha límite de pago de la cuota en formato ISO (YYYY-MM-DD) */
  dueDate: string;
  
  /** Estado actual de la cuota */
  status: InstallmentStatus;
  
  /** Fecha en la que la cuota fue saldada por completo en formato ISO (opcional) */
  paidAt?: string;
  
  /** Cargo o penalización por retraso en el pago (interés por mora aplicado a esta cuota, opcional) */
  penaltyAmount?: number;
}

/**
 * Extensión de la interfaz Installment con relaciones resueltas.
 * Útil para operaciones de backend, conciliaciones de caja o vistas detalladas de cobranza.
 */
export interface InstallmentWithRelations extends Installment {
  /** Datos completos de la venta a la que pertenece esta cuota */
  sale?: Sale;
  
  /** Historial de pagos imputados o asociados directamente a esta cuota */
  payments?: Payment[];
}
