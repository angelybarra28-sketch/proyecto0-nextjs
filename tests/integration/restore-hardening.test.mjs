import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_MAX_RESTORE_PAYLOAD_MB,
  parseMaxRestorePayloadMb,
  getMaxRestorePayloadBytes,
  buildPayloadTooLargeMessage,
  getRestorePayloadError,
} from '../../lib/services/admin/backup/restoreConfig.ts';

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('tamaño excedido: payload por debajo del límite es permitido', () => {
  const small = JSON.stringify({ ok: true });
  assert.equal(getRestorePayloadError(small, 50), null);
});

test('tamaño excedido: payload por encima del límite devuelve error consistente', () => {
  const big = 'x'.repeat(50 * 1024 * 1024 + 1);
  const error = getRestorePayloadError(big, 50);
  assert.ok(error);
  assert.equal(error, buildPayloadTooLargeMessage(50));
});

test('tamaño excedido: el límite es configurable (BACKUP_MAX_SIZE_MB)', () => {
  const payload = 'y'.repeat(10 * 1024 * 1024 + 1);
  assert.equal(parseMaxRestorePayloadMb('10'), 10);
  assert.equal(getRestorePayloadError(payload, 10), buildPayloadTooLargeMessage(10));
  assert.equal(getRestorePayloadError(payload, 50), null);
});

test('límite de tamaño: default 50MB y bytes correctos', () => {
  assert.equal(DEFAULT_MAX_RESTORE_PAYLOAD_MB, 50);
  assert.equal(getMaxRestorePayloadBytes(50), 50 * 1024 * 1024);
  assert.equal(getMaxRestorePayloadBytes(10), 10 * 1024 * 1024);
});

test('límite de tamaño: valores inválidos caen al default', () => {
  assert.equal(parseMaxRestorePayloadMb(undefined), 50);
  assert.equal(parseMaxRestorePayloadMb(null), 50);
  assert.equal(parseMaxRestorePayloadMb(''), 50);
  assert.equal(parseMaxRestorePayloadMb('abc'), 50);
  assert.equal(parseMaxRestorePayloadMb('0'), 50);
  assert.equal(parseMaxRestorePayloadMb('-3'), 50);
  assert.equal(parseMaxRestorePayloadMb('50.5'), 50.5);
});

test('mensaje de tamaño es consistente entre ruta y servicio', () => {
  const route = read('app/api/admin/backup/restore/route.ts');
  const service = read('lib/services/admin/backup/restore.service.ts');
  const config = read('lib/services/admin/backup/restoreConfig.ts');
  assert.match(route, /buildPayloadTooLargeMessage/);
  assert.match(service, /new RestoreError\(payloadError, 413\)/);
  assert.match(config, /buildPayloadTooLargeMessage/);
  assert.match(route, /413/);
});

test('restore.service: límite configurable y no hardcodeado', () => {
  const service = read('lib/services/admin/backup/restore.service.ts');
  const config = read('lib/services/admin/backup/restoreConfig.ts');
  assert.match(config, /BACKUP_MAX_SIZE_MB/);
  assert.match(service, /getMaxRestorePayloadMb/);
  assert.match(service, /getRestorePayloadError/);
  assert.doesNotMatch(service, /const MAX_RESTORE_PAYLOAD_BYTES\s*=/);
});

test('restore.service: restauración transaccional con snapshot y rollback completo', () => {
  const service = read('lib/services/admin/backup/restore.service.ts');
  assert.match(service, /snapshot = await exportBackup\(\)/);
  assert.match(service, /applyRollback/);
  assert.match(service, /await clearAllData\(supabase\)/);
  assert.match(service, /await importData\(supabase, snapshot, existingAuthIds, warnings\)/);
  assert.match(service, /Rollback aplicado: la base fue restaurada al estado anterior al restore\./);
  assert.match(service, /rollbackApplied = true/);
});

test('restore.service: merge fail-fast sin restauraciones parciales', () => {
  const service = read('lib/services/admin/backup/restore.service.ts');
  assert.match(service, /throw new Error\(`merge \$\{table\}: \$\{rowError\.message\}`\)/);
  assert.doesNotMatch(service, /ignorada/);
});

test('restore.route: pre-chequeo de Content-Length antes de leer el cuerpo', () => {
  const route = read('app/api/admin/backup/restore/route.ts');
  assert.match(route, /Content-Length/);
  assert.match(route, /request\.text\(\)/);
  assert.match(route, /declaredBytes > maxBytes/);
});

test('restore.route: archivo inexistente / cuerpo vacío responde error consistente', () => {
  const route = read('app/api/admin/backup/restore/route.ts');
  assert.match(route, /El cuerpo de la solicitud está vacío/);
});

test('restore.route: errores internos no se exponen al cliente', () => {
  const route = read('app/api/admin/backup/restore/route.ts');
  assert.match(route, /error instanceof RestoreError \? error\.status : 500/);
  assert.match(route, /error instanceof RestoreError \? error\.message : undefined/);
});

test('restore.route: parseo de versión defensivo no expone errores de JSON corrupto', () => {
  const route = read('app/api/admin/backup/restore/route.ts');
  assert.match(route, /let parsedVersion = ''/);
  assert.match(route, /catch \{\s*parsedVersion = '';\s*\}/);
});

test('restore.route y service delegan la validación de contenido a validateBackup', () => {
  const service = read('lib/services/admin/backup/restore.service.ts');
  assert.match(service, /const validation = validateBackup\(options\.rawJson\)/);
  assert.match(service, /throw new RestoreError\(`El backup no es válido:/);
  assert.match(service, /validateSchemaCompatibility/);
});
