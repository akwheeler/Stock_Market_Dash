'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface EquityCurveProps {
  equityCurve: { date: string; value: number }[];
  buyHoldCurve?: { date: string; value: number }[];
}

interface ChartRow {
  date: string;
  strategy: number | null;
  buyHold: number | null;
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
      {payload.map((entry) =>
        entry.value != null ? (
          <p key={entry.name} style={{ color: entry.color, fontSize: 12, margin: '2px 0 0' }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ) : null,
      )}
    </div>
  );
}

export default function EquityCurve({ equityCurve, buyHoldCurve }: EquityCurveProps) {
  const dateMap = new Map<string, ChartRow>();

  for (const p of equityCurve) {
    dateMap.set(p.date, { date: p.date, strategy: p.value, buyHold: null });
  }
  if (buyHoldCurve) {
    for (const p of buyHoldCurve) {
      const existing = dateMap.get(p.date);
      if (existing) {
        existing.buyHold = p.value;
      } else {
        dateMap.set(p.date, { date: p.date, strategy: null, buyHold: p.value });
      }
    }
  }

  const chartData = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
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
          tickFormatter={(v: number) => formatCurrency(v)}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />

        <Line
          type="monotone"
          dataKey="strategy"
          stroke="#00e676"
          strokeWidth={2}
          dot={false}
          name="Signal Strategy"
          connectNulls
          isAnimationActive={false}
        />

        {buyHoldCurve && (
          <Line
            type="monotone"
            dataKey="buyHold"
            stroke="#64748b"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name="Buy & Hold"
            connectNulls
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
