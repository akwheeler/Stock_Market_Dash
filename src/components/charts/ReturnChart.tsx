'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { EnrichedRow } from '@/types';
import { formatPercent, formatDate } from '@/lib/utils/format';

interface ReturnChartProps {
  data: EnrichedRow[];
}

interface ChartRow {
  date: string;
  return: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number | null }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDate(label ?? '')}</p>
      <p
        style={{
          color: typeof value === 'number' && value >= 0 ? '#00e676' : '#ff1744',
          fontSize: 12,
          margin: '2px 0 0',
        }}
      >
        Return: {typeof value === 'number' ? formatPercent(value) : '—'}
      </p>
    </div>
  );
}

export default function ReturnChart({ data }: ReturnChartProps) {
  const chartData: ChartRow[] = data.map((row) => ({
    date: row.date,
    return: row.return,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
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
          tickFormatter={(v: number) => formatPercent(v, 1)}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />

        <Bar dataKey="return" name="Daily Return" isAnimationActive={false}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.return >= 0 ? '#00e676' : '#ff1744'}
              fillOpacity={0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
