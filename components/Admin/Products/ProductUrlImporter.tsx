'use client';

import { useState } from 'react';
import { importProductFromUrlAction } from '@/app/actions/importProduct';
import styles from '@/styles/Admin.module.css';

export type ImportedProductData = {
  name: string;
  description: string;
  images: string[];
  referencePrice: number | null;
  source: string;
  categoryName?: string;
};

type ProductUrlImporterProps = {
  onImport: (data: ImportedProductData) => void;
};

export function ProductUrlImporter({ onImport }: ProductUrlImporterProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastImport, setLastImport] = useState<ImportedProductData | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Ingresá una URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setLastImport(null);

    try {
      const result = await importProductFromUrlAction(url.trim());

      if (result.success) {
        setLastImport(result.data);
        onImport(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.section} style={{ marginBottom: '2rem' }}>
      <h3 className={styles.sectionTitle}>Importar desde URL del proveedor</h3>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="url"
          placeholder="https://zafiromayorista.mitiendanube.com/productos/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          style={{ flex: 1 }}
          className={styles.tableContainer}
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={isLoading || !url.trim()}
          className={styles.deleteBtn}
        >
          {isLoading ? 'Importando...' : 'Importar'}
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
        Soportado: MitiendaNube y MercadoLibre. Se extrae: nombre, descripción, imágenes y precio de referencia.
      </p>

      {error && (
        <p className={styles.adminAlertError} style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {lastImport && (
        <div style={{ 
          background: '#1a3a1a', 
          border: '1px solid #2d5a2d', 
          borderRadius: '4px', 
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <p className={styles.adminAlertSuccess} style={{ marginBottom: '0.5rem' }}>
            ✅ Producto importado correctamente
          </p>
          <div style={{ fontSize: '0.9rem', color: '#b8a89c' }}>
            <p><strong>Origen:</strong> {lastImport.source}</p>
            <p><strong>Nombre:</strong> {lastImport.name}</p>
            <p><strong>Imágenes:</strong> {lastImport.images.length} encontradas</p>
            {lastImport.referencePrice && (
              <p><strong>Precio de referencia:</strong> ${lastImport.referencePrice.toLocaleString('es-AR')}</p>
            )}
            {lastImport.categoryName && (
              <p><strong>Categoría detectada:</strong> {lastImport.categoryName}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
