import { render, screen } from '@testing-library/react';
import ProgressBar from '@/components/shared/ProgressBar';

describe('ProgressBar', () => {
  it('renders with label', () => {
    render(<ProgressBar value={50} label="Progress" />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('shows percentage by default', () => {
    render(<ProgressBar value={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('hides percentage when showPercent is false', () => {
    render(<ProgressBar value={50} showPercent={false} />);
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('caps at 100%', () => {
    render(<ProgressBar value={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles custom max', () => {
    render(<ProgressBar value={25} max={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('applies color class', () => {
    const { container } = render(<ProgressBar value={50} color="green" />);
    const bar = container.querySelector('.bg-gywd-green');
    expect(bar).not.toBeNull();
  });
});
