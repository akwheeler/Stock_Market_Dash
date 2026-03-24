'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { EnrichedRow } from '@/types';
import { formatVolume, formatDate } from '@/lib/utils/format';

interface VolumeChartProps {
  data: EnrichedRow[];
}

interface ChartRow {
  date: string;
  volume: number;
  volumeSma20: number | null;
  isUp: boolean;
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
          {entry.name}: {typeof entry.value === 'number' ? formatVolume(entry.value) : '—'}
        </p>
      ))}
    </div>
  );
}

export default function VolumeChart({ data }: VolumeChartProps) {
  const chartData: ChartRow[] = data.map((row) => ({
    date: row.date,
    volume: row.volume,
    volumeSma20: row.volumeSma20,
    isUp: row.close >= row.open,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
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
          tickFormatter={formatVolume}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />

        <Bar dataKey="volume" name="Volume" isAnimationActive={false}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isUp ? '#00e676' : '#ff1744'}
              fillOpacity={0.6}
            />
          ))}
        </Bar>

        <Line
          type="monotone"
          dataKey="volumeSma20"
          stroke="#ffab00"
          strokeWidth={1.5}
          dot={false}
          name="Vol SMA 20"
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
