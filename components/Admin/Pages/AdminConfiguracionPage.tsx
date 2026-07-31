'use client';

import { useCallback, useRef, useState } from 'react';
import {
  downloadBackup,
  restoreBackupFile,
  validateBackupFile,
  type RestoreResult,
  type ValidationResponse,
} from '@/lib/services/admin/backup-client';
import { AdminBackupHistory } from '@/components/Admin/Pages/AdminBackupHistory';
import styles from '@/styles/Admin.module.css';

type WizardStep = 'select' | 'validating' | 'summary' | 'mode' | 'confirm' | 'restoring' | 'done';

type TableCountRow = {
  table: string;
  rows: number;
};

const cardStyle: React.CSSProperties = {
  background: '#1e1d1b',
  borderRadius: 8,
  padding: 16,
  border: '1px solid #363330',
  fontSize: 13,
  color: '#d3cdc4',
  lineHeight: 1.8,
};

const labelStyle: React.CSSProperties = { color: '#d3cdc4', fontSize: 14, marginBottom: 12, display: 'block' };

function parseTableCounts(rawJson: string): TableCountRow[] {
  try {
    const parsed = JSON.parse(rawJson) as { manifest?: { rowCounts?: Record<string, number> } };
    const rowCounts = parsed.manifest?.rowCounts ?? {};
    return Object.entries(rowCounts).map(([table, rows]) => ({ table, rows }));
  } catch {
    return [];
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

function downloadSnapshot(snapshot: RestoreResult['snapshot']): void {
  if (!snapshot) return;
  const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pre-restore-backup-${new Date().toISOString().slice(0, 16).replace('T', '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminConfiguracionPage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('select');
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardFile, setWizardFile] = useState<File | null>(null);
  const [wizardFileName, setWizardFileName] = useState('');
  const [wizardText, setWizardText] = useState('');
  const [wizardValidation, setWizardValidation] = useState<ValidationResponse | null>(null);
  const [wizardMode, setWizardMode] = useState<'merge' | 'replace'>('merge');
  const [wizardResult, setWizardResult] = useState<RestoreResult | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = useCallback(async () => {
    setBackupLoading(true);
    setMessage(null);
    try {
      const filename = await downloadBackup();
      setMessage({ type: 'success', text: `Backup generado correctamente: ${filename}` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al generar backup' });
    } finally {
      setBackupLoading(false);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidating(true);
    setMessage(null);
    setValidationResult(null);

    try {
      const result = await validateBackupFile(file);
      setValidationResult(result);
      if (result.valid) {
        setMessage({ type: 'success', text: 'Backup validado correctamente' });
      } else {
        setMessage({ type: 'error', text: `Se encontraron ${result.errors.length} error(es) en el backup` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al validar backup' });
    } finally {
      setValidating(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep('select');
    setWizardError(null);
    setWizardFile(null);
    setWizardFileName('');
    setWizardText('');
    setWizardValidation(null);
    setWizardMode('merge');
    setWizardResult(null);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardStep('select');
    setWizardError(null);
    setWizardResult(null);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWizardError(null);
    setWizardResult(null);
    setWizardStep('validating');

    try {
      const text = await file.text();
      setWizardText(text);
      setWizardFile(file);
      setWizardFileName(file.name);

      const result = await validateBackupFile(file);
      setWizardValidation(result);

      if (result.valid) {
        setWizardStep('summary');
      } else {
        setWizardError(`El backup no es válido: se encontraron ${result.errors.length} error(es).`);
        setWizardStep('select');
      }
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Error al validar el backup');
      setWizardStep('select');
    } finally {
      if (restoreFileInputRef.current) {
        restoreFileInputRef.current.value = '';
      }
    }
  };

  const executeRestore = async () => {
    if (!wizardText) return;

    setWizardError(null);
    setWizardStep('restoring');

    try {
      const result = await restoreBackupFile(wizardMode, wizardText);
      setWizardResult(result);
      setWizardStep('done');
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Error al restaurar el backup');
      setWizardStep('confirm');
    }
  };

  const tableCounts = wizardText ? parseTableCounts(wizardText) : [];
  const totalBackupRows = tableCounts.reduce((sum, entry) => sum + entry.rows, 0);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Configuración</h1>

      {message && (
        <div className={message.type === 'success' ? styles.adminAlertSuccess : styles.adminAlertError}>
          {message.text}
        </div>
      )}

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Backups</h2>
          <p style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 12 }}>
            Descargar un respaldo completo de la base de datos en formato JSON.
            Incluye todas las tablas del sistema: productos, ventas, clientes, créditos, proveedores, historial de
            precios y auditoría.
          </p>
          <div className={styles.actionButtonsRow} style={{ maxWidth: 480 }}>
            <a role="button" tabIndex={0} onClick={handleBackup}>
              <button
                className={styles.adminActionButton}
                onClick={handleBackup}
                disabled={backupLoading}
                style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRadius: '8px 0 0 8px' }}
              >
                {backupLoading ? 'Generando backup...' : 'Crear Backup'}
              </button>
            </a>
            <a role="button" tabIndex={0} onClick={openWizard}>
              <button
                className={styles.adminActionButton}
                onClick={openWizard}
                style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRadius: '0 8px 8px 0' }}
              >
                Restaurar Backup
              </button>
            </a>
          </div>
        </div>

        {wizardOpen && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Restaurar Backup</h2>

            {wizardError && <div className={styles.adminAlertError}>{wizardError}</div>}

            {wizardStep === 'select' && (
              <div>
                <p style={labelStyle}>
                  Seleccioná un archivo de backup JSON. Se validará su estructura, integridad y compatibilidad antes
                  de restaurar.
                </p>
                <input
                  ref={restoreFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  style={{ display: 'none' }}
                />
                <button
                  className={styles.adminActionButton}
                  onClick={() => restoreFileInputRef.current?.click()}
                  style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}
                >
                  Seleccionar archivo
                </button>{' '}
                <button
                  className={styles.adminActionButton}
                  onClick={closeWizard}
                  style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}
                >
                  Cancelar
                </button>
              </div>
            )}

            {wizardStep === 'validating' && <p className={styles.empty}>Validando backup...</p>}

            {wizardStep === 'summary' && wizardValidation && (
              <div>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 14, marginBottom: 12, background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                  Backup válido
                </div>
                <div style={cardStyle}>
                  <div><strong>Archivo:</strong> {wizardFileName}</div>
                  <div><strong>Versión:</strong> {wizardValidation.summary.version || 'N/A'}</div>
                  <div><strong>Fecha:</strong> {wizardValidation.summary.exportedAt ? new Date(wizardValidation.summary.exportedAt).toLocaleString() : 'N/A'}</div>
                  <div><strong>Registros totales:</strong> {totalBackupRows.toLocaleString()}</div>
                  <div><strong>Checksum:</strong> <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{wizardValidation.summary.checksum}</code></div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 6 }}>Tablas</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tabla</th>
                          <th>Registros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableCounts.map((entry) => (
                          <tr key={entry.table}>
                            <td>{entry.table}</td>
                            <td>{entry.rows.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {wizardValidation.warnings.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h3 style={{ color: '#fbbf24', fontSize: 14, marginBottom: 6 }}>Advertencias</h3>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {wizardValidation.warnings.map((w, i) => (
                        <li key={i} style={{ color: '#fbbf24', fontSize: 13 }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.backLink} style={{ marginTop: 16 }}>
                  <button className={styles.adminActionButton} onClick={() => setWizardStep('mode')} style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}>
                    Continuar
                  </button>{' '}
                  <button className={styles.adminActionButton} onClick={() => setWizardStep('select')} style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}>
                    Elegir otro archivo
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 'mode' && (
              <div>
                <h3 style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 8 }}>Elegí el modo de restauración</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setWizardMode('merge')}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 14,
                      borderRadius: 8,
                      border: wizardMode === 'merge' ? '2px solid #f7c59f' : '1px solid #363330',
                      background: wizardMode === 'merge' ? '#262320' : '#1e1d1b',
                      color: '#f5f2ec',
                    }}
                  >
                    <strong>Fusionar (recomendado)</strong>
                    <p style={{ margin: '6px 0 0', color: '#d3cdc4', fontSize: 13, lineHeight: 1.5 }}>
                      No borra información existente. Inserta registros nuevos y actualiza los existentes
                      conservando los UUID originales. Idempotente.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardMode('replace')}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 14,
                      borderRadius: 8,
                      border: wizardMode === 'replace' ? '2px solid #f7c59f' : '1px solid #363330',
                      background: wizardMode === 'replace' ? '#262320' : '#1e1d1b',
                      color: '#f5f2ec',
                    }}
                  >
                    <strong>Reemplazar</strong>
                    <p style={{ margin: '6px 0 0', color: '#d3cdc4', fontSize: 13, lineHeight: 1.5 }}>
                      Vacía la base y restaura todo el backup. Se crea automáticamente un snapshot de seguridad
                      del estado actual antes de comenzar.
                    </p>
                  </button>
                </div>

                <div className={styles.backLink} style={{ marginTop: 16 }}>
                  <button className={styles.adminActionButton} onClick={() => setWizardStep('confirm')} style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}>
                    Continuar
                  </button>{' '}
                  <button className={styles.adminActionButton} onClick={() => setWizardStep('summary')} style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}>
                    Volver
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 'confirm' && (
              <div>
                <div style={cardStyle}>
                  <div><strong>Archivo:</strong> {wizardFileName}</div>
                  <div><strong>Modo:</strong> {wizardMode === 'merge' ? 'Fusionar (recomendado)' : 'Reemplazar'}</div>
                  <div><strong>Registros a procesar:</strong> {totalBackupRows.toLocaleString()}</div>
                  <div><strong>Tablas:</strong> {tableCounts.length}</div>
                </div>

                {wizardMode === 'replace' ? (
                  <div className={styles.adminAlertError} style={{ marginTop: 12 }}>
                    Advertencia: el modo Reemplazar vaciará las tablas de la base y restaurará el contenido del
                    backup. Se generará automáticamente un snapshot de seguridad del estado actual, disponible para
                    descargar al finalizar.
                  </div>
                ) : (
                  <div className={styles.adminAlertSuccess} style={{ marginTop: 12 }}>
                    El modo Fusionar no elimina datos existentes: inserta registros nuevos, actualiza los existentes
                    por UUID e ignora los conflictos resueltos.
                  </div>
                )}

                <div className={styles.backLink} style={{ marginTop: 16 }}>
                  <button
                    className={styles.adminActionButton}
                    onClick={() => void executeRestore()}
                    style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}
                  >
                    Confirmar y restaurar
                  </button>{' '}
                  <button className={styles.adminActionButton} onClick={() => setWizardStep('mode')} style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}>
                    Volver
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 'restoring' && (
              <p className={styles.empty}>
                {wizardMode === 'replace' ? 'Generando snapshot y restaurando...' : 'Restaurando...'}
              </p>
            )}

            {wizardStep === 'done' && wizardResult && (
              <div>
                {wizardResult.success ? (
                  <div className={styles.adminAlertSuccess}>Backup restaurado correctamente.</div>
                ) : (
                  <div className={styles.adminAlertError}>
                    El restore falló{wizardResult.rollbackApplied ? ' y se aplicó un rollback al estado anterior' : ''}.
                  </div>
                )}

                <div style={cardStyle}>
                  <div><strong>Modo:</strong> {wizardResult.mode === 'merge' ? 'Fusionar' : 'Reemplazar'}</div>
                  <div><strong>Duración:</strong> {formatDuration(wizardResult.durationMs)}</div>
                  <div><strong>Insertados:</strong> {wizardResult.totalInserted.toLocaleString()}</div>
                  <div><strong>Actualizados:</strong> {wizardResult.totalUpdated.toLocaleString()}</div>
                  <div><strong>Ignorados:</strong> {wizardResult.totalIgnored.toLocaleString()}</div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h3 style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 6 }}>Detalle por tabla</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tabla</th>
                          <th>En backup</th>
                          <th>Insertados</th>
                          <th>Actualizados</th>
                          <th>Ignorados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wizardResult.tables.map((entry) => (
                          <tr key={entry.table}>
                            <td>{entry.table}</td>
                            <td>{entry.backupRows.toLocaleString()}</td>
                            <td>{entry.inserted.toLocaleString()}</td>
                            <td>{entry.updated.toLocaleString()}</td>
                            <td>{entry.ignored.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {wizardResult.snapshot && (
                  <div className={styles.backLink} style={{ marginTop: 12 }}>
                    <button
                      className={styles.adminActionButton}
                      onClick={() => downloadSnapshot(wizardResult.snapshot)}
                      style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}
                    >
                      Descargar snapshot de seguridad
                    </button>
                  </div>
                )}

                {wizardResult.warnings.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h3 style={{ color: '#fbbf24', fontSize: 14, marginBottom: 6 }}>Advertencias</h3>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {wizardResult.warnings.map((w, i) => (
                        <li key={i} style={{ color: '#fbbf24', fontSize: 13 }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {wizardResult.errors.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h3 style={{ color: '#f87171', fontSize: 14, marginBottom: 6 }}>Errores</h3>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {wizardResult.errors.map((e, i) => (
                        <li key={i} style={{ color: '#f87171', fontSize: 13 }}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.backLink} style={{ marginTop: 16 }}>
                  <button className={styles.adminActionButton} onClick={closeWizard} style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Validar Backup</h2>
          <p style={{ color: '#d3cdc4', fontSize: 14, marginBottom: 12 }}>
            Seleccionar un archivo de backup JSON para validar su estructura, integridad y consistencia.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={validating}
            style={{ display: 'none' }}
          />
          <button
            className={styles.adminActionButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={validating}
            style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}
          >
            {validating ? 'Validando...' : 'Seleccionar archivo'}
          </button>

          {validationResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 12,
                background: validationResult.valid ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                color: validationResult.valid ? '#34d399' : '#f87171',
              }}>
                {validationResult.valid ? 'Backup válido' : 'Backup inválido'}
              </div>

              <div style={cardStyle}>
                <div><strong>Versión:</strong> {validationResult.summary.version || 'N/A'}</div>
                <div><strong>Fecha:</strong> {validationResult.summary.exportedAt ? new Date(validationResult.summary.exportedAt).toLocaleString() : 'N/A'}</div>
                <div><strong>Tablas:</strong> {validationResult.summary.tables}</div>
                <div><strong>Registros:</strong> {validationResult.summary.rows.toLocaleString()}</div>
                <div><strong>Checksum:</strong> <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{validationResult.summary.checksum}</code></div>
              </div>

              {validationResult.warnings.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ color: '#fbbf24', fontSize: 14, marginBottom: 6 }}>Advertencias</h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationResult.warnings.map((w, i) => (
                      <li key={i} style={{ color: '#fbbf24', fontSize: 13 }}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.errors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ color: '#f87171', fontSize: 14, marginBottom: 6 }}>Errores</h3>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationResult.errors.map((e, i) => (
                      <li key={i} style={{ color: '#f87171', fontSize: 13 }}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <AdminBackupHistory />
      </div>
    </div>
  );
}
