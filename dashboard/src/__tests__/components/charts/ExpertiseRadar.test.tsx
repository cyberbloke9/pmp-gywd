/**
 * ExpertiseRadar uses Recharts RadarChart.
 * We test data shape and edge cases here.
 */
import { render, screen } from '@testing-library/react';
import ExpertiseRadar from '@/components/charts/ExpertiseRadar';
import type { ExpertisePoint } from '@/lib/chart-data';

// Mock recharts to avoid SVG rendering issues in jsdom
jest.mock('recharts', () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Radar: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
}));

describe('ExpertiseRadar', () => {
  it('renders radar chart with data', () => {
    const data: ExpertisePoint[] = [
      { domain: 'backend', level: 85, observations: 5 },
      { domain: 'frontend', level: 60, observations: 3 },
      { domain: 'devops', level: 40, observations: 2 },
    ];
    render(<ExpertiseRadar data={data} />);
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<ExpertiseRadar data={[]} />);
    expect(screen.getByText('No expertise data recorded')).toBeInTheDocument();
  });
});
