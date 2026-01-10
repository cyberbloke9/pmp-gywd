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

**GYWD** (Get Your Work Done) is a decision-aware development system for Claude Code.

**v1.4 Philosophy:** Code is crystallized decisions. GYWD understands WHY code exists, not just WHAT it does.

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
/gywd:context     # Context budget analysis
/gywd:health      # Project health dashboard
```

**Decision Intelligence (v1.4):**
```
/gywd:why <code>         # Why does this code exist?
/gywd:extract-decisions  # Build decision graph from history
/gywd:challenge          # Adversarial review of plans/code
/gywd:history            # Query temporal codebase evolution
/gywd:anticipate         # Predictive context loading
/gywd:profile            # Developer digital twin
/gywd:impact             # Connect code to production reality
```

**v2.0 Unified Intelligence:**
```
/gywd:bootstrap          # Initialize complete v2.0 system on any codebase
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

**`/gywd:preview-plan <path>`** *(New!)*
Preview what a plan will do before executing it.

- Shows all tasks that will run
- Lists files to be created/modified
- Highlights checkpoints and risks
- Read-only operation - no changes made

Usage: `/gywd:preview-plan .planning/phases/01-foundation/01-01-PLAN.md`

**`/gywd:execute-plan <path> [--tasks]`**
Execute a PLAN.md file directly.

- Runs plan tasks sequentially
- Creates SUMMARY.md after completion
- Updates STATE.md with accumulated context
- Supports partial execution with --tasks flag

Usage: `/gywd:execute-plan .planning/phases/01-foundation/01-01-PLAN.md`
Partial: `/gywd:execute-plan .planning/phases/01-foundation/01-01-PLAN.md --tasks 1-3`

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

**`/gywd:status`**
Quick one-line project status.

- Shows progress bar, phase, and last activity
- Perfect for a quick glance at where you are

Usage: `/gywd:status`
Output: `[████░░░░░░] 40% | Phase 2/5: Auth | Last: today`

**`/gywd:context`** *(New!)*
Show context budget visibility and usage analysis.

- Estimates current context usage percentage
- Breaks down by source (plans, codebase, state)
- Warns when approaching context limits
- Suggests actions to reduce context load

Usage: `/gywd:context`

**`/gywd:health`** *(New!)*
Phase health dashboard showing quality metrics.

- Shows overall project health score
- Displays phase-by-phase breakdown
- Tracks open issues per phase
- Provides actionable recommendations

Usage: `/gywd:health`

**`/gywd:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/gywd:progress`

### Memory & Analysis

**`/gywd:memory [show|add|clear|learn]`** *(New!)*
Multi-session memory for patterns and preferences.

- Persists coding style, library choices, project rules
- Learns patterns from your work automatically
- Carries forward between sessions

Usage: `/gywd:memory show` or `/gywd:memory add preference "Use TypeScript strict mode"`

**`/gywd:check-drift`** *(New!)*
Detect specification drift between PROJECT.md and implementation.

- Shows alignment percentage
- Identifies missing/partial requirements
- Flags undocumented features
- Suggests corrective actions

Usage: `/gywd:check-drift`

**`/gywd:deps [phase-number|all]`** *(New!)*
Visualize phase and task dependencies.

- Shows dependency graph
- Identifies parallelizable work
- Highlights critical path
- Shows blocked vs ready status

Usage: `/gywd:deps` or `/gywd:deps 3`

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

### Advanced Features

**`/gywd:digest [focus-area]`** *(New!)*
Create compact codebase digest for quick context refresh.

- 90%+ smaller than full codebase map
- Focus on specific areas (auth, api, etc.)
- Shows recent activity and hot files
- Perfect for resuming work

Usage: `/gywd:digest` or `/gywd:digest auth`

**`/gywd:rollback [target]`** *(New!)*
Safely rollback to a previous checkpoint.

- Phase rollback: Undo entire phase
- Plan rollback: Undo specific plan
- Creates safety branch before changes
- Preserves planning files for learning

Usage: `/gywd:rollback last` or `/gywd:rollback 3`

**`/gywd:sync-github [type]`** *(New!)*
Sync GYWD state with GitHub issues, PRs, milestones.

- Push issues to GitHub, import GitHub issues
- Create PRs for completed phases
- Sync milestones bidirectionally
- Track PR merges with phase completion

Usage: `/gywd:sync-github` or `/gywd:sync-github issues`

### Issue Management

**`/gywd:consider-issues`**
Review deferred issues with codebase context.

- Analyzes all open issues against current codebase state
- Identifies resolved issues (can close)
- Identifies urgent issues (should address now)
- Identifies natural fits for upcoming phases
- Offers batch actions (close, insert phase, note for planning)

Usage: `/gywd:consider-issues`

### Decision Intelligence (v1.4)

**`/gywd:why <target>`**
Ask why code exists - trace to decisions.

- Answers "why does this code exist?"
- Traces to original decisions and context
- Shows alternatives considered, trade-offs accepted
- Links to incidents and history

Usage: `/gywd:why src/utils/result.ts` or `/gywd:why "the retry logic in payments"`

**`/gywd:extract-decisions`**
Build decision graph from codebase history.

- Parses git history, PRs, comments for decisions
- Creates structured decision records
- Links decisions causally (A led to B)
- Identifies documentation gaps

Usage: `/gywd:extract-decisions --depth deep`

**`/gywd:history <query>`**
Query temporal codebase evolution.

- Natural language queries against history
- "When did we start using this pattern?"
- "What did auth look like before the rewrite?"
- Hotspot detection and prediction

Usage: `/gywd:history "Why did we remove Redux?"`

**`/gywd:challenge [target]`**
Adversarial review - agents that attack your plan/code.

- Critic Agent: Finds logical flaws
- Devil's Advocate: Argues for alternatives
- Red Team: Security attack simulation
- Chaos Agent: Edge case generation

Usage: `/gywd:challenge .planning/phases/03-payment/03-01-PLAN.md`

**`/gywd:anticipate`**
Predictive development - know what you'll need.

- Pre-loads relevant patterns before you ask
- Surfaces similar past work
- Warns about known pitfalls
- Protects flow state

Usage: `/gywd:anticipate --for "payment integration"`

**`/gywd:profile [show|learn]`**
Developer Digital Twin - model of your patterns.

- Captures cognitive style and preferences
- Maps expertise topology
- Learns from your behavior
- Adapts AI responses to YOU

Usage: `/gywd:profile show` or `/gywd:profile learn`

**`/gywd:impact <target>`**
Reality integration - connect code to outcomes.

- Production metrics per file/endpoint
- Business impact attribution
- Cost breakdown by code area
- Incident history linkage

Usage: `/gywd:impact src/api/checkout.ts`

### v2.0 Unified Intelligence

**`/gywd:bootstrap [--quick|--deep]`**
Initialize complete GYWD v2.0 system on any codebase.

- One command to rule them all - replaces multiple init commands
- Maps codebase structure with parallel agents
- Extracts decision graph from git history
- Builds context intelligence model
- Creates developer profile from contributions
- Initializes continuous learning system
- Sets up PROJECT.md, ROADMAP.md, STATE.md

Modes:
- `--quick`: Shallow analysis (~2 min)
- Default: Full analysis (~5-10 min)
- `--deep`: Exhaustive analysis with adversarial validation (~15-30 min)

Usage: `/gywd:bootstrap` or `/gywd:bootstrap --deep`

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
