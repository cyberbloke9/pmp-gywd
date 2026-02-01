# Architecture

## System Design Pattern

**Autonomous Workflow-Driven CLI Architecture** with command-dispatch system, multi-agent orchestration, and intelligent context management for AI-assisted development.

```
User Command → Command Handler → Workflow Engine → Agent Orchestrator → Output
                                      ↓                    ↓
                              Load State/Context    Permission Router
                                      ↓                    ↓
                              Apply Templates       Risk Assessment
```

## Five-Layer Architecture (v4.0)

### Layer 1: Command Interface
- Location: `commands/gywd/`
- 43 user-facing slash commands
- Each command is a markdown file with YAML frontmatter
- Defines objectives, allowed tools, execution context

### Layer 2: Agent Runtime
- Location: `lib/agents/`
- 6 specialized agents: Critic, Devil's Advocate, Red Team, Chaos, Skeptic
- AgentOrchestrator with execution strategies:
  - Sequential, Parallel, Priority, Pipeline
- Aggregation strategies: Merge, Array, Vote, Weighted

### Layer 3: Intelligence Layer
- Location: `lib/brain/`, `lib/context/`, `lib/memory/`, `lib/profile/`, `lib/questioning/`
- Developer Digital Twin (profile learning)
- Adaptive Questioning Engine
- Context Predictor with co-access patterns
- Global Memory with cross-project patterns

### Layer 4: Workflow Engine
- Location: `get-your-work-done/workflows/`
- 14 workflow files defining execution logic
- Step-by-step processes with decision points
- References templates and principles

### Layer 5: Knowledge Base
- Location: `get-your-work-done/`
- **Templates** (16 files): Output document formats
- **References** (9 files): Guiding principles and patterns
- **Config**: Workflow preferences

## v4.0 Autonomous Systems

### Agent System
```
┌───────────────────────────────────────────────┐
│            Agent Runtime (v4.0)                │
│  Critic · Red Team · Chaos · Skeptic · Devil  │
│            AgentOrchestrator                   │
└─────────────────────┬─────────────────────────┘
                      │
  ┌─────────┬─────────┼─────────┬─────────┐
  │Permission│  Self-  │ Analytics│  Multi- │
  │ Scanner │ Grilling │  Agents │  Agent  │
  └────┬────┴────┬────┴────┬────┴────┬────┘
       └─────────┴─────────┴─────────┘
```

### Permission Scanner
- Location: `lib/permissions/`
- OperationClassifier: Pattern-based risk classification
- RiskScorer: Multi-factor scoring (category, target, context, history, time)
- PermissionRouter: Auto-approve safe (<30), block dangerous (>85)

### Self-Grilling System
- Location: `lib/grilling/`
- PlanChallengerAgent: Questions assumptions before execution
- ChangeValidatorAgent: Validates proposed changes
- DecisionGrillerAgent: "5 Whys" analysis, cognitive bias detection

### Multi-Agent Coordination
- Location: `lib/multi-agent/`
- MultiAgentCoordinator: Consensus, majority, leader, round-robin modes
- MessageQueue: Pub/sub with priority queues
- CloudSyncManager: Versioned sync with conflict resolution
- TeamSyncManager: Real-time pattern sharing, decision voting

## Data Flow

```
.planning/
├── PROJECT.md    ← Vision (always loaded)
├── ROADMAP.md    ← Phase breakdown
├── STATE.md      ← Session memory (quick digest)
├── config.json   ← Workflow mode
├── codebase/     ← Architecture documentation
└── phases/
    └── XX-name/
        ├── XX-YY-PLAN.md     ← Executable prompt
        └── XX-YY-SUMMARY.md  ← Execution results
```

## Key Architectural Decisions

1. **Plans ARE Prompts** - PLAN.md files are executable prompts, not documents transformed into prompts

2. **State via Files** - Project state in `.planning/` directory enables session persistence without database

3. **Fresh Contexts** - Each plan executes in isolated subagent context (200k tokens) to prevent degradation

4. **Atomic Commits** - Each task commits immediately: `{type}({phase}-{plan}): {description}`

5. **Dual Modes** - Interactive (user confirmation) vs Autonomous (minimal intervention)

6. **Agent Composition** - Specialized agents can be combined via orchestration strategies

7. **Permission Intelligence** - Operations classified and routed based on risk scoring

## Execution Strategies

| Strategy | Checkpoints | Behavior |
|----------|-------------|----------|
| A: Autonomous | None | Spawn subagent, run to completion |
| B: Segmented | Verify-only | Pause for human confirmation |
| C: Interactive | Decision | Human input affects subsequent tasks |

## Agent Orchestration Strategies

| Strategy | Description |
|----------|-------------|
| Sequential | Agents run one after another |
| Parallel | All agents run simultaneously |
| Priority | High-priority agents run first |
| Pipeline | Output of one agent feeds into next |

---
*Last updated: 2026-02-01 - v4.0.0*
