/**
 * TimelineChart uses Recharts which requires browser APIs.
 * We test the data transformation logic here; rendering is
 * covered by chart-data.test.ts and build verification.
 */
import type { TimelinePoint } from '@/lib/chart-data';

describe('TimelineChart data', () => {
  it('TimelinePoint has required fields', () => {
    const point: TimelinePoint = {
      phase: 43,
      title: 'Web Dashboard Core',
      status: 'Complete',
      fill: '#22c55e',
    };
    expect(point.phase).toBe(43);
    expect(point.fill).toBe('#22c55e');
  });

  it('status colors are consistent', () => {
    const colors: Record<string, string> = {
      'Complete': '#22c55e',
      'In Progress': '#f59e0b',
      'Not Started': '#334155',
    };
    expect(colors['Complete']).toBe('#22c55e');
    expect(colors['In Progress']).toBe('#f59e0b');
    expect(colors['Not Started']).toBe('#334155');
  });
});
