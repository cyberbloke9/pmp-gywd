import { render, screen } from '@testing-library/react';
import PhaseTimeline from '@/components/overview/PhaseTimeline';
import type { PhaseEntry } from '@/lib/types';

describe('PhaseTimeline', () => {
  const phases: PhaseEntry[] = [
    { number: 43, title: 'Web Dashboard Core', status: 'Not Started' },
    { number: 44, title: 'Web Dashboard Charts', status: 'Not Started' },
    { number: 45, title: 'API Gateway', status: 'Not Started' },
  ];

  it('renders all phases', () => {
    render(<PhaseTimeline phases={phases} />);
    expect(screen.getByText('Web Dashboard Core')).toBeInTheDocument();
    expect(screen.getByText('Web Dashboard Charts')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
  });

  it('highlights current phase', () => {
    const { container } = render(<PhaseTimeline phases={phases} currentPhase={43} />);
    const highlighted = container.querySelector('.border-gywd-blue\\/20');
    expect(highlighted).not.toBeNull();
  });

  it('shows empty message when no phases', () => {
    render(<PhaseTimeline phases={[]} />);
    expect(screen.getByText('No phases found')).toBeInTheDocument();
  });

  it('renders phase numbers', () => {
    render(<PhaseTimeline phases={phases} />);
    expect(screen.getByText('43')).toBeInTheDocument();
    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<PhaseTimeline phases={phases} />);
    const badges = screen.getAllByText('Not Started');
    expect(badges).toHaveLength(3);
  });
});
