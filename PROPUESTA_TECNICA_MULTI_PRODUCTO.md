# Propuesta Técnica: Soporte Multi-Producto en Cuentas de Crédito

## Análisis del Backend y Base de Datos

### 1. Estado Actual del Schema

**Tabla `credit_accounts` (2026-06-01):**
```sql
CREATE TABLE credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_name TEXT NOT NULL,        -- ← LIMITACIÓN: solo un producto
  quantity INTEGER NOT NULL DEFAULT 1,
  installment_count INTEGER NOT NULL DEFAULT 8,
  installment_amount NUMERIC(12, 2) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Problema:** `product_name` es un campo `TEXT` escalar. No existe tabla intermedia para múltiples productos.

**Tablas existentes relacionadas:**
- `credit_payments` → ingresos
- `credit_installments` → cuotas
- `credit_payment_allocations` → asignación FIFO
- `credit_collection_notes` → gestiones
- `customers` → clientes

**No existe:** `credit_account_items` u otra tabla intermedia que vincule una cuenta con múltiples productos.

---

### 2. Propuesta de Schema: Tabla `credit_account_items`

#### 2.1 SQL de Creación

```sql
-- =============================================================================
-- MIGRACIÓN: Tabla intermedia para productos de una cuenta de crédito
-- =============================================================================

CREATE TABLE IF NOT EXISTS credit_account_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para lookups rápidos por cuenta
CREATE INDEX IF NOT EXISTS idx_credit_account_items_account_id 
ON credit_account_items(credit_account_id);

-- Índice para búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_credit_account_items_product_name 
ON credit_account_items(product_name);

-- RLS
ALTER TABLE credit_account_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read credit account items"
  ON credit_account_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'STAFF')
      AND is_active = true
  ));

-- Revoke public access
REVOKE ALL ON credit_account_items FROM anon, authenticated;
```

#### 2.2 Decisiones de Diseño

| Decisión | Justificación |
|----------|---------------|
| `product_name` como `TEXT` | Flexibilidad para nombres de productos libres (no necesita FK a catálogo). |
| `quantity` con `CHECK > 0` | Previene cantidades inválidas. Igual que `credit_accounts.quantity`. |
| `unit_price` opcional | Para futuro cálculo de total real. Hoy no es obligatorio porque el total se calcula por `installment_amount * installment_count`. |
| `ON DELETE CASCADE` | Si se borra la cuenta, se borran los items. Coherente con `credit_installments`. |
| Sin `updated_at` | Los items son inmutables una vez creados. No necesitan tracking de modificación. |
| No tocar `credit_accounts` | `product_name` y `quantity` se mantienen para backward compatibility con datos legacy. Las nuevas cuentas con múltiples productos usarán la tabla intermedia. |

---

### 3. Backward Compatibility Strategy

**Opción A (Recomendada):** Mantener `product_name`/`quantity` en `credit_accounts` como campos legacy. Cuando se crea una cuenta con `items`, `product_name` se guarda como concatenación de los productos ("Juego de Sabanas + Acolchado + Almohadas") para que las vistas antiguas sigan funcionando.

**Opción B:** Hacer `product_name` nullable y migrar datos legacy a `credit_account_items` (más complejo, riesgoso).

**Veredicto:** Implementar **Opción A**. El frontend nuevo leerá `items`, el frontend legacy leerá `product_name`. Zero breaking changes.

---

### 4. Cambios en Tipos (`lib/types.ts`)

```typescript
// Nuevo tipo para items
export interface CreditAccountItem {
  id: string;
  creditAccountId: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  createdAt: string;
}

// Modificación en CreateCreditAccountInput
export interface CreateCreditAccountInput {
  customerId: string;
  operationNumber?: string;
  productName?: string;        // ← Opcional ahora
  quantity?: number;           // ← Opcional ahora
  items?: Array<{              // ← NUEVO
    productName: string;
    quantity: number;
    unitPrice?: number;
  }>;
  installmentCount?: number;
  installmentAmount: number;
  saleDate?: string;
  notes?: string;
}

// Modificación en CreditAccountSummary
export interface CreditAccountSummary extends CreditAccount {
  total: number;
  paid: number;
  remaining: number;
  overpayment: number;
  paymentCount: number;
  customerName?: string;
  items?: CreditAccountItem[];  // ← NUEVO
}

// Modificación en CreditAccountDetail
export interface CreditAccountDetail extends CreditAccountSummary {
  customer: { ... };
  installments: CreditInstallment[];
  payments: CreditPayment[];
  collectionNotes: CreditCollectionNote[];
  items: CreditAccountItem[];  // ← NUEVO (obligatorio en detalle)
}
```

---

### 5. Cambios en Repositorio (`lib/repositories/creditAccountRepository.ts`)

#### 5.1 Nuevas Interfaces
```typescript
export interface DbCreditAccountItem {
  id: string;
  credit_account_id: string;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  created_at: string;
}
```

#### 5.2 Nuevas Funciones

```typescript
// Insertar items en lote
export async function insertCreditAccountItems(
  supabase: SupabaseClient,
  accountId: string,
  items: Array<{ product_name: string; quantity: number; unit_price?: number | null }>
): Promise<void> {
  const { error } = await supabase
    .from('credit_account_items')
    .insert(
      items.map((item) => ({
        credit_account_id: accountId,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price ?? null,
      }))
    );

  if (error) throw error;
}

// Obtener items de una cuenta
export async function getCreditAccountItems(
  supabase: SupabaseClient,
  accountId: string
): Promise<DbCreditAccountItem[]> {
  const { data, error } = await supabase
    .from('credit_account_items')
    .select('*')
    .eq('credit_account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Obtener items de múltiples cuentas (para listado)
export async function getCreditAccountItemsForAccounts(
  supabase: SupabaseClient,
  accountIds: string[]
): Promise<DbCreditAccountItem[]> {
  const { data, error } = await supabase
    .from('credit_account_items')
    .select('*')
    .in('credit_account_id', accountIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
```

#### 5.3 Modificación en `getCreditAccountById`

```typescript
export async function getCreditAccountById(...) {
  // ... existing code ...
  
  const { data: items, error: itemsError } = await supabase
    .from('credit_account_items')
    .select('*')
    .eq('credit_account_id', accountId);

  if (itemsError) throw itemsError;

  return { account, installments, payments, collectionNotes, items: items ?? [] };
}
```

#### 5.4 Modificación en `getCreditAccounts`

```typescript
export async function getCreditAccounts(...) {
  // ... existing code for accounts, installments, payments ...
  
  const accountIds = (accounts ?? []).map((a) => a.id);
  
  const { data: allItems, error: itemsError } = await supabase
    .from('credit_account_items')
    .select('*')
    .in('credit_account_id', accountIds);

  if (itemsError) throw itemsError;

  return { accounts, installments, payments, items: allItems ?? [] };
}
```

---

### 6. Cambios en Servicio (`lib/services/creditAccountService.ts`)

#### 6.1 Modificación en `createCreditAccount`

```typescript
export async function createCreditAccount(
  input: CreateCreditAccountInput
): Promise<CreditAccountSummary> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  // Validar: si hay items, debe haber al menos uno
  if (input.items && input.items.length > 0) {
    // Concatenar product_name para backward compatibility
    const concatenatedName = input.items
      .map((item) => `${item.productName} (x${item.quantity})`)
      .join(' + ');
    
    const totalQuantity = input.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

    const account = await insertCreditAccount(supabase, {
      customer_id: input.customerId,
      operation_number: input.operationNumber ?? null,
      product_name: concatenatedName,
      quantity: totalQuantity,
      installment_count: input.installmentCount ?? 8,
      installment_amount: input.installmentAmount,
      sale_date: input.saleDate ?? new Date().toISOString(),
      notes: input.notes ?? null,
    });

    // Insertar items en lote
    await insertCreditAccountItems(
      supabase,
      account.id,
      input.items.map((item) => ({
        product_name: item.productName,
        quantity: item.quantity ?? 1,
        unit_price: item.unitPrice ?? null,
      }))
    );

    // Generar cuotas (igual que antes)
    const installmentCount = input.installmentCount ?? 8;
    const total = Number(account.installment_amount) * account.installment_count;
    const installmentAmount = total / installmentCount;
    await generateInstallmentsForAccount(
      supabase,
      account.id,
      installmentCount,
      installmentAmount,
      input.saleDate ?? new Date().toISOString()
    );

    // Recuperar items para devolver en el summary
    const items = await getCreditAccountItems(supabase, account.id);

    return {
      ...calculateSummary(account, []),
      items: items.map((item) => ({
        id: item.id,
        creditAccountId: item.credit_account_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        createdAt: item.created_at,
      })),
    };
  } else {
    // Fallback: comportamiento legacy (single product)
    const account = await insertCreditAccount(supabase, {
      customer_id: input.customerId,
      operation_number: input.operationNumber ?? null,
      product_name: input.productName ?? 'Artículo no especificado',
      quantity: input.quantity ?? 1,
      installment_count: input.installmentCount ?? 8,
      installment_amount: input.installmentAmount,
      sale_date: input.saleDate ?? new Date().toISOString(),
      notes: input.notes ?? null,
    });

    const installmentCount = input.installmentCount ?? 8;
    const total = Number(account.installment_amount) * account.installment_count;
    const installmentAmount = total / installmentCount;
    await generateInstallmentsForAccount(
      supabase,
      account.id,
      installmentCount,
      installmentAmount,
      input.saleDate ?? new Date().toISOString()
    );

    return {
      ...calculateSummary(account, []),
      items: [],
    };
  }
}
```

#### 6.2 Modificación en `getCreditAccountDetail`

```typescript
export async function getCreditAccountDetail(accountId: string): Promise<CreditAccountDetail> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error('Supabase no está configurado');

  const { account, installments, payments, collectionNotes, items } = await getCreditAccountById(supabase, accountId);
  const customer = await getCustomerForCredit(supabase, account.customer_id);

  const summary = calculateSummary(
    account,
    installments.map((inst) => ({
      original_amount: inst.original_amount,
      paid_amount: inst.paid_amount,
      status: inst.status,
    }))
  );

  return {
    ...summary,
    customer: { ... },
    installments: installments.map(mapInstallment),
    payments: payments.map(mapPayment),
    collectionNotes: collectionNotes.map(mapCollectionNote),
    items: items.map((item) => ({
      id: item.id,
      creditAccountId: item.credit_account_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      createdAt: item.created_at,
    })),
  };
}
```

#### 6.3 Modificación en `listCreditAccountSummaries`

```typescript
export async function listCreditAccountSummaries(...): Promise<CreditAccountSummary[]> {
  const { accounts, installments, payments, items } = await getCreditAccounts(supabase);
  
  // Agrupar items por cuenta
  const itemsByAccount = new Map<string, CreditAccountItem[]>();
  for (const item of items) {
    const list = itemsByAccount.get(item.credit_account_id) ?? [];
    list.push(item);
    itemsByAccount.set(item.credit_account_id, list);
  }

  let summaries = accounts.map((account) => {
    const summary = calculateSummary(account, installmentsByAccount.get(account.id) ?? []);
    return {
      ...summary,
      items: itemsByAccount.get(account.id)?.map((item) => ({
        id: item.id,
        creditAccountId: item.credit_account_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        createdAt: item.created_at,
      })) ?? [],
    };
  });

  // ... resto del filtrado y mapeo ...
}
```

---

### 7. Cambios en API (`app/api/admin/credit-accounts/route.ts`)

```typescript
export async function POST(request: Request) {
  const context = createRequestContext(request);
  try {
    const authorizationError = await requireStrictAdminUser();
    if (authorizationError) return authorizationError;

    const body = (await request.json()) as {
      customerId?: string;
      operationNumber?: string;
      productName?: string;
      quantity?: number;
      items?: Array<{ productName: string; quantity: number; unitPrice?: number }>;
      installmentCount?: number;
      installmentAmount?: number;
      saleDate?: string;
      notes?: string;
    };

    if (!body.customerId || typeof body.customerId !== 'string') {
      return errorResponse(new Error('customerId es requerido'), context.requestId, 400);
    }

    // Validar: debe tener items o productName (backward compatibility)
    const hasItems = body.items && Array.isArray(body.items) && body.items.length > 0;
    const hasProductName = body.productName && typeof body.productName === 'string';
    
    if (!hasItems && !hasProductName) {
      return errorResponse(new Error('Debe proporcionar al menos un producto (items o productName)'), context.requestId, 400);
    }

    if (typeof body.installmentAmount !== 'number' || body.installmentAmount <= 0) {
      return errorResponse(new Error('installmentAmount debe ser un número positivo'), context.requestId, 400);
    }

    const account = await createCreditAccount({
      customerId: body.customerId,
      operationNumber: body.operationNumber,
      productName: body.productName,
      quantity: body.quantity,
      items: body.items,
      installmentCount: body.installmentCount,
      installmentAmount: body.installmentAmount,
      saleDate: body.saleDate,
      notes: body.notes,
    });

    return NextResponse.json(
      { success: true, account },
      { headers: { 'x-request-id': context.requestId } }
    );
  } catch (error) {
    logServerError({ area: 'admin.creditAccounts', action: 'create', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  }
}
```

---

### 8. Modificaciones en RPCs SQL (Opcional, para Reportes)

Si `get_credit_collection_route` y otros RPCs usan `ca.product_name`, podemos:
1. Mantenerlo como está (ya que `product_name` se guarda como concatenación).
2. O crear una vista que joinée con `credit_account_items`.

**Veredicto:** Fase 1 no toca RPCs. El `product_name` concatenado es suficiente para reportes. En Fase 2 se puede optimizar.

---

### 9. Plan de Ejecución (Orden Recomendado)

| Paso | Archivo | Acción |
|------|---------|--------|
| 1 | SQL Migration | Crear `credit_account_items` + índices + RLS |
| 2 | `lib/types.ts` | Agregar `CreditAccountItem`, modificar `CreateCreditAccountInput`, `CreditAccountSummary`, `CreditAccountDetail` |
| 3 | `lib/repositories/creditAccountRepository.ts` | Agregar `DbCreditAccountItem`, `insertCreditAccountItems`, `getCreditAccountItems`, `getCreditAccountItemsForAccounts`, modificar `getCreditAccountById`, `getCreditAccounts` |
| 4 | `lib/services/creditAccountService.ts` | Modificar `createCreditAccount`, `getCreditAccountDetail`, `listCreditAccountSummaries` |
| 5 | `app/api/admin/credit-accounts/route.ts` | Aceptar `items` en el payload del POST |
| 6 | `app/api/admin/credit-accounts/[id]/route.ts` | Asegurar que el detalle incluya `items` |
| 7 | `app/admin/ventas/nueva/page.tsx` | UI con array de productos |
| 8 | `components/Admin/Credit/CreditAccountDetailView.tsx` | Mostrar lista de productos en el detalle |
| 9 | Tests | Validar que legacy (sin items) y nuevo (con items) funcionan |

---

### 10. Diseño de UI (`app/admin/ventas/nueva/page.tsx`)

#### Estado del Formulario
```typescript
interface FormItem {
  productName: string;
  quantity: number;
  unitPrice?: number;
}

interface FormData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: FormItem[];        // ← Array de productos
  saleDate: string;
  notes: string;
  installmentAmount: number;
  installmentCount: number;
  operationNumber: string;
}

const [form, setForm] = useState<FormData>({
  items: [{ productName: '', quantity: 1 }],  // ← Al menos 1 item
  // ... resto
});
```

#### Render de Items
```tsx
{form.items.map((item, index) => (
  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
    <div style={{ flex: 1 }}>
      <label>Producto {index + 1}</label>
      <input
        value={item.productName}
        onChange={(e) => updateItem(index, 'productName', e.target.value)}
        placeholder="Ej: Juego de Sabanas"
        style={inputStyle}
      />
    </div>
    <div style={{ width: '100px' }}>
      <label>Cantidad</label>
      <input
        type="number"
        value={item.quantity}
        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
        style={inputStyle}
      />
    </div>
    {form.items.length > 1 && (
      <button
        type="button"
        onClick={() => removeItem(index)}
        style={deleteButtonStyle}
      >
        ✕
      </button>
    )}
  </div>
))}

<button
  type="button"
  onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { productName: '', quantity: 1 }] }))}
  style={addButtonStyle}
>
  + Agregar otro producto
</button>
```

#### Submit
```typescript
const response = await fetch('/api/admin/credit-accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId,
    operationNumber: form.operationNumber,
    items: form.items.filter((item) => item.productName.trim()),  // Solo enviar los que tienen nombre
    installmentCount: form.installmentCount,
    installmentAmount: form.installmentAmount,
    saleDate: form.saleDate,
    notes: form.notes,
  }),
});
```

---

## Veredicto

**La estructura propuesta es:**
1. ✅ **Tabla nueva:** `credit_account_items` con FK, índices, RLS.
2. ✅ **Backward compatibility:** `product_name` en `credit_accounts` se mantiene y se concatena.
3. ✅ **Servicio modificado:** `createCreditAccount` acepta `items` y hace bulk insert.
4. ✅ **API extendida:** `POST /api/admin/credit-accounts` acepta `items` array.
5. ✅ **UI dinámica:** Array de productos con botón "+ Agregar otro producto".

**¿Procedo a implementar los archivos?** Confirmar para generar:
- SQL Migration
- Tipos modificados
- Repositorio modificado
- Servicio modificado
- API modificado
- UI modificada
