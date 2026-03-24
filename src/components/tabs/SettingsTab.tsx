'use client';

import { ModelSettings } from '@/types';

interface SettingsTabProps {
  settings: ModelSettings;
  onSettingsChange: (s: ModelSettings) => void;
  onRetrain: () => void;
  onRefreshData: () => void;
  onExportCSV: () => void;
  isTraining: boolean;
}

export default function SettingsTab({
  settings,
  onSettingsChange,
  onRetrain,
  onRefreshData,
  onExportCSV,
  isTraining,
}: SettingsTabProps) {
  const updateHMM = (key: keyof ModelSettings['hmm'], value: number) => {
    onSettingsChange({
      ...settings,
      hmm: { ...settings.hmm, [key]: value },
    });
  };

  const updateLSTM = (key: keyof ModelSettings['lstm'], value: number) => {
    onSettingsChange({
      ...settings,
      lstm: { ...settings.lstm, [key]: value },
    });
  };

  const updateSignals = (key: keyof ModelSettings['signals'], value: boolean | number) => {
    onSettingsChange({
      ...settings,
      signals: { ...settings.signals, [key]: value },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* HMM Settings */}
      <div className="card">
        <div className="card-header">HMM Settings</div>
        <div className="space-y-5 mt-2">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">Number of States</label>
              <span className="text-[#2979ff] font-bold">{settings.hmm.nStates}</span>
            </div>
            <input
              type="range"
              min={2}
              max={5}
              step={1}
              value={settings.hmm.nStates}
              onChange={(e) => updateHMM('nStates', Number(e.target.value))}
              className="w-full"
              disabled={isTraining}
            />
            <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">EM Iterations</label>
              <span className="text-[#2979ff] font-bold">{settings.hmm.iterations}</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={settings.hmm.iterations}
              onChange={(e) => updateHMM('iterations', Number(e.target.value))}
              className="w-full"
              disabled={isTraining}
            />
            <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
              <span>10</span>
              <span>30</span>
              <span>50</span>
            </div>
          </div>
        </div>
      </div>

      {/* LSTM Settings */}
      <div className="card">
        <div className="card-header">LSTM Settings</div>
        <div className="space-y-5 mt-2">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">Hidden Size</label>
              <span className="text-[#2979ff] font-bold">{settings.lstm.hiddenSize}</span>
            </div>
            <input
              type="range"
              min={4}
              max={20}
              step={2}
              value={settings.lstm.hiddenSize}
              onChange={(e) => updateLSTM('hiddenSize', Number(e.target.value))}
              className="w-full"
              disabled={isTraining}
            />
            <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
              <span>4</span>
              <span>12</span>
              <span>20</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">Lookback Window</label>
              <span className="text-[#2979ff] font-bold">{settings.lstm.lookback}</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.lstm.lookback}
              onChange={(e) => updateLSTM('lookback', Number(e.target.value))}
              className="w-full"
              disabled={isTraining}
            />
            <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
              <span>5</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">Epochs</label>
              <span className="text-[#2979ff] font-bold">{settings.lstm.epochs}</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={10}
              value={settings.lstm.epochs}
              onChange={(e) => updateLSTM('epochs', Number(e.target.value))}
              className="w-full"
              disabled={isTraining}
            />
            <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
              <span>10</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">Learning Rate</label>
              <span className="text-[#2979ff] font-bold">{settings.lstm.lr}</span>
            </div>
            <input
              type="number"
              min={0.0001}
              max={0.1}
              step={0.001}
              value={settings.lstm.lr}
              onChange={(e) => updateLSTM('lr', Number(e.target.value))}
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded px-3 py-1.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#2979ff]"
              disabled={isTraining}
            />
          </div>
        </div>
      </div>

      {/* Signal Settings */}
      <div className="card">
        <div className="card-header">Signal Settings</div>
        <div className="space-y-4 mt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.signals.enableHMM}
              onChange={(e) => updateSignals('enableHMM', e.target.checked)}
              className="w-4 h-4 rounded border-[#1e293b] bg-[#0a0e17] accent-[#2979ff]"
              disabled={isTraining}
            />
            <div>
              <span className="text-sm text-[#e2e8f0]">HMM Regime Signals</span>
              <p className="text-[10px] text-[#64748b]">Generate signals on regime transitions</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.signals.enableSMA}
              onChange={(e) => updateSignals('enableSMA', e.target.checked)}
              className="w-4 h-4 rounded border-[#1e293b] bg-[#0a0e17] accent-[#2979ff]"
              disabled={isTraining}
            />
            <div>
              <span className="text-sm text-[#e2e8f0]">SMA Crossover Signals</span>
              <p className="text-[10px] text-[#64748b]">Golden cross / death cross on SMA 20/50</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.signals.enableLSTM}
              onChange={(e) => updateSignals('enableLSTM', e.target.checked)}
              className="w-4 h-4 rounded border-[#1e293b] bg-[#0a0e17] accent-[#2979ff]"
              disabled={isTraining}
            />
            <div>
              <span className="text-sm text-[#e2e8f0]">LSTM Prediction Signals</span>
              <p className="text-[10px] text-[#64748b]">Signal when predicted price exceeds threshold</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.signals.enableMACD}
              onChange={(e) => updateSignals('enableMACD', e.target.checked)}
              className="w-4 h-4 rounded border-[#1e293b] bg-[#0a0e17] accent-[#2979ff]"
              disabled={isTraining}
            />
            <div>
              <span className="text-sm text-[#e2e8f0]">MACD Crossover Signals</span>
              <p className="text-[10px] text-[#64748b]">MACD line vs signal line crossovers</p>
            </div>
          </label>

          <div className="pt-2 border-t border-[#1e293b]">
            <div className="flex justify-between text-sm mb-2">
              <label className="text-[#e2e8f0]">LSTM Threshold (%)</label>
              <span className="text-[#2979ff] font-bold">{settings.signals.lstmThreshold}</span>
            </div>
            <input
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={settings.signals.lstmThreshold}
              onChange={(e) => updateSignals('lstmThreshold', Number(e.target.value))}
              className="w-full bg-[#0a0e17] border border-[#1e293b] rounded px-3 py-1.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#2979ff]"
              disabled={isTraining}
            />
          </div>
        </div>
      </div>

      {/* Data Settings + Retrain */}
      <div className="card flex flex-col gap-4">
        <div className="card-header">Data &amp; Actions</div>

        <div className="space-y-3">
          <button
            onClick={onRefreshData}
            disabled={isTraining}
            className="w-full px-4 py-2.5 rounded text-sm font-medium transition-colors border border-[#1e293b] bg-[#0a0e17] text-[#e2e8f0] hover:bg-[#1e293b] hover:border-[#64748b] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh Market Data
          </button>

          <button
            onClick={onExportCSV}
            disabled={isTraining}
            className="w-full px-4 py-2.5 rounded text-sm font-medium transition-colors border border-[#1e293b] bg-[#0a0e17] text-[#e2e8f0] hover:bg-[#1e293b] hover:border-[#64748b] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Data as CSV
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={onRetrain}
          disabled={isTraining}
          className={`w-full px-6 py-3.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
            isTraining
              ? 'bg-[#1e293b] text-[#64748b] cursor-not-allowed'
              : 'bg-[#2979ff] text-white hover:bg-[#2979ff]/80 shadow-lg shadow-[#2979ff]/20'
          }`}
        >
          {isTraining ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Training Models...
            </span>
          ) : (
            'Retrain All Models'
          )}
        </button>
      </div>
    </div>
  );
}
