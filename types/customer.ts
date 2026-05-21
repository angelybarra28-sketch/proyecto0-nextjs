import type { Sale } from './sale';

/**
 * Interfaz que representa la entidad plana de un Cliente en la base de datos.
 */
export interface Customer {
  /** Identificador único del cliente (UUID, autoincremental o ID de autenticación) */
  id: string;
  
  /** Nombre completo del cliente (ej. Juan Pérez) */
  fullName: string;
  
  /** Teléfono de contacto (importante para llamadas de cobro y notificaciones de cuotas) */
  phone: string;
  
  /** Documento Nacional de Identidad / CUIT / CUIL (esencial para la validez legal del financiamiento) */
  dni?: string;
  
  /** Correo electrónico (para envío opcional de recibos de pago digitales) */
  email?: string;
  
  /** Dirección física de entrega / facturación (opcional) */
  address?: string;
  
  /** Notas y observaciones sobre el cliente (ej. "Cliente excelente", "Prefiere pagar los sábados") */
  notes?: string;
  
  /** Fecha de registro o creación del cliente en formato ISO (string) */
  createdAt: string;
}

/**
 * Extensión de la interfaz Customer para cuando se resuelven y recuperan
 * sus relaciones desde la base de datos o estado global.
 */
export interface CustomerWithRelations extends Customer {
  /** Ventas asociadas a este cliente */
  sales?: Sale[];
}
