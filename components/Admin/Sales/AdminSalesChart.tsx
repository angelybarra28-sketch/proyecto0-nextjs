'use client';

import { useState } from 'react';
import styles from '@/styles/Admin.module.css';

type MonthlyData = {
  month: string;
  revenue: number;
  collected: number;
};

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  if (!year || !month) return monthStr;
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const idx = parseInt(month, 10) - 1;
  return `${monthNames[idx] ?? month} ${year}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

export function AdminSalesChart({ monthly }: { monthly: MonthlyData[] }) {
  const [open, setOpen] = useState(false);

  if (monthly.length === 0) return null;

  const width = 720;
  const height = 260;
  const paddingX = 56;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const maxValue = Math.max(...monthly.map((d) => Math.max(d.revenue, d.collected)), 1);
  const stepX = monthly.length > 1 ? chartWidth / (monthly.length - 1) : chartWidth;

  const revenuePoints = monthly.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = height - paddingY - (d.revenue / maxValue) * chartHeight;
    return { x, y, value: d.revenue, label: formatMonthLabel(d.month) };
  });

  const collectedPoints = monthly.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = height - paddingY - (d.collected / maxValue) * chartHeight;
    return { x, y, value: d.collected, label: formatMonthLabel(d.month) };
  });

  const revenuePath = revenuePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const collectedPath = collectedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const zeroY = height - paddingY;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = (maxValue / 4) * i;
    const y = height - paddingY - (v / maxValue) * chartHeight;
    return { y, value: v };
  });

  return (
    <section className={styles.section}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Gráfico mensual</h2>
        <button onClick={() => setOpen(!open)} className={styles.compactBtn}>
          {open ? 'Ocultar gráfico' : 'Ver gráfico mensual'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: '#059669', display: 'inline-block' }} />
              Ventas realizadas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: '#dc2626', display: 'inline-block' }} />
              Ventas finalizadas
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 480, height: 'auto' }}>
              {yTicks.map((t, i) => (
                <line key={`grid-${i}`} x1={paddingX} y1={t.y} x2={width - paddingX} y2={t.y} stroke="#363330" strokeDasharray="4 4" />
              ))}

              <line x1={paddingX} y1={zeroY} x2={width - paddingX} y2={zeroY} stroke="#5a5248" strokeWidth={1} />
              <line x1={paddingX} y1={paddingY} x2={paddingX} y2={zeroY} stroke="#5a5248" strokeWidth={1} />

              <path d={revenuePath} fill="none" stroke="#059669" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <path d={`${revenuePath} L ${revenuePoints[revenuePoints.length - 1].x} ${zeroY} L ${revenuePoints[0].x} ${zeroY} Z`} fill="rgba(5,150,105,0.06)" />

              <path d={collectedPath} fill="none" stroke="#dc2626" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              <path d={`${collectedPath} L ${collectedPoints[collectedPoints.length - 1].x} ${zeroY} L ${collectedPoints[0].x} ${zeroY} Z`} fill="rgba(220,38,38,0.06)" />

              {revenuePoints.map((p, i) => (
                <g key={`r-${i}`}>
                  <text x={p.x} y={p.y - 10} fontSize={10} fontWeight={600} textAnchor="middle" fill="#059669">
                    {formatCurrency(p.value)}
                  </text>
                  <circle cx={p.x} cy={p.y} r={4} fill="#059669" stroke="#1e1d1b" strokeWidth={2} />
                </g>
              ))}

              {collectedPoints.map((p, i) => (
                <g key={`c-${i}`}>
                  <text x={p.x} y={p.y - 10} fontSize={10} fontWeight={600} textAnchor="middle" fill="#dc2626">
                    {formatCurrency(p.value)}
                  </text>
                  <circle cx={p.x} cy={p.y} r={4} fill="#dc2626" stroke="#1e1d1b" strokeWidth={2} />
                </g>
              ))}

              {revenuePoints.map((p, i) => (
                <text key={`xl-${i}`} x={p.x} y={zeroY + 18} fontSize={10} textAnchor="middle" fill="#8a7e72" fontWeight={500}>
                  {p.label}
                </text>
              ))}

              {yTicks.map((t, i) => (
                <text key={`yt-${i}`} x={paddingX - 8} y={t.y + 4} fontSize={10} textAnchor="end" fill="#8a7e72">
                  {formatCurrency(t.value)}
                </text>
              ))}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
