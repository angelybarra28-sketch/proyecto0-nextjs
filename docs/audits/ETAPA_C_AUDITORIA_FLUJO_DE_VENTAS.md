# Etapa C — Auditoría del Flujo Real de Ventas

> **Alcance:** Auditoría técnica read-only del **único camino vivo** de creación de ventas del proyecto `proyecto0-nextjs`: checkout → `POST /api/pre-sales` → INSERT directo a `sales` / `sale_items` / `installments` (código muerto del RPC excluido de este alcance; ver Etapa B.1 §5).
> **Método:** Reconstrucción completa del call-graph desde el carrito hasta las tablas (`app/` → `components/` → `lib/services` → `lib/repositories` → Supabase service-role), verificación de cada línea citada, y contraste del esquema (DDL, RLS, índices). Sin consultas a la DB real.
> **Fecha:** 2026-08-05.
> **Estado:** READ-ONLY. Ningún cambio aplicado a código ni base de datos.
> **Documentos relacionados:** `ETAPA_B_AUDITORIA_BASE_DE_DATOS.md` (revisión B.1) — este informe es la profundización del hallazgo R6 y la verificación del flujo vivo mencionado en B.1.

---

## Resumen ejecutivo

| ID | Hallazgo | Riesgo | Estado | Confianza |
|----|----------|--------|--------|-----------|
| F1 | Creación de venta **sin transacción**: 3 INSERTs separados + compensación parcial | ALTO | Confirmado (código) | 100% |
| F2 | Precios y cantidades **confiados al cliente** sin validación ni contraste con catálogo | ALTO | Confirmado (código) | 100% |
| F3 | **Sin idempotencia real** → ventas duplicadas (doble submit + reintento de red) | ALTO | Confirmado (código) | 100% |
| F4 | `POST /api/pre-sales` **público, sin auth ni rate-limit**, escribe con service-role | ALTO | Confirmado (código) | 100% |
| F5 | Cuotas: se usa el `installmentCount` del 1er ítem y el monto mostrado al cliente (por ítem) **difere** del generado en BD (sobre el total del carrito) | MEDIO | Confirmado (código) | 100% |
| F6 | **Sin control de stock** en la venta (ni validación ni descuento) | MEDIO | Confirmado (código) | 100% |
| F7 | `sale_items` **sin referencia al producto** (`legacy_product_id`/`product_id`/slug) → sin trazabilidad y el índice único queda inerte | MEDIO | Confirmado (código) | 100% |
| F8 | Se expone `error.message` **crudo al navegador** | MEDIO | Confirmado (código) | 100% |
| F9 | `findOrCreateCustomer` **recursivo** ante 23505 (riesgo latente de recursión infinita) | MEDIO | Confirmado (código) | 100% |
| F10 | Precio del carrito vía `parseInt(formato es-AR)` — frágil y redondea a entero | BAJO | Confirmado (código) | 100% |
| F11 | `window.open` tras `await` → popup puede ser bloqueado y `clearCart()` igual borra el carrito | BAJO | Probable | 85% |
| F12 | Cuotas con due-date `now + 30·n` días corridos, no mensuales/calendario | BAJO | Confirmado (código) | 100% |
| F13 | Sort por `customerName` en admin ordena solo la página en memoria | BAJO | Confirmado (código) | 95% |

**Veredicto:** el flujo es deliberadamente *best-effort* (falla silenciosa de persistencia y el cliente igual continúa por WhatsApp, `checkout/page.tsx:57-59`). Es una decisión de negocio razonable, pero convierte la BD en un **registro secundario y no confiable**: montos no validados, duplicados posibles y fallos parciales que dejan ventas sin ítems. El **riesgo ALTO** es real y vigente hoy (F1–F4).

---

## 1. Trazado del flujo real (call-graph verificado)

```
Carrito (localStorage 'cart')
  lib/cartContext.tsx
    ├─ components/Cart/CartSummary.tsx:89  (botón "Continuar compra", sin disabled/loading)
    └─ app/checkout/page.tsx:44 handleWhatsApp (async, sin lock)
          ├─ lib/services/preSaleClient.ts:18 persistPreSale → fetch POST /api/pre-sales
          │      (catch de red → {persisted:false}; NO lanza)
          ├─ app/checkout/page.tsx:57-59  si !persisted → alert, pero CONTINÚA
          ├─ app/checkout/page.tsx:80-83  mensaje WhatsApp usa cuotas del 1er ítem
          ├─ app/checkout/page.tsx:87     window.open(wa.me/...)  ← tras el await
          └─ app/checkout/page.tsx:89     clearCart()  ← aunque haya fallado el POST

POST /api/pre-sales  (app/api/pre-sales/route.ts)
  ├─ lib/supabase/server.ts:14 getSupabaseAdminClient()  ← service-role, sin auth de usuario
  ├─ validación mínima: route.ts:32  (fullName + items.length>0, SIN auth, SIN mantenimiento)
  ├─ lib/repositories/customerRepository.ts:15 findOrCreateCustomer
  │      (lookup phone → lookup email → insert → retry recursivo 23505)
  ├─ route.ts:43-47  total/itemCount/checkoutRequestId(randomUUID)/installmentCount(1er ítem ?? 8)
  ├─ lib/repositories/saleRepository.ts:363 createSale        → INSERT sales (+recovery 23505)
  ├─ route.ts:69-80  sale_items snapshot (nombre/precio/qty/imagen, SIN legacy/product id)
  │      └─ lib/repositories/saleRepository.ts:384 createSaleItems → INSERT sale_items
  ├─ route.ts:85-105 generación de cuotas → INSERT installments
  │      └─ SI FALLA: route.ts:108 delete sales (FK cascade limpia items/cuotas)
  └─ response { persisted, saleId, saleNumber }  /  catch → 500 con error.message
```

---

## 2. Descripción paso a paso

### 2.1 Origen de los datos (carrito)

- `lib/cartContext.tsx`: carrito en `localStorage['cart']`; el ítem guarda `{ id, name, price, quantity, imageUrl, installmentCount, installmentAmount }`.
- El `price` guardado proviene de `components/Product/ProductInfo.tsx:40`:
  `const priceNum = parseInt(price.replace(/[$.,]/g, ''));` donde `price` es una cadena ya formateada por `lib/adapters/catalogAdapter.ts:91` (`'$' + Math.round(value).toLocaleString('es-AR')`). El precio llega al carrito **como número entero redondeado** (F10).
- `installmentCount`/`installmentAmount` se calculan por producto en `catalogAdapter.ts:184-185`:
  `installmentCount ?? 8`, `installmentAmount ?? Math.round(priceNumber / installmentCount)` (F5).

### 2.2 Checkout (app/checkout/page.tsx:44-90)

- `handleWhatsApp` no verifica sesión, no bloquea doble clic y no hace `try/catch` (no lo necesita: `persistPreSale` nunca lanza).
- Tras el `await` (línea 55), si `!result.persisted` → `alert(...)` y **se continúa igual** con WhatsApp (diseño best-effort).
- El mensaje de WhatsApp (80-83) comunica "N cuotas de $X" usando `firstItem.installmentAmount` (por ítem del primer producto) — **no** el monto que se genera en BD (F5).
- Línea 87: `window.open` después del `await` (F11). Línea 89: `clearCart()` incondicional.

### 2.3 Persistencia (app/api/pre-sales/route.ts)

- `route.ts:25-28`: cliente **service-role** cacheado (`lib/supabase/server.ts:13-20`, `persistSession:false`). Sin verificación de sesión, rol ni mantenimiento (`middleware.ts` no existe; `lib/server/maintenance.ts` nunca se invoca aquí).
- `route.ts:32-34`: única validación — `fullName` no vacío e `items.length > 0`. No valida `fullName` por longitud, `price > 0`, `quantity` entero/rango, ni total.
- `route.ts:43-44`: `total` y `itemCount` **calculados desde el body del cliente** (F2).
- `route.ts:45`: `checkoutRequestId = crypto.randomUUID()` → nuevo por cada intento (F3).
- `route.ts:47`: `installmentCount = input.items[0]?.installmentCount ?? 8` (F5).
- `route.ts:49-65`: `SaleInsert` sin `sale_number` ni `source` ni `collection_status` → usan defaults de BD (`SALE-…`, `checkout_whatsapp`, `PENDING`).
- `route.ts:67` → `createSale` (`saleRepository.ts:363-382`): insert + `select.single()`; ante `23505` re-busca por `checkout_request_id` (`findSaleByCheckoutRequestId`, 346-361). Solo sirve si se reenvía el **mismo** request id (nunca ocurre, F3).
- `route.ts:69-78`: ítems con **solo snapshot** (nombre, precio, cantidad, imagen). No se setean `legacy_product_id`, `product_id`, `product_slug_snapshot`, `category_name_snapshot` (F7).
- `route.ts:80` → `createSaleItems` (`saleRepository.ts:384-393`). Si falla, **la venta ya quedó insertada y no hay compensación** (F1).
- `route.ts:82`: `installmentAmount = Math.round(total / installmentCount)` sobre el **total del carrito** (F5).
- `route.ts:85-101`: cuotas `status:'PENDING'`, due_date `now + 30·(i+1)` días (F12); última cuota absorbe el redondeo (`total - installmentAmount*(count-1)`), por lo que la suma de `original_amount` siempre cuadra con `total_amount`.
- `route.ts:103-105`: INSERT de cuotas. **Si falla**: `route.ts:108` borra la venta (el FK `sale_items.sale_id`/`installments.sale_id` ON DELETE CASCADE limpia lo insertado) y devuelve 500. El cliente no reintenta con el mismo request id → la venta "deseada" se pierde de BD aunque el cliente siguió por WhatsApp (F1).
- `route.ts:117-122`: catch global → 500 con `error.message` crudo (F8) y `console.error` sin request-id.

### 2.4 Deduplicación de clientes (customerRepository.ts)

- Normaliza (trim + email en minúsculas, 4-13); busca por `phone` (21-35), luego por `email` (37-51); si no existe, inserta (53-57).
- Ante `23505` **se vuelve a llamar recursivamente** (59-62). Hoy termina porque el lookup previo cubre las colisiones posibles de phone/email, pero es una recursión sin límite de profundidad (F9).

---

## 3. Hallazgos por severidad

### 3.1 ALTO

#### F1 — La creación de la venta NO es transaccional (ALTO)

- **Evidencia:** `route.ts:67` (`createSale`), `route.ts:80` (`createSaleItems`), `route.ts:103-105` (INSERT `installments`) son 3 operaciones independientes. La única compensación es para el caso "falló cuotas" (`route.ts:108`, `supabase.from('sales').delete()`); **no existe** para "falló `createSaleItems`".
- **Explicación:** si `createSaleItems` lanza (`saleRepository.ts:388-393`), la fila de `sales` persiste con `item_count > 0` (calculado en `route.ts:44`) pero **cero ítems** → venta corrupta, invisible para el detalle de admin (`getSaleById` devuelve la venta con `sale_items` vacío). Si el INSERT de cuotas falla, se borra la venta entera vía cascade → la intención de compra quedó en WhatsApp pero **no en la BD**; el cliente ya siguió por WhatsApp sin saberlo.
- **Impacto:** datos financieros incompletos (ventas sin ítems), pérdida silenciosa de registros y desincronización entre el chat de WhatsApp (fuente de verdad operativa) y la BD.
- **Solución (deuda T21):** un RPC transaccional (único `BEGIN…COMMIT`) que reemplace los 3 INSERT. `create_checkout_sale` ya existió para eso (bug C1, ver B.1 T18) — reactivar corregida o crear una nueva.

#### F2 — Montos calculados y confiados al cliente (ALTO)

- **Evidencia:** `route.ts:43` `total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0)`; `PreSaleItem` (`route.ts:7-13`) con `price`/`quantity` sin validar; `route.ts:32` solo valida `fullName` e `items.length`. Nunca se consulta `products.price`.
- **Explicación:** cualquier cliente puede `POST` con `price: 1` o `price: 0`. La BD frena negativos (`check (subtotal_amount >= 0)` en `202605260002_tables.sql:65-69`) y `quantity <= 0` (`check (quantity > 0)`, línea 99), pero **ceros y montos arbitrarios pasan**.
- **Impacto:** `total_amount`, `remaining_amount` y las cuotas alimentan directamente la cobranza (`remaining_amount > 0` en `saleRepository.ts:599-610`, dashboards). Ventas con montos falsos contaminan reportes financieros y de cobranza.
- **Solución (deuda T23):** validar server-side contra el catálogo (`products.price` por `legacy_product_id`/slug) o al menos sanity checks (`price > 0`, `quantity` entero en `1..N`).

#### F3 — Sin idempotencia real → ventas duplicadas (ALTO)

- **Evidencia:** `route.ts:45` `checkoutRequestId = crypto.randomUUID()` por request; `preSaleClient.ts:18-34` sin retry ni request id reutilizado; `CartSummary.tsx:89` botón sin `disabled`/loading; `checkout/page.tsx:55` `await persistPreSale` sin lock ni flag de "enviando".
- **Explicación:** el recovery 23505 de `createSale` (`saleRepository.ts:374-377`) solo cubre el reenvío del **mismo** `checkout_request_id`, lo que el cliente nunca hace. Doble clic en "Continuar compra" → 2 POST concurrentes con 2 request ids → **2 ventas PENDING** para el mismo carrito. Igual si la red se cae tras el insert exitoso (el cliente no recibe `{persisted:true}`) y el usuario reintenta.
- **Impacto:** duplicados reales en `sales`/`installments`; el vendedor ve el mismo pedido 2 veces en cobranza.
- **Solución (deuda T22 + T24):** generar `checkoutRequestId` en el **cliente** antes del POST y reutilizarlo en reintentos (el recovery 23505 ya resuelve el resto); deshabilitar el botón durante el envío.

#### F4 — Endpoint público sin auth ni rate-limit (ALTO)

- **Evidencia:** `route.ts:23` `POST` sin verificación de sesión/rol; no existe `middleware.ts` (glob: 0 resultados); todo pasa por service-role (`server.ts:14`) que **bypasea RLS** (RLS sí está activo en `sales`/`sale_items`/`installments`, `202605260004_rls.sql:6-9`, pero el service-role lo ignora). `lib/server/maintenance.ts` no se usa aquí.
- **Explicación:** cualquiera que conozca la URL puede crear clientes, ventas y cuotas ilimitadas (spam/abuso de almacenamiento y contaminación de datos financieros). El `fullName` no tiene límite de longitud (sin validación de tamaño).
- **Impacto:** riesgo de abuso actual y, peor, **patrón de diseño**: toda operación administrativa queda a un POST de distancia porque el único camino usa service-role sin frontera de seguridad en la capa de aplicación.
- **Solución (deuda T25):** rate-limit por IP (o por cliente autenticado/anon-key), límite de ítems/payload y decidir si una pre-venta pública debe poder escribirse sin validación humana.

### 3.2 MEDIO

#### F5 — Cuotas: fuente de verdad inconsistente entre UI, WhatsApp y BD (MEDIO)

- **Evidencia:** cliente calcula cuotas **por producto**: `catalogAdapter.ts:184-185` `installmentAmount = Math.round(priceNumber / installmentCount)`; el WhatsApp y el resumen muestran `firstItem.installmentAmount` (`checkout/page.tsx:80-83`, `CartSummary.tsx:64-72`). Servidor genera cuotas **sobre el total del carrito**: `route.ts:82` `installmentAmount = Math.round(total / installmentCount)`. Y `route.ts:47` usa el `installmentCount` del **primer ítem**, ignorando los demás.
- **Explicación:** con un solo producto los montos coinciden (misma fórmula); con varios, el cliente lee "N cuotas de $X" (basado en el 1er producto) mientras la BD genera cuotas sobre el total completo → las cuotas reales son mayores a las comunicadas. Además, ítems con planes distintos se resuelven con el primero.
- **Impacto:** inconsistencia comercial/legal en lo que se comunica al cliente vs. lo que se registra; confusión en cobranza.
- **Solución (deuda T29):** definir una única fuente de verdad (el carrito completo) y usarla idénticamente en UI, WhatsApp y BD.

#### F6 — Sin control de stock (MEDIO)

- **Evidencia:** `products.stock` existe (`202605260002_tables.sql:23`) y se mantiene vía admin, pero `route.ts` no lo consulta ni lo descuenta; `ProductInfo.tsx`/`ProductDetailClient.tsx` no validan stock al agregar al carrito.
- **Impacto:** se pre-ordenan productos sin stock; el vendedor no tiene señal automática. Moderado porque la venta se confirma por WhatsApp (confirmación humana), pero la señal de stock es nula.
- **Solución (deuda T28):** decidir política (validar en ruta y/o descontar al confirmar la venta).

#### F7 — `sale_items` sin referencia al producto (MEDIO)

- **Evidencia:** `route.ts:69-78` mapea solo `name/price/quantity/imageUrl`; el DDL permite `product_id`, `legacy_product_id`, `product_slug_snapshot`, `category_name_snapshot` (`202605260002_tables.sql:93-97`) que quedan NULL. El índice único `idx_sale_items_sale_legacy_unique` (`202605260003_indexes.sql:45`, `where legacy_product_id is not null`) **nunca aplica** en este flujo.
- **Impacto:** imposible rastrear el ítem vendido al catálogo (reportes de ventas por producto, reposición, control de precios); la guarda anti-duplicados de ítems queda inerte.
- **Solución (deuda T26):** enviar `legacy_product_id` (el `id` del CartItem es el legacy) desde el front y poblar slug/categoría server-side.

#### F8 — Se expone `error.message` crudo al navegador (MEDIO)

- **Evidencia:** `route.ts:119-122` `{ persisted:false, error: error instanceof Error ? error.message : 'Unknown error' }`. La respuesta viaja a `preSaleClient.ts:39` y al `alert()` de `checkout/page.tsx:58`.
- **Impacto:** filtración de detalle interno (mensajes de Postgres/Supabase, nombres de objetos) a un cliente no autenticado.
- **Solución (deuda T27):** errores genéricos al cliente + log server-side con request-id.

#### F9 — Recursión ilimitada en `findOrCreateCustomer` ante 23505 (MEDIO)

- **Evidencia:** `customerRepository.ts:59-62` — en `23505` se llama a sí misma sin límite de profundidad.
- **Explicación:** hoy es segura (el lookup previo por phone/email cubre las colisiones posibles y el `insert` de `findOrCreateCustomer` nunca inserta `dni`). Pero si mañana el insert incluye `dni` (que sí es UNIQUE, `202605260002_tables.sql:38`) o cualquier otra colisión no cubierta por el lookup → **recursión infinita / stack overflow**.
- **Solución (deuda T30):** upsert con `onConflict` en un solo paso o límite de reintentos.

### 3.3 BAJO

#### F10 — Precio del carrito vía `parseInt` sobre cadena formateada (BAJO)

- **Evidencia:** `ProductInfo.tsx:40,62` `parseInt(price.replace(/[$.,]/g,''))` donde `price = formatPrice(priceNumber)` (`catalogAdapter.ts:91`: `'$' + Math.round(value).toLocaleString('es-AR')`).
- **Explicación:** con el formato actual (enteros, separador de miles con `.`) el round-trip es correcto ("$1.299.999" → 1299999). Pero **redondea a entero** y depende de que el formato nunca cambie; con decimales o separador decimal (ej. "1.299,99") el parseo es incorrecto y el precio del carrito se corrompe **silenciosamente** (F2 agrava: ese precio ya es el que confía el servidor).
- **Solución (deuda T31):** transportar el precio como número y formatear solo en render.

#### F11 — `window.open` tras `await` + `clearCart()` incondicional (BAJO)

- **Evidencia:** `checkout/page.tsx:87` (`window.open`) ocurre después de `await persistPreSale` (55) — el gesto de usuario se pierde y algunos navegadores bloquean el popup; además `clearCart()` (89) se ejecuta **siempre**, incluso si el POST falló.
- **Impacto:** el cliente puede quedarse sin WhatsApp **y sin carrito** (pierde la lista de productos) mientras la venta pudo registrarse o no.
- **Solución (deuda T32):** abrir WhatsApp antes del await (fire-and-forget del registro) o fallback con `<a href>`/link cuando el popup falla; borrar el carrito solo si `persisted` (o ofrecer "reintentar").

#### F12 — Cuotas con due-date de "30 días corridos" (BAJO)

- **Evidencia:** `route.ts:86-87` `dueDate.setDate(dueDate.getDate() + 30 * (i + 1))` desde `now` (la fecha de creación), no desde el envío/confirmación y no mensual/calendario. La RPC muerta ya soportaba `p_first_due_date` (ver B.1 §5).
- **Impacto:** vencimientos desplazados respecto a lo que el cliente espera de un plan "mensual" (meses de 31 días, fines de semana); aceptable para pre-venta, a informar.
- **Nota:** la matemática de montos es correcta (última cuota absorbe el redondeo, `route.ts:89-90`) y respeta el CHECK `paid_amount + remaining_amount = original_amount` (`202605260002_tables.sql:119`).

#### F13 — Sort por `customerName` en memoria sobre la página (BAJO)

- **Evidencia:** `saleRepository.ts:529-534` ordena en JS el arreglo ya paginado (`range(from,to)` en 517-519) cuando `sortKey === 'customerName'`. Equivale a C7 de la Etapa B (mismo patrón).
- **Impacto:** con volumen, la página no queda realmente ordenada por cliente. No afecta la creación de ventas.

---

## 4. Qué está bien (no "arreglar")

- **FK con `ON DELETE CASCADE`** en `sale_items` y `installments` (`202605260002_tables.sql:92,109`): la compensación de `route.ts:108` deja la BD limpia sin huérfanos.
- **FK `ON DELETE RESTRICT`** en `customers`/`payments` (`202605260002_tables.sql:63,125-126`): no se pierde historial de clientes ni pagos.
- **CHECKs de integridad en BD** (montos `>= 0`, `quantity > 0`, `paid + remaining = original`) que frenan montos negativos aunque el cliente los envíe (F2).
- **UNIQUEs** en `sales.sale_number`, `sales.checkout_request_id`, `installments(sale_id, installment_number)` (`202605260002_tables.sql:61-62,118`).
- **RLS default-deny** en las 4 tablas transaccionales sin policies (`202605260004_rls.sql:6-9`): el acceso anónimo directo a la API pública de Supabase está cerrado; solo service-role entra (el riesgo F4 es de la capa de aplicación, no de RLS).
- **`findOrCreateCustomer`** normaliza (trim + email lower) y deduplica por phone→email (`customerRepository.ts:4-13,21-51`).
- **Recovery 23505 en `createSale`** (`saleRepository.ts:374-377`): base correcta de idempotencia; solo falta reutilizar el request id del cliente (T22).
- **`preSaleClient` captura errores de red sin lanzar** (`preSaleClient.ts:36-46`): el negocio nunca pierde la venta en el chat de WhatsApp (best-effort coherente).
- **Escapado de `%` y `,`** en la búsqueda admin ILIKE (`saleRepository.ts:511`).
- **`source` default `checkout_whatsapp`** (`202605260002_tables.sql:75`): permite distinguir origen de venta sin código extra.
- **Índices de apoyo** para el detalle de venta (`idx_sale_items_sale_id`, `idx_installments_sale_id`, GIN trgm en `sale_number`/`delivery_*`, `202605260003_indexes.sql:36-38,40,47`).

---

## 5. Hipótesis descartadas

- **H1:** "El checkout web usa el RPC `create_checkout_sale`" → **falso** (ya descartado en B.1; confirmado: `app/api/sales/route.ts`, `checkoutSaleClient.ts`, `checkoutSaleService.ts` no tienen llamadores).
- **H2:** "`/api/pre-sales` valida precios contra el catálogo" → **falso**: no consulta `products` (F2).
- **H3:** "Hay transacción o rollback automático si falla `createSaleItems`" → **falso**: sin transacción y sin compensación para ese caso (F1).
- **H4:** "El recovery 23505 impide duplicados de checkout" → **falso**: solo cubre reenvíos del mismo `checkout_request_id`, que el cliente no reutiliza (F3).
- **H5:** "Las cuotas mostradas al cliente coinciden con las generadas en BD en multi-ítem" → **falso**: per-item vs. total del carrito (F5).
- **H6:** "La recursión de `findOrCreateCustomer` es un bug activo" → **parcialmente falso**: hoy termina; es un riesgo latente (F9).

---

## 6. Código muerto relacionado con el flujo (cruzado con Etapa B.1 §5)

| Código | Estado | Detalle |
|--------|--------|---------|
| `app/api/sales/route.ts` | Muerto | Cadena RPC abandonada (B.1 T18) |
| `lib/services/checkoutSaleClient.ts` | Muerto | Idem |
| `lib/services/checkoutSaleService.ts` | Muerto | Idem |
| `lib/repositories/saleRepository.ts:321-342` `createCheckoutSaleTransaction` | Muerto | Idem |
| Tipos `CheckoutSale*` | Muerto | Idem |
| RPC `create_checkout_sale` (prod) | Muerto en runtime | Solo lo invoca `tests/db/checkout-real.test.mjs` y `tests/helpers/seedFinancialFixtures.mjs` (B.1 T18/T20); conserva el bug de tipos C1 |
| `findSaleByCheckoutRequestId` (`saleRepository.ts:346-361`) | Vivo (parcial) | Solo lo usa el recovery 23505 de `createSale` — clave para T22 |

**Pendiente de decisión (B.1 T18):** reactivar `create_checkout_sale` corrigiendo su bug de tipos (lo que además resolvería F1 con atomicidad real) **o** eliminarla. Este informe recomienda **reactivar/corregir** como solución natural de T21.

---

## 7. Deuda técnica (continuación de T18–T20)

- **T21** — Hacer la creación de venta transaccional (RPC `create_checkout_sale` corregido o equivalente) → resuelve F1.
- **T22** — Idempotencia end-to-end: `checkout_request_id` generado y reutilizado en el cliente + recovery 23505 → resuelve F3.
- **T23** — Validación server-side de precios contra `products.price` + sanity de cantidad → resuelve F2.
- **T24** — Botón "Continuar compra" con estado loading/disabled + lock en `handleWhatsApp` → mitiga F3.
- **T25** — Rate-limit/control de acceso en `/api/pre-sales` → resuelve F4.
- **T26** — Persistir `legacy_product_id`/`product_id`/slug/categoría en `sale_items` → resuelve F7.
- **T27** — Errores genéricos al cliente + log con request-id → resuelve F8.
- **T28** — Política de stock (validar en ruta / descontar al confirmar) → resuelve F6.
- **T29** — Fuente de verdad única para cuotas (carrito completo) en UI, WhatsApp y BD → resuelve F5.
- **T30** — `findOrCreateCustomer` con `onConflict`/límite de reintentos (sin recursión) → resuelve F9.
- **T31** — Transportar precio como número (eliminar `parseInt` de formatos) → resuelve F10.
- **T32** — Apertura de WhatsApp antes del await / fallback de link; `clearCart()` solo si persistió → resuelve F11.

---

## 8. Roadmap priorizado

| Prioridad | Alcance | Tarea | Motivo |
|-----------|---------|-------|--------|
| Inmediata | UI | T24 + T22 | Elimina el duplicado más probable (doble clic) |
| Inmediata | API | T23 | Integridad de montos (F2) — sin esto, los datos financieros no son confiables |
| Corto plazo | API/BD | T21 (RPC transaccional) | Cierra F1 y de paso define el destino de T18 |
| Corto plazo | API | T27 | No filtrar internals |
| Corto plazo | API/UI | T26 | Trazabilidad de ítems vendidos |
| Medio plazo | API/Infra | T25, T28, T29, T30, T31, T32 | Endurecimiento y consistencia |

---

## 9. Notas de calidad por área (1-10)

| Área | Nota | Justificación |
|------|------|---------------|
| Arquitectura | 6 | Separación repo/service/route limpia; pero el camino vivo repite en 3 INSERTs lo que la RPC abandonada hacía en 1 transacción, y toda la seguridad descansa en el secreto service-role (F4). |
| Seguridad | 4 | RLS correcta; penalizada por F4 (endpoint público con service-role), F8 (fuga de errores) y F2 (trust al cliente). |
| Integridad de datos | 4 | UNIQUEs y CHECKs de BD muy buenos; pero F1 (ventas sin ítems / borradas), F2 (montos falsos) y F3 (duplicados) comprometen los registros financieros. |
| Rendimiento | 8 | 4-6 queries por pedido a volumen de tienda es irrelevante; índices correctos. |
| Backend (Next.js) | 6 | Manejo de errores y best-effort bien pensados (preSaleClient no lanza); falta idempotencia/validación/stock. |
| Frontend | 7 | Checkout claro; F10 (parseInt), F11 (popup+clearCart) y F5 (cuotas inconsistentes) son los puntos flojos. |
| Base de datos | 8 | Esquema y constraints sólidos; el problema es que el código de aplicación no los aprovecha (no transacción, no validación). |
| Mantenibilidad | 5 | Dualidad vivo/muerto (pre-sales vs. RPC) ya documentada en B.1; este flujo es simple y fácil de auditar. |

---

## 10. Referencias cruzadas con Etapa B.1

- **R6 (B.1 §Resumen):** este informe es la profundización de R6 (endpoint sin auth, sin validación, sin idempotencia) → aquí materializado como **F1–F4**.
- **T18/T19/T20 (B.1):** destino del RPC y la cadena muerta → aquí **T21** (reactivar corregido) y §6.
- **C1 (B.1 §2-R1):** bug de tipos del RPC → se recomienda corregirlo como parte de T21.
- **C7 (B.1):** sort en memoria → aquí re-confirmado como **F13** (`saleRepository.ts:529-534`).
- **B.1 §12 "Qué NO tocar":** se mantiene el recovery 23505 en `createSale`, la normalización de inputs y los CHECKs de cuotas → aquí §4.

---

## 11. Anexo — Checklist de verificación (archivos y líneas usadas)

| Archivo | Líneas clave |
|---------|--------------|
| `app/checkout/page.tsx` | 44-90 (handleWhatsApp/WhatsApp/clearCart), 57-59 (best-effort) |
| `components/Cart/CartSummary.tsx` | 64-72 (cuotas), 89 (botón sin lock) |
| `components/Product/ProductInfo.tsx` | 40, 62 (parseInt precio) |
| `lib/adapters/catalogAdapter.ts` | 91 (formatPrice), 184-185 (cuotas por ítem) |
| `lib/services/preSaleClient.ts` | 18-34 (fetch), 36-46 (errores) |
| `app/api/pre-sales/route.ts` | 23-34 (POST/validación), 43-47 (total/requestId/cuotas), 49-80 (sale+items), 82-110 (cuotas/compensación), 117-122 (catch) |
| `lib/repositories/saleRepository.ts` | 321-342 (muerto), 346-361 (findByCheckoutRequestId), 363-382 (createSale+23505), 384-393 (createSaleItems), 511 (escapado), 529-534 (sort en memoria) |
| `lib/repositories/customerRepository.ts` | 4-13 (normalización), 21-51 (lookup), 53-62 (insert/recursión) |
| `lib/supabase/server.ts` | 6-23 (service-role cacheado) |
| `supabase/migrations/202605260002_tables.sql` | 35-48 (customers), 59-88 (sales), 90-105 (sale_items), 107-120 (installments), 122-134 (payments) |
| `supabase/migrations/202605260003_indexes.sql` | 20-21, 45, 58 (UNIQUE parciales) |
| `supabase/migrations/202605260004_rls.sql` | 6-9 (RLS transaccionales sin policies) |
| `supabase/migrations/202605260005_rpcs.sql` | 284-569 (`create_checkout_sale`, bug C1) |

---

*Informe generado en modo read-only. Ningún cambio fue aplicado al código ni a la base de datos. Verificación de archivos completa el 2026-08-05. Las verificaciones contra la DB real (duplicados reales, ventas sin ítems, montos anómalos) quedan pendientes y se recomiendan como siguiente paso de validación.*
