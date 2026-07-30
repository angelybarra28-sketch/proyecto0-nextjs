'use client';

import { useCallback, useRef, useState } from 'react';
import { downloadBackup, validateBackupFile, type ValidationResponse } from '@/lib/services/admin/backup-client';
import styles from '@/styles/Admin.module.css';

export function AdminConfiguracionPage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            Incluye todas las tablas del sistema: productos, ventas, clientes, créditos, proveedores y auditoría.
          </p>
          <button
            className={styles.adminActionButton}
            onClick={handleBackup}
            disabled={backupLoading}
            style={{ minHeight: 48, width: 'auto', padding: '12px 24px', borderRight: 'none', borderRadius: 8 }}
          >
            {backupLoading ? 'Generando backup...' : 'Crear Backup'}
          </button>
        </div>

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
                {validationResult.valid ? 'Backup v\u00e1lido' : 'Backup inv\u00e1lido'}
              </div>

              <div style={{
                background: '#1e1d1b',
                borderRadius: 8,
                padding: 16,
                border: '1px solid #363330',
                fontSize: 13,
                color: '#d3cdc4',
                lineHeight: 1.8,
              }}>
                <div><strong>Versi\u00f3n:</strong> {validationResult.summary.version || 'N/A'}</div>
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
      </div>
    </div>
  );
}
