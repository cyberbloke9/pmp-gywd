# GYWD v2.0 Agent Orchestration Patterns

## Overview

The Agent Orchestrator manages multiple AI agents working together, including
adversarial agents that challenge assumptions and find flaws.

## Agent Types

### Planning Agents

```yaml
Architect:
  purpose: High-level system design
  inputs:
    - Requirements
    - Constraints
    - Existing architecture (if brownfield)
  outputs:
    - Component diagram
    - Interface definitions
    - Decision recommendations
  style: Conservative, considers long-term implications

Implementer:
  purpose: Detailed task breakdown
  inputs:
    - Architect's design
    - Codebase context
    - Developer profile
  outputs:
    - Task list with dependencies
    - File change predictions
    - Risk assessment per task
  style: Practical, focused on executability

Estimator:
  purpose: Complexity and risk assessment
  inputs:
    - Task list
    - Historical data
    - Codebase metrics
  outputs:
    - Complexity scores
    - Risk factors
    - Potential blockers
  style: Data-driven, cautious
```

### Execution Agents

```yaml
Coder:
  purpose: Write implementation code
  inputs:
    - Task specification
    - Relevant decisions
    - Code context
    - Developer profile (for style matching)
  outputs:
    - Code changes
    - Inline documentation
    - Test stubs
  style: Matches developer preferences

Tester:
  purpose: Generate and run tests
  inputs:
    - Code changes
    - Test patterns from codebase
    - Coverage requirements
  outputs:
    - Test files
    - Coverage report
    - Edge cases identified
  style: Thorough, adversarial to code

Documenter:
  purpose: Generate documentation
  inputs:
    - Code changes
    - Decisions involved
    - Existing doc style
  outputs:
    - API documentation
    - Decision records
    - README updates
  style: Clear, matches existing conventions
```

### Review Agents (Adversarial)

```yaml
Critic:
  purpose: Find logical and design flaws
  personality: Skeptical, detail-oriented
  questions_asked:
    - "What happens if this fails?"
    - "Is this the simplest solution?"
    - "Does this violate any existing decisions?"
  output_style: Specific, actionable critiques

Devil's Advocate:
  purpose: Argue for alternative approaches
  personality: Contrarian, creative
  questions_asked:
    - "Why not do it this other way?"
    - "What would [framework X] users do?"
    - "Is there a third option we haven't considered?"
  output_style: Alternative proposals with trade-offs

Red Team:
  purpose: Security attack simulation
  personality: Adversarial, security-focused
  attack_vectors:
    - Input validation bypass
    - Authentication weaknesses
    - Data exposure risks
    - Injection vulnerabilities
  output_style: Vulnerability reports with severity

Chaos:
  purpose: Edge case and failure mode discovery
  personality: Chaotic, thorough
  scenarios_generated:
    - Null/empty inputs
    - Concurrent access
    - Resource exhaustion
    - Network failures
    - Malformed data
  output_style: Test scenarios with expected behavior

Skeptic:
  purpose: Question assumptions and requirements
  personality: Philosophical, questioning
  questions_asked:
    - "Do we actually need this?"
    - "Is the requirement correct?"
    - "What assumptions are we making?"
  output_style: Assumption list with validation suggestions
```

## Orchestration Patterns

### Sequential Pattern
```
Use when: Tasks have clear dependencies
Flow: A → B → C
Example: Design → Implement → Test

┌─────────┐     ┌─────────┐     ┌─────────┐
│Architect│ ──► │Implement│ ──► │ Tester  │
└─────────┘     └─────────┘     └─────────┘
```

### Parallel Pattern
```
Use when: Tasks are independent
Flow: A | B | C (concurrent)
Example: Multiple file changes in different modules

┌─────────┐
│ Coder A │ ─┐
└─────────┘  │
             │  ┌──────────┐
┌─────────┐  ├─►│Synthesize│
│ Coder B │ ─┤  └──────────┘
└─────────┘  │
             │
┌─────────┐  │
│ Coder C │ ─┘
└─────────┘
```

### Adversarial Pattern
```
Use when: Need to validate decisions/code quality
Flow: A vs B (competing proposals)
Example: Two approaches to the same problem

┌─────────────┐        ┌─────────────┐
│ Approach A  │   vs   │ Approach B  │
└──────┬──────┘        └──────┬──────┘
       │                      │
       └──────────┬───────────┘
                  ▼
          ┌─────────────┐
          │   Compare   │
          │  & Select   │
          └─────────────┘
```

### Consensus Pattern
```
Use when: Critical decisions need multiple perspectives
Flow: A + B + C → agreement
Example: Architecture decisions

┌──────────┐  ┌──────────┐  ┌──────────┐
│ Security │  │  Perf    │  │  UX      │
│ Expert   │  │  Expert  │  │  Expert  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   ▼
           ┌─────────────┐
           │  Consensus  │
           │   Builder   │
           └─────────────┘
```

### Challenge Pattern
```
Use when: Running /gywd:challenge
Flow: Proposal → Multiple adversarial attacks → Synthesis

                    ┌─────────┐
             ┌─────►│ Critic  │─────┐
             │      └─────────┘     │
             │                      │
┌──────────┐ │      ┌─────────┐     │  ┌──────────┐
│ Proposal │─┼─────►│ Devil's │─────┼─►│ Synthesis│
└──────────┘ │      │Advocate │     │  └──────────┘
             │      └─────────┘     │
             │                      │
             │      ┌─────────┐     │
             ├─────►│Red Team │─────┤
             │      └─────────┘     │
             │                      │
             │      ┌─────────┐     │
             └─────►│  Chaos  │─────┘
                    └─────────┘
```

## Agent Communication Protocol

### Message Format
```json
{
  "from": "agent_id",
  "to": "agent_id | broadcast",
  "type": "request | response | critique | proposal",
  "priority": "low | medium | high | critical",
  "payload": {
    "content": "...",
    "context_needed": ["file1", "decision2"],
    "confidence": 0.85
  },
  "metadata": {
    "timestamp": "...",
    "in_response_to": "message_id",
    "thread_id": "..."
  }
}
```

### Conflict Resolution

When agents disagree:

1. **Severity Assessment**: How critical is the disagreement?
2. **Evidence Gathering**: What data supports each position?
3. **Developer Profile Check**: What would the developer prefer?
4. **Escalation**: If unresolved, present options to user

```yaml
resolution_strategies:
  low_severity:
    - Use developer profile preference
    - Default to simpler option

  medium_severity:
    - Present both options with trade-offs
    - Recommend based on project decisions

  high_severity:
    - Require explicit user decision
    - Document for future reference
```

## Integration with Core Systems

### Decision Graph Integration
```
- Agents query relevant decisions before work
- Agents propose new decisions from their work
- Decision conflicts trigger adversarial review
```

### Context Intelligence Integration
```
- Orchestrator requests optimal context for each agent
- Agents report what context was useful
- Context predictions refined based on agent outcomes
```

### Learning System Integration
```
- Agent outcomes recorded for learning
- Agent selections refined over time
- Agent personalities adapted to developer
```

## Performance Considerations

### Token Budget Management
```yaml
budget_allocation:
  planning_agents: 20%
  execution_agents: 50%
  review_agents: 25%
  synthesis: 5%

compression_triggers:
  - Total exceeds 80% budget
  - Individual agent exceeds allocation
  - Redundant information detected
```

### Parallelization Strategy
```yaml
parallel_when:
  - Independent file changes
  - Multiple review perspectives needed
  - Exploration of alternatives

sequential_when:
  - Output of one needed by another
  - Consensus building required
  - Critical path execution
```
