import { render, screen } from '@testing-library/react';
import StatusCards from '@/components/overview/StatusCards';
import type { PlanningState } from '@/lib/types';

describe('StatusCards', () => {
  const baseState: PlanningState = {
    phase: { current: 43, total: 52 },
    plan: null,
    focus: 'Web Dashboard Core',
    milestone: 'v5.0',
    status: 'In Progress',
    progress: 81,
    version: '4.1.0',
    lastActivity: '2026-02-04',
  };

  it('renders all four status cards', () => {
    render(<StatusCards state={baseState} />);
    expect(screen.getByText('Phase')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
  });

  it('displays phase info correctly', () => {
    render(<StatusCards state={baseState} />);
    expect(screen.getByText('43 of 52')).toBeInTheDocument();
  });

  it('displays version with v prefix', () => {
    render(<StatusCards state={baseState} />);
    expect(screen.getByText('v4.1.0')).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<StatusCards state={baseState} />);
    expect(screen.getByText('81%')).toBeInTheDocument();
  });

  it('handles null state values', () => {
    const emptyState: PlanningState = {
      phase: null, plan: null, focus: null, milestone: null,
      status: null, progress: null, version: null, lastActivity: null,
    };
    render(<StatusCards state={emptyState} />);
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
