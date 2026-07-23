# Módulo de Lectura Automática de Facturas

> **Versión 1.0 — ESTABLE PARA PRODUCCIÓN**
> Módulo congelado funcionalmente. No se aceptan nuevas funcionalidades; solo corrección de bugs críticos.
> Próximas versiones planificadas en `docs/reference/CHANGELOG_LECTURA_FACTURAS.md`.

## Arquitectura

```
lib/invoice-reader/                    ← Módulo desacoplado
├── types.ts                           ← Interfaces públicas (OcrResult, InvoiceData, etc.)
├── reader.ts                          ← FacturaReader (interfaz abstracta)
├── readers/
│   └── paddle-ocr.ts                  ← Implementación con PaddleOCR
├── parser.ts                          ← Router: elige parser según proveedor
├── parsers/
│   ├── index.ts                       ← Registro de parsers
│   ├── generic.parser.ts              ← Fallback universal
│   └── zafiro.parser.ts               ← Parser específico ZAFIRO
├── normalizer.ts                      ← Normalización de precios, fechas, etc.
└── utils.ts                           ← Helpers (coordenadas, moneda, patrones)

python/ocr/
├── requirements.txt                   ← Dependencias Python
└── ocr_client.py                      ← Script: imagen → OCR → JSON

app/api/admin/proveedores/compras/leer-factura/
└── route.ts                           ← POST endpoint

components/Admin/Proveedores/
├── InvoicePreview.tsx                  ← Modal editable de previsualización
└── CompraForm.tsx                      ← + botón "📄 Importar factura"
```

## Flujo completo

```
Usuario click "📄 Importar factura"
  → Selecciona imagen
  → POST /api/.../leer-factura
     → Guarda en temp
     → Ejecuta ocr_client.py (Python + PaddleOCR)
     → Obtiene OcrResult { text, lines[], raw }
     → Parser detecta proveedor y parsea → InvoiceData
     → Limpia temp
     → Responde con InvoiceData + OcrResult
  → Abre InvoicePreview con datos precargados
  → Usuario revisa/edita filas
  → Confirma → auto-completa CompraForm
  → Usuario click "Crear Compra" (mismo flujo manual)
  → Imagen subida como adjunto (uploadProveedorAdjunto)
```

## Cómo agregar un nuevo parser

```typescript
// lib/invoice-reader/parsers/mi-proveedor.parser.ts
import type { FacturaParser, InvoiceData, OcrLine, OcrResult } from '../types';
import { groupLinesByRow } from '../utils';
import { enrichFromText, normalizeInvoiceData } from '../normalizer';

export class MiProveedorParser implements FacturaParser {
  detect(lines: OcrLine[]): boolean {
    const text = lines.map(l => l.text.toLowerCase()).join(' ');
    return text.includes('mi proveedor');
  }

  parse(data: OcrResult): InvoiceData {
    const rows = groupLinesByRow(data.lines, 12);
    // ... lógica específica del proveedor
    let result: InvoiceData = { items, rawText: data.text };
    result = enrichFromText(result, data);
    result = normalizeInvoiceData(result);
    return result;
  }
}
```

Registrarlo en `lib/invoice-reader/parsers/index.ts`:

```typescript
import { MiProveedorParser } from './mi-proveedor.parser';

const REGISTERED_PARSERS: FacturaParser[] = [
  new ZafiroParser(),
  new MiProveedorParser(),   // ← nuevo parser
  new GenericParser(),       // ← siempre al final (fallback)
];
```

El orden importa: `detect()` se evalúa en orden de registro. El primer parser que matchee gana.

## Cómo reemplazar PaddleOCR por otro motor

Crear un nuevo reader:

```typescript
// lib/invoice-reader/readers/openai.ts
import type { FacturaReader } from '../reader';
import type { OcrResult } from '../types';

export class OpenAIReader implements FacturaReader {
  async read(imagePath: string): Promise<OcrResult> {
    const base64 = await fs.promises.readFile(imagePath, { encoding: 'base64' });
    const response = await fetch('https://api.openai.com/v1/...', { ... });
    const data = await response.json();
    return { text: data.text, lines: data.lines, raw: data };
  }
}
```

Luego reemplazar en `app/api/.../leer-factura/route.ts`:

```typescript
// Antes:
import { PaddleOCRReader } from '@/lib/invoice-reader/readers/paddle-ocr';
const reader = new PaddleOCRReader();

// Después:
import { OpenAIReader } from '@/lib/invoice-reader/readers/openai';
const reader = new OpenAIReader();
```

Sin tocar nada más del sistema.

## Instalación de PaddleOCR

```bash
# En el directorio del proyecto
cd python/ocr

# (Opcional) Crear virtualenv
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependencias
pip install -r requirements.txt
```

Esto instala PaddlePaddle (~1.5GB) y PaddleOCR. La primera ejecución descarga modelos adicionales (~100MB).

## Requisitos de Instalación (Nuevos Entornos)

### Python

```bash
# Verificar versión (requerido 3.8+)
python --version

# Windows: asegurarse de que Python esté en PATH
python -c "import sys; print(sys.version)"
```

### PaddleOCR

```bash
# Ir al directorio del módulo
cd python/ocr

# (Recomendado) Crear virtualenv para aislar dependencias
python -m venv venv

# Activar virtualenv
# Linux/Mac:
source venv/bin/activate
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat

# Instalar dependencias (~1.5GB)
pip install -r requirements.txt
```

> La primera ejecución de PaddleOCR descarga modelos adicionales (~100MB).
> Para CPU es suficiente; CUDA no es requerido pero acelera el OCR.

### Verificar instalación

```bash
python python/ocr/ocr_client.py --help
# Debe mostrar: "Image path argument is required"
```

### Solución de problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| `ModuleNotFoundError: No module named 'paddleocr'` | Dependencias no instaladas | `pip install -r requirements.txt` |
| `ConnectionError` en primera ejecución | Descarga de modelos bloqueada | Verificar conexión a internet |
| `OSError: [WinError 126]` en Windows | DLL de Visual C++ faltante | Instalar "Microsoft Visual C++ Redistributable" |
| OCR lento (>10s por imagen) | CPU sin aceleración | Esperar; es normal en CPU |

### Timeout

El proceso OCR tiene un timeout configurable vía variable de entorno:

```bash
# En .env.local
OCR_TIMEOUT_MS=60000  # 60 segundos (default: 30000)
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `OCR_TIMEOUT_MS` | `30000` | Timeout máximo para el proceso OCR en milisegundos |

El módulo depende también de las variables Supabase existentes para autenticación (`requireAdminUser`).

## Cómo probar manualmente

### Endpoint OCR (Etapa 1)

```bash
curl -X POST http://localhost:3000/api/admin/proveedores/compras/leer-factura \
  -F "file=@/ruta/a/factura.jpg"
```

Respuesta esperada:

```json
{
  "success": true,
  "data": {
    "proveedor": "ZAFIRO",
    "fecha": "2026-06-27",
    "numeroFactura": "8070",
    "total": 1039300,
    "cantidadTotalUnidades": 5,
    "items": [
      { "cantidad": 5, "descripcion": "AC02 ROSS RELAX JACK / CORDERITO Z/X03", "presentacion": "2 1/2 PL", "precioUnitario": 55900, "subtotal": 279500 }
    ],
    "rawText": "..."
  },
  "ocrResult": { "text": "...", "lines": [...], "raw": [...] },
  "tempPath": "C:\\...\\factura-....jpg"
}
```

### Flujo completo (Navegador)

1. Ir a `/admin/provedores`
2. Pestaña **Compras**
3. Click **+ Nueva Compra**
4. Click **📄 Importar factura**
5. Seleccionar imagen
6. Esperar OCR → se abre **InvoicePreview**
7. Editar datos si es necesario
8. Click **Confirmar** → formulario auto-completado
9. Click **Crear Compra**

## Casos límite conocidos

| Situación | Comportamiento |
|---|---|
| Python no instalado | Error claro: "No se encontró Python" + formulario manual intacto |
| PaddleOCR no disponible | Error con mensaje de la excepción Python |
| Imagen corrupta | Error del OCR atrapado, formulario intacto |
| Archivo >5MB | Rechazado con mensaje antes de llamar a Python |
| Formato no image/* | Rechazado en validación |
| OCR no encuentra texto | OcrResult.text vacío, sin items → tabla vacía, usuario puede editar |
| Factura de proveedor desconocido | GenericParser intenta parsear genéricamente |
| Subtotal inconsistente | Advertencia en InvoicePreview, no bloquea |
| Timeout | Error del child_process atrapado |
| Edición de compra existente | El botón "📄 Importar factura" NO se muestra (solo en nuevas) |

## Limitaciones actuales

- **Parser ZAFIRO**: diseñado para facturas con el formato de ejemplo. Facturas con estructura diferente pueden requerir parsing manual.
- **GenericParser**: funciona por patrones de texto (cantidad inicial + últimos dos montos). Facturas sin este patrón no se parsearán correctamente.
- **Presentación**: la detección usa una lista fija de patrones. Presentaciones nuevas deben agregarse a `PRESENTATION_PATTERNS` en `utils.ts`.
- **Dependencia Python**: requiere Python + PaddleOCR instalados en el servidor/serverless.

## Recomendaciones futuras

1. **Parser autoadaptativo**: almacenar las correcciones del usuario para mejorar el parser automáticamente.
2. **Entrenar modelo propio**: con suficientes facturas etiquetadas, entrenar un modelo específico para los proveedores.
3. **Reemplazar PaddleOCR por IA**: la arquitectura `FacturaReader` permite cambiar el motor sin modificar nada más.
4. **Soporte PDF**: agregar conversión PDF → imagen antes de OCR.
5. **Parser por ML**: usar embeddings de texto para detectar campos en lugar de regex fijos.
