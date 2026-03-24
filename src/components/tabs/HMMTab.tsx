'use client';

import { useMemo } from 'react';
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
import { EnrichedRow, HMMResult } from '@/types';
import { formatPercent } from '@/lib/utils/format';
import RegimeChart from '@/components/charts/RegimeChart';
import LossChart from '@/components/charts/LossChart';

interface HMMTabProps {
  data: EnrichedRow[];
  hmmResult: HMMResult | null;
}

const REGIME_COLORS: Record<number, string> = {
  0: '#ff1744',
  1: '#ffab00',
  2: '#00e676',
};

const REGIME_LABELS: Record<number, string> = {
  0: 'Bear',
  1: 'Neutral',
  2: 'Bull',
};

export default function HMMTab({ data, hmmResult }: HMMTabProps) {
  const regimeDistribution = useMemo(() => {
    if (!hmmResult) return [];
    const total = hmmResult.states.length;
    const counts: Record<number, number> = {};
    for (const s of hmmResult.states) {
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([state, count]) => ({
        state: Number(state),
        label: hmmResult.stateLabels[Number(state)] || REGIME_LABELS[Number(state)] || `State ${state}`,
        count,
        pct: (count / total) * 100,
      }))
      .sort((a, b) => a.state - b.state);
  }, [hmmResult]);

  if (!hmmResult) {
    return (
      <div className="card text-center text-[#64748b] py-16">
        <p className="text-lg mb-2">HMM model has not been trained yet</p>
        <p className="text-sm">Go to Settings to configure and train the model</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Regime Chart - full width */}
      <div className="card lg:col-span-2">
        <div className="card-header">Price with HMM Regime Overlay</div>
        <RegimeChart data={data} />
      </div>

      {/* Regime Distribution */}
      <div className="card">
        <div className="card-header">Regime Distribution</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={regimeDistribution} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 56 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={11}
              tick={{ fill: '#64748b' }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              domain={[0, 100]}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              tick={{ fill: '#64748b' }}
              width={56}
            />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Days']}
              labelStyle={{ color: '#64748b' }}
            />
            <Bar dataKey="pct" name="% of Days" isAnimationActive={false}>
              {regimeDistribution.map((entry, index) => (
                <Cell key={`dist-${index}`} fill={REGIME_COLORS[entry.state] || '#64748b'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Log-Likelihood Convergence */}
      <div className="card">
        <div className="card-header">Log-Likelihood Convergence</div>
        {hmmResult.logLikelihoods.length > 0 ? (
          <LossChart data={hmmResult.logLikelihoods} label="Log-Likelihood" />
        ) : (
          <div className="text-[#64748b] text-sm py-8 text-center">No convergence data available</div>
        )}
      </div>

      {/* State Parameters Table */}
      <div className="card">
        <div className="card-header">State Parameters</div>
        <div className="overflow-x-auto">
          <table className="signal-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Mean (mu)</th>
                <th>Std Dev (sigma)</th>
                <th>Ann. Volatility</th>
              </tr>
            </thead>
            <tbody>
              {hmmResult.means.map((mean, i) => (
                <tr key={i}>
                  <td>
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ color: REGIME_COLORS[i] || '#64748b' }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ background: REGIME_COLORS[i] || '#64748b' }}
                      />
                      {hmmResult.stateLabels[i] || REGIME_LABELS[i] || `State ${i}`}
                    </span>
                  </td>
                  <td className="font-mono">{formatPercent(mean * 100, 4)}</td>
                  <td className="font-mono">{(hmmResult.stds[i] * 100).toFixed(4)}%</td>
                  <td className="font-mono">{formatPercent(hmmResult.stds[i] * Math.sqrt(252) * 100, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transition Matrix */}
      <div className="card">
        <div className="card-header">Transition Matrix</div>
        <div className="overflow-x-auto">
          <table className="signal-table">
            <thead>
              <tr>
                <th>From \ To</th>
                {hmmResult.transitionMatrix[0]?.map((_, j) => (
                  <th key={j} style={{ color: REGIME_COLORS[j] || '#64748b' }}>
                    {hmmResult.stateLabels[j] || REGIME_LABELS[j] || `S${j}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hmmResult.transitionMatrix.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: REGIME_COLORS[i] || '#64748b', fontWeight: 600 }}>
                    {hmmResult.stateLabels[i] || REGIME_LABELS[i] || `S${i}`}
                  </td>
                  {row.map((prob, j) => {
                    const intensity = Math.min(prob, 1);
                    const bgColor =
                      i === j
                        ? `rgba(41, 121, 255, ${intensity * 0.5})`
                        : `rgba(100, 116, 139, ${intensity * 0.4})`;
                    return (
                      <td
                        key={j}
                        className="font-mono text-center"
                        style={{
                          background: bgColor,
                          borderRadius: 4,
                        }}
                      >
                        {(prob * 100).toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[#64748b] mt-2">
          Each row sums to 100%. Diagonal entries show regime persistence probability.
        </p>
      </div>
    </div>
  );
}
