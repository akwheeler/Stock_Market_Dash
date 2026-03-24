/** Raw OHLCV price data row */
export interface OHLCVRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Enriched row with all computed indicators and model outputs */
export interface EnrichedRow extends OHLCVRow {
  return: number;
  logReturn: number;
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  rsi: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  atr: number | null;
  range: number;
  volumeSma20: number | null;
  hmmState: number;
  lstmPred: number | null;
  signal: 'BUY' | 'SELL' | null;
  signalStrength: number;
  signalSources: string[];
  signalReason: string;
}

/** HMM training result */
export interface HMMResult {
  states: number[];
  means: number[];
  stds: number[];
  transitionMatrix: number[][];
  logLikelihoods: number[];
  stateLabels: string[];
}

/** LSTM training result */
export interface LSTMResult {
  predictions: number[];
  futurePredictions: number[];
  losses: number[];
  mae: number;
  lookback: number;
  hiddenSize: number;
  epochs: number;
}

/** A single trading signal */
export interface Signal {
  date: string;
  direction: 'BUY' | 'SELL';
  price: number;
  sources: string[];
  reason: string;
  strength: number;
}

/** Individual trade in backtest */
export interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  returnPct: number;
}

/** Backtest results */
export interface BacktestResult {
  totalReturn: number;
  buyHoldReturn: number;
  trades: Trade[];
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: { date: string; value: number }[];
}

/** User-configurable model settings */
export interface ModelSettings {
  hmm: { nStates: number; iterations: number };
  lstm: { hiddenSize: number; lookback: number; epochs: number; lr: number };
  signals: {
    enableHMM: boolean;
    enableSMA: boolean;
    enableLSTM: boolean;
    enableMACD: boolean;
    lstmThreshold: number;
  };
}

/** Training progress callback data */
export interface TrainingProgress {
  model: 'hmm' | 'lstm';
  epoch: number;
  totalEpochs: number;
  loss?: number;
}
