# Índice de Documentación

## Inicio Rápido

| Si eres... | Empieza aquí | Tiempo |
|------------|--------------|--------|
| Nuevo en el proyecto | `docs/guides/QUICK_START.md` → luego `docs/reference/AGENTS.md` | 10 min |
| Desarrollador frontend | `docs/guides/CHEATSHEET_FILTROS.md` → `docs/guides/EJEMPLOS_FILTROS.md` | 20 min |
| Arquitecto/DevOps | `docs/architecture/filter-system.md` → `docs/guides/SUPABASE_PHASE_1.md` | 25 min |
| Dueño del producto | `docs/guides/RESUMEN_MIGRACION.md` → `docs/guides/RESUMEN_IMPLEMENTACION.md` | 15 min |
| Auditoría crédito | `docs/audits/` (los 3 documentos) | 45 min |

---

## Estructura de Documentación

```
docs/
├── architecture/
│   ├── filter-system.md         ← Sistema de filtros (arquitectura completa)
│   ├── ARQUITECTURA_SLUGS.md    ← Diagramas de migración a slugs
│   └── MIGRACION_SLUGS.md       ← Detalles técnicos de migración
│
├── audits/
│   ├── AUDITORIA_FASE_4_1_CALCULATE_SUMMARY_SOBREPAGOS.md
│   ├── AUDITORIA_IS_ACTIVE_CALCULATE_SUMMARY.md
│   ├── AUDITORIA_PAGOS_HUERFANOS_Y_DIVERGENCIA.md
│   └── PLAN_ACCION_CONSERVADOR_HARDENING.md
│
├── guides/
│   ├── CHEATSHEET_FILTROS.md          ← Referencia rápida de filtros
│   ├── EJEMPLOS_FILTROS.md            ← Ejemplos de código copy-paste
│   ├── EJECUCION_SEMANA_1_SQL.md      ← SQL para ejecutar en Supabase
│   ├── GUIA_PRACTICA_SLUGS.md         ← Guía práctica de slugs
│   ├── INTEGRACION_FILTROS.md         ← Guía de integración de filtros
│   ├── OPERATIONS_CHECKLIST.md        ← Checklist de producción
│   ├── QUICK_START.md                 ← Tutorial rápido de filtros
│   ├── README_FILTROS.md              ← README del sistema de filtros
│   ├── RESUMEN_IMPLEMENTACION.md      ← Resumen ejecutivo de filtros
│   ├── RESUMEN_MIGRACION.md           ← Resumen ejecutivo de migración
│   └── SUPABASE_PHASE_1.md            ← Diseño de integración Supabase
│
├── database/
│   ├── 01_auditoria_preventiva.sql    ← SQL de auditoría crediticia
│   └── audit_credit_schema.sql        ← SQL de auditoría de esquema
│
├── reference/
│   ├── AGENTS.md                      ← Notas para agentes AI
│   ├── CHANGELOG_MIGRACION.md         ← Changelog de migración a slugs
│   └── VERIFICACION_MIGRACION.md      ← Testing checklist de migración
│
├── archive/
│   └── PROPUESTA_TECNICA_MULTI_PRODUCTO.md  ← Propuesta no implementada
│
├── PRODUCTION_DEPLOY.md              ← Checklist de deploy a producción
├── FINANCIAL_OPERATIONS.md           ← Operaciones financieras críticas
└── BACKUP_AND_RECOVERY.md            ← Procedimientos de backup/restore
```

---

## Documentación del Sistema de Filtros

### Lectura recomendada

| Orden | Documento | Tiempo | Para qué |
|-------|-----------|--------|----------|
| 1 | `docs/guides/QUICK_START.md` | 5 min | Primera vez |
| 2 | `docs/guides/README_FILTROS.md` | 5 min | Visión general |
| 3 | `docs/architecture/filter-system.md` | 15 min | Arquitectura completa |
| 4 | `docs/guides/CHEATSHEET_FILTROS.md` | 5 min | Referencia de funciones |
| 5 | `docs/guides/EJEMPLOS_FILTROS.md` | 15 min | Código práctico |
| 6 | `docs/guides/INTEGRACION_FILTROS.md` | 15 min | Integración |
| 7 | `docs/guides/RESUMEN_IMPLEMENTACION.md` | 10 min | Qué cambió |

### Referencia rápida por tema

| Tema | Documento |
|------|-----------|
| Listado de funciones | `docs/guides/CHEATSHEET_FILTROS.md` |
| Tipos TypeScript | `docs/architecture/filter-system.md` sección "TypeScript Types" |
| Errores comunes | `docs/guides/CHEATSHEET_FILTROS.md` + `docs/guides/INTEGRACION_FILTROS.md` |
| Código para copiar | `docs/guides/EJEMPLOS_FILTROS.md` (7 casos) |
| Migrar a base de datos | `docs/guides/INTEGRACION_FILTROS.md` sección "Migración a DB" |

---

## Documentación de Migración a Slugs

### Lectura recomendada

| Orden | Documento | Tiempo | Para qué |
|-------|-----------|--------|----------|
| 1 | `docs/guides/RESUMEN_MIGRACION.md` | 5 min | Resumen ejecutivo |
| 2 | `docs/guides/GUIA_PRACTICA_SLUGS.md` | 20 min | Cómo usar y extender |
| 3 | `docs/architecture/ARQUITECTURA_SLUGS.md` | 15 min | Diagramas y flujos |
| 4 | `docs/architecture/MIGRACION_SLUGS.md` | 15 min | Detalles técnicos |
| 5 | `docs/reference/VERIFICACION_MIGRACION.md` | 15 min | Testing |
| 6 | `docs/reference/CHANGELOG_MIGRACION.md` | 10 min | Historial de cambios |

### Referencia rápida por tema

| Tema | Documento |
|------|-----------|
| URLs antes/después | `docs/guides/RESUMEN_MIGRACION.md` |
| Testing de URLs | `docs/reference/VERIFICACION_MIGRACION.md` |
| Agregar nuevo helper | `docs/guides/GUIA_PRACTICA_SLUGS.md` |
| Migrar a base de datos | `docs/architecture/MIGRACION_SLUGS.md` |
| Changelog completo | `docs/reference/CHANGELOG_MIGRACION.md` |

---

## Documentación de Auditorías (Crédito)

| Documento | Enfoque | Duración |
|-----------|---------|----------|
| `docs/audits/AUDITORIA_PAGOS_HUERFANOS_Y_DIVERGENCIA.md` | Pagos huérfanos, divergencia entre módulos | 30 min |
| `docs/audits/AUDITORIA_IS_ACTIVE_CALCULATE_SUMMARY.md` | Flag is_active, función calculateSummary | 20 min |
| `docs/audits/AUDITORIA_FASE_4_1_CALCULATE_SUMMARY_SOBREPAGOS.md` | Sobrepagos, análisis de remaining | 35 min |
| `docs/audits/PLAN_ACCION_CONSERVADOR_HARDENING.md` | Plan de hardening, prioridades | 25 min |

### Para ejecutar en Supabase

1. Abrir `docs/database/01_auditoria_preventiva.sql` — queries A-E (también referenciados en `docs/audits/*.md`)
2. Ejecutar en SQL Editor de Supabase
3. Seguir `docs/guides/EJECUCION_SEMANA_1_SQL.md` — índices y constraints

---

## Documentación de Operaciones

| Documento | Propósito |
|-----------|-----------|
| `docs/guides/OPERATIONS_CHECKLIST.md` | Checklist de producción (env, RPCs, índices) |
| `docs/PRODUCTION_DEPLOY.md` | Deploy a producción |
| `docs/FINANCIAL_OPERATIONS.md` | Operaciones financieras críticas |
| `docs/BACKUP_AND_RECOVERY.md` | Backup y restore de Supabase |
| `docs/guides/SUPABASE_PHASE_1.md` | Diseño de integración Supabase |

---

## Archivo de AI Agent

`docs/reference/AGENTS.md` — Notas para asistentes AI. Contiene comandos rápidos, shape del proyecto, fuentes de datos, estado global, tipos, lint gotchas, y notas del módulo de crédito.

---

*Documento fusionado desde INDICE_DOCUMENTACION.md e INDICE_DOCUMENTACION_FILTROS.md*
*Última actualización: Junio 2026*
