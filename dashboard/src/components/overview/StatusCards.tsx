import Card from '@/components/shared/Card';
import type { PlanningState } from '@/lib/types';

interface StatusCardsProps {
  state: PlanningState;
}

interface StatusItem {
  label: string;
  value: string;
  icon: string;
}

export default function StatusCards({ state }: StatusCardsProps) {
  const items: StatusItem[] = [
    {
      label: 'Phase',
      value: state.phase ? `${state.phase.current} of ${state.phase.total}` : 'N/A',
      icon: '📍',
    },
    {
      label: 'Status',
      value: state.status || 'Unknown',
      icon: '🔄',
    },
    {
      label: 'Progress',
      value: state.progress !== null ? `${state.progress}%` : 'N/A',
      icon: '📊',
    },
    {
      label: 'Version',
      value: state.version ? `v${state.version}` : 'N/A',
      icon: '📦',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="text-xs text-gywd-muted">{item.label}</p>
              <p className="text-lg font-semibold text-gywd-text">{item.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
