# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Run Svelte type checking and TypeScript checks
```

### Common Development Tasks
```bash
# Install dependencies
npm install

# Type checking only
npx svelte-check --tsconfig ./tsconfig.app.json
```

## Architecture Overview

### Technology Stack
- **Framework**: Svelte 5 with new runes API (`$state`, `$derived`, `$props()`)
- **Language**: TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS with custom design system
- **UI Library**: Shadcn-svelte (bits-ui based)
- **State Management**: Custom Svelte stores using runes API

### Key Architectural Patterns

1. **Component Organization**
   - Base UI components in `src/lib/components/ui/` (shadcn-svelte)
   - Custom business components in `src/lib/components/custom-ui/`
   - Feature-specific components grouped by domain (charts, graph, model)

2. **State Management**
   - Global stores in `src/lib/stores/` using Svelte 5 runes
   - Each domain has its own store (AuthStore, ProjectStore, LiteratureStore, etc.)
   - Stores handle both state and API communication

3. **API Integration**
   - Service layer in `src/lib/services/`
   - All API calls use credentials: 'include' for cookie-based auth
   - Base API URL configured in environment

4. **Routing Structure**
   - Route components in `src/routes/`
   - Protected routes use ProtectedLayout/ProtectedRoute components
   - Project routes are nested under `/project/:id/`

5. **Type Safety**
   - Types defined in `src/lib/types/`
   - Strict TypeScript configuration
   - Component props use `$props()` rune for type safety

### Important Conventions

1. **Svelte 5 Runes**
   - Use `$state` for reactive state
   - Use `$derived` for computed values
   - Use `$props()` for component props
   - Use `$effect` for side effects
   - **IMPORTANT**: Runes (`$state`, `$derived`, `$effect`, etc.) can ONLY be used in `.svelte` or `.svelte.ts` files, NOT in regular `.ts` files

2. **Import Paths**
   - Use `$lib` alias for imports from src/lib
   - Example: `import { Button } from '$lib/components/ui/button'`

3. **Component Patterns**
   - Prefer composition over inheritance
   - Use slot props for flexible component APIs
   - Keep components focused and single-purpose

4. **Error Handling**
   - API errors are handled in service layer
   - User feedback via toast notifications
   - Form validation with proper error states

### Key Features and Their Implementation

1. **Rich Text Editing**
   - TipTap v2 editor in `src/lib/components/shad-editor/`
   - Extensive plugin system for tables, math, media
   - Custom toolbar and formatting options

2. **Data Visualization**
   - D3.js for custom charts
   - Chart.js for standard charts
   - 3D Force Graph for network visualizations
   - XYFlow for flow diagrams

3. **Project Management**
   - Multi-step project workflows
   - Literature management with search and organization
   - Model creation and visualization
   - Outcome tracking and reporting

4. **Team Collaboration**
   - Organization-based access control
   - Team member management
   - Invitation system
   - Role-based permissions

### Development Notes

- No testing framework currently configured
- API base URL should be set in environment
- Authentication uses cookie-based sessions
- All API requests require authentication except login/register
- Custom event system for analytics and tracking

<!-- BACKLOG.MD GUIDELINES START -->
# Instructions for the usage of Backlog.md CLI Tool

## 1. Source of Truth

- Tasks live under **`backlog/tasks/`** (drafts under **`backlog/drafts/`**).
- Every implementation decision starts with reading the corresponding Markdown task file.
- Project documentation is in **`backlog/docs/`**.
- Project decisions are in **`backlog/decisions/`**.

## 2. Defining Tasks

### **Title**

Use a clear brief title that summarizes the task.

### **Description**: (The **"why"**)

Provide a concise summary of the task purpose and its goal. Do not add implementation details here. It
should explain the purpose and context of the task. Code snippets should be avoided.

### **Acceptance Criteria**: (The **"what"**)

List specific, measurable outcomes that define what means to reach the goal from the description. Use checkboxes (`- [ ]`) for tracking.
When defining `## Acceptance Criteria` for a task, focus on **outcomes, behaviors, and verifiable requirements** rather
than step-by-step implementation details.
Acceptance Criteria (AC) define *what* conditions must be met for the task to be considered complete.
They should be testable and confirm that the core purpose of the task is achieved.
**Key Principles for Good ACs:**

- **Outcome-Oriented:** Focus on the result, not the method.
- **Testable/Verifiable:** Each criterion should be something that can be objectively tested or verified.
- **Clear and Concise:** Unambiguous language.
- **Complete:** Collectively, ACs should cover the scope of the task.
- **User-Focused (where applicable):** Frame ACs from the perspective of the end-user or the system's external behavior.

    - *Good Example:* "- [ ] User can successfully log in with valid credentials."
    - *Good Example:* "- [ ] System processes 1000 requests per second without errors."
    - *Bad Example (Implementation Step):* "- [ ] Add a new function `handleLogin()` in `auth.ts`."

### Task file

Once a task is created it will be stored in `backlog/tasks/` directory as a Markdown file with the format
`task-<id> - <title>.md` (e.g. `task-42 - Add GraphQL resolver.md`).

### Additional task requirements

- Tasks must be **atomic** and **testable**. If a task is too large, break it down into smaller subtasks.
  Each task should represent a single unit of work that can be completed in a single PR.

- **Never** reference tasks that are to be done in the future or that are not yet created. You can only reference
  previous
  tasks (id < current task id).

- When creating multiple tasks, ensure they are **independent** and they do not depend on future tasks.   
  Example of wrong tasks splitting: task 1: "Add API endpoint for user data", task 2: "Define the user model and DB
  schema".  
  Example of correct tasks splitting: task 1: "Add system for handling API requests", task 2: "Add user model and DB
  schema", task 3: "Add API endpoint for user data".

## 3. Recommended Task Anatomy

```markdown
# task‑42 - Add GraphQL resolver

## Description (the why)

Short, imperative explanation of the goal of the task and why it is needed.

## Acceptance Criteria (the what)

- [ ] Resolver returns correct data for happy path
- [ ] Error response matches REST
- [ ] P95 latency ≤ 50 ms under 100 RPS

## Implementation Plan (the how)

1. Research existing GraphQL resolver patterns
2. Implement basic resolver with error handling
3. Add performance monitoring
4. Write unit and integration tests
5. Benchmark performance under load

## Implementation Notes (only added after working on the task)

- Approach taken
- Features implemented or modified
- Technical decisions and trade-offs
- Modified or added files
```

## 6. Implementing Tasks

Mandatory sections for every task:

- **Implementation Plan**: (The **"how"**) Outline the steps to achieve the task. Because the implementation details may
  change after the task is created, **the implementation notes must be added only after putting the task in progress**
  and before starting working on the task.
- **Implementation Notes**: Document your approach, decisions, challenges, and any deviations from the plan. This
  section is added after you are done working on the task. It should summarize what you did and why you did it. Keep it
  concise but informative.

**IMPORTANT**: Do not implement anything else that deviates from the **Acceptance Criteria**. If you need to
implement something that is not in the AC, update the AC first and then implement it or create a new task for it.

## 2. Typical Workflow

```bash
# 1 Identify work
backlog task list -s "To Do" --plain

# 2 Read details & documentation
backlog task 42 --plain
# Read also all documentation files in `backlog/docs/` directory.
# Read also all decision files in `backlog/decisions/` directory.

# 3 Start work: assign yourself & move column
backlog task edit 42 -a @{yourself} -s "In Progress"

# 4 Add implementation plan before starting
backlog task edit 42 --plan "1. Analyze current implementation\n2. Identify bottlenecks\n3. Refactor in phases"

# 5 Break work down if needed by creating subtasks or additional tasks
backlog task create "Refactor DB layer" -p 42 -a @{yourself} -d "Description" --ac "Tests pass,Performance improved"

# 6 Complete and mark Done
backlog task edit 42 -s Done --notes "Implemented GraphQL resolver with error handling and performance monitoring"
```

### 7. Final Steps Before Marking a Task as Done

Always ensure you have:

1. ✅ Marked all acceptance criteria as completed (change `- [ ]` to `- [x]`)
2. ✅ Added an `## Implementation Notes` section documenting your approach
3. ✅ Run all tests and linting checks
4. ✅ Updated relevant documentation

## 8. Definition of Done (DoD)

A task is **Done** only when **ALL** of the following are complete:

1. **Acceptance criteria** checklist in the task file is fully checked (all `- [ ]` changed to `- [x]`).
2. **Implementation plan** was followed or deviations were documented in Implementation Notes.
3. **Automated tests** (unit + integration) cover new logic.
4. **Static analysis**: linter & formatter succeed.
5. **Documentation**:
    - All relevant docs updated (README, backlog/docs, backlog/decisions, etc.).
    - Task file **MUST** have an `## Implementation Notes` section added summarising:
        - Approach taken
        - Features implemented or modified
        - Technical decisions and trade-offs
        - Modified or added files
6. **Review**: code reviewed.
7. **Task hygiene**: status set to **Done** via CLI (`backlog task edit <id> -s Done`).
8. **No regressions**: performance, security and licence checks green.

⚠️ **IMPORTANT**: Never mark a task as Done without completing ALL items above.

## 9. Handy CLI Commands

| Purpose          | Command                                                                |
|------------------|------------------------------------------------------------------------|
| Create task      | `backlog task create "Add OAuth"`                                      |
| Create with desc | `backlog task create "Feature" -d "Enables users to use this feature"` |
| Create with AC   | `backlog task create "Feature" --ac "Must work,Must be tested"`        |
| Create with deps | `backlog task create "Feature" --dep task-1,task-2`                    |
| Create sub task  | `backlog task create -p 14 "Add Google auth"`                          |
| List tasks       | `backlog task list --plain`                                            |
| View detail      | `backlog task 7 --plain`                                               |
| Edit             | `backlog task edit 7 -a @{yourself} -l auth,backend`                   |
| Add plan         | `backlog task edit 7 --plan "Implementation approach"`                 |
| Add AC           | `backlog task edit 7 --ac "New criterion,Another one"`                 |
| Add deps         | `backlog task edit 7 --dep task-1,task-2`                              |
| Add notes        | `backlog task edit 7 --notes "We added this and that feature because"` |
| Mark as done     | `backlog task edit 7 -s "Done"`                                        |
| Archive          | `backlog task archive 7`                                               |
| Draft flow       | `backlog draft create "Spike GraphQL"` → `backlog draft promote 3.1`   |
| Demote to draft  | `backlog task demote <task-id>`                                        |

## 10. Tips for AI Agents

- **Always use `--plain` flag** when listing or viewing tasks for AI-friendly text output instead of using Backlog.md
  interactive UI.
- When users mention to create a task, they mean to create a task using Backlog.md CLI tool.

<!-- BACKLOG.MD GUIDELINES END -->
