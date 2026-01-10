---
name: GYWD:help
description: Show available GYWD commands and usage guide
---

<objective>
Display the complete GYWD command reference.

Output ONLY the reference content below. Do NOT add:

- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
  </objective>

<reference>
# GYWD Command Reference

**GYWD** (Get Your Work Done) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

**Fast track (minimal questions):**
```
/gywd:init my-project
/gywd:create-roadmap
/gywd:plan-phase 1
/gywd:execute-plan
```

**Full setup (detailed questioning):**
```
/gywd:new-project
/gywd:create-roadmap
/gywd:plan-phase 1
/gywd:execute-plan
```

**Check status anytime:**
```
/gywd:status      # One-line status
/gywd:progress    # Detailed progress
```

## Core Workflow

```
Initialization → Planning → Execution → Milestone Completion
```

### Project Initialization

**`/gywd:init <name>`** *(New!)*
Quick project initialization with minimal questions.

- Creates minimal PROJECT.md and config.json
- Auto-detects brownfield vs greenfield
- Gets you coding in under 30 seconds

Usage: `/gywd:init my-app`

**`/gywd:new-project`**
Initialize new project with brief and configuration.

- Creates `.planning/PROJECT.md` (vision and requirements)
- Creates `.planning/config.json` (workflow mode)
- Asks for workflow mode (interactive/yolo) upfront
- Commits initialization files to git

Usage: `/gywd:new-project`

**`/gywd:create-roadmap`**
Create roadmap and state tracking for initialized project.

- Creates `.planning/ROADMAP.md` (phase breakdown)
- Creates `.planning/STATE.md` (project memory)
- Creates `.planning/phases/` directories

Usage: `/gywd:create-roadmap`

**`/gywd:map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/gywd:new-project` on existing codebases

Usage: `/gywd:map-codebase`

### Phase Planning

**`/gywd:discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel

Usage: `/gywd:discuss-phase 2`

**`/gywd:research-phase <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates RESEARCH.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/gywd:research-phase 3`

**`/gywd:list-phase-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a phase
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/gywd:list-phase-assumptions 3`

**`/gywd:plan-phase <number>`**
Create detailed execution plan for a specific phase.

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/gywd:plan-phase 1`
Result: Creates `.planning/phases/01-foundation/01-01-PLAN.md`

### Execution

**`/gywd:execute-plan <path>`**
Execute a PLAN.md file directly.

- Runs plan tasks sequentially
- Creates SUMMARY.md after completion
- Updates STATE.md with accumulated context
- Fast execution without loading full skill context

Usage: `/gywd:execute-plan .planning/phases/01-foundation/01-01-PLAN.md`

### Roadmap Management

**`/gywd:add-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/gywd:add-phase "Add admin dashboard"`

**`/gywd:insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/gywd:insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/gywd:remove-phase <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/gywd:remove-phase 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

### Milestone Management

**`/gywd:discuss-milestone`**
Figure out what you want to build in the next milestone.

- Reviews what shipped in previous milestone
- Helps you identify features to add, improve, or fix
- Routes to /gywd:new-milestone when ready

Usage: `/gywd:discuss-milestone`

**`/gywd:new-milestone <name>`**
Create a new milestone with phases for an existing project.

- Adds milestone section to ROADMAP.md
- Creates phase directories
- Updates STATE.md for new milestone

Usage: `/gywd:new-milestone "v2.0 Features"`

**`/gywd:complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/gywd:complete-milestone 1.0.0`

### Progress Tracking

**`/gywd:status`** *(New!)*
Quick one-line project status.

- Shows progress bar, phase, and last activity
- Perfect for a quick glance at where you are

Usage: `/gywd:status`
Output: `[████░░░░░░] 40% | Phase 2/5: Auth | Last: today`

**`/gywd:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/gywd:progress`

### Session Management

**`/gywd:resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/gywd:resume-work`

**`/gywd:pause-work`**
Create context handoff when pausing work mid-phase.

- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/gywd:pause-work`

### Issue Management

**`/gywd:consider-issues`**
Review deferred issues with codebase context.

- Analyzes all open issues against current codebase state
- Identifies resolved issues (can close)
- Identifies urgent issues (should address now)
- Identifies natural fits for upcoming phases
- Offers batch actions (close, insert phase, note for planning)

Usage: `/gywd:consider-issues`

### Utility Commands

**`/gywd:help`**
Show this command reference.

## Files & Structure

```
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── ISSUES.md             # Deferred enhancements (created when needed)
├── config.json           # Workflow mode & gates
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/gywd:new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Common Workflows

**Starting a new project:**

```
/gywd:new-project
/gywd:create-roadmap
/gywd:plan-phase 1
/gywd:execute-plan .planning/phases/01-foundation/01-01-PLAN.md
```

**Resuming work after a break:**

```
/gywd:progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/gywd:insert-phase 5 "Critical security fix"
/gywd:plan-phase 5.1
/gywd:execute-plan .planning/phases/05.1-critical-security-fix/05.1-01-PLAN.md
```

**Completing a milestone:**

```
/gywd:complete-milestone 1.0.0
/gywd:new-project  # Start next milestone
```

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/gywd:progress` to check where you're up to
  </reference>
