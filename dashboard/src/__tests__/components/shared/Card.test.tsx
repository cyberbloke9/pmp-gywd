import { render, screen } from '@testing-library/react';
import Card from '@/components/shared/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Card title="My Card">Content</Card>);
    expect(screen.getByText('My Card')).toBeInTheDocument();
  });

  it('does not render title div when title is omitted', () => {
    const { container } = render(<Card>Content</Card>);
    const titleDiv = container.querySelector('.border-b');
    expect(titleDiv).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="mt-4">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('mt-4');
  });
});
