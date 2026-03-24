'use client';

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { EnrichedRow } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface RegimeChartProps {
  data: EnrichedRow[];
}

interface ChartRow {
  date: string;
  close: number;
  regimeBar: number;
  hmmState: number;
  regimeLabel: string;
}

const REGIME_COLORS: Record<number, string> = {
  0: '#ff1744', // Bear
  1: '#ffab00', // Neutral
  2: '#00e676', // Bull
};

const REGIME_LABELS: Record<number, string> = {
  0: 'Bear',
  1: 'Neutral',
  2: 'Bull',
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { payload?: ChartRow }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDate(label ?? '')}</p>
      {row && (
        <>
          <p style={{ color: '#e2e8f0', fontSize: 12, margin: '2px 0 0' }}>
            Close: {formatCurrency(row.close)}
          </p>
          <p style={{ color: REGIME_COLORS[row.hmmState] ?? '#64748b', fontSize: 12, margin: '2px 0 0' }}>
            Regime: {row.regimeLabel}
          </p>
        </>
      )}
    </div>
  );
}

export default function RegimeChart({ data }: RegimeChartProps) {
  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.05;

  const chartData: ChartRow[] = data.map((row) => ({
    date: row.date,
    close: row.close,
    regimeBar: minPrice - padding,
    hmmState: row.hmmState,
    regimeLabel: REGIME_LABELS[row.hmmState] ?? `State ${row.hmmState}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          yAxisId="price"
          domain={[minPrice - padding * 3, maxPrice + padding]}
          tickFormatter={(v: number) => formatCurrency(v)}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={72}
        />
        <YAxis yAxisId="regime" hide domain={[0, 1]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />

        {/* Regime colored bars at the bottom */}
        <Bar
          yAxisId="regime"
          dataKey="regimeBar"
          name="Regime"
          barSize={4}
          isAnimationActive={false}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`regime-${index}`}
              fill={REGIME_COLORS[entry.hmmState] ?? '#64748b'}
              fillOpacity={0.5}
            />
          ))}
        </Bar>

        {/* Price line */}
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="#e2e8f0"
          strokeWidth={1.5}
          dot={false}
          name="Close"
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
