import type { Signal, EnrichedRow, ModelSettings } from '@/types';

/** Vote direction for an individual signal source */
type Vote = 'BUY' | 'SELL' | 'HOLD';

/** Internal structure representing a single source's vote and reasoning */
interface SourceVote {
  source: string;
  vote: Vote;
  reason: string;
}

/**
 * Detect HMM regime transitions and generate a vote.
 *
 * - BUY on Bear->Bull or Bear->Neutral transitions
 * - SELL on Bull->Bear or Bull->Neutral transitions
 *
 * HMM states are encoded as integers; state labels are inferred by sorted
 * mean return (0 = Bear, 1 = Neutral, 2 = Bull).
 */
function hmmVote(prev: EnrichedRow, curr: EnrichedRow): SourceVote {
  const prevState = prev.hmmState;
  const currState = curr.hmmState;

  // State mapping: 0 = Bear, 1 = Neutral, 2 = Bull
  const BEAR = 0;
  const NEUTRAL = 1;
  const BULL = 2;

  if (
    (prevState === BEAR && currState === BULL) ||
    (prevState === BEAR && currState === NEUTRAL)
  ) {
    const label = currState === BULL ? 'Bull' : 'Neutral';
    return {
      source: 'HMM',
      vote: 'BUY',
      reason: `Regime transition Bear->${label}`,
    };
  }

  if (
    (prevState === BULL && currState === BEAR) ||
    (prevState === BULL && currState === NEUTRAL)
  ) {
    const label = currState === BEAR ? 'Bear' : 'Neutral';
    return {
      source: 'HMM',
      vote: 'SELL',
      reason: `Regime transition Bull->${label}`,
    };
  }

  return { source: 'HMM', vote: 'HOLD', reason: 'No regime transition' };
}

/**
 * Detect SMA crossovers between SMA20 and SMA50.
 *
 * - Golden Cross (BUY): SMA20 crosses above SMA50
 * - Death Cross (SELL): SMA20 crosses below SMA50
 */
function smaVote(prev: EnrichedRow, curr: EnrichedRow): SourceVote {
  if (
    prev.sma20 === null ||
    prev.sma50 === null ||
    curr.sma20 === null ||
    curr.sma50 === null
  ) {
    return { source: 'SMA', vote: 'HOLD', reason: 'Insufficient SMA data' };
  }

  const prevDiff = prev.sma20 - prev.sma50;
  const currDiff = curr.sma20 - curr.sma50;

  if (prevDiff <= 0 && currDiff > 0) {
    return {
      source: 'SMA',
      vote: 'BUY',
      reason: 'Golden Cross: SMA20 crossed above SMA50',
    };
  }

  if (prevDiff >= 0 && currDiff < 0) {
    return {
      source: 'SMA',
      vote: 'SELL',
      reason: 'Death Cross: SMA20 crossed below SMA50',
    };
  }

  return { source: 'SMA', vote: 'HOLD', reason: 'No SMA crossover' };
}

/**
 * Generate a directional vote from LSTM predicted price.
 *
 * - BUY when predicted price exceeds current price by threshold
 * - SELL when predicted price is below current price by threshold
 *
 * @param threshold - Minimum price difference in dollars (default $1)
 */
function lstmVote(curr: EnrichedRow, threshold: number): SourceVote {
  if (curr.lstmPred === null) {
    return { source: 'LSTM', vote: 'HOLD', reason: 'No LSTM prediction available' };
  }

  const diff = curr.lstmPred - curr.close;

  if (diff > threshold) {
    return {
      source: 'LSTM',
      vote: 'BUY',
      reason: `LSTM predicts +$${diff.toFixed(2)} above current price`,
    };
  }

  if (diff < -threshold) {
    return {
      source: 'LSTM',
      vote: 'SELL',
      reason: `LSTM predicts -$${Math.abs(diff).toFixed(2)} below current price`,
    };
  }

  return { source: 'LSTM', vote: 'HOLD', reason: 'LSTM prediction within threshold' };
}

/**
 * Detect MACD / signal line crossovers.
 *
 * - BUY when MACD crosses above its signal line
 * - SELL when MACD crosses below its signal line
 */
function macdVote(prev: EnrichedRow, curr: EnrichedRow): SourceVote {
  if (
    prev.macd === null ||
    prev.macdSignal === null ||
    curr.macd === null ||
    curr.macdSignal === null
  ) {
    return { source: 'MACD', vote: 'HOLD', reason: 'Insufficient MACD data' };
  }

  const prevDiff = prev.macd - prev.macdSignal;
  const currDiff = curr.macd - curr.macdSignal;

  if (prevDiff <= 0 && currDiff > 0) {
    return {
      source: 'MACD',
      vote: 'BUY',
      reason: 'MACD crossed above signal line',
    };
  }

  if (prevDiff >= 0 && currDiff < 0) {
    return {
      source: 'MACD',
      vote: 'SELL',
      reason: 'MACD crossed below signal line',
    };
  }

  return { source: 'MACD', vote: 'HOLD', reason: 'No MACD crossover' };
}

/**
 * Generate consensus trading signals by combining up to 4 independent sources:
 * HMM regime transitions, SMA crossovers, LSTM directional predictions, and
 * MACD crossovers.
 *
 * Consensus rules:
 * - Each source casts a BUY, SELL, or HOLD vote independently.
 * - If BUY votes >= SELL votes **and** at least 1 BUY vote exists, the
 *   consensus is BUY.
 * - If SELL votes > BUY votes, the consensus is SELL.
 * - Otherwise no signal is emitted.
 * - Signal strength equals the number of agreeing sources (1-4).
 *
 * @param data - Array of enriched price rows with indicators and model outputs
 * @param settings - Signal generation settings controlling which sources are
 *                   enabled and the LSTM threshold
 * @returns Array of consensus signals with source attribution
 */
export function generateSignals(
  data: EnrichedRow[],
  settings: ModelSettings['signals'],
): Signal[] {
  const signals: Signal[] = [];
  const lstmThreshold = settings.lstmThreshold ?? 1;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const votes: SourceVote[] = [];

    // Collect votes from enabled sources
    if (settings.enableHMM) {
      votes.push(hmmVote(prev, curr));
    }
    if (settings.enableSMA) {
      votes.push(smaVote(prev, curr));
    }
    if (settings.enableLSTM) {
      votes.push(lstmVote(curr, lstmThreshold));
    }
    if (settings.enableMACD) {
      votes.push(macdVote(prev, curr));
    }

    // Tally votes
    const buyVotes = votes.filter((v) => v.vote === 'BUY');
    const sellVotes = votes.filter((v) => v.vote === 'SELL');

    let direction: 'BUY' | 'SELL' | null = null;
    let agreeingVotes: SourceVote[] = [];

    if (buyVotes.length >= sellVotes.length && buyVotes.length > 0) {
      direction = 'BUY';
      agreeingVotes = buyVotes;
    } else if (sellVotes.length > buyVotes.length) {
      direction = 'SELL';
      agreeingVotes = sellVotes;
    }

    if (direction !== null && agreeingVotes.length > 0) {
      signals.push({
        date: curr.date,
        direction,
        price: curr.close,
        sources: agreeingVotes.map((v) => v.source),
        reason: agreeingVotes.map((v) => v.reason).join('; '),
        strength: agreeingVotes.length,
      });
    }
  }

  return signals;
}
