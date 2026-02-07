interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorMap = {
  blue: 'bg-gywd-blue',
  green: 'bg-gywd-green',
  amber: 'bg-gywd-amber',
  red: 'bg-gywd-red',
  purple: 'bg-gywd-purple',
};

export default function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  color = 'blue',
}: ProgressBarProps) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-gywd-muted">
          {label && <span>{label}</span>}
          {showPercent && <span>{percent}%</span>}
        </div>
      )}
      <div className="h-2 bg-gywd-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorMap[color]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
