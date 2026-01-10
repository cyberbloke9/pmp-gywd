<div align="center">

# PMP - Get Your Work Done (GYWD)

**A light-weight and powerful meta-prompting, context engineering and spec-driven development system for Claude Code by cyberbloke9.**

[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/cyberbloke9/pmp-gywd?style=for-the-badge&logo=github&color=181717)](https://github.com/cyberbloke9/pmp-gywd)

<br>

```bash
npx pmp-gywd
```

**Works on Mac, Windows, and Linux.**

<br>

*"If you know clearly what you want, this WILL build it for you. No bs."*

*"By far the most powerful addition to my Claude Code. Nothing over-engineered. Literally just gets work done."*

<br>

[Why I Built This](#why-i-built-this) · [How It Works](#how-it-works) · [Commands](#commands) · [Why It Works](#why-it-works)

</div>

---

## Why I Built This

I'm a developer who uses Claude Code to ship MVPs fast.

Other spec-driven development tools exist, but they make things way more complicated than they need to be (sprint ceremonies, story points, stakeholder syncs, retrospectives, Jira workflows). I'm not a 50-person software company. I don't want to play enterprise theater. I'm just a builder trying to create great things that work.

So I forked and customized this system. The complexity is in the system, not in your workflow. Behind the scenes: context engineering, XML prompt formatting, subagent orchestration, state management. What you see: a few commands that just work.

The system gives Claude everything it needs to do the work *and* verify it. I trust the workflow. It just does a good job.

That's what this is. No enterprise roleplay. Just an incredibly effective system for building cool stuff consistently using Claude Code.

— **cyberbloke9**

---

Vibecoding has a bad reputation. You describe what you want, AI generates code, and you get inconsistent garbage that falls apart at scale.

GYWD fixes that. It's the context engineering layer that makes Claude Code reliable. Describe your idea, let the system extract everything it needs to know, and let Claude Code get to work.

---

## Who This Is For

People who want to describe what they want and have it built correctly — without pretending they're running a 50-person engineering org.

---

## Getting Started

```bash
npx pmp-gywd
```

That's it. Verify with `/gywd:help`.

<details>
<summary><strong>Non-interactive Install (Docker, CI, Scripts)</strong></summary>

```bash
npx pmp-gywd --global   # Install to ~/.claude/
npx pmp-gywd --local    # Install to ./.claude/
```

Use `--global` (`-g`) or `--local` (`-l`) to skip the interactive prompt.

</details>

<details>
<summary><strong>Development Installation</strong></summary>

Clone the repository and run the installer locally:

```bash
git clone https://github.com/cyberbloke9/pmp-gywd.git
cd pmp-gywd
node bin/install.js --local
```

Installs to `./.claude/` for testing modifications before contributing.

</details>

### Recommended: Skip Permissions Mode

GYWD is designed for frictionless automation. Run Claude Code with:

```bash
claude --dangerously-skip-permissions
```

> [!TIP]
> This is how GYWD is intended to be used — stopping to approve `date` and `git commit` 50 times defeats the purpose.

<details>
<summary><strong>Alternative: Granular Permissions</strong></summary>

If you prefer not to use that flag, add this to your project's `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(date:*)",
      "Bash(echo:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(wc:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(sort:*)",
      "Bash(grep:*)",
      "Bash(tr:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)",
      "Bash(git tag:*)"
    ]
  }
}
```

</details>

---

## How It Works

### 1. Start with an idea

```
/gywd:new-project
```

The system asks questions. Keeps asking until it has everything — your goals, constraints, tech preferences, edge cases. You go back and forth until the idea is fully captured. Creates **PROJECT.md**.

### 2. Create roadmap

```
/gywd:create-roadmap
```

Produces:
- **ROADMAP.md** — Phases from start to finish
- **STATE.md** — Living memory that persists across sessions

### 3. Plan and execute phases

```
/gywd:plan-phase 1      # System creates atomic task plans
/gywd:execute-plan      # Subagent implements autonomously
```

Each phase breaks into 2-3 atomic tasks. Each task runs in a fresh subagent context — 200k tokens purely for implementation, zero degradation.

### 4. Ship and iterate

```
/gywd:complete-milestone   # Archive v1, prep for v2
/gywd:add-phase            # Append new work
/gywd:insert-phase 2       # Slip urgent work between phases
```

Ship your MVP in a day. Add features. Insert hotfixes. The system stays modular — you're never stuck.

---

## Existing Projects (Brownfield)

Already have code? Start here instead.

### 1. Map the codebase

```
/gywd:map-codebase
```

Spawns parallel agents to analyze your code. Creates `.planning/codebase/` with 7 documents:

| Document | Purpose |
|----------|---------|
| `STACK.md` | Languages, frameworks, dependencies |
| `ARCHITECTURE.md` | Patterns, layers, data flow |
| `STRUCTURE.md` | Directory layout, where things live |
| `CONVENTIONS.md` | Code style, naming patterns |
| `TESTING.md` | Test framework, patterns |
| `INTEGRATIONS.md` | External services, APIs |
| `CONCERNS.md` | Tech debt, known issues, fragile areas |

### 2. Initialize project

```
/gywd:new-project
```

Same as greenfield, but the system knows your codebase. Questions focus on what you're adding/changing, not starting from scratch.

### 3. Continue as normal

From here, it's the same: `/gywd:create-roadmap` → `/gywd:plan-phase` → `/gywd:execute-plan`

The codebase docs load automatically during planning. Claude knows your patterns, conventions, and where to put things.

---

## Why It Works

### Context Engineering

Claude Code is incredibly powerful *if* you give it the context it needs. Most people don't.

GYWD handles it for you:

| File | What it does |
|------|--------------|
| `PROJECT.md` | Project vision, always loaded |
| `ROADMAP.md` | Where you're going, what's done |
| `STATE.md` | Decisions, blockers, position — memory across sessions |
| `PLAN.md` | Atomic task with XML structure, verification steps |
| `SUMMARY.md` | What happened, what changed, committed to history |
| `ISSUES.md` | Deferred enhancements tracked across sessions |

Size limits based on where Claude's quality degrades. Stay under, get consistent excellence.

### XML Prompt Formatting

Every plan is structured XML optimized for Claude:

```xml
<task type="auto">
  <name>Create login endpoint</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>
    Use jose for JWT (not jsonwebtoken - CommonJS issues).
    Validate credentials against users table.
    Return httpOnly cookie on success.
  </action>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200 + Set-Cookie</verify>
  <done>Valid credentials return cookie, invalid return 401</done>
</task>
```

Precise instructions. No guessing. Verification built in.

### Subagent Execution

As Claude fills its context window, quality degrades. You've seen it: *"Due to context limits, I'll be more concise now."* That "concision" is code for cutting corners.

GYWD prevents this. Each plan is maximum 3 tasks. Each plan runs in a fresh subagent — 200k tokens purely for implementation, zero accumulated garbage.

| Task | Context | Quality |
|------|---------|---------|
| Task 1 | Fresh | ✅ Full |
| Task 2 | Fresh | ✅ Full |
| Task 3 | Fresh | ✅ Full |

No degradation. Walk away, come back to completed work.

### Atomic Git Commits

Each task gets its own commit immediately after completion:

```bash
abc123f docs(08-02): complete user registration plan
def456g feat(08-02): add email confirmation flow
hij789k feat(08-02): implement password hashing
lmn012o feat(08-02): create registration endpoint
```

> [!NOTE]
> **Benefits:** Git bisect finds exact failing task. Each task independently revertable. Clear history for Claude in future sessions. Better observability in AI-automated workflow.

Every commit is surgical, traceable, and meaningful.

### Modular by Design

- Add phases to current milestone
- Insert urgent work between phases
- Complete milestones and start fresh
- Adjust plans without rebuilding everything

You're never locked in. The system adapts.

---

## Commands

| Command | What it does |
|---------|--------------|
| `/gywd:new-project` | Extract your idea through questions, create PROJECT.md |
| `/gywd:create-roadmap` | Create roadmap and state tracking |
| `/gywd:map-codebase` | Map existing codebase for brownfield projects |
| `/gywd:plan-phase [N]` | Generate task plans for phase |
| `/gywd:execute-plan` | Run plan via subagent |
| `/gywd:progress` | Where am I? What's next? |
| `/gywd:verify-work [N]` | User acceptance test of phase or plan |
| `/gywd:plan-fix [plan]` | Plan fixes for UAT issues from verify-work |
| `/gywd:complete-milestone` | Ship it, prep next version |
| `/gywd:discuss-milestone` | Gather context for next milestone |
| `/gywd:new-milestone [name]` | Create new milestone with phases |
| `/gywd:add-phase` | Append phase to roadmap |
| `/gywd:insert-phase [N]` | Insert urgent work |
| `/gywd:remove-phase [N]` | Remove future phase, renumber subsequent |
| `/gywd:discuss-phase [N]` | Gather context before planning |
| `/gywd:research-phase [N]` | Deep ecosystem research for niche domains |
| `/gywd:list-phase-assumptions [N]` | See what Claude thinks before you correct it |
| `/gywd:pause-work` | Create handoff file when stopping mid-phase |
| `/gywd:resume-work` | Restore from last session |
| `/gywd:consider-issues` | Review deferred issues, close resolved, identify urgent |
| `/gywd:help` | Show all commands and usage guide |

---

## Troubleshooting

**Commands not found after install?**
- Restart Claude Code to reload slash commands
- Verify files exist in `~/.claude/commands/gywd/` (global) or `./.claude/commands/gywd/` (local)

**Commands not working as expected?**
- Run `/gywd:help` to verify installation
- Re-run `npx pmp-gywd` to reinstall

**Updating to the latest version?**
```bash
npx pmp-gywd@latest
```

---

## Credits

This project is a fork of [Get Shit Done](https://github.com/glittercowboy/get-shit-done) by Lex Christopherson (TÂCHES). Full credit to the original creator for the brilliant context engineering system.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Claude Code is powerful. GYWD makes it reliable.**

</div>
