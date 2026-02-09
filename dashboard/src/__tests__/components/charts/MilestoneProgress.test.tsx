/**
 * MilestoneProgress uses Recharts BarChart.
 * Mock recharts and test rendering logic.
 */
import { render, screen } from '@testing-library/react';
import MilestoneProgress from '@/components/charts/MilestoneProgress';
import type { PhaseProgressBar } from '@/lib/chart-data';

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}));

describe('MilestoneProgress', () => {
  const data: PhaseProgressBar[] = [
    { milestone: 'v1.0-v3.2', completed: 9, total: 9, percent: 100 },
    { milestone: 'v5.0', completed: 1, total: 10, percent: 10 },
  ];

  it('renders bar chart', () => {
    render(<MilestoneProgress data={data} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
