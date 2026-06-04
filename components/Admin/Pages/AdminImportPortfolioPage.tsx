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
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Financiado</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{formatCurrency(preview.totalFinanced)}</p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, color: '#333' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Cobrado</p>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{formatCurrency(preview.totalCollected)}</p>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div style={{ background: '#fee2e2', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Errores bloqueantes ({preview.errors.length})</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#991b1b' }}>
                  {preview.errors.map((e, i) => (
                    <li key={i}>Fila {e.rowIndex + 1}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div style={{ background: '#fef3c7', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Advertencias ({preview.warnings.length})</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e' }}>
                  {preview.warnings.map((w, i) => (
                    <li key={i}>Fila {w.rowIndex + 1}: {w.message}</li>
                  ))}
                </ul>
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
                disabled={!confirmed || isImporting || preview.errors.length > 0}
                onClick={() => confirmImport(preview.rows)}
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
