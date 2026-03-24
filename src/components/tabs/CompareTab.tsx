'use client';

import { useMemo } from 'react';
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
  BarChart,
} from 'recharts';
import { EnrichedRow, HMMResult, LSTMResult } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface CompareTabProps {
  data: EnrichedRow[];
  hmmResult: HMMResult | null;
  lstmResult: LSTMResult | null;
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

interface CombinedRow {
  date: string;
  close: number;
  lstmPred: number | null;
  hmmState: number;
  regimeBar: number;
}

function CombinedTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: CombinedRow }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px' }}>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{label ? formatDate(label) : ''}</p>
      {row && (
        <>
          <p style={{ color: '#e2e8f0', fontSize: 12, margin: '2px 0 0' }}>
            Close: {formatCurrency(row.close)}
          </p>
          {row.lstmPred != null && (
            <p style={{ color: '#2979ff', fontSize: 12, margin: '2px 0 0' }}>
              LSTM: {formatCurrency(row.lstmPred)}
            </p>
          )}
          <p style={{ color: REGIME_COLORS[row.hmmState] || '#64748b', fontSize: 12, margin: '2px 0 0' }}>
            Regime: {REGIME_LABELS[row.hmmState] || `State ${row.hmmState}`}
          </p>
        </>
      )}
    </div>
  );
}

export default function CompareTab({ data, hmmResult, lstmResult }: CompareTabProps) {
  const combinedData = useMemo(() => {
    const prices = data.map((d) => d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05;

    return data.map((row) => ({
      date: row.date,
      close: row.close,
      lstmPred: row.lstmPred,
      hmmState: row.hmmState,
      regimeBar: minPrice - padding,
    }));
  }, [data]);

  const errorByRegime = useMemo(() => {
    if (!hmmResult || !lstmResult) return [];

    const lookback = lstmResult.lookback;
    const errors: Record<number, number[]> = {};

    lstmResult.predictions.forEach((pred, i) => {
      const dataIdx = lookback + i;
      if (dataIdx >= data.length) return;
      const actual = data[dataIdx].close;
      const state = data[dataIdx].hmmState;
      if (!errors[state]) errors[state] = [];
      errors[state].push(Math.abs(pred - actual));
    });

    return Object.entries(errors)
      .map(([state, errs]) => ({
        state: Number(state),
        label: hmmResult.stateLabels[Number(state)] || REGIME_LABELS[Number(state)] || `State ${state}`,
        mae: errs.reduce((a, b) => a + b, 0) / errs.length,
        count: errs.length,
      }))
      .sort((a, b) => a.state - b.state);
  }, [data, hmmResult, lstmResult]);

  const prices = data.map((d) => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.05;

  const hasModels = hmmResult || lstmResult;

  if (!hasModels) {
    return (
      <div className="card text-center text-[#64748b] py-16">
        <p className="text-lg mb-2">No models trained yet</p>
        <p className="text-sm">Train at least one model in Settings to compare results</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Combined Chart - full width */}
      <div className="card lg:col-span-2">
        <div className="card-header">Combined: Price + LSTM Prediction + HMM Regime</div>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={combinedData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
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
            <Tooltip content={<CombinedTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />

            {/* Regime colored bars */}
            <Bar
              yAxisId="regime"
              dataKey="regimeBar"
              name="Regime"
              barSize={4}
              isAnimationActive={false}
            >
              {combinedData.map((entry, index) => (
                <Cell
                  key={`regime-${index}`}
                  fill={REGIME_COLORS[entry.hmmState] || '#64748b'}
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
              name="Actual"
              isAnimationActive={false}
            />

            {/* LSTM prediction overlay */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="lstmPred"
              stroke="#2979ff"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              name="LSTM Predicted"
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* LSTM Error by Regime */}
      <div className="card">
        <div className="card-header">LSTM Error by HMM Regime</div>
        {errorByRegime.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={errorByRegime} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(v: number) => formatCurrency(v)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
                  formatter={(value) => [formatCurrency(Number(value)), 'MAE']}
                  labelStyle={{ color: '#64748b' }}
                />
                <Bar dataKey="mae" name="MAE" isAnimationActive={false}>
                  {errorByRegime.map((entry, index) => (
                    <Cell key={`mae-${index}`} fill={REGIME_COLORS[entry.state] || '#64748b'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="text-xs text-[#64748b] mt-2">
              {errorByRegime.map((e) => (
                <span key={e.state} className="mr-4">
                  {e.label}: {e.count} samples
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-[#64748b] text-sm py-8 text-center">
            Train both HMM and LSTM models to see error by regime
          </div>
        )}
      </div>

      {/* Model Summary Table */}
      <div className="card">
        <div className="card-header">Model Summary</div>
        <div className="overflow-x-auto">
          <table className="signal-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th style={{ color: '#ffab00' }}>HMM</th>
                <th style={{ color: '#2979ff' }}>LSTM</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-[#64748b]">Architecture</td>
                <td>Gaussian HMM</td>
                <td>LSTM (Browser)</td>
              </tr>
              <tr>
                <td className="text-[#64748b]">States / Hidden Size</td>
                <td>{hmmResult ? hmmResult.means.length : '—'}</td>
                <td>{lstmResult ? lstmResult.hiddenSize : '—'}</td>
              </tr>
              <tr>
                <td className="text-[#64748b]">Iterations / Epochs</td>
                <td>{hmmResult ? hmmResult.logLikelihoods.length : '—'}</td>
                <td>{lstmResult ? lstmResult.epochs : '—'}</td>
              </tr>
              <tr>
                <td className="text-[#64748b]">Lookback Window</td>
                <td>—</td>
                <td>{lstmResult ? lstmResult.lookback : '—'}</td>
              </tr>
              <tr>
                <td className="text-[#64748b]">MAE</td>
                <td>—</td>
                <td>{lstmResult ? formatCurrency(lstmResult.mae) : '—'}</td>
              </tr>
              <tr>
                <td className="text-[#64748b]">Final Loss / Log-Likelihood</td>
                <td>
                  {hmmResult && hmmResult.logLikelihoods.length > 0
                    ? hmmResult.logLikelihoods[hmmResult.logLikelihoods.length - 1].toExponential(3)
                    : '—'}
                </td>
                <td>
                  {lstmResult && lstmResult.losses.length > 0
                    ? lstmResult.losses[lstmResult.losses.length - 1].toExponential(3)
                    : '—'}
                </td>
              </tr>
              <tr>
                <td className="text-[#64748b]">Output</td>
                <td>Regime labels</td>
                <td>Price predictions</td>
              </tr>
              <tr>
                <td className="text-[#64748b]">Forecast Horizon</td>
                <td>Current state</td>
                <td>{lstmResult ? `${lstmResult.futurePredictions.length} days` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
