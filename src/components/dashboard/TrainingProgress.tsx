'use client';

interface TrainingProgressProps {
  model: string;
  epoch: number;
  totalEpochs: number;
  loss?: number;
  isComplete?: boolean;
}

/** Training progress bar displayed during model training */
export default function TrainingProgress({ model, epoch, totalEpochs, loss, isComplete }: TrainingProgressProps) {
  const progress = totalEpochs > 0 ? (epoch / totalEpochs) * 100 : 0;

  if (isComplete) {
    return (
      <div className="card flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
        <span className="text-sm text-[#00e676]">{model} training complete</span>
      </div>
    );
  }

  return (
    <div className="card space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#2979ff]">Training {model}...</span>
        <span className="text-[#64748b]">
          Epoch {epoch}/{totalEpochs}
          {loss !== undefined && ` · Loss: ${loss.toFixed(6)}`}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
