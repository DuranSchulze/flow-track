# Clockify Timer

Internal company time tracking app for Duran File Pino. Employees track work by workspace, project, tag, department, and billable status.

## Tech Stack

- **Framework** — TanStack Start (React SSR) + TanStack Router (file-based)
- **Auth** — Better Auth (email/password)
- **Database** — Prisma + PostgreSQL
- **UI** — Tailwind CSS v4 + shadcn/ui
- **Forms** — TanStack Form + Zod
- **Package manager** — pnpm

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.local` and fill in the values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/clockify_timer"
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=   # generate with: npx -y @better-auth/cli secret
```

### 3. Generate and push the Prisma schema

```bash
pnpm db:generate   # generates the Prisma client
pnpm db:push       # pushes the schema to the database (dev only)
```

Use `pnpm db:migrate` instead of `db:push` when you want a tracked migration file.

### 4. Start the dev server

```bash
pnpm dev
```

The app runs at **http://localhost:3000**.

---

## All pnpm Scripts

| Command            | Description                                         |
| ------------------ | --------------------------------------------------- |
| `pnpm dev`         | Start the development server on port 3000           |
| `pnpm build`       | Build for production                                |
| `pnpm preview`     | Preview the production build locally                |
| `pnpm test`        | Run Vitest tests                                    |
| `pnpm lint`        | Run ESLint                                          |
| `pnpm format`      | Check formatting with Prettier                      |
| `pnpm check`       | Auto-fix formatting and lint issues                 |
| `pnpm db:generate` | Regenerate the Prisma client after schema changes   |
| `pnpm db:push`     | Push schema to DB without a migration file (dev)    |
| `pnpm db:migrate`  | Create and apply a tracked migration (staging/prod) |
| `pnpm db:studio`   | Open Prisma Studio to browse/edit data              |
| `pnpm db:seed`     | Run the database seed script                        |

---

## Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add <component>
```

Example:

```bash
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add table
```

---

## Project Structure

```
src/
├── components/
│   ├── time-tracker/   # App-specific UI (AppShell, TimeTrackerDashboard, WorkspaceScreens)
│   └── ui/             # shadcn/ui primitives
├── lib/
│   ├── auth.ts         # Better Auth server config
│   ├── auth-client.ts  # Better Auth client
│   ├── utils.ts        # cn() utility
│   └── time-tracker/   # store.ts (local state) + types.ts
├── routes/
│   ├── index.tsx               # Landing page (/)
│   ├── auth/index.tsx          # Sign in / sign up (/auth)
│   ├── app.tsx                 # Authenticated layout shell (/app)
│   ├── app/time-tracker/       # Timer, Day, Week, Month views
│   ├── app/workspace/          # Members, Catalogs, Settings
│   ├── app/profile.tsx         # User profile
│   └── api/auth/$.ts           # Better Auth API handler — do not delete
├── db.ts                       # Shared Prisma client
└── styles.css                  # Global Tailwind styles
prisma/
└── schema.prisma               # Database schema
```

---

## Routes

| Path                      | Description                        | Access        |
| ------------------------- | ---------------------------------- | ------------- |
| `/`                       | Landing page                       | Public        |
| `/auth`                   | Sign in / Sign up                  | Public        |
| `/app/time-tracker`       | Timer (week view default)          | Authenticated |
| `/app/time-tracker/day`   | Day view                           | Authenticated |
| `/app/time-tracker/week`  | Week view                          | Authenticated |
| `/app/time-tracker/month` | Month view                         | Authenticated |
| `/app/workspace/members`  | Manage workspace members           | Owner / Admin |
| `/app/workspace/catalogs` | Manage projects, tags, departments | Owner / Admin |
| `/app/workspace/settings` | Workspace settings                 | Owner / Admin |
| `/app/profile`            | Personal profile                   | Authenticated |

---

## Database Workflow

After editing `prisma/schema.prisma`:

```bash
# Dev — push directly without a migration file
pnpm db:push

# Or create a tracked migration
pnpm db:migrate

# Always regenerate the client after schema changes
pnpm db:generate
```

Browse data visually:

```bash
pnpm db:studio
```

---

## Auth Setup

Better Auth is pre-configured with email/password. The API handler lives at `src/routes/api/auth/$.ts` — do not delete or modify this file without checking the [Better Auth docs](https://www.better-auth.com).

Generate a secret for `BETTER_AUTH_SECRET`:

```bash
npx -y @better-auth/cli secret
```
