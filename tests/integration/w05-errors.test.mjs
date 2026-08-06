import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveSafeErrorMessage } from '../../lib/server/errorMessages.ts';
import { createRequestContext, logServerError } from '../../lib/server/logging.ts';

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('W05: mensaje seguro para 400 VALIDATION_ERROR', () => {
  assert.equal(resolveSafeErrorMessage('VALIDATION_ERROR', 400), 'Solicitud inválida');
});

test('W05: mensaje seguro para 400 INTERNAL_ERROR', () => {
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 400), 'Solicitud inválida');
});

test('W05: mensaje seguro para 404', () => {
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 404), 'Recurso no encontrado');
  assert.equal(resolveSafeErrorMessage('PRODUCT_NOT_FOUND', 404), 'Recurso no encontrado');
});

test('W05: mensaje seguro para 409', () => {
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 409), 'Conflicto');
});

test('W05: mensaje seguro para 429 (rate limit genérico)', () => {
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 429), 'Solicitud inválida');
});

test('W05: excepción inesperada → 500 genérico', () => {
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 500), 'Error interno del servidor');
  assert.equal(resolveSafeErrorMessage('VALIDATION_ERROR', 500), 'Error interno del servidor');
});

test('W05: maintenance mode tiene mensaje propio aunque sea 503', () => {
  assert.equal(resolveSafeErrorMessage('MAINTENANCE_MODE_ACTIVE', 503), 'Servicio temporalmente no disponible');
});

test('W05: códigos de negocio mapean a mensajes seguros', () => {
  assert.equal(resolveSafeErrorMessage('AUTH_REQUIRED', 401), 'Autenticación requerida');
  assert.equal(resolveSafeErrorMessage('FORBIDDEN', 403), 'Acceso denegado');
  assert.equal(resolveSafeErrorMessage('STOCK_INSUFFICIENT', 400), 'Stock insuficiente');
  assert.equal(resolveSafeErrorMessage('STORAGE_INCONSISTENT', 500), 'Error interno del servidor');
});

test('W05: safeMessage curado prevalece sobre el genérico', () => {
  assert.equal(
    resolveSafeErrorMessage('INTERNAL_ERROR', 413, 'El backup supera el tamaño máximo permitido.'),
    'El backup supera el tamaño máximo permitido.'
  );
});

test('W05: safeMessage vacío se ignora y cae al genérico', () => {
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 400, ''), 'Solicitud inválida');
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 400, '   '), 'Solicitud inválida');
  assert.equal(resolveSafeErrorMessage('INTERNAL_ERROR', 400, undefined), 'Solicitud inválida');
});

test('W05: ningún mensaje resuelto contiene detalle interno', () => {
  const codes = ['AUTH_REQUIRED', 'FORBIDDEN', 'VALIDATION_ERROR', 'RUNTIME_CONTRACT_FAILED', 'STOCK_INSUFFICIENT', 'PRODUCT_NOT_FOUND', 'MAINTENANCE_MODE_ACTIVE', 'STORAGE_INCONSISTENT', 'INTERNAL_ERROR'];
  const statuses = [400, 401, 403, 404, 409, 413, 429, 500, 503];
  const forbidden = /postgres|supabase|sql|stack|relation|column|duplicate|syntax|PG[0-9]{5}|at\s+\S+:\d+/i;
  for (const code of codes) {
    for (const status of statuses) {
      const message = resolveSafeErrorMessage(code, status);
      assert.ok(message.length > 0, `mensaje vacío para ${code}/${status}`);
      assert.doesNotMatch(message, forbidden, `${code}/${status} expone detalle interno: ${message}`);
    }
  }
});

test('W05: request-id se genera si la request no trae uno', () => {
  const context = createRequestContext(new Request('http://localhost/api/test'));
  assert.ok(context.requestId && context.requestId.length >= 8);
});

test('W05: request-id se reutiliza si la request ya trae uno', () => {
  const context = createRequestContext(new Request('http://localhost/api/test', {
    headers: { 'x-request-id': 'req-abc-123' },
  }));
  assert.equal(context.requestId, 'req-abc-123');
});

test('W05: logs contienen request-id, timestamp y stack', () => {
  const originalError = console.error;
  let captured = '';
  console.error = (serialized) => { captured = serialized; };
  try {
    logServerError({
      area: 'test',
      action: 'boom',
      requestId: 'req-log-1',
      error: new Error('boom interno'),
    });
  } finally {
    console.error = originalError;
  }

  const payload = JSON.parse(captured);
  assert.equal(payload.level, 'error');
  assert.equal(payload.requestId, 'req-log-1');
  assert.ok(payload.timestamp);
  assert.equal(payload.error.message, 'boom interno');
  assert.ok(payload.error.stack && payload.error.stack.includes('boom interno'));
});

test('W05: logs redactan secretos en metadata', () => {
  const originalError = console.error;
  let captured = '';
  console.error = (serialized) => { captured = serialized; };
  try {
    logServerError({
      area: 'test',
      action: 'redact',
      requestId: 'req-log-2',
      metadata: { service_role: 'sk-live-123', safe: 'ok' },
      error: new Error('x'),
    });
  } finally {
    console.error = originalError;
  }

  const payload = JSON.parse(captured);
  assert.equal(payload.metadata.service_role, '[REDACTED]');
  assert.equal(payload.metadata.safe, 'ok');
});

test('W05: apiErrors usa el resolver seguro y no expone error.message en crudo', () => {
  const source = read('lib/server/apiErrors.ts');
  assert.match(source, /resolveSafeErrorMessage/);
  assert.doesNotMatch(source, /message:\s*safeMessage/);
  assert.doesNotMatch(source, /safeMessage\s*=\s*status >= 500/);
  assert.doesNotMatch(source, /stack/);
});

test('W05: pre-sales (F8) no filtra error.message y registra con request-id', () => {
  const source = read('app/api/pre-sales/route.ts');
  assert.match(source, /error: 'Error interno del servidor'/);
  assert.doesNotMatch(source, /error instanceof Error \? error\.message : 'Unknown error'/);
  assert.match(source, /createRequestContext/);
  assert.match(source, /logServerError/);
  assert.match(source, /x-request-id/);
});

test('W05: hard-delete 409 no expone error.message', () => {
  const source = read('app/api/admin/products/[id]/hard-delete/route.ts');
  assert.doesNotMatch(source, /message: error\.message/);
  assert.match(source, /no puede eliminarse definitivamente/);
});

test('W05: restore preserva los mensajes curados de RestoreError vía safeMessage', () => {
  const source = read('app/api/admin/backup/restore/route.ts');
  assert.match(source, /error instanceof RestoreError \? error\.status : 500/);
  assert.match(source, /error instanceof RestoreError \? error\.message : undefined/);
});

test('W05: rutas con console.error crudo quedan unificadas a logServerError', () => {
  const targets = [
    'app/api/categories/route.ts',
    'app/api/admin/collections/summary/route.ts',
    'app/api/admin/sales/[id]/route.ts',
    'app/api/admin/credit-accounts/commercial-metrics/route.ts',
    'app/api/admin/credit-accounts/clean/route.ts',
    'app/api/admin/importacion-cartera/import/route.ts',
  ];
  for (const path of targets) {
    const source = read(path);
    assert.doesNotMatch(source, /console\.(error|warn)/, `${path} todavía usa console`);
    assert.match(source, /logServerError\(/, `${path} no usa logServerError`);
    assert.match(source, /requestId/, `${path} no incluye requestId en el log`);
  }
});

test('W05: respuestas inline de error incluyen x-request-id', () => {
  const targets = [
    'app/api/admin/backup/validate/route.ts',
    'app/api/admin/credit-accounts/[id]/notes/route.ts',
    'app/api/mi-cuenta/resumen/route.ts',
    'app/api/admin/sales/[id]/route.ts',
    'app/api/admin/collections/summary/route.ts',
    'app/api/categories/route.ts',
    'app/api/admin/backup/export/route.ts',
  ];
  for (const path of targets) {
    const source = read(path);
    assert.match(source, /x-request-id/, `${path} no incluye x-request-id`);
  }
});
