'use strict';

const { PlanEditor } = require('../../lib/crdt/plan-editor');

describe('PlanEditor', () => {
  let editor;

  beforeEach(() => {
    editor = new PlanEditor('user1', 'plan-1');
  });

  test('creates with default fields', () => {
    expect(editor.getField('title')).toBe('');
    expect(editor.getField('description')).toBe('');
    expect(editor.getField('status')).toBe('draft');
    expect(editor.getField('phase')).toBe('');
  });

  test('setField and getField', () => {
    editor.setField('title', 'My Plan');
    editor.setField('description', 'A great plan');
    expect(editor.getField('title')).toBe('My Plan');
    expect(editor.getField('description')).toBe('A great plan');
  });

  test('setField creates custom fields', () => {
    editor.setField('priority', 'high');
    expect(editor.getField('priority')).toBe('high');
  });

  test('getField returns undefined for unknown fields', () => {
    expect(editor.getField('nonexistent')).toBeUndefined();
  });

  test('addTask and getTasks', () => {
    editor.addTask('task-1');
    editor.addTask('task-2');
    expect(editor.hasTask('task-1')).toBe(true);
    expect(editor.hasTask('task-2')).toBe(true);
    expect(editor.getTasks()).toContain('task-1');
    expect(editor.getTasks()).toContain('task-2');
  });

  test('removeTask', () => {
    editor.addTask('task-1');
    editor.addTask('task-2');
    editor.removeTask('task-1');
    expect(editor.hasTask('task-1')).toBe(false);
    expect(editor.hasTask('task-2')).toBe(true);
  });

  test('getPlan returns full state', () => {
    editor.setField('title', 'Phase 48');
    editor.setField('status', 'active');
    editor.addTask('task-1');

    const plan = editor.getPlan();
    expect(plan.planId).toBe('plan-1');
    expect(plan.title).toBe('Phase 48');
    expect(plan.status).toBe('active');
    expect(plan.tasks).toContain('task-1');
    expect(plan.editors.length).toBeGreaterThan(0);
  });

  test('operations are logged', () => {
    editor.setField('title', 'Test');
    editor.addTask('task-1');
    editor.removeTask('task-1');

    const history = editor.getHistory();
    expect(history.length).toBe(3);
    expect(history[0].op).toBe('set_field');
    expect(history[1].op).toBe('add_task');
    expect(history[2].op).toBe('remove_task');
  });

  test('getEditorOps filters by editor', () => {
    editor.setField('title', 'User1 title');
    const ops = editor.getEditorOps('user1');
    expect(ops.length).toBe(1);
    expect(ops[0].nodeId).toBe('user1');

    const otherOps = editor.getEditorOps('user2');
    expect(otherOps.length).toBe(0);
  });

  test('registerEditor and getActiveEditors', () => {
    editor.registerEditor('user2', 'title-field');
    const active = editor.getActiveEditors();
    expect(active.length).toBe(2); // user1 (self) + user2
    expect(active.map(e => e.nodeId)).toContain('user2');
  });

  test('removeEditor', () => {
    editor.registerEditor('user2');
    editor.removeEditor('user2');
    const active = editor.getActiveEditors();
    expect(active.map(e => e.nodeId)).not.toContain('user2');
  });

  test('merge combines two editors', () => {
    const editor2 = new PlanEditor('user2', 'plan-1');

    // Each makes different changes
    editor.setField('title', 'Title by user1');
    editor2.setField('description', 'Desc by user2');
    editor.addTask('task-A');
    editor2.addTask('task-B');

    // Wait a bit so timestamps differ
    editor2.setField('title', 'Title by user2'); // user2 overwrites title (later timestamp)

    editor.merge(editor2);

    // user2's title should win (later timestamp via LWW)
    expect(editor.getField('title')).toBe('Title by user2');
    expect(editor.getField('description')).toBe('Desc by user2');
    expect(editor.hasTask('task-A')).toBe(true);
    expect(editor.hasTask('task-B')).toBe(true);
  });

  test('merge combines operations', () => {
    const editor2 = new PlanEditor('user2', 'plan-1');
    editor.setField('title', 'T1');
    editor2.setField('title', 'T2');

    editor.merge(editor2);
    const history = editor.getHistory();
    // Should have ops from both editors
    const nodeIds = [...new Set(history.map(o => o.nodeId))];
    expect(nodeIds).toContain('user1');
    expect(nodeIds).toContain('user2');
  });

  test('export and import preserve state', () => {
    editor.setField('title', 'Exported Plan');
    editor.addTask('task-1');
    editor.registerEditor('user3');

    const state = editor.export();
    const restored = PlanEditor.fromState(state);

    expect(restored.getField('title')).toBe('Exported Plan');
    expect(restored.hasTask('task-1')).toBe(true);
    expect(restored.planId).toBe('plan-1');
    expect(restored.nodeId).toBe('user1');
  });
});
