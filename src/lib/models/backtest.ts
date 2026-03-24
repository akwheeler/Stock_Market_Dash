import type { Signal, BacktestResult, Trade } from '@/types';

/** Starting capital for the backtest in dollars */
const STARTING_CAPITAL = 10_000;

/** Annualised risk-free rate used for Sharpe ratio calculation */
const RISK_FREE_RATE = 0.04;

/** Approximate number of trading days per year */
const TRADING_DAYS_PER_YEAR = 252;

/**
 * Find the price entry that matches (or is closest after) a given date.
 *
 * @param prices - Sorted array of date/close pairs
 * @param date - Target date string
 * @param startIdx - Index to begin searching from (optimisation)
 * @returns The index into the prices array, or -1 if not found
 */
function findPriceIndex(
  prices: { date: string; close: number }[],
  date: string,
  startIdx: number,
): number {
  for (let i = startIdx; i < prices.length; i++) {
    if (prices[i].date >= date) {
      return i;
    }
  }
  return -1;
}

/**
 * Compute the maximum drawdown from an equity curve.
 *
 * Maximum drawdown is the largest peak-to-trough decline expressed as a
 * positive percentage (0-1 range).
 *
 * @param equityCurve - Array of equity values over time
 * @returns Maximum drawdown as a fraction (e.g. 0.15 = 15%)
 */
function computeMaxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0];
  let maxDrawdown = 0;

  for (const value of equityCurve) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Compute the annualised Sharpe ratio from an array of daily returns.
 *
 * @param dailyReturns - Array of daily percentage returns (as fractions)
 * @returns Annualised Sharpe ratio, or 0 if insufficient data
 */
function computeSharpeRatio(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) {
    return 0;
  }

  const dailyRiskFree = RISK_FREE_RATE / TRADING_DAYS_PER_YEAR;
  const excessReturns = dailyReturns.map((r) => r - dailyRiskFree);

  const mean =
    excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;

  const variance =
    excessReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
    (excessReturns.length - 1);
  const std = Math.sqrt(variance);

  if (std === 0) {
    return 0;
  }

  return (mean / std) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Run a simple long-only backtest using trading signals against historical
 * prices.
 *
 * **Strategy rules:**
 * - Enter a full position on a BUY signal (if not already in a position).
 * - Exit the position on a SELL signal (if currently in a position).
 * - Starting capital is $10,000.
 *
 * **Outputs:**
 * - Total return percentage of the strategy.
 * - Buy-and-hold benchmark return over the same period.
 * - Per-trade P&L log with entry/exit dates and prices.
 * - Win rate (fraction of trades with positive return).
 * - Maximum drawdown of the strategy equity curve.
 * - Annualised Sharpe ratio of daily strategy returns.
 * - Daily equity curve data for charting.
 *
 * @param signals - Array of BUY/SELL signals with dates and prices
 * @param prices - Array of daily date/close pairs (must be sorted by date)
 * @returns Complete backtest results including trades, metrics, and equity curve
 */
export function runBacktest(
  signals: Signal[],
  prices: { date: string; close: number }[],
): BacktestResult {
  if (prices.length === 0) {
    return {
      totalReturn: 0,
      buyHoldReturn: 0,
      trades: [],
      winRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      equityCurve: [],
    };
  }

  const trades: Trade[] = [];
  let capital = STARTING_CAPITAL;
  let shares = 0;
  let entryDate = '';
  let entryPrice = 0;
  let inPosition = false;

  // Build a date-to-signal map for efficient lookups
  const signalMap = new Map<string, Signal>();
  for (const signal of signals) {
    // If multiple signals on the same date, the last one wins
    signalMap.set(signal.date, signal);
  }

  // Track equity at each price point for curve and Sharpe calculation
  const equityCurve: { date: string; value: number }[] = [];
  const equityValues: number[] = [];
  const dailyReturns: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const { date, close } = prices[i];
    const signal = signalMap.get(date);

    // Process signals
    if (signal !== undefined) {
      if (signal.direction === 'BUY' && !inPosition) {
        // Enter long position
        shares = capital / close;
        entryDate = date;
        entryPrice = close;
        inPosition = true;
      } else if (signal.direction === 'SELL' && inPosition) {
        // Exit position
        const exitValue = shares * close;
        const pnl = exitValue - capital;
        const returnPct = ((close - entryPrice) / entryPrice) * 100;

        trades.push({
          entryDate,
          exitDate: date,
          entryPrice,
          exitPrice: close,
          pnl,
          returnPct,
        });

        capital = exitValue;
        shares = 0;
        inPosition = false;
      }
    }

    // Compute current portfolio value
    const portfolioValue = inPosition ? shares * close : capital;

    equityCurve.push({ date, value: portfolioValue });
    equityValues.push(portfolioValue);

    // Compute daily return
    if (i > 0) {
      const prevValue = equityValues[equityValues.length - 2];
      if (prevValue > 0) {
        dailyReturns.push((portfolioValue - prevValue) / prevValue);
      }
    }
  }

  // If still in a position at the end, close it at the last price
  if (inPosition && prices.length > 0) {
    const lastPrice = prices[prices.length - 1];
    const exitValue = shares * lastPrice.close;
    const pnl = exitValue - capital;
    const returnPct = ((lastPrice.close - entryPrice) / entryPrice) * 100;

    trades.push({
      entryDate,
      exitDate: lastPrice.date,
      entryPrice,
      exitPrice: lastPrice.close,
      pnl,
      returnPct,
    });

    capital = exitValue;
  }

  // Strategy total return
  const finalValue = equityValues.length > 0
    ? equityValues[equityValues.length - 1]
    : STARTING_CAPITAL;
  const totalReturn =
    ((finalValue - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;

  // Buy-and-hold benchmark
  const firstClose = prices[0].close;
  const lastClose = prices[prices.length - 1].close;
  const buyHoldReturn = ((lastClose - firstClose) / firstClose) * 100;

  // Win rate
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? winningTrades / trades.length : 0;

  // Max drawdown
  const maxDrawdown = equityValues.length > 0
    ? computeMaxDrawdown(equityValues)
    : 0;

  // Sharpe ratio
  const sharpeRatio = computeSharpeRatio(dailyReturns);

  return {
    totalReturn,
    buyHoldReturn,
    trades,
    winRate,
    maxDrawdown,
    sharpeRatio,
    equityCurve,
  };
}
