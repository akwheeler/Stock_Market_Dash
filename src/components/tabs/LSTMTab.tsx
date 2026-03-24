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
import { EnrichedRow, LSTMResult } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import ForecastChart from '@/components/charts/ForecastChart';
import LossChart from '@/components/charts/LossChart';

interface LSTMTabProps {
  data: EnrichedRow[];
  lstmResult: LSTMResult | null;
}

export default function LSTMTab({ data, lstmResult }: LSTMTabProps) {
  const { actualPrices, predictedPrices, futurePrices, errorDistribution, futureActual, futurePredicted, futureForecast } =
    useMemo(() => {
      if (!lstmResult) {
        return {
          actualPrices: [],
          predictedPrices: [],
          futurePrices: [],
          errorDistribution: [],
          futureActual: [],
          futurePredicted: [],
          futureForecast: [],
        };
      }

      const lookback = lstmResult.lookback;
      const predStart = lookback;

      const actual = data.map((d) => ({ date: d.date, price: d.close }));
      const predicted = lstmResult.predictions.map((p, i) => ({
        date: data[predStart + i]?.date ?? '',
        price: p,
      }));

      // Future predictions
      const lastDate = new Date(data[data.length - 1]?.date ?? Date.now());
      const future = lstmResult.futurePredictions.map((p, i) => {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i + 1);
        // Skip weekends
        while (d.getDay() === 0 || d.getDay() === 6) {
          d.setDate(d.getDate() + 1);
        }
        return { date: d.toISOString().split('T')[0], price: p };
      });

      // Error distribution
      const errors: { bin: string; count: number; isNegative: boolean }[] = [];
      const predErrors = lstmResult.predictions.map((p, i) => {
        const actualPrice = data[predStart + i]?.close ?? 0;
        return actualPrice !== 0 ? ((p - actualPrice) / actualPrice) * 100 : 0;
      });

      // Create histogram bins
      const binSize = 0.5;
      const minErr = Math.floor(Math.min(...predErrors) / binSize) * binSize;
      const maxErr = Math.ceil(Math.max(...predErrors) / binSize) * binSize;
      for (let b = minErr; b <= maxErr; b += binSize) {
        const count = predErrors.filter((e) => e >= b && e < b + binSize).length;
        if (count > 0) {
          errors.push({ bin: `${b.toFixed(1)}%`, count, isNegative: b < 0 });
        }
      }

      // For the 10-day forecast mini chart, show last 20 days of actual + future
      const tailActual = actual.slice(-20);
      const lastPredictions = predicted.slice(-20);

      return {
        actualPrices: actual,
        predictedPrices: predicted,
        futurePrices: future,
        errorDistribution: errors,
        futureActual: tailActual,
        futurePredicted: lastPredictions,
        futureForecast: future,
      };
    }, [data, lstmResult]);

  if (!lstmResult) {
    return (
      <div className="card text-center text-[#64748b] py-16">
        <p className="text-lg mb-2">LSTM model has not been trained yet</p>
        <p className="text-sm">Go to Settings to configure and train the model</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Prediction Chart - full width */}
      <div className="card lg:col-span-2">
        <div className="card-header">LSTM Prediction vs Actual</div>
        <ForecastChart
          actualPrices={actualPrices}
          predictedPrices={predictedPrices}
          futurePrices={futurePrices}
        />
      </div>

      {/* Training Loss Curve */}
      <div className="card">
        <div className="card-header">Training Loss Curve</div>
        {lstmResult.losses.length > 0 ? (
          <LossChart data={lstmResult.losses} label="MSE Loss" />
        ) : (
          <div className="text-[#64748b] text-sm py-8 text-center">No loss data available</div>
        )}
      </div>

      {/* 10-Day Forecast */}
      <div className="card">
        <div className="card-header">10-Day Forecast</div>
        <ForecastChart
          actualPrices={futureActual}
          predictedPrices={futurePredicted}
          futurePrices={futureForecast}
        />
      </div>

      {/* Error Distribution */}
      <div className="card">
        <div className="card-header">Prediction Error Distribution</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={errorDistribution} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="bin" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} interval={1} />
            <YAxis stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} width={36} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: '#64748b' }}
            />
            <Bar dataKey="count" name="Frequency" isAnimationActive={false}>
              {errorDistribution.map((entry, index) => (
                <Cell
                  key={`err-${index}`}
                  fill={entry.isNegative ? '#ff1744' : '#00e676'}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* MAE Metric Display */}
      <div className="card flex flex-col items-center justify-center">
        <div className="card-header">Model Accuracy</div>
        <div className="text-center space-y-4 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Mean Absolute Error</div>
            <div className="text-3xl font-bold text-[#2979ff]">{formatCurrency(lstmResult.mae)}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Hidden Size</div>
              <div className="text-lg font-bold text-[#e2e8f0]">{lstmResult.hiddenSize}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Lookback</div>
              <div className="text-lg font-bold text-[#e2e8f0]">{lstmResult.lookback}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#64748b] mb-1">Epochs</div>
              <div className="text-lg font-bold text-[#e2e8f0]">{lstmResult.epochs}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="lg:col-span-2">
        <p className="disclaimer">
          Disclaimer: LSTM predictions are generated by a simplified neural network trained in the browser. This model is
          for educational purposes only and should not be relied upon for financial decisions. Market behavior is
          influenced by countless factors that no model can fully capture.
        </p>
      </div>
    </div>
  );
}
