import { OHLCVRow } from '@/types';

const CACHE_KEY = 'spy-historical-data';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: OHLCVRow[];
  timestamp: number;
}

/** Check if cached data is still valid */
function getCachedData(): OHLCVRow[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/** Cache data in localStorage */
function setCachedData(data: OHLCVRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage might be full
  }
}

/** Fetch SPY data from Alpha Vantage API */
async function fetchFromAPI(): Promise<OHLCVRow[] | null> {
  try {
    // Using Alpha Vantage demo key for SPY daily data
    const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=SPY&outputsize=full&apikey=demo';
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const timeSeries = json['Time Series (Daily)'];
    if (!timeSeries) return null;

    const rows: OHLCVRow[] = Object.entries(timeSeries as Record<string, Record<string, string>>)
      .map(([date, values]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'], 10),
      }))
      .filter(row => !isNaN(row.close) && row.close > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Return last 600 trading days (~2.4 years)
    return rows.slice(-600);
  } catch {
    return null;
  }
}

/** Load fallback data from bundled JSON */
async function loadFallbackData(): Promise<OHLCVRow[]> {
  try {
    const response = await fetch('/data/spy-historical.json');
    if (!response.ok) throw new Error('Failed to load fallback data');
    const data: OHLCVRow[] = await response.json();
    return data;
  } catch {
    // Generate synthetic data if everything fails
    return generateSyntheticData();
  }
}

/** Generate synthetic SPY-like data as ultimate fallback */
function generateSyntheticData(): OHLCVRow[] {
  const rows: OHLCVRow[] = [];
  let price = 420;
  const startDate = new Date('2023-06-01');

  for (let i = 0; i < 550; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i * 7 / 5)); // Skip weekends approximately

    // Skip weekends
    const day = date.getDay();
    if (day === 0 || day === 6) continue;

    // Random walk with slight upward drift (mimicking SPY)
    const dailyReturn = (Math.random() - 0.48) * 0.02; // slight positive bias
    const volatility = 0.005 + Math.random() * 0.015;

    price = price * (1 + dailyReturn);
    const high = price * (1 + volatility);
    const low = price * (1 - volatility);
    const open = price * (1 + (Math.random() - 0.5) * volatility);
    const volume = Math.floor(50000000 + Math.random() * 50000000);

    rows.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume,
    });
  }

  return rows;
}

/**
 * Fetch SPY historical data with caching and fallback.
 * Priority: localStorage cache → API → bundled JSON → synthetic data
 */
export async function fetchSPYData(forceRefresh = false): Promise<{ data: OHLCVRow[]; source: string }> {
  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = getCachedData();
    if (cached && cached.length > 100) {
      return { data: cached, source: 'cache' };
    }
  }

  // Try API
  const apiData = await fetchFromAPI();
  if (apiData && apiData.length > 100) {
    setCachedData(apiData);
    return { data: apiData, source: 'api' };
  }

  // Fallback to bundled data
  const fallback = await loadFallbackData();
  setCachedData(fallback);
  return { data: fallback, source: fallback.length > 0 ? 'fallback' : 'synthetic' };
}

/** Clear cached data */
export function clearCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
  }
}
