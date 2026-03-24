'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { EnrichedRow } from '@/types';
import { formatDate } from '@/lib/utils/format';

interface RSIChartProps {
  data: EnrichedRow[];
}

interface ChartRow {
  date: string;
  rsi: number | null;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number | null }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  let color = '#ffab00';
  if (typeof value === 'number') {
    if (value >= 70) color = '#ff1744';
    else if (value <= 30) color = '#00e676';
  }
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDate(label ?? '')}</p>
      <p style={{ color, fontSize: 12, margin: '2px 0 0' }}>
        RSI: {typeof value === 'number' ? value.toFixed(1) : '—'}
      </p>
    </div>
  );
}

export default function RSIChart({ data }: RSIChartProps) {
  const chartData: ChartRow[] = data.map((row) => ({
    date: row.date,
    rsi: row.rsi,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
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
          domain={[0, 100]}
          ticks={[0, 30, 50, 70, 100]}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />

        <ReferenceLine y={70} stroke="#ff1744" strokeDasharray="4 4" strokeOpacity={0.7} />
        <ReferenceLine y={30} stroke="#00e676" strokeDasharray="4 4" strokeOpacity={0.7} />
        <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 2" strokeOpacity={0.4} />

        <Area
          type="monotone"
          dataKey="rsi"
          stroke="#ffab00"
          strokeWidth={1.5}
          fill="#ffab00"
          fillOpacity={0.1}
          connectNulls
          name="RSI"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
