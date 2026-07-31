'use client';

import { useEffect, useState } from 'react';
import type { PriceHistoryResponse } from '@/lib/services/admin/product-price-history';
import { fetchProductPriceHistory } from '@/lib/services/admin/client';
import styles from '@/styles/Admin.module.css';

type PriceHistoryTabProps = {
  productId: string;
};

type LoadState = { status: 'loading' } | { status: 'ready'; data: PriceHistoryResponse } | { status: 'error' };

function formatPrice(value: number): string {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatVariation(oldPrice: number, newPrice: number): { text: string; color: string } {
  const diff = newPrice - oldPrice;
  if (diff === 0) {
    return { text: 'Sin cambio', color: '#d3cdc4' };
  }
  const sign = diff > 0 ? '+' : '';
  return {
    text: `${sign}$${Math.abs(diff).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
    color: diff > 0 ? '#4ade80' : '#f87171',
  };
}

const summaryCardStyle: React.CSSProperties = {
  background: '#4a433a',
  color: '#f5f2ec',
  borderRadius: '6px',
  padding: '12px 14px',
};

export function PriceHistoryTab({ productId }: PriceHistoryTabProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetchProductPriceHistory(productId, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Error loading price history:', error);
        setState({ status: 'error' });
      });

    return () => controller.abort();
  }, [productId]);

  if (state.status === 'loading') {
    return <p className={styles.empty}>Cargando historial de precios...</p>;
  }

  if (state.status === 'error') {
    return <p className={styles.adminAlertError}>No se pudo cargar el historial de precios.</p>;
  }

  const { history, summary } = state.data;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          marginBottom: '1rem',
        }}
      >
        <div style={summaryCardStyle}>
          <div style={{ fontSize: '12px', color: '#d3cdc4' }}>Precio actual</div>
          <div style={{ fontWeight: 700, marginTop: '4px' }}>{formatPrice(summary.currentPrice)}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: '12px', color: '#d3cdc4' }}>Primer precio registrado</div>
          <div style={{ fontWeight: 700, marginTop: '4px' }}>
            {summary.firstPrice === null ? '—' : formatPrice(summary.firstPrice)}
          </div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: '12px', color: '#d3cdc4' }}>Cantidad de cambios</div>
          <div style={{ fontWeight: 700, marginTop: '4px' }}>{summary.changeCount}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={{ fontSize: '12px', color: '#d3cdc4' }}>Última modificación</div>
          <div style={{ fontWeight: 700, marginTop: '4px' }}>
            {summary.lastChangeAt ? formatDateTime(summary.lastChangeAt) : '—'}
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <p className={styles.empty}>
          Aún no hay cambios de precio registrados para este producto. Se registrarán automáticamente cuando
          modifiques el precio de venta.
        </p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Precio anterior</th>
                <th>Precio nuevo</th>
                <th>Variación</th>
                <th>Usuario</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const variation = formatVariation(entry.oldPrice, entry.newPrice);
                return (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{formatPrice(entry.oldPrice)}</td>
                    <td>{formatPrice(entry.newPrice)}</td>
                    <td style={{ color: variation.color, fontWeight: 600 }}>{variation.text}</td>
                    <td>{entry.changedByName ?? '—'}</td>
                    <td>{entry.reason ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
