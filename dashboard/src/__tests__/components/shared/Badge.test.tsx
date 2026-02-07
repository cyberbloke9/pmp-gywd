import { render, screen } from '@testing-library/react';
import Badge from '@/components/shared/Badge';

describe('Badge', () => {
  it('renders label text', () => {
    render(<Badge label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default muted variant', () => {
    const { container } = render(<Badge label="Test" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-gywd-muted');
  });

  it('applies blue variant', () => {
    const { container } = render(<Badge label="Phase 43" variant="blue" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-gywd-blue');
  });

  it('applies green variant', () => {
    const { container } = render(<Badge label="Complete" variant="green" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-gywd-green');
  });

  it('applies amber variant', () => {
    const { container } = render(<Badge label="In Progress" variant="amber" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-gywd-amber');
  });
});
