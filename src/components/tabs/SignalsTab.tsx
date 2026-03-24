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
  AreaChart,
  Area,
} from 'recharts';
import { EnrichedRow, Signal, BacktestResult } from '@/types';
import { formatCurrency, formatPercent, formatDate, formatNumber } from '@/lib/utils/format';
import SignalBadge from '@/components/dashboard/SignalBadge';
import PriceChart from '@/components/charts/PriceChart';

interface SignalsTabProps {
  data: EnrichedRow[];
  signals: Signal[];
  backtest: BacktestResult | null;
}

const SOURCE_COLORS: Record<string, string> = {
  HMM: '#2979ff',
  SMA: '#ffab00',
  LSTM: '#00e676',
  MACD: '#e040fb',
};

export default function SignalsTab({ data, signals, backtest }: SignalsTabProps) {
  const recentSignals = useMemo(
    () => [...signals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50),
    [signals],
  );

  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of signals) {
      for (const src of s.sources) {
        counts[src] = (counts[src] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [signals]);

  const winCount = backtest ? backtest.trades.filter((t) => t.pnl > 0).length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Signal Chart - full width */}
      <div className="card lg:col-span-2">
        <div className="card-header">Price with Buy/Sell Signals</div>
        <PriceChart data={data} />
      </div>

      {/* Signal Log Table */}
      <div className="card lg:col-span-2">
        <div className="card-header">Signal Log (Last 50)</div>
        <div className="max-h-96 overflow-y-auto">
          <table className="signal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Signal</th>
                <th>Price</th>
                <th>Sources</th>
                <th>Reason</th>
                <th>Strength</th>
              </tr>
            </thead>
            <tbody>
              {recentSignals.map((s, i) => (
                <tr key={`${s.date}-${i}`}>
                  <td className="text-[#64748b]">{formatDate(s.date)}</td>
                  <td>
                    <SignalBadge direction={s.direction} size="sm" />
                  </td>
                  <td>{formatCurrency(s.price)}</td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {s.sources.map((src) => (
                        <span
                          key={src}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: `${SOURCE_COLORS[src] || '#64748b'}20`,
                            color: SOURCE_COLORS[src] || '#64748b',
                          }}
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-[#64748b] text-xs max-w-[200px] truncate">{s.reason}</td>
                  <td className="text-[#ffab00]">{s.strength}/4</td>
                </tr>
              ))}
              {recentSignals.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[#64748b] py-8">
                    No signals generated yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signal Source Breakdown */}
      <div className="card">
        <div className="card-header">Signal Source Breakdown</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sourceBreakdown} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} />
            <YAxis
              type="category"
              dataKey="source"
              stroke="#64748b"
              fontSize={11}
              tick={{ fill: '#64748b' }}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: '#64748b' }}
            />
            <Bar dataKey="count" name="Signals" isAnimationActive={false}>
              {sourceBreakdown.map((entry, index) => (
                <Cell key={`src-${index}`} fill={SOURCE_COLORS[entry.source] || '#64748b'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Backtest Results */}
      <div className="card">
        <div className="card-header">Backtest Results</div>
        {backtest ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0a0e17] rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Signal Return</div>
                <div
                  className={`text-lg font-bold ${backtest.totalReturn >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}`}
                >
                  {formatPercent(backtest.totalReturn)}
                </div>
              </div>
              <div className="bg-[#0a0e17] rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Buy &amp; Hold</div>
                <div
                  className={`text-lg font-bold ${backtest.buyHoldReturn >= 0 ? 'text-[#00e676]' : 'text-[#ff1744]'}`}
                >
                  {formatPercent(backtest.buyHoldReturn)}
                </div>
              </div>
              <div className="bg-[#0a0e17] rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Trades / Win Rate</div>
                <div className="text-lg font-bold text-[#ffab00]">
                  {backtest.trades.length} / {formatPercent(backtest.winRate, 0)}
                </div>
              </div>
            </div>

            {/* Equity Curve */}
            {backtest.equityCurve.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Equity Curve</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={backtest.equityCurve} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#64748b"
                      fontSize={10}
                      tick={{ fill: '#64748b' }}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tick={{ fill: '#64748b' }}
                      tickFormatter={(v: number) => formatCurrency(v)}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
                      labelFormatter={(label) => formatDate(String(label))}
                      formatter={(value) => [formatCurrency(Number(value)), 'Equity']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2979ff"
                      strokeWidth={1.5}
                      fill="#2979ff"
                      fillOpacity={0.15}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[#64748b] text-sm py-8 text-center">Run backtest to see results</div>
        )}
      </div>

      {/* Signal Logic Explanation */}
      <div className="card lg:col-span-2">
        <div className="card-header">Signal Logic Explanation</div>
        <div className="space-y-3 text-sm text-[#e2e8f0]">
          <div>
            <span className="text-[#2979ff] font-bold">HMM:</span>{' '}
            Generates BUY when the Hidden Markov Model transitions to a Bull regime, and SELL when it transitions to a
            Bear regime.
          </div>
          <div>
            <span className="text-[#ffab00] font-bold">SMA:</span>{' '}
            Golden cross (SMA20 crosses above SMA50) triggers BUY; death cross (SMA20 crosses below SMA50) triggers
            SELL.
          </div>
          <div>
            <span className="text-[#00e676] font-bold">LSTM:</span>{' '}
            Generates BUY when the LSTM predicted price exceeds the current price by more than the configured threshold,
            SELL when it falls below by the same threshold.
          </div>
          <div>
            <span className="text-[#e040fb] font-bold">MACD:</span>{' '}
            BUY when MACD line crosses above the signal line, SELL when it crosses below. Confirms momentum shifts.
          </div>
          <div className="text-[#64748b] text-xs pt-2">
            Signal strength (1-4) reflects how many sources agree on the same direction.
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="lg:col-span-2">
        <p className="disclaimer">
          Disclaimer: This is an educational tool. Signal generation and backtesting are based on historical data and
          simplified models. Past performance does not guarantee future results. Do not use these signals for actual
          trading decisions.
        </p>
      </div>
    </div>
  );
}
