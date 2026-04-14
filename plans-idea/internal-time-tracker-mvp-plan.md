# Internal Time Tracker MVP Plan

## Summary

Build a private company time tracking web app inspired by Toggl/Clockify, starting with a usable Time Tracker MVP. The app will support secure employee sign-up/sign-in, workspace membership controlled by Owner/Admin users, department/group tagging, project/tag catalogs, live timers, manual entries, editable time logs, and personal plus admin reporting.

Primary planning files:

- `feature-list.md`: full product feature inventory and phased roadmap.
- `mvp-spec.md`: decision-complete Time Tracker v1 requirements.
- `data-model.md`: workspace, user, role, department, project, tag, and time-entry schema notes.
- `tasks.md`: implementation checklist ordered by dependency.

## Feature List

- Auth and profiles: employee account creation, login/logout, secure session handling, profile page, name/email/avatar/basic employment metadata.
- Workspace: Owner creates a workspace; Owner/Admin manages workspace user list; employees join only when their account email matches an allowed workspace member record.
- Roles: workspace-level `Owner`, `Admin`, and `Employee`; Owner/Admin can manage workspace catalogs and view all reports; Employees manage only their own time entries.
- Organization tagging: Owner/Admin creates departments and optional groups/cohorts; employees can be assigned to one department and optionally one or more groups/cohorts.
- Catalogs: Owner/Admin creates Projects and Tags; Employees select from these controlled workspace lists when tracking time.
- Time Tracker: start/stop one active timer per employee; create manual entries; set task description, project, tags, billable/non-billable, start/end/duration, and notes.
- Time entry list: view entries by Day, Week, and Month; inline edit; delete; duplicate; filter by project, tag, billable status, and date range.
- Totals: personal total hours per day, week, and month; Owner/Admin workspace reports by employee, department, project, tag, and billable status.
- App shell: authenticated layout with top navbar for workspace switcher/profile/account actions and sidebar navigation for Time Tracker sections.
- Future-ready extensions: client/customer records, approvals, exports, billing rates, custom roles/permissions, invite links, and external integrations.

## Key Implementation Changes

- Replace starter/demo product surface with an authenticated app shell: public auth pages, protected dashboard routes, top navbar, sidebar, and workspace-aware routing.
- Keep Better Auth for email/password auth; store app-specific profile, membership, role, and workspace data in Prisma/Postgres instead of overloading auth records.
- Add Prisma models for `Workspace`, `WorkspaceMember`, `Department`, `Group/Cohort`, `Project`, `Tag`, `TimeEntry`, and a time-entry-to-tag join table.
- Enforce workspace isolation in every query by `workspaceId`; employees can only access their own entries, while Owner/Admin can access workspace-level management and reports.
- Implement one-active-timer rule with a database constraint or service-level transaction: a user cannot start a second running entry until the current one is stopped.
- Use controlled catalogs in v1: only Owner/Admin can create Projects, Tags, Departments, and Groups/Cohorts; Employees only select existing values.
- Provide Time Tracker screens for timer entry, manual entry modal/form, editable entries table, Day/Week/Month views, and summary totals.
- Add admin screens for workspace members, departments, groups/cohorts, projects, and tags.

## Interfaces And Data Rules

Main protected routes:

- `/app/time-tracker`
- `/app/time-tracker/day`
- `/app/time-tracker/week`
- `/app/time-tracker/month`
- `/app/workspace/members`
- `/app/workspace/settings`
- `/app/workspace/catalogs`
- `/app/profile`

Time entry fields:

- `workspaceId`
- `userId`
- `description`
- `projectId`
- `tagIds`
- `billable`
- `startedAt`
- `endedAt`
- `durationSeconds`
- `notes`

Manual entries require `startedAt` and either `endedAt` or duration. Live timer entries have `startedAt` and no `endedAt` until stopped.

Duplicate creates a new draft/manual entry copied from the original, with current date defaults and no active running state.

Reports calculate totals from stored entry timestamps/duration using the workspace/user timezone consistently.

## Test Plan

- Auth: sign up, sign in, sign out, session persistence, unauthenticated route redirects.
- Workspace membership: employee can only enter workspace after Owner/Admin has added their email to the member list.
- Permissions: Employee cannot access admin catalog/member/report pages; Owner/Admin can.
- Timer: start, stop, prevent second active timer, recover active timer after page reload.
- Manual entries: create valid entry, reject invalid end-before-start entry, edit, delete, duplicate.
- Views: Day/Week/Month filters show correct entries and totals.
- Reporting: Employee sees personal totals only; Owner/Admin sees workspace, employee, department, project, tag, and billable totals.
- Security: all server/database reads and writes are scoped to authenticated user plus workspace membership.

## Assumptions And Defaults

- This is private/internal for now, but the data model should remain SaaS-ready for future multi-company use.
- Workspace joining in v1 is controlled by Owner/Admin-managed member records, not open registration or public invite links.
- Roles are simple workspace roles: `Owner`, `Admin`, `Employee`.
- Owner/Admin only can create company-wide departments, groups/cohorts, projects, and tags.
- Employees can run only one active timer at a time.
- Employees see only their own time data; Owner/Admin can see all workspace time data.
- Billing rates, approvals, exports, custom permissions, and public invite flows are future phases, not part of the first MVP.

