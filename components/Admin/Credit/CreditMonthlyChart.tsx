type MonthlyData = {
  month: string;
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

type CreditMonthlyChartProps = {
  data: MonthlyData[];
};

export function CreditMonthlyChart({ data }: CreditMonthlyChartProps) {
  if (data.length === 0) return null;

  const width = 720;
  const height = 260;
  const paddingX = 56;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const maxValue = Math.max(...data.map((d) => d.collected), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = height - paddingY - (d.collected / maxValue) * chartHeight;
    return { x, y, value: d.collected, label: formatMonthLabel(d.month) };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const zeroY = height - paddingY;

  // Eje Y ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = (maxValue / 4) * i;
    const y = height - paddingY - (v / maxValue) * chartHeight;
    return { y, value: v };
  });

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 480, height: 'auto' }}>
        {/* Fondo grid horizontal */}
        {yTicks.map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={paddingX}
            y1={t.y}
            x2={width - paddingX}
            y2={t.y}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
        ))}

        {/* Eje X */}
        <line x1={paddingX} y1={zeroY} x2={width - paddingX} y2={zeroY} stroke="#9ca3af" strokeWidth={1} />

        {/* Eje Y */}
        <line x1={paddingX} y1={paddingY} x2={paddingX} y2={zeroY} stroke="#9ca3af" strokeWidth={1} />

        {/* Línea de datos */}
        <path d={pathD} fill="none" stroke="#667eea" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* Área bajo la línea (gradiente sutil) */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`}
          fill="rgba(102,126,234,0.08)"
        />

        {/* Puntos y labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={5} fill="#667eea" stroke="#fff" strokeWidth={2} />
            {/* Label mes debajo del eje X */}
            <text
              x={p.x}
              y={zeroY + 18}
              fontSize={10}
              textAnchor="middle"
              fill="#6b7280"
              fontWeight={500}
            >
              {p.label}
            </text>
            {/* Tooltip flotante con valor */}
            <rect
              x={p.x - 32}
              y={p.y - 30}
              width={64}
              height={20}
              rx={4}
              fill="#374151"
            />
            <text
              x={p.x}
              y={p.y - 16}
              fontSize={10}
              textAnchor="middle"
              fill="#fff"
              fontWeight={600}
            >
              {formatCurrency(p.value)}
            </text>
          </g>
        ))}

        {/* Labels eje Y */}
        {yTicks.map((t, i) => (
          <text
            key={`ytick-${i}`}
            x={paddingX - 8}
            y={t.y + 4}
            fontSize={10}
            textAnchor="end"
            fill="#9ca3af"
          >
            {formatCurrency(t.value)}
          </text>
        ))}
      </svg>
    </div>
  );
}
