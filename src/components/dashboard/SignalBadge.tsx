'use client';

interface SignalBadgeProps {
  direction: 'BUY' | 'SELL';
  strength?: number;
  size?: 'sm' | 'md' | 'lg';
}

/** Visual badge for buy/sell signals with optional strength indicator */
export default function SignalBadge({ direction, strength, size = 'md' }: SignalBadgeProps) {
  const isBuy = direction === 'BUY';
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded font-bold
        ${sizeClasses[size]}
        ${isBuy
          ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/30'
          : 'bg-[#ff1744]/20 text-[#ff1744] border border-[#ff1744]/30'
        }
      `}
      aria-label={`${direction} signal${strength ? ` strength ${strength}` : ''}`}
    >
      {isBuy ? '▲' : '▼'} {direction}
      {strength !== undefined && strength > 0 && (
        <span className="opacity-70">({strength}/4)</span>
      )}
    </span>
  );
}
