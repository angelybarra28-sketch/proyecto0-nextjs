import type { Sale } from './sale';
import type { Installment } from './installment';

/**
 * Representa los diferentes canales o métodos de pago permitidos en el negocio.
 */
export enum PaymentMethod {
  /** Efectivo (muy común en cobranza presencial a domicilio o local) */
  CASH = 'CASH',
  
  /** Transferencia bancaria (CBU / Alias) */
  BANK_TRANSFER = 'BANK_TRANSFER',
  
  /** Tarjeta de débito */
  DEBIT_CARD = 'DEBIT_CARD',
  
  /** Tarjeta de crédito (un pago o financiación de la tarjeta) */
  CREDIT_CARD = 'CREDIT_CARD',
  
  /** Billetera virtual (Mercado Pago, MODO, Cuenta DNI, Ualá, etc.) */
  MERCADO_PAGO = 'MERCADO_PAGO',
  
  /** Otro medio de pago alternativo */
  OTHER = 'OTHER'
}

/**
 * Interfaz que representa la entidad plana de un Pago en la base de datos.
 */
export interface Payment {
  /** Identificador único del pago */
  id: string;
  
  /** ID de la venta a la cual se le imputa el pago (Relación Foreign Key) */
  saleId: string;
  
  /**
   * ID de la cuota específica a la cual se imputa este pago.
   * Opcional, ya que el cliente podría realizar un pago "a cuenta" o general sin amortizar una cuota concreta,
   * o bien el sistema puede distribuir un pago grande automáticamente entre múltiples cuotas.
   */
  installmentId?: string;
  
  /** Monto en pesos ($) abonado en este pago específico */
  amount: number;
  
  /** Método de pago utilizado */
  paymentMethod: PaymentMethod;
  
  /** Fecha y hora exacta del pago en formato ISO string */
  paymentDate: string;
  
  /** Referencia de transacción (N° de operación bancaria, ID de Mercado Pago, N° de recibo en papel, etc., opcional) */
  transactionReference?: string;
  
  /** Observaciones del pago (ej. "Entregó billetes de $10.000", "Abonó la tía del cliente") */
  notes?: string;
}

/**
 * Extensión de la interfaz Payment con relaciones resueltas.
 * Excelente para auditoría financiera, listado de caja diario e historial de transacciones.
 */
export interface PaymentWithRelations extends Payment {
  /** Datos completos de la venta asociada */
  sale?: Sale;
  
  /** Cuota específica asociada al pago (si existiese) */
  installment?: Installment;
}
