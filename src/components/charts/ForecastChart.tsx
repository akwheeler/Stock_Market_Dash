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
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface ForecastChartProps {
  actualPrices: { date: string; price: number }[];
  predictedPrices: { date: string; price: number }[];
  futurePrices: { date: string; price: number }[];
}

interface ChartRow {
  date: string;
  actual: number | null;
  predicted: number | null;
  forecast: number | null;
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

export default function ForecastChart({ actualPrices, predictedPrices, futurePrices }: ForecastChartProps) {
  // Build a unified date-indexed dataset
  const dateMap = new Map<string, ChartRow>();

  for (const p of actualPrices) {
    dateMap.set(p.date, { date: p.date, actual: p.price, predicted: null, forecast: null });
  }
  for (const p of predictedPrices) {
    const existing = dateMap.get(p.date);
    if (existing) {
      existing.predicted = p.price;
    } else {
      dateMap.set(p.date, { date: p.date, actual: null, predicted: p.price, forecast: null });
    }
  }
  for (const p of futurePrices) {
    const existing = dateMap.get(p.date);
    if (existing) {
      existing.forecast = p.price;
    } else {
      dateMap.set(p.date, { date: p.date, actual: null, predicted: null, forecast: p.price });
    }
  }

  const chartData = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const allValues = chartData.flatMap((d) =>
    [d.actual, d.predicted, d.forecast].filter((v): v is number => v != null),
  );
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const pad = (maxVal - minVal) * 0.05;

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
          domain={[minVal - pad, maxVal + pad]}
          tickFormatter={(v: number) => formatCurrency(v)}
          stroke="#64748b"
          fontSize={11}
          tick={{ fill: '#64748b' }}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />

        {/* Actual price */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#e2e8f0"
          strokeWidth={1.5}
          dot={false}
          name="Actual"
          connectNulls
          isAnimationActive={false}
        />

        {/* Predicted price (dashed) */}
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#2979ff"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          name="Predicted"
          connectNulls
          isAnimationActive={false}
        />

        {/* Future forecast with dots */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#00e676"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          name="Forecast"
          connectNulls
          isAnimationActive={false}
        />
        <Scatter
          dataKey="forecast"
          fill="#00e676"
          name="Forecast Points"
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
