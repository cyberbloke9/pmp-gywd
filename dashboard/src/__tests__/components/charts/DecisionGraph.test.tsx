import { render, screen } from '@testing-library/react';
import DecisionGraph from '@/components/charts/DecisionGraph';
import type { DecisionNode, DecisionEdge } from '@/lib/chart-data';

describe('DecisionGraph', () => {
  const nodes: DecisionNode[] = [
    { id: 'a', label: 'Jest', rationale: 'Testing' },
    { id: 'b', label: 'TypeScript', rationale: 'Type safety' },
    { id: 'c', label: 'Next.js', rationale: 'React SSR' },
  ];

  const edges: DecisionEdge[] = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
  ];

  it('renders node labels', () => {
    render(<DecisionGraph nodes={nodes} edges={edges} />);
    expect(screen.getByText('Jest')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  it('renders SVG with lines and rects', () => {
    const { container } = render(<DecisionGraph nodes={nodes} edges={edges} />);
    const lines = container.querySelectorAll('line');
    expect(lines).toHaveLength(2);
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(3);
  });

  it('shows empty message when no nodes', () => {
    render(<DecisionGraph nodes={[]} edges={[]} />);
    expect(screen.getByText('No decisions recorded')).toBeInTheDocument();
  });
});
