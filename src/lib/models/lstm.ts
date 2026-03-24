/**
 * Simplified LSTM (single-layer gated recurrent network) for stock price prediction.
 *
 * Implements a single-layer recurrent network with input, forget, and output gates
 * trained via backpropagation through time (BPTT) on min-max normalized closing prices.
 *
 * @module lstm
 */

import type { LSTMResult } from '@/types';

// ---------------------------------------------------------------------------
// Activation helpers
// ---------------------------------------------------------------------------

/** Standard sigmoid activation clamped to avoid numerical overflow. */
function sigmoid(x: number): number {
  const clamped = Math.max(-15, Math.min(15, x));
  return 1 / (1 + Math.exp(-clamped));
}

/** Derivative of sigmoid given the *output* of sigmoid. */
function sigmoidDeriv(s: number): number {
  return s * (1 - s);
}

/** Hyperbolic tangent. */
function tanh(x: number): number {
  return Math.tanh(x);
}

/** Derivative of tanh given the *output* of tanh. */
function tanhDeriv(t: number): number {
  return 1 - t * t;
}

// ---------------------------------------------------------------------------
// Min-max normalization helpers
// ---------------------------------------------------------------------------

/**
 * Normalize an array of values to the 0-1 range using min-max scaling.
 *
 * @returns An object containing the normalized array and the min/max used for
 *          later denormalization.
 */
function minMaxNormalize(values: number[]): {
  normalized: number[];
  min: number;
  max: number;
} {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid division by zero
  const normalized = values.map((v) => (v - min) / range);
  return { normalized, min, max };
}

/**
 * Denormalize a single value from 0-1 range back to the original scale.
 */
function denormalize(value: number, min: number, max: number): number {
  return value * (max - min) + min;
}

// ---------------------------------------------------------------------------
// Random initialization helpers
// ---------------------------------------------------------------------------

/** Xavier-style initialization scaled by fan-in. */
function randWeight(fanIn: number): number {
  const limit = Math.sqrt(6 / fanIn);
  return (Math.random() * 2 - 1) * limit;
}

/** Create a zero-filled 1-D array. */
function zeros(n: number): number[] {
  return new Array<number>(n).fill(0);
}

/** Create a 2-D weight matrix with Xavier-initialized values. */
function randomMatrix(rows: number, cols: number): number[][] {
  const fanIn = cols;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randWeight(fanIn)),
  );
}

// ---------------------------------------------------------------------------
// LSTM cell types (internal)
// ---------------------------------------------------------------------------

/** Weights for a single LSTM gate (input→hidden and hidden→hidden). */
interface GateWeights {
  /** Weight matrix from input to gate, shape [hiddenSize x inputSize]. */
  Wi: number[][];
  /** Weight matrix from hidden to gate, shape [hiddenSize x hiddenSize]. */
  Wh: number[][];
  /** Bias vector, length hiddenSize. */
  b: number[];
}

/** All weight groups for the LSTM cell plus the output projection. */
interface LSTMWeights {
  /** Input gate weights. */
  inputGate: GateWeights;
  /** Forget gate weights. */
  forgetGate: GateWeights;
  /** Output gate weights. */
  outputGate: GateWeights;
  /** Cell candidate (g / c-tilde) weights. */
  cellGate: GateWeights;
  /** Output projection: hiddenSize → 1. */
  Wy: number[];
  /** Output projection bias (scalar). */
  by: number;
}

/** Cached activations for a single time-step (used during BPTT). */
interface StepCache {
  /** Input gate activation. */
  i: number[];
  /** Forget gate activation. */
  f: number[];
  /** Output gate activation. */
  o: number[];
  /** Cell candidate activation (tanh). */
  g: number[];
  /** Cell state after update. */
  c: number[];
  /** Hidden state after update. */
  h: number[];
  /** Network output (sigmoid). */
  y: number;
  /** Input vector for this time-step. */
  x: number[];
  /** Previous cell state. */
  cPrev: number[];
  /** Previous hidden state. */
  hPrev: number[];
}

// ---------------------------------------------------------------------------
// Gate forward helpers
// ---------------------------------------------------------------------------

/**
 * Compute the pre-activation (linear combination) for a single gate.
 *
 * z = Wi * x + Wh * hPrev + b
 */
function gateLinear(
  gate: GateWeights,
  x: number[],
  hPrev: number[],
  hiddenSize: number,
): number[] {
  const z = zeros(hiddenSize);
  const inputSize = x.length;
  for (let h = 0; h < hiddenSize; h++) {
    let sum = gate.b[h];
    for (let j = 0; j < inputSize; j++) {
      sum += gate.Wi[h][j] * x[j];
    }
    for (let j = 0; j < hiddenSize; j++) {
      sum += gate.Wh[h][j] * hPrev[j];
    }
    z[h] = sum;
  }
  return z;
}

// ---------------------------------------------------------------------------
// Core LSTM implementation
// ---------------------------------------------------------------------------

/**
 * Initialize all LSTM weights with Xavier initialization.
 */
function initWeights(inputSize: number, hiddenSize: number): LSTMWeights {
  const makeGate = (): GateWeights => ({
    Wi: randomMatrix(hiddenSize, inputSize),
    Wh: randomMatrix(hiddenSize, hiddenSize),
    b: zeros(hiddenSize),
  });
  return {
    inputGate: makeGate(),
    forgetGate: makeGate(),
    outputGate: makeGate(),
    cellGate: makeGate(),
    Wy: Array.from({ length: hiddenSize }, () => randWeight(hiddenSize)),
    by: 0,
  };
}

/**
 * Run the LSTM cell forward for a single time-step.
 *
 * @param weights  - Network weight parameters.
 * @param x        - Input vector for this step.
 * @param hPrev    - Previous hidden state.
 * @param cPrev    - Previous cell state.
 * @param H        - Hidden size.
 * @returns The cached activations for backpropagation.
 */
function forwardStep(
  weights: LSTMWeights,
  x: number[],
  hPrev: number[],
  cPrev: number[],
  H: number,
): StepCache {
  // Gate pre-activations
  const iZ = gateLinear(weights.inputGate, x, hPrev, H);
  const fZ = gateLinear(weights.forgetGate, x, hPrev, H);
  const oZ = gateLinear(weights.outputGate, x, hPrev, H);
  const gZ = gateLinear(weights.cellGate, x, hPrev, H);

  // Gate activations
  const iAct = iZ.map(sigmoid);
  const fAct = fZ.map(sigmoid);
  const oAct = oZ.map(sigmoid);
  const gAct = gZ.map(tanh);

  // Cell state update: c = f * cPrev + i * g
  const c = zeros(H);
  for (let h = 0; h < H; h++) {
    c[h] = fAct[h] * cPrev[h] + iAct[h] * gAct[h];
  }

  // Hidden state: h = o * tanh(c)
  const hState = zeros(H);
  const tanhC = c.map(tanh);
  for (let h = 0; h < H; h++) {
    hState[h] = oAct[h] * tanhC[h];
  }

  // Output projection: y = sigmoid(Wy . h + by)
  let yLinear = weights.by;
  for (let h = 0; h < H; h++) {
    yLinear += weights.Wy[h] * hState[h];
  }
  const y = sigmoid(yLinear);

  return {
    i: iAct,
    f: fAct,
    o: oAct,
    g: gAct,
    c,
    h: hState,
    y,
    x: [...x],
    cPrev: [...cPrev],
    hPrev: [...hPrev],
  };
}

/**
 * Run the network forward over a full sequence of inputs.
 *
 * @param weights   - Network weight parameters.
 * @param sequence  - Array of input vectors, one per time-step.
 * @param H         - Hidden size.
 * @returns Array of step caches (one per time-step).
 */
function forwardSequence(
  weights: LSTMWeights,
  sequence: number[][],
  H: number,
): StepCache[] {
  const caches: StepCache[] = [];
  let hPrev = zeros(H);
  let cPrev = zeros(H);

  for (const x of sequence) {
    const cache = forwardStep(weights, x, hPrev, cPrev, H);
    caches.push(cache);
    hPrev = cache.h;
    cPrev = cache.c;
  }

  return caches;
}

// ---------------------------------------------------------------------------
// Gradient accumulator type
// ---------------------------------------------------------------------------

interface GateGrads {
  dWi: number[][];
  dWh: number[][];
  db: number[];
}

interface WeightGrads {
  inputGate: GateGrads;
  forgetGate: GateGrads;
  outputGate: GateGrads;
  cellGate: GateGrads;
  dWy: number[];
  dby: number;
}

function zeroGateGrads(H: number, inputSize: number): GateGrads {
  return {
    dWi: Array.from({ length: H }, () => zeros(inputSize)),
    dWh: Array.from({ length: H }, () => zeros(H)),
    db: zeros(H),
  };
}

function zeroGrads(H: number, inputSize: number): WeightGrads {
  return {
    inputGate: zeroGateGrads(H, inputSize),
    forgetGate: zeroGateGrads(H, inputSize),
    outputGate: zeroGateGrads(H, inputSize),
    cellGate: zeroGateGrads(H, inputSize),
    dWy: zeros(H),
    dby: 0,
  };
}

// ---------------------------------------------------------------------------
// Backpropagation through time (BPTT)
// ---------------------------------------------------------------------------

/**
 * Accumulate gate gradients for one time-step and one gate.
 */
function accumulateGateGrads(
  grads: GateGrads,
  delta: number[],
  x: number[],
  hPrev: number[],
  H: number,
): void {
  const inputSize = x.length;
  for (let h = 0; h < H; h++) {
    grads.db[h] += delta[h];
    for (let j = 0; j < inputSize; j++) {
      grads.dWi[h][j] += delta[h] * x[j];
    }
    for (let j = 0; j < H; j++) {
      grads.dWh[h][j] += delta[h] * hPrev[j];
    }
  }
}

/**
 * Run BPTT across the unrolled sequence and return accumulated gradients.
 *
 * @param weights - Current network weights.
 * @param caches  - Forward-pass caches for each time-step.
 * @param targets - Target value for each time-step.
 * @param H       - Hidden size.
 * @returns Accumulated weight gradients and the mean squared error loss.
 */
function backward(
  weights: LSTMWeights,
  caches: StepCache[],
  targets: number[],
  H: number,
): { grads: WeightGrads; loss: number } {
  const T = caches.length;
  const inputSize = caches[0].x.length;
  const grads = zeroGrads(H, inputSize);
  let totalLoss = 0;

  // Gradients flowing back through time
  let dhNext = zeros(H);
  let dcNext = zeros(H);

  for (let t = T - 1; t >= 0; t--) {
    const cache = caches[t];
    const target = targets[t];

    // MSE loss derivative for this step: dL/dy = 2*(y - target) / T
    const error = cache.y - target;
    totalLoss += error * error;
    const dyRaw = (2 * error) / T;

    // Through sigmoid output: dL/dyLinear = dyRaw * sigmoid'(yLinear)
    const dyLinear = dyRaw * sigmoidDeriv(cache.y);

    // Output projection gradients
    grads.dby += dyLinear;
    for (let h = 0; h < H; h++) {
      grads.dWy[h] += dyLinear * cache.h[h];
    }

    // dL/dh from output projection + future steps
    const dh = zeros(H);
    for (let h = 0; h < H; h++) {
      dh[h] = dyLinear * weights.Wy[h] + dhNext[h];
    }

    // Through h = o * tanh(c)
    const tanhC = cache.c.map(tanh);
    const doGate = zeros(H); // dL/d(output gate pre-sigmoid)
    const dc = zeros(H);
    for (let h = 0; h < H; h++) {
      doGate[h] = dh[h] * tanhC[h] * sigmoidDeriv(cache.o[h]);
      dc[h] = dh[h] * cache.o[h] * tanhDeriv(tanhC[h]) + dcNext[h];
    }

    // Through c = f * cPrev + i * g
    const diGate = zeros(H);
    const dfGate = zeros(H);
    const dgGate = zeros(H);
    for (let h = 0; h < H; h++) {
      diGate[h] = dc[h] * cache.g[h] * sigmoidDeriv(cache.i[h]);
      dfGate[h] = dc[h] * cache.cPrev[h] * sigmoidDeriv(cache.f[h]);
      dgGate[h] = dc[h] * cache.i[h] * tanhDeriv(cache.g[h]);
    }

    // Accumulate weight gradients for each gate
    accumulateGateGrads(grads.inputGate, diGate, cache.x, cache.hPrev, H);
    accumulateGateGrads(grads.forgetGate, dfGate, cache.x, cache.hPrev, H);
    accumulateGateGrads(grads.outputGate, doGate, cache.x, cache.hPrev, H);
    accumulateGateGrads(grads.cellGate, dgGate, cache.x, cache.hPrev, H);

    // Propagate gradients to previous time-step through recurrent connections
    dhNext = zeros(H);
    for (let h = 0; h < H; h++) {
      for (let j = 0; j < H; j++) {
        dhNext[j] +=
          diGate[h] * weights.inputGate.Wh[h][j] +
          dfGate[h] * weights.forgetGate.Wh[h][j] +
          doGate[h] * weights.outputGate.Wh[h][j] +
          dgGate[h] * weights.cellGate.Wh[h][j];
      }
    }
    dcNext = zeros(H);
    for (let h = 0; h < H; h++) {
      dcNext[h] = dc[h] * cache.f[h];
    }
  }

  const loss = totalLoss / T;
  return { grads, loss };
}

// ---------------------------------------------------------------------------
// Weight update with gradient clipping
// ---------------------------------------------------------------------------

/** Clip a gradient value to [-clipVal, clipVal]. */
function clip(val: number, clipVal: number): number {
  return Math.max(-clipVal, Math.min(clipVal, val));
}

/** Apply a single gate's gradients to its weights. */
function applyGateGrads(
  gate: GateWeights,
  grads: GateGrads,
  lr: number,
  clipVal: number,
  H: number,
  inputSize: number,
): void {
  for (let h = 0; h < H; h++) {
    gate.b[h] -= lr * clip(grads.db[h], clipVal);
    for (let j = 0; j < inputSize; j++) {
      gate.Wi[h][j] -= lr * clip(grads.dWi[h][j], clipVal);
    }
    for (let j = 0; j < H; j++) {
      gate.Wh[h][j] -= lr * clip(grads.dWh[h][j], clipVal);
    }
  }
}

/**
 * Update all weights using the computed gradients with gradient clipping.
 */
function updateWeights(
  weights: LSTMWeights,
  grads: WeightGrads,
  lr: number,
  H: number,
  inputSize: number,
): void {
  const clipVal = 5.0;

  applyGateGrads(weights.inputGate, grads.inputGate, lr, clipVal, H, inputSize);
  applyGateGrads(weights.forgetGate, grads.forgetGate, lr, clipVal, H, inputSize);
  applyGateGrads(weights.outputGate, grads.outputGate, lr, clipVal, H, inputSize);
  applyGateGrads(weights.cellGate, grads.cellGate, lr, clipVal, H, inputSize);

  for (let h = 0; h < H; h++) {
    weights.Wy[h] -= lr * clip(grads.dWy[h], clipVal);
  }
  weights.by -= lr * clip(grads.dby, clipVal);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Train a simplified LSTM network on historical closing prices and produce
 * one-step-ahead predictions plus a 10-day forward forecast.
 *
 * The network uses a single recurrent layer with input, forget, and output
 * gates. Training is performed via backpropagation through time (BPTT) on
 * min-max normalized prices using MSE loss.
 *
 * @param prices      - Array of raw closing prices (chronological order).
 * @param hiddenSize  - Number of hidden units in the LSTM layer (default 12).
 * @param lookback    - Number of past days used as input window (default 20).
 * @param epochs      - Number of training epochs (default 60).
 * @param lr          - Learning rate for gradient descent (default 0.002).
 * @param onProgress  - Optional callback invoked after each epoch with the
 *                       current epoch index and training loss.
 * @returns An {@link LSTMResult} containing predictions, forecast, losses,
 *          MAE, and model configuration.
 */
export function trainLSTM(
  prices: number[],
  hiddenSize: number = 12,
  lookback: number = 20,
  epochs: number = 60,
  lr: number = 0.002,
  onProgress?: (epoch: number, loss: number) => void,
): LSTMResult {
  // -----------------------------------------------------------------------
  // 1. Normalize prices
  // -----------------------------------------------------------------------
  const { normalized, min, max } = minMaxNormalize(prices);

  // -----------------------------------------------------------------------
  // 2. Build training sequences (sliding window)
  // -----------------------------------------------------------------------
  // Each input is a window of `lookback` prices; each target is the next price.
  const inputSize = 1; // single feature: normalized close
  const sequences: { inputs: number[][]; target: number }[] = [];

  for (let i = lookback; i < normalized.length; i++) {
    const inputs: number[][] = [];
    for (let j = i - lookback; j < i; j++) {
      inputs.push([normalized[j]]);
    }
    sequences.push({ inputs, target: normalized[i] });
  }

  if (sequences.length === 0) {
    // Not enough data – return empty result
    return {
      predictions: [],
      futurePredictions: [],
      losses: [],
      mae: 0,
      lookback,
      hiddenSize,
      epochs,
    };
  }

  // -----------------------------------------------------------------------
  // 3. Initialize weights
  // -----------------------------------------------------------------------
  const weights = initWeights(inputSize, hiddenSize);

  // -----------------------------------------------------------------------
  // 4. Training loop
  // -----------------------------------------------------------------------
  const losses: number[] = [];

  for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = 0;

    for (const seq of sequences) {
      // Forward pass through the lookback window
      const caches = forwardSequence(weights, seq.inputs, hiddenSize);

      // We only care about the prediction at the last time-step
      const lastCache = caches[caches.length - 1];

      // Build a targets array (only last step contributes to loss)
      const targets = caches.map((_, idx) =>
        idx === caches.length - 1 ? seq.target : lastCache.y,
      );
      // Zero out loss contribution for non-final steps by setting target = output
      // (this makes their error zero).
      // Actually, for cleaner BPTT we only backprop from the last step:
      const singleTarget = [seq.target];
      const singleCache = [lastCache];

      const { grads, loss } = backward(weights, singleCache, singleTarget, hiddenSize);
      epochLoss += loss;

      updateWeights(weights, grads, lr, hiddenSize, inputSize);
    }

    const avgLoss = epochLoss / sequences.length;
    losses.push(avgLoss);

    if (onProgress) {
      onProgress(epoch, avgLoss);
    }
  }

  // -----------------------------------------------------------------------
  // 5. Generate one-step-ahead predictions for each training window
  // -----------------------------------------------------------------------
  const normalizedPredictions: number[] = [];

  for (const seq of sequences) {
    const caches = forwardSequence(weights, seq.inputs, hiddenSize);
    normalizedPredictions.push(caches[caches.length - 1].y);
  }

  // Denormalize predictions and pad the front with NaN-replaced values
  const predictions: number[] = new Array<number>(lookback).fill(prices[lookback - 1]);
  for (const np of normalizedPredictions) {
    predictions.push(denormalize(np, min, max));
  }

  // -----------------------------------------------------------------------
  // 6. Compute MAE against actual prices
  // -----------------------------------------------------------------------
  let maeSum = 0;
  let maeCount = 0;
  for (let i = lookback; i < prices.length; i++) {
    maeSum += Math.abs(predictions[i] - prices[i]);
    maeCount++;
  }
  const mae = maeCount > 0 ? maeSum / maeCount : 0;

  // -----------------------------------------------------------------------
  // 7. Generate 10-day forward forecast from the last known window
  // -----------------------------------------------------------------------
  const forecastSteps = 10;
  const futurePredictions: number[] = [];

  // Seed with the last `lookback` normalized values
  const window = normalized.slice(-lookback);

  for (let step = 0; step < forecastSteps; step++) {
    const inputs = window.map((v) => [v]);
    const caches = forwardSequence(weights, inputs, hiddenSize);
    const nextNorm = caches[caches.length - 1].y;
    futurePredictions.push(denormalize(nextNorm, min, max));

    // Slide window forward
    window.shift();
    window.push(nextNorm);
  }

  return {
    predictions,
    futurePredictions,
    losses,
    mae,
    lookback,
    hiddenSize,
    epochs,
  };
}
