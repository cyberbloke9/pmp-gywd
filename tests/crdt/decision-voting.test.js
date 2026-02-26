'use strict';

const { DecisionVoting } = require('../../lib/crdt/decision-voting');

describe('DecisionVoting', () => {
  let voting;

  beforeEach(() => {
    voting = new DecisionVoting('voter1');
  });

  test('starts with no decisions', () => {
    expect(voting.getDecisionCount()).toBe(0);
    expect(voting.listDecisions()).toEqual([]);
  });

  test('createDecision creates a new decision', () => {
    voting.createDecision({
      id: 'd1',
      title: 'Choose framework',
      description: 'Which frontend framework?',
      options: ['React', 'Vue', 'Svelte'],
    });

    expect(voting.getDecisionCount()).toBe(1);
    const d = voting.getDecision('d1');
    expect(d.title).toBe('Choose framework');
    expect(d.status).toBe('open');
    expect(d.options).toEqual(['React', 'Vue', 'Svelte']);
  });

  test('createDecision rejects duplicate ID', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    expect(() => {
      voting.createDecision({ id: 'd1', title: 'T2', description: 'D2', options: ['C', 'D'] });
    }).toThrow('already exists');
  });

  test('createDecision rejects fewer than 2 options', () => {
    expect(() => {
      voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['only-one'] });
    }).toThrow('at least 2 options');
  });

  test('vote casts a vote', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    const result = voting.vote('d1', 'A');
    expect(result.success).toBe(true);

    const tally = voting.getTally('d1');
    expect(tally.options.A).toBe(1);
    expect(tally.options.B).toBe(0);
    expect(tally.totalVotes).toBe(1);
    expect(tally.leading).toBe('A');
  });

  test('vote rejects invalid option', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    const result = voting.vote('d1', 'C');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid option');
  });

  test('vote rejects missing decision', () => {
    const result = voting.vote('nonexistent', 'A');
    expect(result.success).toBe(false);
  });

  test('vote changes previous choice', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    voting.vote('d1', 'A');
    voting.vote('d1', 'B'); // Change vote

    const tally = voting.getTally('d1');
    expect(tally.options.A).toBe(0);
    expect(tally.options.B).toBe(1);
    expect(tally.totalVotes).toBe(1);
  });

  test('multiple voters', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    voting.vote('d1', 'A', 'voter1');
    voting.vote('d1', 'A', 'voter2');
    voting.vote('d1', 'B', 'voter3');

    const tally = voting.getTally('d1');
    expect(tally.options.A).toBe(2);
    expect(tally.options.B).toBe(1);
    expect(tally.totalVotes).toBe(3);
    expect(tally.leading).toBe('A');
  });

  test('quorum check', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'], quorum: 3 });
    voting.vote('d1', 'A', 'voter1');
    voting.vote('d1', 'A', 'voter2');

    const tally = voting.getTally('d1');
    expect(tally.hasQuorum).toBe(false);

    voting.vote('d1', 'B', 'voter3');
    const tally2 = voting.getTally('d1');
    expect(tally2.hasQuorum).toBe(true);
  });

  test('resolve with majority strategy', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'], quorum: 2, strategy: 'majority' });
    voting.vote('d1', 'A', 'v1');
    voting.vote('d1', 'A', 'v2');
    voting.vote('d1', 'B', 'v3');

    const result = voting.resolve('d1');
    expect(result.resolved).toBe(true);
    expect(result.winner).toBe('A');
    expect(result.reason).toContain('Majority');
  });

  test('resolve fails without quorum', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'], quorum: 5 });
    voting.vote('d1', 'A', 'v1');

    const result = voting.resolve('d1');
    expect(result.resolved).toBe(false);
    expect(result.reason).toContain('Quorum not met');
  });

  test('resolve with unanimous strategy', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'], quorum: 2, strategy: 'unanimous' });
    voting.vote('d1', 'A', 'v1');
    voting.vote('d1', 'A', 'v2');

    const result = voting.resolve('d1');
    expect(result.resolved).toBe(true);
    expect(result.winner).toBe('A');
    expect(result.reason).toContain('Unanimous');
  });

  test('resolve with plurality strategy', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B', 'C'], quorum: 3, strategy: 'plurality' });
    voting.vote('d1', 'A', 'v1');
    voting.vote('d1', 'B', 'v2');
    voting.vote('d1', 'A', 'v3');

    const result = voting.resolve('d1');
    expect(result.resolved).toBe(true);
    expect(result.winner).toBe('A');
    expect(result.reason).toContain('Plurality');
  });

  test('vote rejected on resolved decision', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'], quorum: 1, strategy: 'plurality' });
    voting.vote('d1', 'A', 'v1');
    voting.resolve('d1');

    const result = voting.vote('d1', 'B', 'v2');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not open');
  });

  test('closeDecision sets status to closed', () => {
    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    voting.closeDecision('d1');
    expect(voting.getDecision('d1').status).toBe('closed');
  });

  test('listDecisions filters by status', () => {
    voting.createDecision({ id: 'd1', title: 'Open', description: 'D', options: ['A', 'B'] });
    voting.createDecision({ id: 'd2', title: 'Closed', description: 'D', options: ['A', 'B'] });
    voting.closeDecision('d2');

    const open = voting.listDecisions('open');
    expect(open.length).toBe(1);
    expect(open[0].id).toBe('d1');

    const closed = voting.listDecisions('closed');
    expect(closed.length).toBe(1);
    expect(closed[0].id).toBe('d2');
  });

  test('merge combines decisions from two nodes', () => {
    const voting2 = new DecisionVoting('voter2');

    voting.createDecision({ id: 'd1', title: 'T', description: 'D', options: ['A', 'B'] });
    voting2.createDecision({ id: 'd2', title: 'T2', description: 'D2', options: ['X', 'Y'] });

    voting.vote('d1', 'A', 'voter1');
    voting2.vote('d2', 'X', 'voter2');

    voting.merge(voting2);
    expect(voting.getDecisionCount()).toBe(2);
    expect(voting.getDecision('d2')).not.toBeNull();
  });

  test('getTally returns null for unknown decision', () => {
    expect(voting.getTally('nonexistent')).toBeNull();
  });

  test('getDecision returns null for unknown decision', () => {
    expect(voting.getDecision('nonexistent')).toBeNull();
  });
});
