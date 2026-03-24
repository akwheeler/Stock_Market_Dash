import { OHLCVRow, EnrichedRow } from '@/types';
import { sma, ema, mean, std } from '@/lib/utils/math';

/**
 * Compute all technical indicators from raw OHLCV data.
 * Returns enriched rows with computed features. HMM state, LSTM prediction,
 * and signal fields are initialized to defaults and filled in later.
 */
export function computeFeatures(data: OHLCVRow[]): EnrichedRow[] {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);

  // Moving averages
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const volSma20 = sma(volumes, 20);

  // MACD
  const macdLine: (number | null)[] = ema12.map((e12, i) => {
    const e26 = ema26[i];
    return e12 !== null && e26 !== null ? e12 - e26 : null;
  });

  // MACD Signal line (9-period EMA of MACD)
  const macdValues = macdLine.filter((v): v is number => v !== null);
  const macdSignalRaw = ema(macdValues, 9);
  let macdIdx = 0;
  const macdSignal: (number | null)[] = macdLine.map(v => {
    if (v === null) return null;
    const sig = macdSignalRaw[macdIdx++] ?? null;
    return sig;
  });

  // RSI (14-period)
  const rsiValues = computeRSI(closes, 14);

  // Bollinger Bands
  const bbUpper: (number | null)[] = [];
  const bbLower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const smaVal = sma20[i];
    if (smaVal === null || i < 19) {
      bbUpper.push(null);
      bbLower.push(null);
    } else {
      const slice = closes.slice(i - 19, i + 1);
      const sd = std(slice);
      bbUpper.push(smaVal + 2 * sd);
      bbLower.push(smaVal - 2 * sd);
    }
  }

  // ATR (14-period)
  const atrValues = computeATR(highs, lows, closes, 14);

  // Build enriched rows
  return data.map((row, i) => {
    const dailyReturn = i > 0
      ? ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100
      : 0;
    const logReturn = i > 0
      ? Math.log(closes[i] / closes[i - 1]) * 100
      : 0;

    return {
      ...row,
      return: dailyReturn,
      logReturn,
      sma20: sma20[i],
      sma50: sma50[i],
      ema12: ema12[i],
      ema26: ema26[i],
      macd: macdLine[i],
      macdSignal: macdSignal[i],
      rsi: rsiValues[i],
      bbUpper: bbUpper[i],
      bbLower: bbLower[i],
      atr: atrValues[i],
      range: row.high - row.low,
      volumeSma20: volSma20[i],
      // These are filled in later by model outputs
      hmmState: -1,
      lstmPred: null,
      signal: null,
      signalStrength: 0,
      signalSources: [],
      signalReason: '',
    };
  });
}

/** Compute RSI (Relative Strength Index) */
function computeRSI(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [null]; // first element has no return

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const avgGain = mean(gains.slice(0, period));
      const avgLoss = mean(losses.slice(0, period));
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    } else {
      const prevRsi = result[i - 1];
      if (prevRsi === null) {
        result.push(null);
        continue;
      }
      // Use smoothed averages
      const prevAvgGain = (100 - prevRsi) === 0 ? mean(gains.slice(-period)) : 0;
      const change2 = closes[i] - closes[i - 1];
      const currentGain = change2 > 0 ? change2 : 0;
      const currentLoss = change2 < 0 ? -change2 : 0;

      // Wilder's smoothing
      const recentGains = gains.slice(Math.max(0, gains.length - period));
      const recentLosses = losses.slice(Math.max(0, losses.length - period));
      const avgGain = mean(recentGains);
      const avgLoss = mean(recentLosses);

      void prevAvgGain; void currentGain; void currentLoss;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    }
  }

  return result;
}

/** Compute Average True Range */
function computeATR(highs: number[], lows: number[], closes: number[], period: number): (number | null)[] {
  const trueRanges: number[] = [];
  const result: (number | null)[] = [];

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      trueRanges.push(highs[i] - lows[i]);
      result.push(null);
    } else {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);

      if (i < period) {
        result.push(null);
      } else {
        const atr = mean(trueRanges.slice(i - period + 1, i + 1));
        result.push(atr);
      }
    }
  }

  return result;
}
