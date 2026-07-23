# CHANGELOG — Módulo de Importación Automática de Facturas

## [1.0.0] — 2026-07-23 — Versión Inicial

### Estado
**ESTABLE PARA PRODUCCIÓN** — Módulo congelado funcionalmente.

---

### Arquitectura

```
lib/invoice-reader/                    ← Módulo desacoplado
├── types.ts                           ← Interfaces públicas
├── reader.ts                          ← FacturaReader (interfaz abstracta)
├── readers/
│   └── paddle-ocr.ts                  ← Implementación PaddleOCR
├── parser.ts                          ← Router de parsers
├── parsers/
│   ├── index.ts                       ← Registro de parsers
│   ├── generic.parser.ts              ← Fallback universal
│   └── zafiro.parser.ts               ← Parser específico ZAFIRO
├── normalizer.ts                      ← Normalización de datos
└── utils.ts                           ← Helpers de coordenadas/moneda/patrones

python/ocr/
├── ocr_client.py                      ← Script Python PaddleOCR
└── requirements.txt                   ← Dependencias

app/api/.../compras/leer-factura/
└── route.ts                           ← POST endpoint OCR+parser

components/Admin/Proveedores/
├── InvoicePreview.tsx                  ← Modal editable desacoplado
└── CompraForm.tsx                      ← Integración OCR + adjunto manual
```

---

### Funcionalidades Implementadas

| Funcionalidad | Archivo |
|---------------|---------|
| Interfaz `FacturaReader` desacoplada | `lib/invoice-reader/reader.ts` |
| Motor OCR vía PaddleOCR (local, sin servicios externos) | `lib/invoice-reader/readers/paddle-ocr.ts` |
| Invocación Python por `child_process` + fallback `python3`↔`python` | `lib/invoice-reader/readers/paddle-ocr.ts` |
| Timeout configurable vía `OCR_TIMEOUT_MS` (default 30s) + `AbortController` | `lib/invoice-reader/readers/paddle-ocr.ts` |
| Destrucción garantizada del child process en timeout | `lib/invoice-reader/readers/paddle-ocr.ts` |
| Limpieza garantizada de archivos temporales | `app/api/.../leer-factura/route.ts` |
| Interfaz `FacturaParser` para parsers por proveedor | `lib/invoice-reader/types.ts` |
| Registro extensible de parsers (orden = prioridad) | `lib/invoice-reader/parsers/index.ts` |
| Parser específico ZAFIRO con coordenadas OCR | `lib/invoice-reader/parsers/zafiro.parser.ts` |
| Parser genérico de respaldo (cualquier factura) | `lib/invoice-reader/parsers/generic.parser.ts` |
| Filtro header/footer en GenericParser | `lib/invoice-reader/parsers/generic.parser.ts` |
| Normalización de precios ARS, fechas, proveedor | `lib/invoice-reader/normalizer.ts` |
| Extracción de fecha, total, N° factura por regex | `lib/invoice-reader/normalizer.ts` |
| Patrones de presentación (12 formatos comunes) | `lib/invoice-reader/utils.ts` |
| Agrupación por coordenadas Y (groupLinesByRow) | `lib/invoice-reader/utils.ts` |
| POST endpoint con validación de tipo/tamaño de archivo | `app/api/.../leer-factura/route.ts` |
| Manejo exhaustivo de errores Python (import, timeout, ENOENT, maxBuffer, stderr) | `lib/invoice-reader/readers/paddle-ocr.ts` |
| Script Python con captura de excepciones + traceback | `python/ocr/ocr_client.py` |
| Vista previa editable modal (InvoicePreview) | `components/Admin/Proveedores/InvoicePreview.tsx` |
| Recálculo automático de subtotales al editar | `components/Admin/Proveedores/InvoicePreview.tsx` |
| Advertencias visuales (inconsistencias, NaN, valores faltantes) | `components/Admin/Proveedores/InvoicePreview.tsx` |
| Botón "📄 Importar factura" solo en compras nuevas | `components/Admin/Proveedores/CompraForm.tsx` |
| Auto-completado del formulario al confirmar preview | `components/Admin/Proveedores/CompraForm.tsx` |
| Imagen original reutilizada como adjunto (mismo flujo manual) | `components/Admin/Proveedores/CompraForm.tsx` |
| Documentación técnica completa | `docs/guides/MODULO_LECTURA_FACTURAS.md` |

---

### Flujo Completo

```
Nueva Compra → click "📄 Importar factura" → seleccionar imagen
→ POST /api/.../leer-factura → PaddleOCR → parser → InvoiceData
→ InvoicePreview (editable) → confirmar → auto-completar formulario
→ guardar compra → adjuntar imagen como factura
```

---

### Requisitos de Entorno

| Requisito | Versión Mínima |
|-----------|----------------|
| Python | 3.8+ |
| PaddlePaddle | 3.0.0b1 |
| PaddleOCR | 2.9.0+ |
| Node.js | 18+ |

---

### Configuración

| Variable | Default | Descripción |
|----------|---------|-------------|
| `OCR_TIMEOUT_MS` | `30000` | Timeout máximo para OCR en milisegundos |

---

### Edge Cases Cubiertos

- Python no instalado → error claro + formulario manual intacto
- PaddleOCR no disponible → error con traceback Python
- Imagen corrupta → error capturado + formulario intacto
- Archivo >5MB → rechazado antes de llamar a Python
- Formato no image/* → rechazado en validación
- OCR sin texto detectado → tabla vacía editable
- Factura de proveedor desconocido → GenericParser fallback
- Subtotales inconsistentes → advertencia visual (no bloquea)
- NaN en cantidad/precio/subtotal → advertencia + `isFinite()`
- Timeout del child process → mensaje claro + limpieza temp
- Edición de compra existente → botón OCR oculto

---

### Límites Conocidos

- Parser ZAFIRO requiere el formato de factura específico
- GenericParser asume estructura cantidad + último PU/subtotal
- Detección de presentación usa lista fija de patrones
- Requiere Python + PaddleOCR instalados en el servidor
- No soporta PDF (requiere conversión previa)

---

### Próximas Versiones (Planificadas)

| Versión | Funcionalidad |
|---------|---------------|
| v1.1 | Parser autoadaptativo con feedback de usuario |
| v1.2 | Soporte PDF (conversión imagen previa) |
| v2.0 | Reemplazo PaddleOCR por IA (OpenAI / LLM) |
| v2.0 | Aprendizaje automático para detección de campos |
| v2.0 | Asociación automática de productos con catálogo |
