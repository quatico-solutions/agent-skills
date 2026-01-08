---
description: Create or update CLAUDE.md through systematic exploration of the project and related ecosystem
---

# /init-agent - CLAUDE.md Setup Methodology

You are helping a developer create or update a CLAUDE.md file for their project. This command defines HOW to gather information, not WHAT the information is. Everything is discovered from sources.

## Quatico Tech Stack Assumptions

Most projects use one of these stacks:

| Stack | Detection | Common Tools |
|-------|-----------|--------------|
| **Node.js/TypeScript** | `package.json` + `tsconfig.json` | pnpm, Nx, Jest, Playwright, Storybook |
| **Java/Maven** | `pom.xml` | Maven, Spring, JUnit |
| **Java/Gradle** | `build.gradle` or `gradlew` | Gradle/Kotlin DSL, microservices |
| **Hybrid** | `pom.xml` + `package.json` | Maven backend + pnpm frontend |
| **Legacy/Custom** | Unusual configs | Ask user for details |

**Defaults to assume:**
- pnpm over npm/yarn (22 monorepos use pnpm)
- Nx for task orchestration (16 repos)
- Jest + Playwright for testing
- Bitbucket for git hosting (not GitHub)
- Jenkins for CI (not GitHub Actions)

## Phase 1: Project Discovery

First, understand what you're working with:

1. **Read current directory** - Look for:
   - Node.js: `package.json`, `tsconfig.json`, `pnpm-workspace.yaml`, `nx.json`, `lerna.json`
   - Java: `pom.xml`, `build.gradle`, `gradlew`
   - Both: Hybrid Maven+pnpm project
2. **Check for existing CLAUDE.md** - If it exists, this is an update. Read it first.
3. **Detect project archetype**:
   - **pnpm + Nx**: Modern Node monorepo (most common)
   - **pnpm + Lerna**: Multi-package publishing
   - **Maven**: Java backend or legacy
   - **Hybrid**: Maven backend + pnpm frontend (ewz-web, bfh-web pattern)
4. **Assess project state** - Existing codebase with code, or empty/new project

Report findings to user before proceeding.

## Phase 2: Ask for Context Sources

Request TWO types of sources from the user:

### TYPE A: Rule Templates
Repos with good, working CLAUDE.md files to use as reference.

- Purpose: Copy 1:1, adapt, or ignore specific rules
- What you'll read: Only their CLAUDE.md files
- Best candidates: Recently updated repos with proven agent rules

**Known repos with CLAUDE.md (8 total):**
| Repo | Lines | Good for |
|------|-------|----------|
| `WEBBLOQS/wbcomponents-catalog` | 414 | Comprehensive: commands, testing, architecture, external tools |
| `CDSTLZ/qs-design-tests` | 1014 | Monorepo incubator, Jenkins CI, performance benchmarks |
| `CDSTLZ/qs-magellan` | 488 | Hybrid Node+Java, watchman, architecture analysis |
| `CDSTLZ/wbcomponents-proxies` | 171 | Component library, SSR, release process |
| `EWZ/ewz-workspace` | 644 | Meta-workspace, domain glossary, architecture diagrams |
| `MCHWEB/internal-project-workspace` | 752 | Meta-workspace, multi-tenant, domain glossary |
| `MCHWEB/internal-project-product-processor` | 189 | Spring Boot pipeline, implicit behaviors, pitfalls |

Ask: "Which repos have CLAUDE.md files I should reference? Here are the known ones: [list above]"

### TYPE B: Ecosystem Projects
Projects related to THIS project that help understand its context.

- **Sibling packages** - Same monorepo or sister repositories
- **Upstream libraries** - Libraries this project depends on
- **Downstream consumers** - Projects that USE this library/service

Purpose: Explore their SOURCE CODE, tests, and docs to understand:
- Import conventions and patterns
- Testing practices
- Architecture decisions
- Integration patterns

**Known project organizations (~/CODE/):**
| Org | Focus | Example Projects |
|-----|-------|------------------|
| `WEBBLOQS/` | Component library core | wbcomponents-catalog, wbcomponents-proxies |
| `CDSTLZ/` | Design system toolkit | qs-design-tests, websmith, vite-plugin-wbcomponents |
| `EWZ/` | Elektrizitätswerk Zürich | ewz-web, ewz-design, ewz-kus-* (microservices) |
| `MCHWEB/` | MCH Group | internal-project, internal-project-product-processor, bfh-design-tests |
| `CDS/` | Custom Data Solutions | internal-project, cds-invoicing |
| `BFHWEB/` | Bern University | bfh-web (hybrid Maven+pnpm) |
| `QUAWEBPLF/` | Quatico Web Platform | qs-web-platform, qs-runtime-* |
| `QUAINFRA/` | Infrastructure | cloud, apps-infra (Terraform) |

Ask: "Which sibling, upstream, or downstream projects should I explore? Here are the known organizations: [list above]"

### Also Request
- Team documentation URLs (Confluence/wiki pages)
- CI/Build system: Usually Jenkins (check Bitbucket PR for build links)

## Phase 3: Exploration

Launch parallel agents based on project state:

### For EXISTING projects (has code):

1. **Agent: This Project's Architecture**
   - Explore package structure, entry points, main patterns
   - Identify key abstractions and conventions

2. **Agent: This Project's Commands**
   - Read package.json scripts, Makefile, build configs
   - Document build, test, lint, dev workflows

3. **Agent: TYPE B Ecosystem Projects**
   - For each ecosystem project: explore source, tests, docs
   - Find patterns relevant to THIS project (import conventions, etc.)

4. **Agent (optional): TYPE A Rule Templates**
   - Read CLAUDE.md from each template repo
   - Extract rules to present for copy/adapt/ignore

### For EMPTY/NEW projects:

- Skip Agents 1 & 2 (no code to explore)
- Focus on TYPE B ecosystem to understand expected patterns
- Heavily reference TYPE A templates for structure

## Phase 4: Rule Synthesis

For each rule found in TYPE A template repos:

1. **Present the rule** - Show the exact text
2. **Ask the user** - "Should I: Copy 1:1 | Adapt | Ignore?"
3. **If adapt** - Ask what to change
4. **User stays in control** - Never assume; always ask

Group rules by section (Commands, Testing Protocol, Behavioral Rules, etc.) for efficiency.

## Phase 5: Section Generation

Generate CLAUDE.md incrementally, section by section:

### Standard Sections (include based on project type)

| Section | When to Include |
|---------|-----------------|
| **Overview** | Always - project description, main products, related packages |
| **Getting Started** | Always - setup commands (nvm, pnpm install, etc.) |
| **Commands** | Always - Build, Test, Lint, Development commands |
| **Critical Testing Protocol** | If CI exists - task completion requirements |
| **Agent Behavioral Rules** | If library/team project - changelog, docs, PR behavior |
| **Architecture** | If complex codebase - package structure, patterns |
| **Build Tools** | If relevant - pnpm, Nx, Vite, etc. |
| **TypeScript/Config** | If non-standard - noteworthy config options |
| **Release Process** | If applicable - how to release |
| **Important Notes** | Always - gotchas, conventions, edge cases |
| **Technology Stack** | Always - versions of key dependencies |
| **External Tools** | If applicable - CI, PR tools (Bitbucket, Jenkins) |

### For Each Section

1. Present a draft (200-300 words max)
2. Ask for validation: "Does this look right? Any changes?"
3. Incorporate feedback before moving to next section
4. Keep content concise - agents scan quickly

## Phase 6: Write and Verify

1. **Write CLAUDE.md** - Combine all validated sections
2. **Show summary** - List what was created/updated
3. **Suggest verification** - "Try giving me a simple task to verify the instructions work"

## Key Principles

### User Control
- Never assume what rules to copy
- Present every rule and ask for decision
- Validate every section before writing

### Discovery Over Templates
- CLAUDE.md content is discovered fresh from sources each time
- Tech stack assumptions and known repos are hardcoded context (see above)
- User-provided sources define what rules to include

### Efficient Exploration
- Use parallel agents when possible
- TYPE A repos: read CLAUDE.md only
- TYPE B repos: deep exploration of source, tests, docs

### Concise Output
- 200-300 words per section max
- Tables and code blocks over prose
- Agents scan; don't write novels
