---
name: GYWD:profile
description: Developer Digital Twin - model of your patterns, preferences, and expertise
argument-hint: "[show|learn|reset] [--export] [--import <path>]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
  - Write
---

<objective>
Build and maintain a persistent model of YOU as a developer.

Current AI treats every developer identically.
But you have:
- Unique cognitive patterns
- Personal heuristics
- Areas of deep expertise
- Characteristic blind spots
- Preferred abstractions

Your Digital Twin captures this, making AI adapt to YOU.
</objective>

<philosophy>
From cognitive science: "Experts organize knowledge as larger but fewer chunks than novices."

Your expertise has a shape. Your thinking has patterns.
A system that understands YOUR patterns serves you better than one that serves "average developer."
</philosophy>

<profile_dimensions>
## What We Model

### 1. Cognitive Fingerprint
How you think about problems.

```yaml
cognitive_style:
  abstraction_level: high  # vs concrete
  approach: top_down       # vs bottom_up
  exploration: depth_first # vs breadth_first
  risk_tolerance: moderate # conservative, moderate, aggressive

  chunking_patterns:
    - "Groups by feature, not layer"
    - "Thinks in data transformations"
    - "Visualizes as state machines"

  reasoning_style:
    - "Prefers explicit over implicit"
    - "Asks 'what could go wrong' early"
    - "Iterates quickly, refactors later"
```

### 2. Knowledge Topology
What you know and how deeply.

```yaml
expertise_map:
  deep:  # Could teach others
    - TypeScript advanced types
    - React hooks patterns
    - API design
    - Testing strategies

  working:  # Competent, no lookup needed
    - Node.js
    - PostgreSQL
    - Git workflows
    - Docker basics

  familiar:  # Can work with lookup
    - GraphQL
    - Redis
    - CI/CD
    - AWS services

  learning:  # Currently developing
    - Rust
    - WebAssembly

  gaps:  # Known unknowns
    - Machine learning
    - Mobile development
    - Kubernetes internals
```

### 3. Decision Patterns
How you make choices.

```yaml
decision_style:
  speed: deliberate  # quick, deliberate, thorough
  reversibility_bias: "Prefers easily reversible choices"
  documentation: "Documents decisions but not code"

  typical_trade_offs:
    - "Favors readability over performance"
    - "Prefers explicit over clever"
    - "Chooses boring technology"

  anti_patterns:  # Things you avoid
    - "Class inheritance hierarchies"
    - "Global state"
    - "Magic strings"
```

### 4. Communication Style
How you explain and understand.

```yaml
communication:
  explanation_preference: "Examples before theory"
  detail_level: moderate

  learns_best_from:
    - "Working code examples"
    - "Visual diagrams"
    - "Incremental building"

  learns_poorly_from:
    - "Long documentation"
    - "Abstract descriptions"
    - "Videos without code"

  writes:
    - "Terse commit messages"
    - "Detailed PR descriptions"
    - "Comments for 'why' not 'what'"
```

### 5. Work Patterns
How you operate.

```yaml
work_patterns:
  peak_hours: "9am-12pm"
  deep_work_duration: "90 min average"
  context_switch_cost: high

  session_patterns:
    - "Starts with review of yesterday"
    - "Tackles hard problems in morning"
    - "Refactors in afternoon"
    - "Writes tests at end of feature"

  interruption_tolerance: low

  collaboration_style:
    - "Prefers async communication"
    - "Likes pair programming for complex problems"
    - "Reviews PRs in batches"
```

### 6. Historical Patterns
What your past reveals.

```yaml
historical:
  common_bugs:
    - "Off-by-one errors in loops"
    - "Missing null checks on optional chains"
    - "Forgetting to await async functions"

  refactoring_triggers:
    - "Third time writing similar code"
    - "Function exceeds 50 lines"
    - "More than 3 parameters"

  typical_journey:
    - "Spike solution first"
    - "Happy path implementation"
    - "Error handling second pass"
    - "Tests after implementation"
    - "Refactor before PR"
```
</profile_dimensions>

<commands>
## Subcommands

### /gywd:profile show
Display current profile.

```markdown
## Developer Profile: @cyberbloke9

### Cognitive Style
- Top-down thinker, depth-first explorer
- Groups by feature, thinks in data transformations
- Moderate risk tolerance

### Expertise
🟢 Deep: TypeScript, React, API Design, Testing
🔵 Working: Node.js, PostgreSQL, Git, Docker
🟡 Familiar: GraphQL, Redis, CI/CD
📚 Learning: Rust

### Decision Patterns
- Deliberate decision-maker
- Favors readability over performance
- Chooses boring technology

### Work Patterns
- Peak: 9am-12pm
- Deep work: 90 min sessions
- High context-switch cost
- Low interruption tolerance

### Known Blind Spots
- Off-by-one errors
- Missing null checks
- Forgetting await

Profile confidence: 78% (based on 6 months data)
```

### /gywd:profile learn
Trigger learning from recent behavior.

```
Analyzing recent activity...

Learned:
+ "Prefers named exports over default exports"
+ "Uses early returns consistently"
+ "Tests edge cases before happy path"

Updated:
~ expertise.typescript: working → deep
~ work_patterns.peak_hours: refined to 9:30-11:30am

Removed (no longer accurate):
- "Uses class components" (switched to hooks)

Profile updated.
```

### /gywd:profile reset [dimension]
Reset profile or specific dimension.

```
/gywd:profile reset expertise
# Resets expertise map, keeps other dimensions

/gywd:profile reset
# Full reset with confirmation
```

### /gywd:profile --export
Export profile to shareable format.

```
Exported to .planning/profile-export.yaml

This file contains:
- Cognitive patterns
- Expertise map
- Decision patterns
- Work patterns

Does NOT contain:
- Historical bugs (private)
- Session data (private)
- Personal identifiers
```

### /gywd:profile --import <path>
Import profile from export.

```
Importing from team-profile.yaml...

Imported:
- Team coding conventions
- Shared expertise expectations
- Common decision patterns

Merged with personal profile.
```
</commands>

<learning_sources>
## How Profile Learns

### Code Patterns
- Analyze your commits for style patterns
- Compare accepted vs rejected suggestions
- Track refactoring triggers

### Decision Patterns
- Track which options you choose
- Analyze commit message language
- Learn from PR review comments

### Work Patterns
- Session start/end times
- Focus duration analysis
- Context switch frequency
- Interruption handling

### Expertise
- Files you navigate confidently
- Areas where you seek help
- Explanation complexity you produce
- Code review depth by area
</learning_sources>

<integration>
## How Profile Integrates

### In Planning
- Suggest approaches matching your style
- Flag areas outside your expertise
- Estimate your effort based on patterns

### In Execution
- Format output to your preferences
- Explain in your style
- Warn about your common mistakes

### In Review
- Focus on your blind spots
- Match your review depth preferences
- Time suggestions appropriately

### In Anticipation
- Predict based on YOUR patterns
- Pre-load YOUR typical needs
- Protect YOUR flow patterns
</integration>

<privacy>
## Privacy Controls

All profile data is:
- Stored locally in .planning/profile/
- Never transmitted without explicit export
- Deletable with /gywd:profile reset

Sensitive dimensions (bugs, session data) are:
- Never included in exports
- Encrypted at rest
- Purgeable separately
</privacy>

<success_criteria>
- [ ] Captures cognitive patterns accurately
- [ ] Maps expertise topology
- [ ] Learns from behavior over time
- [ ] Adapts AI responses to profile
- [ ] Exports/imports for team sharing
- [ ] Respects privacy boundaries
- [ ] Improves with usage
</success_criteria>
