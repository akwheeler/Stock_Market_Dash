'use client';

import { EnrichedRow } from '@/types';
import PriceChart from '@/components/charts/PriceChart';
import VolumeChart from '@/components/charts/VolumeChart';
import ReturnChart from '@/components/charts/ReturnChart';
import RSIChart from '@/components/charts/RSIChart';

interface OverviewTabProps {
  data: EnrichedRow[];
}

export default function OverviewTab({ data }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Main Price Chart - full width */}
      <div className="card lg:col-span-2">
        <div className="card-header">SPY Price &amp; Signals</div>
        <PriceChart data={data} />
      </div>

      {/* Volume Chart - full width */}
      <div className="card lg:col-span-2">
        <div className="card-header">Volume</div>
        <VolumeChart data={data} />
      </div>

      {/* Returns Distribution - half width */}
      <div className="card">
        <div className="card-header">Returns Distribution</div>
        <ReturnChart data={data} />
      </div>

      {/* RSI Chart - half width */}
      <div className="card">
        <div className="card-header">RSI (14)</div>
        <RSIChart data={data} />
      </div>
    </div>
  );
}
