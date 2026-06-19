'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminAccess } from '@/components/Admin/useAdminData';
import { useImportPortfolio } from '@/components/Admin/useImportPortfolio';
import styles from '@/styles/Admin.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export function AdminImportPortfolioPage() {
  const { isAdmin } = useAdminAccess();
  const {
    preview,
    result,
    isUploading,
    isImporting,
    error,
    confirmed,
    setConfirmed,
    uploadForPreview,
    confirmImport,
  } = useImportPortfolio();
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      alert('Formato no soportado. Use .xlsx, .xls o .csv');
      return;
    }
    await uploadForPreview(file);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  };

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Importación de Cartera Histórica</h1>
      <p className={styles.subtitle}>Suba la planilla Excel para importar ventas financiadas y pagos históricos</p>

      <div className={styles.sections}>
        {error && <div className={styles.adminAlertError}>{error}</div>}

        {!preview && !result && (
          <section className={styles.section}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragOver ? '#667eea' : '#ccc'}`,
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                background: dragOver ? '#f0f4ff' : '#fafafa',
                color: '#333',
                transition: 'all 0.2s ease',
              }}
            >
              <p style={{ color: '#555', marginBottom: 12 }}>
                Arrastre aquí su archivo Excel o CSV, o haga clic para seleccionar
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFileInput}
                style={{ display: 'none' }}
                id="portfolio-file-input"
              />
              <label htmlFor="portfolio-file-input">
                <button
                  className={styles.adminActionButton}
                  onClick={() => document.getElementById('portfolio-file-input')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Procesando...' : 'Seleccionar Archivo'}
                </button>
              </label>
            </div>
          </section>
        )}

        {preview && !result && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Preview de Importación</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Filas detectadas</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{preview.rowCount}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Clientes únicos</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{preview.uniqueCustomers}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Ventas (cuentas)</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{preview.accountCount}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Pagos detectados</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{preview.totalPayments}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Pagos mensuales</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{preview.stats.paymentsDetectedCount}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Financiado</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{formatCurrency(preview.totalFinanced)}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Cobrado</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{formatCurrency(preview.totalCollected)}</p>
              </div>
            </div>

            {/* Columnas críticas faltantes */}
            {preview.missingColumns.length > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Columnas críticas faltantes ({preview.missingColumns.length})</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#991b1b' }}>
                  {preview.missingColumns.map((col, i) => (
                    <li key={i}>{col}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modo seguro: resumen de importabilidad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, color: '#333', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: 12, color: '#166534', margin: 0 }}>Importables</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0', color: '#065f46' }}>{preview.stats.importableCount}</p>
              </div>
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, color: '#333', border: '1px solid #fde68a' }}>
                <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>Duplicadas en archivo</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0', color: '#92400e' }}>{preview.stats.duplicateInFileCount}</p>
              </div>
              <div style={{ background: '#fee2e2', borderRadius: 8, padding: 12, color: '#333', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>Inválidas</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0', color: '#991b1b' }}>{preview.stats.invalidCount}</p>
              </div>
            </div>

            {/* Estadísticas de calidad */}
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{ fontWeight: 700, color: '#374151', marginBottom: 12, fontSize: 14 }}>Calidad de datos detectada</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 13, color: '#4b5563' }}>
                <div>Producto vacío: <strong>{preview.stats.emptyProductCount}</strong></div>
                <div>Sin fecha de venta: <strong>{preview.stats.missingSaleDateCount}</strong></div>
                <div>Sin dirección: <strong>{preview.stats.missingAddressCount}</strong></div>
                <div>Sin tarjeta: <strong>{preview.stats.missingOperationNumberCount}</strong></div>
                <div>Sin nombre: <strong>{preview.stats.missingNameCount}</strong></div>
                {preview.stats.skippedEmptyRowCount > 0 && (
                  <div>Filas ignoradas (sin datos): <strong>{preview.stats.skippedEmptyRowCount}</strong></div>
                )}
              </div>
            </div>

            {/* Debug: columnas de meses detectadas */}
            <div style={{ background: preview.detectedMonthColumns && preview.detectedMonthColumns.length > 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: 16, marginBottom: 16, border: `1px solid ${preview.detectedMonthColumns && preview.detectedMonthColumns.length > 0 ? '#bbf7d0' : '#fecaca'}` }}>
              <p style={{ fontWeight: 700, color: '#374151', marginBottom: 8, fontSize: 14 }}>
                Columnas de meses detectadas: {preview.detectedMonthColumns ? preview.detectedMonthColumns.length : 0}
              </p>
              {preview.detectedMonthColumns && preview.detectedMonthColumns.length > 0 ? (
                <p style={{ fontSize: 13, color: '#166534', margin: 0, wordBreak: 'break-all' }}>
                  {preview.detectedMonthColumns.join(', ')}
                </p>
              ) : (
                <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>
                  No se detectaron columnas de meses. Los pagos mensuales NO se van a importar.
                  Las columnas deben tener encabezados como: 1, 2, ... 12 o ENERO, FEBRERO, etc.
                </p>
              )}
              {preview.rawHeadersSample && preview.rawHeadersSample.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
                    Ver todas las columnas del archivo ({preview.rawHeadersSample.length})
                  </summary>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0', wordBreak: 'break-all' }}>
                    {preview.rawHeadersSample.join(' | ')}
                  </p>
                </details>
              )}
            </div>

            {/* Debug: primeras filas con pagos */}
            {preview.rows.filter((r) => r.payments.length > 0).length > 0 && (
              <details style={{ marginBottom: 16 }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  Primeras filas con pagos mensuales ({preview.rows.filter((r) => r.payments.length > 0).length} filas con pagos)
                </summary>
                <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12, color: '#333', marginTop: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#e5e7eb' }}>
                        <th style={{ padding: 4, textAlign: 'left' }}>Tarjeta</th>
                        <th style={{ padding: 4, textAlign: 'left' }}>Nombre</th>
                        <th style={{ padding: 4, textAlign: 'left' }}>Cuota</th>
                        <th style={{ padding: 4, textAlign: 'left' }}>Total</th>
                        <th style={{ padding: 4, textAlign: 'left' }}>Pagado</th>
                        <th style={{ padding: 4, textAlign: 'left' }}>Fecha venta</th>
                        <th style={{ padding: 4, textAlign: 'left' }}>Pagos mes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.filter((r) => r.payments.length > 0).slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: 4 }}>{r.operationNumber ?? '-'}</td>
                          <td style={{ padding: 4 }}>{r.customerFullName}</td>
                          <td style={{ padding: 4 }}>{r.installmentAmount} x {r.installmentCount}</td>
                          <td style={{ padding: 4 }}>{r.totalAmount}</td>
                          <td style={{ padding: 4 }}>{r.accumulatedPayment}</td>
                          <td style={{ padding: 4 }}>{r.saleDate}</td>
                          <td style={{ padding: 4 }}>{r.payments.map((p) => `$${p.amount}@${p.paymentDate}`).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {preview.errors.length > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Errores bloqueantes ({preview.errors.length})</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#991b1b', maxHeight: 200, overflowY: 'auto' }}>
                  {preview.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>Fila {e.rowIndex + 1}: {e.message}</li>
                  ))}
                </ul>
                {preview.errors.length > 50 && (
                  <p style={{ color: '#991b1b', fontSize: 13, marginTop: 4 }}>...y {preview.errors.length - 50} errores más</p>
                )}
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Advertencias ({preview.warnings.length})</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e', maxHeight: 200, overflowY: 'auto' }}>
                  {preview.warnings.slice(0, 50).map((w, i) => (
                    <li key={i}>Fila {w.rowIndex + 1}: {w.message}</li>
                  ))}
                </ul>
                {preview.warnings.length > 50 && (
                  <p style={{ color: '#92400e', fontSize: 13, marginTop: 4 }}>...y {preview.warnings.length - 50} advertencias más</p>
                )}
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span style={{ fontSize: 14, color: '#333' }}>
                Revisé el preview, confirmo que los datos son correctos y deseo importar la cartera
              </span>
            </label>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className={styles.adminActionButton}
                disabled={!confirmed || isImporting || preview.stats.importableCount === 0}
                onClick={() => confirmImport(preview.importableRows)}
              >
                {isImporting ? 'Importando...' : 'Importar Cartera'}
              </button>
              <button className={styles.adminActionButton} onClick={() => { setConfirmed(false); uploadForPreview(new File([], '')); }} disabled>
                Cancelar
              </button>
            </div>
          </section>
        )}

        {result && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Resultado de la Importación</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Importados</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0', color: '#065f46' }}>{result.imported}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Omitidos por duplicado</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0', color: '#92400e' }}>{result.skipped}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Fallidos</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0', color: '#991b1b' }}>{result.failed}</p>
              </div>
            </div>

            {result.skippedDetails && result.skippedDetails.length > 0 && (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Cuentas omitidas ({result.skippedDetails.length})</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e' }}>
                  {result.skippedDetails.map((d, i) => (
                    <li key={i}>Fila {d.rowIndex + 1}: Tarjeta {d.operationNumber ?? '-'} — {d.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.details.some((d) => d.error) && (
              <div style={{ background: '#fee2e2', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Detalle de errores</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#991b1b' }}>
                  {result.details.filter((d) => d.error).map((d, i) => (
                    <li key={i}>Fila {d.rowIndex + 1}: {d.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/admin/cuenta-corriente">
                <button className={styles.adminActionButton}>Ir a Cuenta Corriente</button>
              </Link>
              <button className={styles.adminActionButton} onClick={() => window.location.reload()}>
                Importar otro archivo
              </button>
            </div>
          </section>
        )}
      </div>

      <div className={styles.backLink}>
        <Link href="/admin/cuenta-corriente">Volver a Cuenta Corriente</Link>
      </div>
    </div>
  );
}
