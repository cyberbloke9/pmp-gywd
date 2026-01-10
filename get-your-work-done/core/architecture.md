# GYWD v2.0 Core Architecture

## The Unified System

v1.x was commands. v2.0 is intelligence.

```
┌─────────────────────────────────────────────────────────────────┐
│                        GYWD v2.0 Core                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Decision   │  │   Context   │  │   Agent     │             │
│  │   Graph     │◄─┤ Intelligence│◄─┤Orchestrator │             │
│  │   Engine    │  │   Engine    │  │             │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────┬───────┴────────┬───────┘                     │
│                  │                │                             │
│         ┌────────▼────────────────▼────────┐                   │
│         │     Continuous Learning System    │                   │
│         └───────────────────────────────────┘                   │
│                          │                                      │
├──────────────────────────┼──────────────────────────────────────┤
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Command Layer                          │  │
│  │  (extract-decisions, why, challenge, anticipate, etc.)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Decision Graph Engine

The central nervous system. Everything is a decision or derives from one.

```yaml
responsibilities:
  - Store all extracted decisions
  - Maintain causal links between decisions
  - Answer "why" queries in O(1)
  - Detect decision conflicts
  - Track decision confidence over time

data_structure:
  nodes: Decision records
  edges: Causal relationships (A led to B)
  indexes:
    - by_file: Decision[] per file path
    - by_author: Decision[] per contributor
    - by_time: Decision[] chronologically
    - by_tag: Decision[] by category

operations:
  - addDecision(decision) → id
  - linkDecisions(parent, child, relationship)
  - queryByFile(path) → Decision[]
  - queryByTimeRange(start, end) → Decision[]
  - findConflicts() → Conflict[]
  - traceDecision(id) → DecisionChain
```

### 2. Context Intelligence Engine

Manages what the AI knows and why.

```yaml
responsibilities:
  - Determine optimal context for any task
  - Predict needed context before it's requested
  - Manage context budget (prevent overflow)
  - Learn which context was useful vs. noise

subsystems:
  context_selector:
    - Analyzes current task
    - Queries decision graph for relevant decisions
    - Fetches related code patterns
    - Assembles optimal context window

  context_predictor:
    - Monitors developer activity
    - Predicts next likely needs
    - Pre-fetches context in background
    - Caches frequently-used patterns

  context_optimizer:
    - Tracks context usage effectiveness
    - Compresses low-value context
    - Expands high-value context
    - Adapts to developer patterns
```

### 3. Agent Orchestrator

Coordinates multiple AI agents, including adversarial ones.

```yaml
responsibilities:
  - Spawn specialized agents for tasks
  - Manage agent communication
  - Synthesize multi-agent output
  - Resolve agent conflicts
  - Balance cooperation vs. adversarial review

agent_types:
  planning_agents:
    - Architect: High-level design
    - Implementer: Detailed task breakdown
    - Estimator: Complexity and risk assessment

  execution_agents:
    - Coder: Implementation
    - Tester: Test generation
    - Documenter: Documentation

  review_agents:
    - Critic: Find flaws
    - Devil's Advocate: Argue alternatives
    - Red Team: Security attacks
    - Chaos: Edge cases

orchestration_patterns:
  sequential: A → B → C (dependent tasks)
  parallel: A | B | C (independent tasks)
  adversarial: A vs B (competing proposals)
  consensus: A + B + C → agreement
```

### 4. Continuous Learning System

Gets smarter with every interaction.

```yaml
responsibilities:
  - Learn from accepted/rejected suggestions
  - Update developer profile
  - Refine decision confidence scores
  - Improve context predictions
  - Adapt to project patterns

learning_signals:
  explicit:
    - User feedback ("this was helpful/not helpful")
    - Accepted vs rejected suggestions
    - Edited vs used-as-is output

  implicit:
    - Time spent on suggestions
    - Follow-up actions after suggestion
    - Patterns in what user searches for
    - Code changes after AI interaction

feedback_loops:
  - Decision extraction → user correction → improved extraction
  - Context prediction → actual need → refined prediction
  - Agent suggestion → user edit → better suggestions
  - Profile inference → behavior observation → profile update
```

## Data Flow

### On Project Start

```
1. User: /gywd:init or /gywd:new-project
   │
2. Decision Graph Engine: Extract decisions from history
   │
3. Context Intelligence: Build initial context model
   │
4. Learning System: Load/create developer profile
   │
5. Ready: Full project understanding loaded
```

### On Any Command

```
1. Command received
   │
2. Context Intelligence: Determine optimal context
   │
3. Decision Graph: Load relevant decisions
   │
4. Agent Orchestrator: Spawn appropriate agents
   │
5. Execute with full context awareness
   │
6. Learning System: Record outcomes
```

### On Code Change

```
1. File change detected
   │
2. Decision Graph: Update affected decisions
   │
3. Context Intelligence: Refresh predictions
   │
4. Learning System: Note patterns
```

## Integration Points

### With Git

```yaml
triggers:
  - pre-commit: Validate against decisions
  - post-commit: Extract new decisions
  - post-merge: Reconcile decision conflicts

data_extraction:
  - Commit messages → decisions
  - PR descriptions → decisions
  - Branch patterns → workflow learning
```

### With IDE/Editor

```yaml
events:
  - file_open: Pre-load relevant context
  - cursor_move: Update active context
  - save: Trigger decision extraction
  - error: Load similar past errors

context_provision:
  - Relevant decisions for current file
  - Recent changes to related files
  - Known issues in this area
```

### With Production

```yaml
data_import:
  - Error rates per file/function
  - Performance metrics per endpoint
  - Cost attribution per service
  - Incident history per code area

context_enhancement:
  - "This code handles 50K requests/day"
  - "Last change here caused P1 incident"
  - "This area costs $400/month in compute"
```

## File Structure

```
.planning/
├── core/                    # v2.0 core data
│   ├── decisions.json       # Decision graph
│   ├── context-model.json   # Context intelligence state
│   ├── learning-state.json  # Learning system state
│   └── agent-history.json   # Agent interaction history
│
├── profile/                 # Developer digital twin
│   ├── cognitive.yaml       # Thinking patterns
│   ├── expertise.yaml       # Knowledge topology
│   ├── preferences.yaml     # Style preferences
│   └── history.yaml         # Interaction history
│
├── codebase/               # Codebase understanding
│   ├── DECISIONS.md        # Human-readable decisions
│   ├── decision-graph.json # Machine-readable graph
│   └── [existing maps]     # Stack, architecture, etc.
│
└── [existing structure]    # PROJECT.md, ROADMAP.md, etc.
```

## Initialization Sequence

```python
def initialize_gywd_v2():
    # 1. Load or create core data structures
    decision_graph = DecisionGraph.load_or_create()
    context_engine = ContextIntelligence.load_or_create()
    learning_system = LearningSystem.load_or_create()
    agent_orchestrator = AgentOrchestrator()

    # 2. If new project, run initial extraction
    if decision_graph.is_empty():
        decisions = extract_decisions_from_history()
        decision_graph.bulk_load(decisions)

    # 3. Build initial context model
    context_engine.initialize_from_decisions(decision_graph)

    # 4. Load developer profile
    profile = learning_system.load_profile()

    # 5. Connect all systems
    core = GYWDCore(
        decisions=decision_graph,
        context=context_engine,
        learning=learning_system,
        agents=agent_orchestrator
    )

    return core
```

## Command Integration

Every v1.x command now goes through the core:

```python
# Before (v1.x): Direct execution
def execute_command(cmd, args):
    return cmd.run(args)

# After (v2.0): Core-mediated execution
def execute_command(cmd, args):
    # Get optimal context
    context = core.context.get_context_for(cmd, args)

    # Load relevant decisions
    decisions = core.decisions.get_relevant(cmd, args)

    # Execute with full awareness
    result = cmd.run(args, context=context, decisions=decisions)

    # Learn from execution
    core.learning.record(cmd, args, result)

    return result
```
