import type { Customer } from './customer';
import type { Installment } from './installment';
import type { Payment } from './payment';

/**
 * Representa el estado general de la venta u orden.
 */
export enum SaleStatus {
  /** Venta en proceso o pendiente de entrega / confirmación */
  PENDING = 'PENDING',
  
  /** Venta completada con éxito y productos entregados */
  COMPLETED = 'COMPLETED',
  
  /** Venta anulada o cancelada (por devolución o falta de acuerdo) */
  CANCELLED = 'CANCELLED'
}

/**
 * Representa el estado de cobranza de una venta financiada en cuotas.
 */
export enum CollectionStatus {
  /** Al día: El cliente ha pagado todas las cuotas vencidas a la fecha */
  UP_TO_DATE = 'UP_TO_DATE',
  
  /** Pendiente de pago: Tiene cuotas pendientes pero ninguna está vencida aún */
  PENDING = 'PENDING',
  
  /** Vencida / Moroso: Tiene una o más cuotas vencidas sin abonar */
  OVERDUE = 'OVERDUE',
  
  /** Totalmente pagada: Se canceló el 100% del monto adeudado */
  PAID = 'PAID'
}

/**
 * Representa una instantánea (snapshot) de un producto vendido dentro de una transacción.
 * Esto asegura la inmutabilidad histórica del precio cobrado ante futuros cambios en el catálogo.
 */
export interface SaleItem {
  /** ID del producto en el catálogo original */
  productId: number;
  
  /** Nombre del producto al momento de la venta (ej. "Juego de Sábanas Algodón 2 plazas") */
  name: string;
  
  /** Precio unitario al que se vendió en esta transacción específica */
  price: number;
  
  /** Cantidad de unidades vendidas */
  quantity: number;
  
  /** Categoría del producto (esencial para métricas de productos y categorías más vendidas) */
  category: string;
}

/**
 * Interfaz que representa la entidad plana de una Venta en la base de datos.
 */
export interface Sale {
  /** Identificador único de la venta */
  id: string;
  
  /** ID del cliente asociado a la compra (Relación Foreign Key) */
  customerId: string;
  
  /** Listado de productos vendidos y sus detalles históricos */
  products: SaleItem[];
  
  /** Monto total facturado en la venta (incluye intereses del financiamiento si los hubiera) */
  totalAmount: number;
  
  /** Monto total ya pagado acumulado hasta la fecha (suma de pagos procesados) */
  paidAmount: number;
  
  /** Deuda restante por cobrar (totalAmount - paidAmount) */
  remainingAmount: number;
  
  /** Cantidad total de cuotas en las que se financió la venta (1 si es en un solo pago) */
  installmentsCount: number;
  
  /** Estado de la venta / entrega física de productos */
  saleStatus: SaleStatus;
  
  /** Estado de cobranza del financiamiento */
  collectionStatus: CollectionStatus;
  
  /** Fecha en que se realizó la venta (en formato ISO string) */
  createdAt: string;
  
  /** Tasa de interés aplicada al financiamiento, expresada en porcentaje (ej: 10 para 10% de interés mensual, opcional) */
  interestRate?: number;
  
  /** Entrega inicial o anticipo en efectivo abonado al momento de retirar el producto (opcional) */
  downPayment?: number;
  
  /** Comentarios u observaciones adicionales sobre la venta */
  notes?: string;
}

/**
 * Extensión de la interfaz Sale con relaciones resueltas.
 * Ideal para el desarrollo del frontend (panel admin, detalles de venta) y reportes consolidados.
 */
export interface SaleWithRelations extends Sale {
  /** Datos completos del cliente asociado */
  customer?: Customer;
  
  /** Plan de cuotas generado para esta venta */
  installments?: Installment[];
  
  /** Historial de pagos reales ingresados para esta venta */
  payments?: Payment[];
}
