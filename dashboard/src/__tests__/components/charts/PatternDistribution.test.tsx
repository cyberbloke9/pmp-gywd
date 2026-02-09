/**
 * PatternDistribution uses Recharts PieChart.
 * Mock recharts and test rendering logic.
 */
import { render, screen } from '@testing-library/react';
import PatternDistribution from '@/components/charts/PatternDistribution';
import type { PatternTypeCount } from '@/lib/chart-data';

jest.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

describe('PatternDistribution', () => {
  it('renders pie chart with data', () => {
    const data: PatternTypeCount[] = [
      { type: 'naming', count: 5, avgConfidence: 0.8 },
      { type: 'structure', count: 3, avgConfidence: 0.7 },
    ];
    render(<PatternDistribution data={data} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<PatternDistribution data={[]} />);
    expect(screen.getByText('No patterns recorded yet')).toBeInTheDocument();
  });
});
