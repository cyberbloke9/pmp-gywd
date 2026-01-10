---
name: GYWD:deps
description: Visualize phase and task dependencies
argument-hint: "[phase-number or 'all']"
---

<objective>
Display dependency relationships between phases and tasks to:
- Identify blocked work
- Find parallelizable tasks
- Understand critical path
- Prevent out-of-order execution

Helps users understand what can be done now vs. what must wait.
</objective>

<context>
Arguments: $ARGUMENTS

- No args or `all`: Show all phase dependencies
- Phase number: Show task dependencies within that phase
</context>

<process>
## Phase Dependencies (default or 'all')

1. Read ROADMAP.md for all phases
2. Read each phase's PLAN.md files for dependency declarations
3. Build dependency graph:
   - Look for "Dependencies:" sections
   - Look for "Requires:" mentions
   - Infer from ordering and context

4. Generate visualization:
   ```
   ## Phase Dependencies

   ```
   [1] Foundation
    ↓
   [2] Authentication ←──┐
    ↓                    │
   [3] Core Features ────┤
    ↓                    │
   [4] API Layer ────────┘
    ↓
   [5] UI Components
    ↓
   [6] Testing
    ↓
   [7] Deployment
   ```

   ### Dependency Matrix

   | Phase | Depends On | Blocks |
   |-------|------------|--------|
   | 1. Foundation | - | 2, 3 |
   | 2. Auth | 1 | 4 |
   | 3. Core | 1 | 4 |
   | 4. API | 2, 3 | 5 |
   | 5. UI | 4 | 6 |
   | 6. Testing | 5 | 7 |
   | 7. Deploy | 6 | - |

   ### Parallelizable

   Can run in parallel:
   - Phase 2 (Auth) ↔ Phase 3 (Core Features)

   ### Critical Path

   Longest chain: 1 → 2 → 4 → 5 → 6 → 7 (6 phases)

   ### Current Status

   ✅ Phase 1: Complete
   🔄 Phase 2: In progress
   ⏳ Phase 3: Can start now (parallel with 2)
   🔒 Phase 4: Blocked by 2, 3
   ```

## Task Dependencies (specific phase)

1. Read the phase's PLAN.md
2. Parse task list with dependency markers
3. Build task dependency graph

4. Generate visualization:
   ```
   ## Phase 3: Core Features - Task Dependencies

   ```
   [T1] Create data models
    ↓
   [T2] Implement repositories ←──┐
    ↓                             │
   [T3] Add business logic ───────┤
    ↓                             │
   [T4] Create service layer ─────┘
    ↓
   [T5] Write unit tests
   ```

   ### Task Status

   | Task | Status | Depends On | Can Start? |
   |------|--------|------------|------------|
   | T1 | ✅ Done | - | - |
   | T2 | ✅ Done | T1 | - |
   | T3 | 🔄 Active | T1 | - |
   | T4 | ⏳ Ready | T2, T3 | After T3 |
   | T5 | 🔒 Blocked | T4 | No |

   ### Parallelizable Tasks

   - T2 ↔ T3 (both depend only on T1)

   ### Next Available

   After current work:
   - T4 becomes unblocked when T3 completes
   ```
</process>

<dependency_detection>
**Explicit dependencies:**
- "Depends on: Phase X" or "Requires: Task Y"
- "After: ..." or "Blocked by: ..."
- Numbered references in descriptions

**Inferred dependencies:**
- Sequential ordering in ROADMAP.md
- References to outputs of other tasks
- Logical prerequisites (can't test before implementing)
- Import/usage patterns in code

**Parallel opportunities:**
- Tasks with same parent dependency
- Phases with no shared requirements
- Independent feature branches
</dependency_detection>

<output_format>
Visual graph using ASCII art:
- `↓` for direct dependency (A must complete before B)
- `←──` for blocking relationship
- `↔` for parallel opportunities

Tables for detailed status:
- Depends On: What must complete first
- Blocks: What's waiting on this
- Can Start?: Whether prerequisites are met

Status indicators:
- ✅ Complete
- 🔄 In progress
- ⏳ Ready (can start)
- 🔒 Blocked
</output_format>

<success_criteria>
- [ ] Parses dependencies from ROADMAP and PLANs
- [ ] Generates visual dependency graph
- [ ] Shows matrix of relationships
- [ ] Identifies parallelizable work
- [ ] Highlights critical path
- [ ] Shows current blocked/unblocked status
</success_criteria>
