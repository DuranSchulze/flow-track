---
name: react-component-hygiene
description: Use when refactoring large React components (>300 lines), splitting inline sub-components into their own files, extracting custom hooks from bloated components, deduplicating near-identical UI patterns, or reviewing React file structure for single-responsibility violations. Triggers on phrases like "this file is too long", "split this component", "extract a hook", "too much in one file", "bloated component", "refactor this dashboard".
---

# React Component Hygiene

Practical rules for keeping React component files small, focused, and reusable. Apply incrementally — never break a working app to chase a rule.

## File-level rules

- **One exported component per file.** Inline a sub-component only if it is **<20 lines** AND used only by the parent in the same file.
- **Soft cap: ~250 lines. Hard cap: ~400 lines.** Past the hard cap, splitting is mandatory, not optional.
- **Co-locate when a component grows.** Once a component needs more than one file, give it a folder:
  ```
  Foo/
    Foo.tsx          # the component
    Foo.hooks.ts     # custom hooks used only by Foo
    Foo.utils.ts     # pure helpers used only by Foo
    parts/           # sub-components used only by Foo
  ```
  If a helper or hook gets a second consumer outside the folder, **promote it** to `lib/` or a shared `hooks/` directory.

## What belongs where

| Kind of code                                                            | Where it lives                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Pure helpers (`formatX`, `calculateY`, `toPayload`)                     | `lib/<domain>/` — never inside a component file         |
| Server mutations + loading state                                        | A custom hook (`useFooMutations`)                       |
| Cross-component derived state (filter/sort, pagination)                 | A custom hook returning `{ value, controls }`           |
| Repeating UI patterns (searchable popover, confirm dialog, empty state) | A generic primitive in `components/ui/` + thin wrappers |
| One-off layout / orchestration                                          | The page or section component                           |

## When to extract a custom hook

Extract `useX` when **any** of these are true:

- The component owns **>2 related `useState`s plus an effect** that act as one unit.
- The same state shape (or pattern) repeats across two or more components.
- Network mutations are mixed with rendering — move them to a hook so the JSX file is render-only.
- A `useMemo` body is more than ~15 lines or has more than ~3 dependencies.

## Deduplicating near-identical components

If two components are >70% the same code (classic case: `ProjectPicker` and `TagPicker` both being a "searchable list with create form"), **build one generic primitive** with the variant points exposed as props (e.g. `multi`, `renderItem`, `onCreate`), then reduce each original to a thin wrapper. Don't chase 100% deduplication — small genuine differences can stay inline.

## Component design rules

- **Props are the contract.** Each leaf component should be testable with explicit props, with no hidden context coupling beyond what the props declare.
- **Lift state only as far as needed.** If two siblings don't share state, don't hoist it to the parent.
- **Many small `useMemo`s beat one giant derived value** — easier to read, easier to invalidate correctly.
- **Pass callbacks, not state setters**, when a child only needs to trigger one transition (`onSelect={id => …}` not `setSelectedId`).
- **Avoid `useEffect` for derived state** — derive in the render body or `useMemo`.

## Refactor process (always step-by-step)

1. **Inventory first.** List every sub-component, hook candidate, and helper in the bloated file before moving anything.
2. **Plan the target shape.** Sketch the folder layout and import graph on paper or in a plan file.
3. **Move leaves before roots.** Pure helpers → leaf components → hooks → section components → orchestrator. The orchestrator shrinks last.
4. **One commit per move.** App must compile and run after every step. No giant "refactor everything" PR.
5. **Re-export shim during migration.** Keep the old file path working with a one-line re-export until all importers are updated, then delete.
6. **Pure structural refactor = zero behavior change.** No styling tweaks, no new features, no "while I'm here" cleanups bundled in.
7. **Verify after each step**, not just at the end: typecheck + run the affected page in the browser.

## What NOT to do

- Don't introduce abstractions for hypothetical future variants. Three similar lines is fine; abstract on the third real duplication.
- Don't add a wrapper component just to rename props.
- Don't split a 150-line component just because "components should be small" — the cap exists to fight bloat, not to fragment cohesive code.
- Don't extract a hook that's used in exactly one place AND is shorter than the call site that consumes it.
- Don't add tests as part of a structural refactor unless the codebase already has component tests for that area.
