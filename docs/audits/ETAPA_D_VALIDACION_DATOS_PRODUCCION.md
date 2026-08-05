# Etapa D — Validación del estado REAL de la base de datos (producción)

> **Alcance:** Validación read-only de los datos de producción (proyecto Supabase `mtpgvidzwveelfjbdgoh`) para comprobar si los riesgos de la Etapa C (F1–F13) ya produjeron corrupción de datos.
> **Método:** Consultas de **solo lectura** ejecutadas contra la base real el **2026-08-05** mediante el endpoint REST/PostgREST (equivalente SELECT) con service-role key. **No** se ejecutó ningún INSERT, UPDATE, DELETE ni RPC. Cada validación se acompaña de su consulta SQL canónica y del resultado obtenido.
> **Estado:** READ-ONLY. No se modificó código, SQL, migraciones ni datos.
> **Documentos relacionados:** Etapa B.1 (hallazgos C1–C13) y Etapa C (hallazgos F1–F13).

---

## Resumen Ejecutivo

- **Volumen real de datos:** `sales` = **2**, `sale_items` = **2**, `installments` = **17**, `payments` = **1**, `payment_allocations` = **3**, `customers` = **661**, `products` = **144**. (Tablas transaccionales de ventas prácticamente vacías.)
- **Resultado global: NO se detectó corrupción de datos** en ninguna de las 15 validaciones. Todas las sumas monetarias cuadran, no hay valores negativos ni ceros sospechosos, no hay huérfanos, no hay duplicados.
- **Pero dos riesgos de la Etapa C SÍ están materializados en los datos:**
  - **F7 confirmado:** el **100%** de los `sale_items` (2/2) no tiene `legacy_product_id`, ni `product_id`, ni slug, ni categoría → la venta solo está vinculada al catálogo por el texto del nombre. La trazabilidad venta→producto es nula.
  - **F15/envejecimiento:** existe **1 venta PENDING real** (`SALE-1007866C`, $783.000, 9 cuotas) con **~6 días de antigüedad** y 9 cuotas PENDING sin actividad.
- **Advertencia de muestra:** con solo 2 ventas, las validaciones que detectan patrones (duplicados por doble submit, spam, montos manipulados) tienen **evidencia insuficiente** para concluir. El hecho de que "no haya corrupción hoy" es cierto sobre los datos existentes, pero no descarta los riesgos F1–F4 a futuro.

---

## Hallazgos confirmados (en los datos reales)

| ID | Hallazgo | Evidencia |
|----|----------|-----------|
| C-D1 | **F7 materializado:** 100% de `sale_items` sin `legacy_product_id`/`product_id`/slug/categoría | D8: 2/2 ítems sin referencia (100%). D7: 0 ítems con legacy id. Además `products.legacy_product_id` es `null` en los productos consultados → no existe vínculo venta↔producto en toda la cadena. |
| C-D2 | **Venta PENDING real envejeciendo:** `SALE-1007866C`, $783.000, 9 cuotas, ~6 días sin actividad | D15. |
| C-D3 | **Input sin validación persistido tal cual:** datos de entrega de una venta contienen basura (`asfasf`, `asdas`, `111111111111`) | D15/D2 detalle de venta `300`. Evidencia colateral de F2 (ausencia de validación de entrada), no de montos corruptos. |
| C-D4 | **Venta con plan inconsistente:** venta `300` declara `payment_plan_type = 'FULL_PAYMENT'` pero tiene **8 cuotas** de $8.500 | D3 (las sumas cuadran; el plan declarado no coincide con el esquema de cuotas). |
| C-D5 | **Venta de prueba/datos ajenos al flujo vivo en prod:** la venta `300` tiene `sale_number = '300'` (no formato `SALE-…`), su ítem fue creado **13 días después** que la venta (imposible por el flujo vivo, que inserta venta+ítem en la misma petición en milisegundos) | D1/D2 detalle de fechas. |

## Hallazgos descartados (validaciones que NO encontraron corrupción)

| Validación | Resultado |
|-----------|-----------|
| D1 — ventas sin ítems | 0 (2 ventas, todas con ítems) |
| D2 — total vs suma de ítems | 0 discrepancias ($68.000 y $783.000 cuadran) |
| D3 — cuotas vs total de venta | 0 discrepancias (8×8.500=68.000; 9×87.000=783.000) |
| D4 — paid+remaining ≠ original | 0 (17/17 cuadran) |
| D6 — `checkout_request_id` repetidos | 0 (2 únicos) |
| D9 — clientes duplicados | 0 por phone / email(lower) / dni (661 clientes) |
| D10 — cuotas huérfanas | 0 |
| D11 — pagos/asignaciones huérfanos | 0 |
| D12 — montos negativos | 0 |
| D13 — precios/cantidades/subtotales = 0 | 0 |
| D14 — stock negativo | 0 (144 productos) |

## Hallazgos sin evidencia (muestra insuficiente para concluir)

| Validación | Motivo |
|-----------|--------|
| D5 — ventas duplicadas (mismo teléfono, mismo total, <5 min) | Solo 1 venta tiene teléfono (`delivery_phone`). Con 1 fila comparable no puede existir ningún par. |
| D7 — `legacy_product_id` de ítems inexistentes en `products` | 0 ítems tienen `legacy_product_id` (D8) → no hay nada que comparar. La validación es vacua y, de paso, confirma F7. |

---

# Evidencia

## D1 — Ventas sin ítems

**Consulta SQL:**
```sql
SELECT s.sale_number, s.created_at, s.item_count, COUNT(si.id) AS real_items
FROM sales s
LEFT JOIN sale_items si ON si.sale_id = s.id
WHERE s.item_count > 0
GROUP BY s.id, s.sale_number, s.created_at, s.item_count
HAVING COUNT(si.id) = 0;
```

**Resultado:** `0 filas`. Ventas totales: 2; con `item_count > 0`: 2; con 0 ítems reales: 0.

**Interpretación objetiva:** no existe ninguna venta con `item_count` declarado que carezca de ítems (riesgo F1 no materializado). Detalle de las 2 ventas existentes:

| sale_number | created_at | item_count | ítems reales |
|---|---|---|---|
| SALE-1007866C | 2026-07-30 14:22:23 | 1 | 1 |
| 300 | 2026-07-14 15:26:25 | 1 | 1 |

**Confianza:** 100% (datos directos de producción).

**Conclusión:** descartado — no hay ventas sin ítems.

---

## D2 — Total distinto a la suma de ítems

**Consulta SQL:**
```sql
SELECT s.sale_number, s.total_amount,
       COALESCE(SUM(si.quantity * si.unit_price_snapshot), 0) AS sum_items,
       s.total_amount - COALESCE(SUM(si.quantity * si.unit_price_snapshot), 0) AS diff
FROM sales s
LEFT JOIN sale_items si ON si.sale_id = s.id
GROUP BY s.id
HAVING ABS(s.total_amount - COALESCE(SUM(si.quantity * si.unit_price_snapshot), 0)) > 0.01;
```

**Resultado:** `0 filas`. Ambas ventas cuadran: `300` → 1×68.000 = 68.000 = total; `SALE-1007866C` → 1×783.000 = 783.000 = total.

**Interpretación objetiva:** los montos almacenados coinciden con la suma de ítems. Además, contrastado contra el catálogo por nombre (suplemento read-only): el ítem de la venta viva "Set Babyliss…" tiene precio de catálogo **783.000** y el de la venta `300` "Almohada Zafiro Relax Classic" tiene precio **68.000** → los precios almacenados coinciden con los del catálogo. Sin evidencia de manipulación de montos (F2), con la salvedad de muestra = 2.

**Confianza:** 100% para las sumas; la comparación contra catálogo es por coincidencia de nombre (sin `product_id`/`legacy_product_id` que lo garantice).

**Conclusión:** descartado — no hay discrepancias de total.

---

## D3 — Cuotas inconsistentes (suma de cuotas vs total)

**Consulta SQL:**
```sql
SELECT s.sale_number, s.total_amount, SUM(i.original_amount) AS sum_original,
       s.total_amount - SUM(i.original_amount) AS diff
FROM sales s
JOIN installments i ON i.sale_id = s.id
GROUP BY s.id
HAVING ABS(s.total_amount - SUM(i.original_amount)) > 0.01;
```

**Resultado:** `0 filas`. Ambas ventas cuadran: venta `300` → 8 cuotas × 8.500 = 68.000 = total; venta `SALE-1007866C` → 9 cuotas × 87.000 = 783.000 = total.

**Interpretación objetiva:** el esquema de cuotas siempre suma el total de la venta (la última cuota absorbe el redondeo). **Observación factual aparte:** la venta `300` declara `payment_plan_type = 'FULL_PAGO'` (valor `FULL_PAYMENT`) y aun así tiene 8 cuotas generadas — el plan declarado y las cuotas existentes no se corresponden. No es una inconsistencia de montos (las sumas cuadran), pero es una inconsistencia de modelo.

**Confianza:** 100%.

**Conclusión:** descartado para montos; se confirma una inconsistencia de plan vs cuotas en la venta `300`.

---

## D4 — Cuotas con `paid_amount + remaining_amount != original_amount`

**Consulta SQL:**
```sql
SELECT id, sale_id, installment_number, original_amount, paid_amount, remaining_amount
FROM installments
WHERE paid_amount + remaining_amount <> original_amount;
```

**Resultado:** `0 filas` de 17 cuotas.

**Interpretación objetiva:** las 17 cuotas cumplen la invariante `paid + remaining = original`. Esto respalda que el CHECK de la tabla (`202605260002_tables.sql:119`) está presente en producción (o, si no lo estuviera, que las escrituras lo respetan de todos modos).

**Confianza:** 100%.

**Conclusión:** descartado.

---

## D5 — Ventas duplicadas (mismo teléfono, mismo total, <5 min)

**Consulta SQL:**
```sql
SELECT c.phone, s.total_amount, count(*) AS n, min(s.sale_date), max(s.sale_date)
FROM sales s
JOIN customers c ON c.id = s.customer_id
WHERE c.phone IS NOT NULL AND c.phone <> ''
GROUP BY c.phone, s.total_amount
HAVING count(*) > 1;
-- (pares dentro de <5 min se evaluarían con LAG/LEAD sobre la ventana ordenada por sale_date)
```

**Resultado:** `0 grupos` con más de una venta. Solo 1 venta tiene teléfono (`delivery_phone = '111111111111'` en la venta `300`); su `customer_id` tampoco arroja pares.

**Interpretación objetiva:** no hay ventas duplicadas por este criterio, pero la muestra es de 1 fila comparable → **no se puede concluir** que el doble submit (F3) no pueda ocurrir; simplemente no hay evidencia de que haya ocurrido hasta ahora.

**Confianza:** 100% sobre los datos; baja capacidad de detección por muestra mínima.

**Conclusión:** sin evidencia suficiente (no descartable ni confirmable con 2 ventas).

---

## D6 — `checkout_request_id` repetidos

**Consulta SQL:**
```sql
SELECT checkout_request_id, count(*)
FROM sales
GROUP BY checkout_request_id
HAVING count(*) > 1;
```

**Resultado:** `0 filas`. 2 ventas, 2 `checkout_request_id` únicos.

**Interpretación objetiva:** no hay duplicados de clave de idempotencia. El DDL define `checkout_request_id text not null unique` (`202605260002_tables.sql:62`); la existencia real de la restricción no se pudo verificar vía PostgREST (no expone constraints), pero la columna es `not null` y sin duplicados en los datos.

**Confianza:** 100% sobre los datos; restricción UNIQUE en BD según DDL (no re-verificada en prod).

**Conclusión:** descartado.

---

## D7 — `legacy_product_id` inexistentes en `products`

**Consulta SQL:**
```sql
SELECT si.sale_id, si.legacy_product_id, si.product_name_snapshot
FROM sale_items si
LEFT JOIN products p ON p.legacy_product_id = si.legacy_product_id
WHERE si.legacy_product_id IS NOT NULL AND p.legacy_product_id IS NULL;
```

**Resultado:** `0 filas`. **Pero por causa vacua:** `sale_items` con `legacy_product_id not null` = **0** (ver D8), y además `products.legacy_product_id` es `null` en los productos consultados del catálogo (los 6 productos de la muestra, incluidos los 2 vendidos).

**Interpretación objetiva:** no se puede hablar de "productos inexistentes en `sale_items`" porque `sale_items` nunca guarda referencia alguna al producto (F7). El vínculo entre la venta y el catálogo solo existe como texto (`product_name_snapshot`). La validación es vacua y confirma F7.

**Confianza:** 100%.

**Conclusión:** sin evidencia de productos inexistentes (no aplica); la ausencia total de referencias es el hallazgo confirmado C-D1.

---

## D8 — `sale_items` sin `legacy_product_id`

**Consulta SQL:**
```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE legacy_product_id IS NULL) AS sin_legacy,
       round(100.0 * count(*) FILTER (WHERE legacy_product_id IS NULL) / count(*), 1) AS pct
FROM sale_items;
```

**Resultado:** `total = 2`, `sin_legacy = 2`, **pct = 100.0%**.

**Interpretación objetiva:** el 100% de los ítems de venta no tiene `legacy_product_id` (tampoco `product_id`, `product_slug_snapshot` ni `category_name_snapshot`, todos `null`). Coincide exactamente con el riesgo **F7** de la Etapa C: la ruta `/api/pre-sales` (`route.ts:69-78`) inserta solo snapshot de nombre/precio/cantidad. Este riesgo **ya está materializado en los datos reales**.

**Confianza:** 100%.

**Conclusión:** confirmado — ausencia total de vinculación venta→producto en producción.

---

## D9 — Clientes duplicados

**Consulta SQL:**
```sql
-- por teléfono
SELECT phone, count(*) FROM customers WHERE phone IS NOT NULL AND phone <> '' GROUP BY phone HAVING count(*) > 1;
-- por email (normalizado a minúsculas)
SELECT lower(email), count(*) FROM customers WHERE email IS NOT NULL AND email <> '' GROUP BY lower(email) HAVING count(*) > 1;
-- por dni
SELECT dni, count(*) FROM customers WHERE dni IS NOT NULL GROUP BY dni HAVING count(*) > 1;
```

**Resultado:** `0` duplicados por phone, `0` por email(lower), `0` por dni, sobre **661 clientes**.

**Interpretación objetiva:** sin clientes duplicados por ninguna de las tres claves. Los índices únicos parciales (`202605260003_indexes.sql:20-21`) y `customers.email`/`dni` únicos (DDL) son consistentes con este resultado.

**Confianza:** 100% sobre los datos.

**Conclusión:** descartado.

---

## D10 — Cuotas huérfanas

**Consulta SQL:**
```sql
SELECT i.id, i.sale_id
FROM installments i
LEFT JOIN sales s ON s.id = i.sale_id
WHERE s.id IS NULL;
```

**Resultado:** `0 filas` de 17 cuotas.

**Interpretación objetiva:** todas las cuotas referencian ventas existentes. Consistente con el FK `installments.sale_id → sales(id) ON DELETE CASCADE` del DDL (`202605260002_tables.sql:109`).

**Confianza:** 100%.

**Conclusión:** descartado.

---

## D11 — Pagos / asignaciones huérfanos

**Consulta SQL:**
```sql
-- pagos con referencias inexistentes
SELECT id, sale_id, customer_id FROM payments
WHERE sale_id NOT IN (SELECT id FROM sales) OR customer_id NOT IN (SELECT id FROM customers);
-- asignaciones con referencias inexistentes
SELECT id, payment_id, installment_id FROM payment_allocations
WHERE installment_id NOT IN (SELECT id FROM installments) OR payment_id NOT IN (SELECT id FROM payments);
```

**Resultado:** `payments`: 1 fila, 0 con `sale_id` inexistente, 0 con `customer_id` inexistente. `payment_allocations`: 3 filas, 0 con `installment_id`/`payment_id` inexistente.

**Interpretación objetiva:** todas las referencias de pagos y asignaciones son válidas. El único pago (20.000 en efectivo, `CONFIRMED`, 2026-07-15) se asigna a 3 cuotas de la venta `300` por un total asignado de 8.500+8.500+3.000 = 20.000 (asignación completa).

**Confianza:** 100%.

**Conclusión:** descartado.

---

## D12 — Totales negativos

**Consulta SQL:**
```sql
-- sales
SELECT id, sale_number FROM sales WHERE subtotal_amount < 0 OR discount_amount < 0
  OR total_amount < 0 OR paid_amount < 0 OR remaining_amount < 0 OR item_count < 0;
-- installments
SELECT id, sale_id FROM installments WHERE original_amount < 0 OR paid_amount < 0 OR remaining_amount < 0;
-- payments
SELECT id, sale_id FROM payments WHERE amount < 0;
-- sale_items
SELECT id, sale_id FROM sale_items WHERE unit_price_snapshot < 0 OR quantity < 0
  OR line_subtotal < 0 OR line_total < 0 OR line_discount_amount < 0;
```

**Resultado:** `0` en las 4 tablas (sales, installments, payments, sale_items).

**Interpretación objetiva:** ningún monto o cantidad negativo. Los CHECKs del DDL (`montos >= 0`, `quantity > 0`) son consistentes con los datos.

**Confianza:** 100%.

**Conclusión:** descartado.

---

## D13 — Valores cero sospechosos

**Consulta SQL:**
```sql
SELECT id, sale_id, product_name_snapshot, unit_price_snapshot, quantity, line_subtotal
FROM sale_items
WHERE unit_price_snapshot = 0 OR quantity = 0 OR line_subtotal = 0;
-- adicional: ventas con total 0
SELECT id, sale_number FROM sales WHERE total_amount = 0;
```

**Resultado:** `sale_items` precio=0: **0**; cantidad=0: **0**; `line_subtotal=0`: **0**. `sales` con `total_amount = 0`: **0**.

**Interpretación objetiva:** ningún precio/cantidad/subtotal cero. Los 2 ítems tienen precio y cantidad > 0.

**Confianza:** 100%.

**Conclusión:** descartado.

---

## D14 — Integridad del stock (solo stock negativo)

**Consulta SQL:**
```sql
SELECT id, name, slug, stock FROM products WHERE stock < 0;
```

**Resultado:** `0 filas` de **144 productos**.

**Interpretación objetiva:** no hay stock negativo. (Observación factual: el producto vendido en la venta `300`, "Almohada Zafiro Relax Classic", figura hoy con `stock = 0`; no se puede afirmar que fuera 0 al momento de la venta. Sin correlación stock↔ventas por diseño — riesgo F6.)

**Confianza:** 100%.

**Conclusión:** descartado (sin stock negativo).

---

## D15 — Antigüedad de ventas PENDING

**Consulta SQL:**
```sql
SELECT sale_number, sale_status, sale_date, total_amount, item_count,
       EXTRACT(DAY FROM now() - sale_date)::int AS antiguedad_dias
FROM sales
WHERE sale_status = 'PENDING'
ORDER BY sale_date ASC;
```

**Resultado:** 1 venta PENDING:

| sale_number | sale_status | sale_date | total_amount | item_count | antigüedad (días) |
|---|---|---|---|---|---|
| SALE-1007866C | PENDING | 2026-07-30 14:22:23 | 783.000 | 1 | ~6 |

**Interpretación objetiva:** existe una venta PENDING real con **~6 días** de antigüedad, $783.000, 9 cuotas PENDING sin ningún pago. Es la única venta creada por el flujo vivo (`/api/pre-sales`, `source = 'checkout_whatsapp'`, ítem creado 0,3s después de la venta). El riesgo de la Etapa C de "ventas PENDING que envejecen sin progreso" ya tiene un caso concreto en producción.

**Confianza:** 100%.

**Conclusión:** confirmado — 1 venta PENDING de alto valor envejeciendo sin actividad (riesgo operativo concreto).

---

## Respuestas (Conclusión)

1. **¿La base presenta corrupción?**
   **No.** Las 15 validaciones no detectaron corrupción: totales cuadran, cuotas consistentes, sin negativos/ceros/huérfanos/duplicados, stock no negativo. Salvedad: el volumen de ventas es mínimo (2 ventas, 2 ítems, 17 cuotas, 1 pago), por lo que el "no" es cierto sobre los datos existentes pero con poder de detección limitado.

2. **¿La corrupción es aislada o sistemática?**
   **No hay corrupción que clasificar.** Lo que sí es **sistemático** (inherente al diseño, no aleatorio) es: (a) la **ausencia total de vínculo venta→producto** (100% de los ítems sin `legacy_product_id`/`product_id`/slug/categoría) y (b) el **patrón de generación de cuotas** (8 en una venta de plan `FULL_PAYMENT`, 9 en la venta real), consistente con el código de Etapa C.

3. **¿Los riesgos de la Etapa C ya ocurrieron realmente?**
   - **F7 (sin referencia al producto): SÍ, confirmado en datos** (D8/D7, 100% de los ítems).
   - **F2 (montos confiados al cliente): SIN evidencia de manipulación** — los 2 precios almacenados coinciden con el catálogo. Pero sí hay evidencia colateral de **ausencia de validación de entrada**: datos de entrega basura persistidos (`asfasf`, `asdas`, `111111111111`).
   - **F1 (ventas sin ítems / borradas): NO** — no existe ninguna venta sin ítems (D1).
   - **F3 (ventas duplicadas): NO** — sin duplicados por clave ni por patrón (D6, D5 con muestra mínima).
   - **F4 (abuso/spam): NO** — sin evidencia de volumen anómalo.
   - **F6 (stock): parcial** — el producto vendido figura hoy con stock 0; no hay stock negativo.

4. **¿Cuál es el riesgo más urgente?**
   Según la evidencia, el más urgente es la **venta PENDING envejeciendo** (`SALE-1007866C`: $783.000, 9 cuotas, ~6 días sin actividad) combinado con la **imposibilidad de trazarla al catálogo** (F7 confirmado): no hay ningún mecanismo en los datos que vincule la venta al producto o que haga avanzar su estado. En segundo plano, el riesgo de mayor severidad de la Etapa C (F2: montos confiados al cliente) no ha mostrado evidencia de ocurrencia, pero **no es verificable** con los datos actuales precisamente por la falta de vínculo venta→producto.

---

*Informe generado en modo read-only el 2026-08-05 contra `mtpgvidzwveelfjbdgoh.supabase.co`. Ejecución: consultas GET/PostgREST (SELECT-equivalentes) con service-role key; sin INSERT/UPDATE/DELETE/RPC. No se modificó código, SQL ni migraciones. Los scripts de verificación temporales se ejecutaron desde `%TEMP%` y no forman parte del repositorio.*
