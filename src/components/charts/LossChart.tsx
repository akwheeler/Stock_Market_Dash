'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LossChartProps {
  data: number[];
  label?: string;
  title?: string;
}

interface ChartRow {
  epoch: number;
  loss: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload?: ChartRow; name?: string }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px' }}>
      {row && (
        <>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>Epoch {row.epoch}</p>
          <p style={{ color: '#2979ff', fontSize: 12, margin: '2px 0 0' }}>
            {payload[0]?.name ?? 'Loss'}: {row.loss.toExponential(3)}
          </p>
        </>
      )}
    </div>
  );
}

export default function LossChart({ data, label = 'Loss', title }: LossChartProps) {
  const chartData: ChartRow[] = data.map((loss, i) => ({
    epoch: i + 1,
    loss,
  }));

  return (
    <div>
      {title && (
        <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px 8px' }}>{title}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="epoch"
            stroke="#64748b"
            fontSize={11}
            tick={{ fill: '#64748b' }}
            label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tick={{ fill: '#64748b' }}
            tickFormatter={(v: number) => v.toExponential(1)}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="loss"
            stroke="#2979ff"
            strokeWidth={1.5}
            fill="#2979ff"
            fillOpacity={0.15}
            name={label}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
