'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchSPYData } from '@/lib/data/spy-data';
import { computeFeatures } from '@/lib/data/features';
import { trainHMM } from '@/lib/models/hmm';
import { trainLSTM } from '@/lib/models/lstm';
import { generateSignals } from '@/lib/models/signals';
import { runBacktest } from '@/lib/models/backtest';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils/format';
import type { OHLCVRow, EnrichedRow, HMMResult, LSTMResult, Signal, BacktestResult, ModelSettings, TrainingProgress } from '@/types';

import MetricCard from '@/components/dashboard/MetricCard';
import TabNav from '@/components/dashboard/TabNav';
import TrainingProgressBar from '@/components/dashboard/TrainingProgress';
import OverviewTab from '@/components/tabs/OverviewTab';
import SignalsTab from '@/components/tabs/SignalsTab';
import HMMTab from '@/components/tabs/HMMTab';
import LSTMTab from '@/components/tabs/LSTMTab';
import CompareTab from '@/components/tabs/CompareTab';
import SettingsTab from '@/components/tabs/SettingsTab';

const TABS = ['Overview', 'Signals', 'HMM', 'LSTM', 'Compare', 'Settings'];

const DEFAULT_SETTINGS: ModelSettings = {
  hmm: { nStates: 3, iterations: 30 },
  lstm: { hiddenSize: 12, lookback: 20, epochs: 60, lr: 0.002 },
  signals: {
    enableHMM: true,
    enableSMA: true,
    enableLSTM: true,
    enableMACD: true,
    lstmThreshold: 1,
  },
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [rawData, setRawData] = useState<OHLCVRow[]>([]);
  const [dataSource, setDataSource] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS);
  const [hmmResult, setHmmResult] = useState<HMMResult | null>(null);
  const [lstmResult, setLstmResult] = useState<LSTMResult | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute features from raw data
  const enrichedData: EnrichedRow[] = useMemo(() => {
    if (rawData.length === 0) return [];
    return computeFeatures(rawData);
  }, [rawData]);

  // Apply HMM states to enriched data
  const dataWithHMM: EnrichedRow[] = useMemo(() => {
    if (!hmmResult || enrichedData.length === 0) return enrichedData;
    return enrichedData.map((row, i) => ({
      ...row,
      hmmState: hmmResult.states[i] ?? -1,
    }));
  }, [enrichedData, hmmResult]);

  // Apply LSTM predictions
  const dataWithModels: EnrichedRow[] = useMemo(() => {
    if (!lstmResult || dataWithHMM.length === 0) return dataWithHMM;
    const { predictions, lookback } = lstmResult;
    return dataWithHMM.map((row, i) => {
      const predIdx = i - lookback;
      return {
        ...row,
        lstmPred: predIdx >= 0 && predIdx < predictions.length ? predictions[predIdx] : null,
      };
    });
  }, [dataWithHMM, lstmResult]);

  // Generate signals
  const signals: Signal[] = useMemo(() => {
    if (dataWithModels.length === 0) return [];
    return generateSignals(dataWithModels, settings.signals);
  }, [dataWithModels, settings.signals]);

  // Apply signals to data
  const finalData: EnrichedRow[] = useMemo(() => {
    if (dataWithModels.length === 0) return [];
    const signalMap = new Map(signals.map(s => [s.date, s]));
    return dataWithModels.map(row => {
      const sig = signalMap.get(row.date);
      return sig ? {
        ...row,
        signal: sig.direction,
        signalStrength: sig.strength,
        signalSources: sig.sources,
        signalReason: sig.reason,
      } : row;
    });
  }, [dataWithModels, signals]);

  // Run backtest
  const backtest: BacktestResult | null = useMemo(() => {
    if (signals.length === 0 || finalData.length === 0) return null;
    const prices = finalData.map(d => ({ date: d.date, close: d.close }));
    return runBacktest(signals, prices);
  }, [signals, finalData]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Train models when data arrives
  useEffect(() => {
    if (rawData.length > 0 && !hmmResult && !isTraining) {
      runTraining();
    }
  }, [rawData]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const { data, source } = await fetchSPYData(forceRefresh);
      setRawData(data);
      setDataSource(source);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(`Failed to load data: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, []);

  const runTraining = useCallback(async () => {
    if (enrichedData.length === 0) return;
    setIsTraining(true);

    try {
      // Train HMM
      setTrainingProgress({ model: 'hmm', epoch: 0, totalEpochs: settings.hmm.iterations });
      const returns = enrichedData.map(d => d.return).filter((_, i) => i > 0);
      const hmm = trainHMM(returns, settings.hmm.nStates, settings.hmm.iterations);
      setHmmResult(hmm);

      // Train LSTM
      setTrainingProgress({ model: 'lstm', epoch: 0, totalEpochs: settings.lstm.epochs });
      const prices = enrichedData.map(d => d.close);
      const lstm = trainLSTM(
        prices,
        settings.lstm.hiddenSize,
        settings.lstm.lookback,
        settings.lstm.epochs,
        settings.lstm.lr,
        (epoch, loss) => {
          setTrainingProgress({ model: 'lstm', epoch, totalEpochs: settings.lstm.epochs, loss });
        }
      );
      setLstmResult(lstm);
    } catch (e) {
      setError(`Training error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsTraining(false);
      setTrainingProgress(null);
    }
  }, [enrichedData, settings]);

  const handleRetrain = useCallback(() => {
    setHmmResult(null);
    setLstmResult(null);
    // Use setTimeout to let state update before running
    setTimeout(() => runTraining(), 50);
  }, [runTraining]);

  const handleRefreshData = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const handleExportCSV = useCallback(() => {
    if (finalData.length === 0) return;
    const headers = ['date', 'open', 'high', 'low', 'close', 'volume', 'return', 'sma20', 'sma50', 'rsi', 'macd', 'hmmState', 'lstmPred', 'signal', 'signalStrength'];
    const rows = finalData.map(d =>
      headers.map(h => {
        const val = d[h as keyof EnrichedRow];
        return val === null || val === undefined ? '' : String(val);
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spy-analytics-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [finalData]);

  // Compute top metrics
  const lastRow = finalData.length > 0 ? finalData[finalData.length - 1] : null;
  const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;
  const totalReturn = finalData.length > 1
    ? ((finalData[finalData.length - 1].close - finalData[0].close) / finalData[0].close) * 100
    : 0;
  const buyCount = signals.filter(s => s.direction === 'BUY').length;
  const sellCount = signals.filter(s => s.direction === 'SELL').length;
  const currentRegime = hmmResult && lastRow && lastRow.hmmState >= 0
    ? hmmResult.stateLabels[lastRow.hmmState]
    : 'N/A';
  const regimeColor = currentRegime === 'Bull' ? 'green' : currentRegime === 'Bear' ? 'red' : 'amber';

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#0a0e17]/95 backdrop-blur border-b border-[#1e293b] px-6 py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-[#2979ff]">SPY</span> Analytics
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
              <div className={`w-1.5 h-1.5 rounded-full ${dataSource ? 'bg-[#00e676] animate-pulse' : 'bg-[#ff1744]'}`} />
              {dataSource === 'api' ? 'LIVE' : dataSource === 'cache' ? 'CACHED' : 'OFFLINE'}
            </div>
          </div>
          <div className="text-xs text-[#64748b]">
            {lastRefresh && `Last refresh: ${lastRefresh}`}
            {rawData.length > 0 && ` · ${rawData.length} days`}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-4">
        {/* Error toast */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#ff1744]/10 border border-[#ff1744]/30 text-[#ff1744] text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 hover:opacity-70" aria-label="Dismiss error">&times;</button>
          </div>
        )}

        {/* Training progress */}
        {isTraining && trainingProgress && (
          <div className="mb-4">
            <TrainingProgressBar
              model={trainingProgress.model === 'hmm' ? 'HMM' : 'LSTM'}
              epoch={trainingProgress.epoch}
              totalEpochs={trainingProgress.totalEpochs}
              loss={trainingProgress.loss}
            />
          </div>
        )}

        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <MetricCard
            title="Last Close"
            value={lastRow ? formatCurrency(lastRow.close) : '--'}
            subtitle={lastRow ? formatDate(lastRow.date) : ''}
            color="blue"
          />
          <MetricCard
            title="Total Return"
            value={formatPercent(totalReturn)}
            color={totalReturn >= 0 ? 'green' : 'red'}
          />
          <MetricCard
            title="Latest Signal"
            value={lastSignal ? lastSignal.direction : '--'}
            subtitle={lastSignal ? formatDate(lastSignal.date) : ''}
            badge={lastSignal?.direction}
            badgeType={lastSignal?.direction === 'BUY' ? 'buy' : lastSignal?.direction === 'SELL' ? 'sell' : 'neutral'}
          />
          <MetricCard
            title="Current Regime"
            value={currentRegime}
            color={regimeColor as 'green' | 'red' | 'amber'}
          />
          <MetricCard
            title="Signal Score"
            value={`${buyCount} / ${sellCount}`}
            subtitle="BUY / SELL"
            color="default"
          />
          <MetricCard
            title="LSTM MAE"
            value={lstmResult ? `$${lstmResult.mae.toFixed(2)}` : '--'}
            color="blue"
          />
        </div>

        {/* Tab Navigation */}
        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {rawData.length === 0 ? (
          <div className="card text-center py-12 text-[#64748b]">
            <div className="text-4xl mb-4 animate-pulse">Loading data...</div>
            <p>Fetching SPY historical data</p>
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && <OverviewTab data={finalData} />}
            {activeTab === 'Signals' && <SignalsTab data={finalData} signals={signals} backtest={backtest} />}
            {activeTab === 'HMM' && <HMMTab data={finalData} hmmResult={hmmResult} />}
            {activeTab === 'LSTM' && <LSTMTab data={finalData} lstmResult={lstmResult} />}
            {activeTab === 'Compare' && <CompareTab data={finalData} hmmResult={hmmResult} lstmResult={lstmResult} />}
            {activeTab === 'Settings' && (
              <SettingsTab
                settings={settings}
                onSettingsChange={setSettings}
                onRetrain={handleRetrain}
                onRefreshData={handleRefreshData}
                onExportCSV={handleExportCSV}
                isTraining={isTraining}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
