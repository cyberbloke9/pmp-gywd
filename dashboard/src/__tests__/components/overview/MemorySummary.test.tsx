import { render, screen } from '@testing-library/react';
import MemorySummary from '@/components/overview/MemorySummary';
import type { MemoryStats } from '@/lib/types';

describe('MemorySummary', () => {
  const stats: MemoryStats = {
    totalPatterns: 15,
    patternTypes: ['naming', 'structure', 'async'],
    expertiseAreas: 5,
    preferencesCount: 3,
    projectsCount: 2,
    highConfidencePatterns: 8,
  };

  it('renders pattern count', () => {
    render(<MemorySummary stats={stats} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders expertise count', () => {
    render(<MemorySummary stats={stats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders pattern types', () => {
    render(<MemorySummary stats={stats} />);
    expect(screen.getByText('naming')).toBeInTheDocument();
    expect(screen.getByText('structure')).toBeInTheDocument();
    expect(screen.getByText('async')).toBeInTheDocument();
  });

  it('shows confidence rate', () => {
    render(<MemorySummary stats={stats} />);
    // 8/15 = 53%
    expect(screen.getByText('53%')).toBeInTheDocument();
  });

  it('handles zero patterns', () => {
    const emptyStats: MemoryStats = {
      totalPatterns: 0,
      patternTypes: [],
      expertiseAreas: 0,
      preferencesCount: 0,
      projectsCount: 0,
      highConfidencePatterns: 0,
    };
    render(<MemorySummary stats={emptyStats} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
