---
trigger: always_on
---

# Clockify Timer — Project Conventions

Internal company time tracking app. Always follow these rules when reading, writing, or reviewing code in this project.

---

## Stack

- **Framework**: TanStack Start (React SSR) with TanStack Router (file-based routing)
- **Data fetching**: TanStack Query (`@tanstack/react-query`) for client-side; `createServerFn` for server/DB calls
- **Auth**: Better Auth (`better-auth`) — email/password only in v1
- **Database**: Prisma + PostgreSQL (`@prisma/client`)
- **UI**: Tailwind CSS v4 + shadcn/ui (via Radix UI primitives)
- **Forms**: TanStack Form (`@tanstack/react-form`)
- **Validation**: Zod (`zod`)
- **Icons**: Lucide React (`lucide-react`)
- **Language**: TypeScript (strict)

---

## TypeScript

- Strict mode is on. No `any` — use `unknown` and narrow explicitly.
- Always provide explicit return types on server functions and non-trivial utility functions.
- Prefer `type` over `interface` unless declaration merging is needed.
- Use Zod schemas as the single source of truth for validated shapes; derive `type` from schemas with `z.infer<typeof Schema>`.
- Import types with `import type { ... }` when only the type is needed.

---

## File & Folder Naming

- **Route files**: kebab-case, following TanStack Router conventions (e.g., `time-tracker/index.tsx`, `workspace/members.tsx`)
- **Component files**: PascalCase matching the exported component name (e.g., `AppShell.tsx`, `TimeTrackerDashboard.tsx`)
- **Lib/utility files**: camelCase (e.g., `store.ts`, `utils.ts`)
- **Type files**: camelCase (e.g., `types.ts`)

---

## Component Conventions

- One primary exported component per file. Small private helper components (e.g., `Metric`, `Info`) may live at the bottom of the same file.
- All time-tracker UI components live in `src/components/time-tracker/`.
- Shared/generic UI primitives (shadcn) live in `src/components/ui/`.
- Component props should be typed inline (not via `FC<Props>`) — use a named `function` declaration.
- Use `React.ReactNode` for children, not `JSX.Element`.

```tsx
// Correct
function Metric({ label, value }: { label: string; value: string }) {
  return <div>...</div>
}

// Avoid
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div>...</div>
```

---

## Routing

- All routes use `createFileRoute` from `@tanstack/react-router`. Never use `createRoute` directly.
- All authenticated app routes live under `src/routes/app/`.
- Public routes (landing, auth) live directly under `src/routes/`.
- API/server routes live under `src/routes/api/`.
- The Better Auth handler at `src/routes/api/auth/$.ts` must never be deleted or modified without checking Better Auth docs.
- Use the `#/` path alias for all internal imports (e.g., `import { authClient } from '#/lib/auth-client'`).

---

## Authentication & Session

- **Client**: Always read the session with `authClient.useSession()`. Never trust user-supplied IDs from the client.
- **Server**: Use `auth.api.getSession({ headers: request.headers })` inside server functions.
- Sign-in/sign-up is handled via `authClient.signIn.email()` / `authClient.signUp.email()`.
- Protected routes must check `session?.user` and redirect to `/auth` if not present.

---

## Database & Prisma

- Import the shared client from `#/db` — never instantiate `PrismaClient` directly elsewhere.
- **Every** query on workspace data must include a `workspaceId` filter. No workspace-unscoped reads.
- `Employee` role: queries must also filter by `userId === session.user.id`.
- `Owner`/`Admin` role: may query all records within a `workspaceId`.
- Use Prisma transactions for multi-step writes (e.g., stopping a timer and recording duration in one operation).
- Never expose raw Prisma errors to the client. Catch, log, and return a clean error message.

---

## Server Functions

- Use `createServerFn` from `@tanstack/react-start` for all DB access.
- Always validate input with Zod inside server functions before touching Prisma.
- Return plain serialisable objects (no `Date` instances — convert to ISO strings).
- File convention: colocate server functions near the routes that use them, or in a `src/lib/server/` module if shared.

---

## Styling

- Tailwind utility classes only. No inline `style` props except for truly dynamic values (e.g., a project color swatch).
- Use `cn()` from `#/lib/utils` to merge conditional classes (backed by `clsx` + `tailwind-merge`).
- Use shadcn/ui components for complex interactive elements (dialogs, dropdowns, toasts, tables). Install new shadcn components with: `pnpm dlx shadcn@latest add <component>`.
- Dark mode is supported via the `dark:` variant. The root `THEME_INIT_SCRIPT` in `__root.tsx` handles flicker prevention — do not remove it.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| React components | PascalCase | `TimeTrackerDashboard` |
| Functions / variables | camelCase | `startTimer`, `filteredEntries` |
| Types / interfaces | PascalCase | `TimeEntry`, `TrackerState` |
| Zod schemas | PascalCase + `Schema` suffix | `TimeEntrySchema` |
| Prisma enums | SCREAMING_SNAKE_CASE | `WorkspaceRole.OWNER` |
| Route files | kebab-case | `time-tracker/day.tsx` |
| Component files | PascalCase | `AppShell.tsx` |
| Lib/util files | camelCase | `store.ts`, `utils.ts` |
| CSS/style files | kebab-case | `styles.css` |

---

## Timer Business Rules (do not break)

- A user can have **at most one** active `TimeEntry` (where `endedAt` is `null`) per workspace.
- Before starting a new timer, always check for an existing active entry and reject/stop if one exists.
- `Employee` users can only read/write their own `TimeEntry` records.
- `Owner`/`Admin` users can read all workspace entries and manage catalogs/members.

---

## What NOT to add

- No `@tanstack/ai-*` packages — AI features are out of scope for MVP.
- No `@faker-js/faker` — use the seeded `initialTrackerState` in `src/lib/time-tracker/store.ts` for dev data.
- No inline scripts or CDN imports.
- No `console.log` left in committed code (use a logger utility or remove before committing).
