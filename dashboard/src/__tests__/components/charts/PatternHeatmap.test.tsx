import { render, screen } from '@testing-library/react';
import PatternHeatmap from '@/components/charts/PatternHeatmap';
import type { HeatmapCell } from '@/lib/chart-data';

describe('PatternHeatmap', () => {
  const cells: HeatmapCell[] = [
    { type: 'naming', bucket: '0.8-1.0', count: 3, intensity: 1 },
    { type: 'naming', bucket: '0.4-0.6', count: 1, intensity: 0.33 },
    { type: 'structure', bucket: '0.6-0.8', count: 2, intensity: 0.67 },
    { type: 'structure', bucket: '0.8-1.0', count: 0, intensity: 0 },
  ];

  it('renders type labels', () => {
    render(<PatternHeatmap cells={cells} types={['naming', 'structure']} buckets={['0.4-0.6', '0.6-0.8', '0.8-1.0']} />);
    expect(screen.getByText('naming')).toBeInTheDocument();
    expect(screen.getByText('structure')).toBeInTheDocument();
  });

  it('renders bucket headers', () => {
    render(<PatternHeatmap cells={cells} types={['naming']} buckets={['0.4-0.6', '0.8-1.0']} />);
    expect(screen.getByText('0.4-0.6')).toBeInTheDocument();
    expect(screen.getByText('0.8-1.0')).toBeInTheDocument();
  });

  it('shows count in non-zero cells', () => {
    render(<PatternHeatmap cells={cells} types={['naming']} buckets={['0.8-1.0']} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows empty message when no types', () => {
    render(<PatternHeatmap cells={[]} types={[]} buckets={[]} />);
    expect(screen.getByText('No patterns recorded yet')).toBeInTheDocument();
  });
});
