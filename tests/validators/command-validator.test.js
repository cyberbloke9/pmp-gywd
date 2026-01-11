/**
 * Command Validator Tests
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  parseFrontmatter,
  validateCommandStructure,
  extractWorkflowReferences,
  validateWorkflowReferences,
  validateCommandFile,
} = require('../../lib/validators/command-validator');

describe('parseFrontmatter', () => {
  test('parses valid frontmatter', () => {
    const content = `---
name: test-command
description: A test command
---
# Content`;

    const result = parseFrontmatter(content);
    expect(result).toEqual({
      name: 'test-command',
      description: 'A test command',
    });
  });

  test('returns null for missing frontmatter', () => {
    const content = '# Just content\nNo frontmatter here';
    const result = parseFrontmatter(content);
    expect(result).toBeNull();
  });

  test('handles multi-line arrays', () => {
    const content = `---
name: test
allowed-tools:
  - Read
  - Write
  - Bash
---`;

    const result = parseFrontmatter(content);
    expect(result.name).toBe('test');
    expect(result['allowed-tools']).toEqual(['Read', 'Write', 'Bash']);
  });
});

describe('validateCommandStructure', () => {
  test('valid command passes', () => {
    const content = `---
name: test-command
description: A test command
---
<objective>
Test objective
</objective>

<process>
Test process
</process>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('warns on missing frontmatter', () => {
    const content = `<objective>
Test objective
</objective>

<process>
Test process
</process>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.warnings).toContain('Missing YAML frontmatter');
  });

  test('errors on missing objective', () => {
    const content = `---
name: test
description: test
---
<process>
Just process
</process>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required section: <objective>');
  });

  test('errors on missing process section', () => {
    const content = `---
name: test
description: test
---
<objective>
Test objective
</objective>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Missing <process>');
  });

  test('accepts reference section instead of process', () => {
    const content = `---
name: test
description: test
---
<objective>
Test objective
</objective>

<reference>
Some reference
</reference>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.valid).toBe(true);
  });

  test('accepts output section instead of process', () => {
    const content = `---
name: test
description: test
---
<objective>
Test objective
</objective>

<output>
Some output
</output>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.valid).toBe(true);
  });

  test('errors on missing frontmatter name', () => {
    const content = `---
description: test
---
<objective>Test</objective>
<process>Test</process>`;

    const result = validateCommandStructure(content, 'test.md');
    expect(result.errors).toContain('Frontmatter missing required field: name');
  });
});

describe('extractWorkflowReferences', () => {
  test('extracts workflow references', () => {
    const content = `
See @~/.claude/get-your-work-done/workflows/test-workflow.md for details.
Also check @~/.claude/get-your-work-done/workflows/other-workflow.md.
`;

    const refs = extractWorkflowReferences(content);
    expect(refs).toContain('test-workflow.md');
    expect(refs).toContain('other-workflow.md');
    expect(refs).toHaveLength(2);
  });

  test('strips trailing punctuation', () => {
    const content = `
Reference: \`@~/.claude/get-your-work-done/workflows/workflow.md\`.
`;

    const refs = extractWorkflowReferences(content);
    expect(refs).toContain('workflow.md');
  });

  test('ignores non-workflow references', () => {
    const content = `
See @~/.claude/get-your-work-done/templates/some-template.md
`;

    const refs = extractWorkflowReferences(content);
    expect(refs).toHaveLength(0);
  });
});

describe('validateWorkflowReferences', () => {
  const tempDir = path.join(os.tmpdir(), `gywd-workflow-test-${ Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'existing.md'), '# Existing');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns empty for existing workflows', () => {
    const missing = validateWorkflowReferences(['existing.md'], tempDir);
    expect(missing).toHaveLength(0);
  });

  test('returns missing workflows', () => {
    const missing = validateWorkflowReferences(['nonexistent.md'], tempDir);
    expect(missing).toContain('nonexistent.md');
  });
});

describe('validateCommandFile', () => {
  const tempDir = path.join(os.tmpdir(), `gywd-cmd-test-${ Date.now()}`);
  const workflowsDir = path.join(tempDir, 'workflows');

  beforeAll(() => {
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'test-workflow.md'), '# Workflow');

    // Valid command
    fs.writeFileSync(path.join(tempDir, 'valid.md'), `---
name: valid-cmd
description: Valid command
---
<objective>
Test objective
</objective>

<process>
Test process
</process>`);

    // Invalid command (missing sections)
    fs.writeFileSync(path.join(tempDir, 'invalid.md'), `# No structure`);

    // Command with workflow reference
    fs.writeFileSync(path.join(tempDir, 'with-ref.md'), `---
name: with-ref
description: Has reference
---
<objective>Test</objective>
<process>
See @~/.claude/get-your-work-done/workflows/missing-workflow.md
</process>`);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('validates correct command file', () => {
    const result = validateCommandFile(
      path.join(tempDir, 'valid.md'),
      workflowsDir,
    );
    expect(result.valid).toBe(true);
  });

  test('detects invalid command structure', () => {
    const result = validateCommandFile(
      path.join(tempDir, 'invalid.md'),
      workflowsDir,
    );
    expect(result.valid).toBe(false);
  });

  test('detects missing workflow references', () => {
    const result = validateCommandFile(
      path.join(tempDir, 'with-ref.md'),
      workflowsDir,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('missing-workflow.md');
  });

  test('returns error for missing file', () => {
    const result = validateCommandFile('/nonexistent.md', workflowsDir);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });
});
