-- =============================================================================
-- 01_auditoria_preventiva.sql
-- =============================================================================
-- Rol: DBA / Administrador de Datos
-- Proyecto: Sistema de Ventas de Sabanas - Dashboard Financiero
-- Fase: Semana 1 - Hardening Conservador del Modulo de Cartera
-- Fecha: 2026-06-10
-- Plataforma: PostgreSQL (Supabase)
-- =============================================================================
-- Objetivo:
--   Validar la integridad contable del modulo de creditos/cartera antes de
--   aplicar cualquier blindaje estructural (constraints, indices, etc.).
--   Este script es puramente de lectura (SELECT). No modifica datos.
-- =============================================================================
-- Instrucciones de ejecucion:
--   1. Abrir Supabase SQL Editor.
--   2. Copiar y pegar TODO el contenido de este script.
--   3. Ejecutar bloque por bloque (o completo).
--   4. Analizar resultados de cada query.
--   5. Criterio de aceptacion: Las queries A, B y C deben retornar 0 filas.
--      La query E debe retornar 'OK'.
-- =============================================================================
-- Contexto del sistema:
--   credit_accounts        -> Cuentas corrientes / tarjetas de credito.
--   credit_installments    -> Cuotas individuales de cada cuenta.
--   credit_payments        -> Registros de pagos recibidos (ingresos).
--   credit_payment_allocations -> Asignacion FIFO de pagos a cuotas.
-- =============================================================================


-- =============================================================================
-- QUERY A: Pagos Individualmente Huerfanos
-- =============================================================================
-- Objetivo:
--   Detectar pagos que existen en 'credit_payments' pero cuyo monto total
--   NO coincide con la suma de sus asignaciones en 'credit_payment_allocations'.
--   Un pago "huerfano" significa que parte del dinero ingreso al sistema
--   pero no se asigno a ninguna cuota, rompiendo la trazabilidad FIFO.
-- =============================================================================
-- Criterio de aceptacion:
--   COUNT(*) = 0  ->  No hay pagos huerfanos. El sistema tiene trazabilidad
--                     perfecta entre ingresos y asignaciones.
--   COUNT(*) > 0  ->  URGENTE. Existen pagos sin asignacion completa.
--                     Requiere analisis caso por caso antes de cualquier
--                     blindaje de importacion.
-- =============================================================================

SELECT
    cp.id AS payment_id,
    cp.credit_account_id,
    ca.operation_number,
    cp.amount AS payment_amount,
    COALESCE(SUM(cpa.amount), 0) AS allocated_amount,
    cp.amount - COALESCE(SUM(cpa.amount), 0) AS unallocated_amount,
    cp.payment_date,
    cp.created_at
FROM credit_payments cp
LEFT JOIN credit_accounts ca
    ON ca.id = cp.credit_account_id
LEFT JOIN credit_payment_allocations cpa
    ON cpa.credit_payment_id = cp.id
GROUP BY
    cp.id,
    cp.credit_account_id,
    ca.operation_number,
    cp.amount,
    cp.payment_date,
    cp.created_at
HAVING
    cp.amount <> COALESCE(SUM(cpa.amount), 0)
ORDER BY
    unallocated_amount DESC;


-- =============================================================================
-- QUERY B: Divergencia a Nivel de Cuenta (Payments vs Installments)
-- =============================================================================
-- Objetivo:
--   Comparar, para cada cuenta corriente, el total de dinero ingresado
--   (SUM de credit_payments.amount) contra el total de dinero absorbido
--   por las cuotas (SUM de credit_installments.paid_amount).
--   En un sistema sano, ambos valores deben ser identicos.
-- =============================================================================
-- Criterio de aceptacion:
--   COUNT(*) = 0  ->  Cuadratura perfecta. Todos los ingresos estan
--                     reflejados en las cuotas.
--   COUNT(*) > 0  ->  ALERTA. Existe una cuenta donde los ingresos y
--                     las cuotas no cuadran. Posible causa: pagos
--                     huerfanos, ajustes manuales, o corrupcion de datos.
-- =============================================================================

SELECT
    ca.id AS account_id,
    ca.operation_number,
    COALESCE(pay.total_payments, 0) AS total_payments,
    COALESCE(inst.total_paid_installments, 0) AS total_paid_installments,
    COALESCE(pay.total_payments, 0) - COALESCE(inst.total_paid_installments, 0) AS difference
FROM credit_accounts ca
LEFT JOIN (
    SELECT
        credit_account_id,
        SUM(amount) AS total_payments
    FROM credit_payments
    GROUP BY credit_account_id
) pay ON pay.credit_account_id = ca.id
LEFT JOIN (
    SELECT
        credit_account_id,
        SUM(paid_amount) AS total_paid_installments
    FROM credit_installments
    GROUP BY credit_account_id
) inst ON inst.credit_account_id = ca.id
WHERE
    COALESCE(pay.total_payments, 0) <> COALESCE(inst.total_paid_installments, 0)
ORDER BY
    ABS(difference) DESC;


-- =============================================================================
-- QUERY C: Sobrepagos Contables (total_collected > total_financed)
-- =============================================================================
-- Objetivo:
--   Identificar cuentas donde la suma historica de pagos supera el monto
--   total financiado original (installment_amount * installment_count).
--   Un sobrepago contable indica que el cliente pago de mas, o que
--   existen pagos huerfanos que inflan artificialmente la cifra de cobro.
-- =============================================================================
-- Criterio de aceptacion:
--   COUNT(*) = 0  ->  No hay sobrepagos. El sistema respeta los limites
--                     del contrato original.
--   COUNT(*) > 0  ->  REVISION. Existen cuentas con saldo negativo
--                     implicito. La UI puede ocultar esto con Math.max(0,...).
--                     Requiere definir politica de negocio (devolucion,
--                     ajuste, o ajuste de datos).
-- =============================================================================

SELECT
    ca.id AS account_id,
    ca.operation_number,
    (ca.installment_amount * ca.installment_count) AS total_financed,
    COALESCE(SUM(cp.amount), 0) AS total_collected,
    COALESCE(SUM(cp.amount), 0) - (ca.installment_amount * ca.installment_count) AS excess
FROM credit_accounts ca
LEFT JOIN credit_payments cp
    ON cp.credit_account_id = ca.id
GROUP BY
    ca.id,
    ca.operation_number,
    ca.installment_amount,
    ca.installment_count
HAVING
    COALESCE(SUM(cp.amount), 0) > (ca.installment_amount * ca.installment_count)
ORDER BY
    excess DESC;


-- =============================================================================
-- QUERY D: Cuadratura Global (credit_payments vs credit_installments)
-- =============================================================================
-- Objetivo:
--   Generar un resumen de 4 metricas globales para comparar dos mundos:
--   A. El mundo de los 'credit_payments' (ingresos brutos).
--   B. El mundo de los 'credit_installments' (cuotas y saldos).
--   Si el sistema es consistente, ambos mundos deben arrojar los mismos
--   totales para 'collected' y 'pending'.
-- =============================================================================
-- Criterio de aceptacion:
--   total_collected_via_payments  ==  total_collected_via_installments
--   total_pending_via_installments  ==  total_financed - total_collected_via_installments
--   Si hay diferencia, indica pagos huerfanos o discrepancias de redondeo.
-- =============================================================================

SELECT
    'total_financed' AS metric,
    COALESCE(SUM(ca.installment_amount * ca.installment_count), 0)::numeric AS value
FROM credit_accounts ca
WHERE ca.is_active = true

UNION ALL

SELECT
    'total_collected_via_payments' AS metric,
    COALESCE(SUM(cp.amount), 0)::numeric AS value
FROM credit_payments cp
JOIN credit_accounts ca
    ON ca.id = cp.credit_account_id
WHERE ca.is_active = true

UNION ALL

SELECT
    'total_collected_via_installments' AS metric,
    COALESCE(SUM(ci.original_amount - ci.remaining_amount), 0)::numeric AS value
FROM credit_installments ci
JOIN credit_accounts ca
    ON ca.id = ci.credit_account_id
WHERE ca.is_active = true

UNION ALL

SELECT
    'total_pending_via_installments' AS metric,
    COALESCE(SUM(ci.remaining_amount), 0)::numeric AS value
FROM credit_installments ci
JOIN credit_accounts ca
    ON ca.id = ci.credit_account_id
WHERE ca.is_active = true;


-- =============================================================================
-- QUERY E: Error de Redondeo (Contrato vs Cuotas Reales)
-- =============================================================================
-- Objetivo:
--   La funcion 'generate_credit_installments' genera cuotas individuales
--   usando 'trunc()', lo que puede introducir centavos de diferencia
--   entre (installment_amount * installment_count) y SUM(original_amount).
--   Esta query detecta si esa discrepancia existe en la cartera activa.
-- =============================================================================
-- Criterio de aceptacion:
--   status = 'OK'   ->  Redondeo tolerable (< 0.01). No hay impacto.
--   status = 'REVIEW' ->  Discrepancia significativa. Requiere revisar
--                         la funcion generadora de cuotas.
-- =============================================================================

WITH agg AS (
    SELECT
        COALESCE(SUM(ci.original_amount - ci.remaining_amount), 0) AS collected_installments,
        COALESCE(SUM(ci.remaining_amount), 0) AS pending_installments,
        COALESCE(SUM(ca.installment_amount * ca.installment_count), 0) AS financed_contract
    FROM credit_accounts ca
    LEFT JOIN credit_installments ci
        ON ci.credit_account_id = ca.id
    WHERE ca.is_active = true
)
SELECT
    collected_installments,
    pending_installments,
    financed_contract,
    (collected_installments + pending_installments) - financed_contract AS rounding_error,
    CASE
        WHEN ABS((collected_installments + pending_installments) - financed_contract) < 0.01 THEN 'OK'
        ELSE 'REVIEW'
    END AS status
FROM agg;


-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
-- Resumen de validacion esperada:
--   Query A -> 0 filas
--   Query B -> 0 filas
--   Query C -> 0 filas
--   Query D -> total_collected_via_payments == total_collected_via_installments
--   Query E -> status = 'OK'
-- =============================================================================
-- Si cualquier query falla el criterio, NO proceder con blindajes de
-- importacion ni cambios funcionales. Documentar resultados y reportar.
-- =============================================================================
