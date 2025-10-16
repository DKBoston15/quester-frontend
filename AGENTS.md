# Repository Guidelines

## Project Structure & Module Organization
- Entry point `src/main.ts`; global styles in `src/app.css`.
- Feature UI lives in `src/lib/components`; domain logic in `src/lib/services`; shared state `src/lib/stores`; helpers in `src/lib/utils`.
- Routes sit in `src/routes`; assets in `src/assets`; static exports in `public/`.
- Tests live in `src/lib/services/__tests__`; shared setup is `src/test-setup.ts`.

## Build, Test, and Development Commands
- `pnpm install` restores dependencies; keep `pnpm-lock.yaml` committed.
- `pnpm dev` runs Vite with HMR at http://localhost:5173.
- `pnpm build` outputs the production bundle to `dist/`; preview via `pnpm preview`.
- `pnpm check` runs `svelte-check` plus TypeScript diagnostics.
- `pnpm test`, `pnpm test:run`, and `pnpm test:ui` cover watch, CI, and interactive Vitest modes.

## Coding Style & Naming Conventions
- Author TypeScript Svelte files with two-space indent, trailing commas, and PascalCase filenames.
- Use camelCase for stores/utilities and `kebab-case` Tailwind helpers; extend shared types from `src/lib/types`.
- Prefer Tailwind utilities; adjust design tokens in `tailwind.config.ts` before adding scoped CSS.

## Testing Guidelines
- Co-locate specs in `__tests__` using the `feature-name.test.ts` pattern.
- Run under jsdom; share mocks and setup in `src/test-setup.ts`.
- Focus coverage on API client, streaming flows, and regressions; run `pnpm test:run` before PRs.

## Commit & Pull Request Guidelines
- Follow the concise, imperative history (`Enhance dark mode support`, `Refine chat note titles`).
- Squash WIP commits and keep scope focused.
- PRs need summary, linked issues, validation notes, and UI screenshots when visuals change.
- Verify `pnpm build` and `pnpm test:run` locally pre-review.

## Svelte MCP Workflow
You can call the Svelte MCP server for Svelte 5 and SvelteKit guidance. Use the tools in this order:

### 1. list-sections
- Call first to list documentation sections with titles, `use_cases`, and paths; required when starting any Svelte/SvelteKit task.

### 2. get-documentation
- After `list-sections`, fetch every relevant section and use `use_cases` to choose the right docs.

### 3. svelte-autofixer
- Run on all Svelte code before sharing; repeat until it reports no issues or suggestions.

### 4. playground-link
- Generates Svelte Playground links; offer only on user request and when code was not written to repository files.
