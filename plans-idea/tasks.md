# Implementation Tasks

- [x] Add planning documentation.
- [x] Add Prisma schema for workspaces, roles, catalogs, and time entries.
- [x] Replace starter landing page with Time Tracker entry point.
- [x] Add authenticated app shell with navbar and sidebar.
- [x] Add interactive Time Tracker MVP screens with seeded local data.
- [x] Add profile, workspace settings, members, and catalogs screens.
- [x] Wire server actions/API handlers to Prisma.
  - [x] Timer CRUD (start, stop, create manual, update, delete, duplicate)
  - [x] Workspace member invite (createWorkspaceMember)
  - [x] Workspace role create (createWorkspaceRole)
  - [x] Catalog CRUD — Projects (create, update, archive)
  - [x] Catalog CRUD — Tags (create, update, archive)
  - [x] Catalog CRUD — Departments (create, update, delete)
  - [x] Catalog CRUD — Cohorts (create, update, delete)
  - [x] Member management — update role, department, cohorts (updateWorkspaceMember)
  - [x] Member management — disable / reactivate (setMemberStatus)
  - [x] Profile update (updateProfile)
  - [x] Workspace settings update (updateWorkspaceSettings)
- [x] Connect Better Auth session to workspace membership enforcement.
- [x] Wire catalog/member/profile/settings mutations into UI screens.
  - [x] CatalogsScreen — Projects manager (create, archive)
  - [x] CatalogsScreen — Tags manager (create, archive)
  - [x] CatalogsScreen — Departments manager (create, delete)
  - [x] CatalogsScreen — Cohorts manager (create, delete)
  - [x] MembersScreen — inline role, department, cohort edit + disable/reactivate
  - [x] SettingsScreen — editable workspace name and timezone form (Owner only)
  - [x] ProfileScreen — editable display name, first/last name, contact form
- [x] Add integration tests for auth, permissions, timer rules, and reports.
  - Tests located at: src/lib/server/**tests**/tracker.test.ts
  - Run with: pnpm test
- [x] Add production seed/migration workflow.
  - Seed script: prisma/seed.ts — run with: pnpm db:seed
  - Migration: pnpm db:migrate (dev), pnpm db:push (direct push)

## Phase 2 Tasks: Time Agent Tracker & Responsive Design

### Time Agent Tracker Role

- [ ] Update Prisma schema: add `TIME_AGENT_TRACKER` to WorkspaceRole enum.
- [ ] Create server function: `getDepartmentMembers()` — list members by department (read-only).
- [ ] Create server function: `getMemberTimeProgress(memberId)` — view time entries for a specific member.
- [ ] Update server functions: allow Time Agent Tracker to create/edit Projects and Tags.
- [ ] Add delete protection: prevent Project deletion if `timeEntries.length > 0`.
- [ ] Add delete protection: prevent Tag deletion if `timeEntries.length > 0`.
- [ ] Update CatalogsScreen: show/hide member management buttons based on role.
- [ ] Update MembersScreen: allow Time Agent Tracker to view but not edit member roles/status.
- [ ] Add new route: `/app/team-progress` — department-filtered member list with time summaries.
- [ ] Add role badge/descriptor in UI to indicate Time Agent Tracker permissions.

### Responsive Design

- [ ] Mobile navigation: collapsible hamburger menu replacing persistent sidebar.
- [ ] Responsive timer controls: larger touch targets (min 44x44px) for start/stop.
- [ ] Time entry list: card-based layout for mobile, table for desktop.
- [ ] Project/Tag selectors: searchable dropdowns with touch-friendly hit areas.
- [ ] Dashboard grid: responsive breakpoints (sm, md, lg) for layout adaptation.
- [ ] Form inputs: full-width on mobile with appropriate font sizes (prevent zoom).
- [ ] Test responsive behavior: Chrome DevTools device emulation for common sizes.
