'use client';

import {
  ComposedChart,
  Line,
  Area,
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

interface PriceChartProps {
  data: EnrichedRow[];
}

interface ChartRow {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  buyPrice: number | null;
  sellPrice: number | null;
  buySize: number;
  sellSize: number;
}

interface TooltipEntry {
  name?: string;
  value?: number | null;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDate(label ?? '')}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: 12, margin: '2px 0 0' }}>
          {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : '—'}
        </p>
      ))}
    </div>
  );
}

const triangleUp = (props: { cx?: number; cy?: number; payload?: ChartRow }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.buyPrice) return null;
  const size = 4 + payload.buySize * 8;
  return (
    <polygon
      points={`${cx},${cy - size} ${cx - size},${cy + size} ${cx + size},${cy + size}`}
      fill="#00e676"
      stroke="#00e676"
      strokeWidth={1}
    />
  );
};

const triangleDown = (props: { cx?: number; cy?: number; payload?: ChartRow }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.sellPrice) return null;
  const size = 4 + payload.sellSize * 8;
  return (
    <polygon
      points={`${cx},${cy + size} ${cx - size},${cy - size} ${cx + size},${cy - size}`}
      fill="#ff1744"
      stroke="#ff1744"
      strokeWidth={1}
    />
  );
};

export default function PriceChart({ data }: PriceChartProps) {
  const chartData: ChartRow[] = data.map((row) => ({
    date: row.date,
    close: row.close,
    sma20: row.sma20,
    sma50: row.sma50,
    bbUpper: row.bbUpper,
    bbLower: row.bbLower,
    buyPrice: row.signal === 'BUY' ? row.close : null,
    sellPrice: row.signal === 'SELL' ? row.close : null,
    buySize: row.signal === 'BUY' ? row.signalStrength : 0,
    sellSize: row.signal === 'SELL' ? row.signalStrength : 0,
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
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#64748b' }}
        />

        {/* Bollinger Bands shaded area */}
        <Area
          dataKey="bbUpper"
          stroke="none"
          fill="#64748b"
          fillOpacity={0.1}
          name="BB Upper"
          connectNulls
          isAnimationActive={false}
        />
        <Area
          dataKey="bbLower"
          stroke="none"
          fill="#0a0e17"
          fillOpacity={1}
          name="BB Lower"
          connectNulls
          isAnimationActive={false}
        />

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

        {/* SMA overlays */}
        <Line
          type="monotone"
          dataKey="sma20"
          stroke="#2979ff"
          strokeWidth={1}
          dot={false}
          name="SMA 20"
          connectNulls
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="sma50"
          stroke="#ffab00"
          strokeWidth={1}
          dot={false}
          name="SMA 50"
          connectNulls
          isAnimationActive={false}
        />

        {/* Buy signals */}
        <Scatter
          dataKey="buyPrice"
          name="Buy Signal"
          fill="#00e676"
          shape={triangleUp}
          isAnimationActive={false}
        />

        {/* Sell signals */}
        <Scatter
          dataKey="sellPrice"
          name="Sell Signal"
          fill="#ff1744"
          shape={triangleDown}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
