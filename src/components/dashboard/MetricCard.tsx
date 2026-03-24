'use client';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: 'green' | 'red' | 'amber' | 'blue' | 'default';
  badge?: string;
  badgeType?: 'buy' | 'sell' | 'neutral';
}

const colorMap = {
  green: 'text-[#00e676]',
  red: 'text-[#ff1744]',
  amber: 'text-[#ffab00]',
  blue: 'text-[#2979ff]',
  default: 'text-[#e2e8f0]',
};

/** Dashboard metric card displaying a key value with optional badge */
export default function MetricCard({ title, value, subtitle, color = 'default', badge, badgeType }: MetricCardProps) {
  return (
    <div className="card flex flex-col gap-1 min-w-[150px]">
      <div className="card-header">{title}</div>
      <div className="flex items-center gap-2">
        <span className={`metric-value ${colorMap[color]}`}>{value}</span>
        {badge && (
          <span className={
            badgeType === 'buy' ? 'badge-buy' :
            badgeType === 'sell' ? 'badge-sell' :
            'badge-neutral'
          }>
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-xs text-[#64748b]">{subtitle}</div>
      )}
    </div>
  );
}
