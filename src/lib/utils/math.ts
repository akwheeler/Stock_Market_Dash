/** Compute the mean of an array of numbers */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Compute the standard deviation of an array */
export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Gaussian probability density function */
export function gaussianPDF(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) sigma = 1e-6;
  const coeff = 1 / (sigma * Math.sqrt(2 * Math.PI));
  const exponent = -0.5 * ((x - mu) / sigma) ** 2;
  return coeff * Math.exp(exponent);
}

/** Compute the Simple Moving Average */
export function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(mean(slice));
    }
  }
  return result;
}

/** Compute the Exponential Moving Average */
export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const initial = mean(data.slice(0, period));
      result.push(initial);
    } else {
      const prev = result[i - 1];
      if (prev === null) {
        result.push(null);
      } else {
        result.push(data[i] * k + prev * (1 - k));
      }
    }
  }
  return result;
}

/** Min-max normalize an array to [0, 1] */
export function minMaxNormalize(arr: number[]): { normalized: number[]; min: number; max: number } {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return {
    normalized: arr.map(v => (v - min) / range),
    min,
    max,
  };
}

/** Denormalize a value from [0, 1] back to original scale */
export function denormalize(value: number, min: number, max: number): number {
  return value * (max - min) + min;
}

/** Clip a value between min and max */
export function clip(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute log-sum-exp for numerical stability */
export function logSumExp(arr: number[]): number {
  const maxVal = Math.max(...arr);
  if (!isFinite(maxVal)) return -Infinity;
  const sum = arr.reduce((s, v) => s + Math.exp(v - maxVal), 0);
  return maxVal + Math.log(sum);
}
