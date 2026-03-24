'use client';

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EnrichedRow } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface SignalChartProps {
  data: EnrichedRow[];
}

interface ChartRow {
  date: string;
  close: number;
  buyPrice: number | null;
  sellPrice: number | null;
  buySize: number;
  sellSize: number;
  signalReason: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { payload?: ChartRow }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px', maxWidth: 260 }}>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDate(label ?? '')}</p>
      <p style={{ color: '#e2e8f0', fontSize: 12, margin: '2px 0 0' }}>
        Close: {row ? formatCurrency(row.close) : '—'}
      </p>
      {row?.buyPrice != null && (
        <p style={{ color: '#00e676', fontSize: 12, margin: '2px 0 0' }}>
          BUY ({(row.buySize * 100).toFixed(0)}%): {row.signalReason}
        </p>
      )}
      {row?.sellPrice != null && (
        <p style={{ color: '#ff1744', fontSize: 12, margin: '2px 0 0' }}>
          SELL ({(row.sellSize * 100).toFixed(0)}%): {row.signalReason}
        </p>
      )}
    </div>
  );
}

const buyDot = (props: { cx?: number; cy?: number; payload?: ChartRow }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.buyPrice) return null;
  const r = 3 + payload.buySize * 10;
  return (
    <polygon
      points={`${cx},${cy - r} ${cx - r * 0.9},${cy + r * 0.6} ${cx + r * 0.9},${cy + r * 0.6}`}
      fill="#00e676"
      fillOpacity={0.85}
      stroke="#00e676"
      strokeWidth={1}
    />
  );
};

const sellDot = (props: { cx?: number; cy?: number; payload?: ChartRow }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.sellPrice) return null;
  const r = 3 + payload.sellSize * 10;
  return (
    <polygon
      points={`${cx},${cy + r} ${cx - r * 0.9},${cy - r * 0.6} ${cx + r * 0.9},${cy - r * 0.6}`}
      fill="#ff1744"
      fillOpacity={0.85}
      stroke="#ff1744"
      strokeWidth={1}
    />
  );
};

export default function SignalChart({ data }: SignalChartProps) {
  const chartData: ChartRow[] = data.map((row) => ({
    date: row.date,
    close: row.close,
    buyPrice: row.signal === 'BUY' ? row.close : null,
    sellPrice: row.signal === 'SELL' ? row.close : null,
    buySize: row.signal === 'BUY' ? row.signalStrength : 0,
    sellSize: row.signal === 'SELL' ? row.signalStrength : 0,
    signalReason: row.signalReason,
  }));

  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.05;

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
          domain={[minPrice - padding, maxPrice + padding]}
          tickFormatter={(v: number) => formatCurrency(v)}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />

        {/* Price line */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#e2e8f0"
          strokeWidth={1.5}
          dot={false}
          name="Close"
          isAnimationActive={false}
        />

        {/* Buy markers */}
        <Scatter
          dataKey="buyPrice"
          name="Buy"
          fill="#00e676"
          shape={buyDot}
          isAnimationActive={false}
        />

        {/* Sell markers */}
        <Scatter
          dataKey="sellPrice"
          name="Sell"
          fill="#ff1744"
          shape={sellDot}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
