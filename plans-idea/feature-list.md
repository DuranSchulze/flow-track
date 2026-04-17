# Feature List

## MVP

- Secure employee sign-up and sign-in with Better Auth (email/password).
- Lounge/waiting page for users who have signed up but are not yet added to a workspace.
- Workspace creation and switching for company-level time tracking.
- Owner/Admin managed workspace member list with invite-by-email flow.
- Workspace roles: Owner, Admin, Catalog Manager, Manager, Employee (five-tier permission hierarchy).
- Member status lifecycle: INVITED → ACTIVE → DISABLED; Owner/Admin can disable or reactivate members.
- Departments with optional department head assignment; groups/cohorts for flexible employee organization.
- Full CRUD for Departments (create, update, delete) and Cohorts (create, update, delete) by Owner/Admin.
- Controlled projects and tags — full CRUD by Owner, Admin, or Catalog Manager (with optional color and archive flag).
- Time tracker with one active timer per employee (second timer blocked until first is stopped).
- Manual time entry creation with project, tags, billable status, dates, duration, and notes.
- Time entry list with inline edit, delete, duplicate, and view filters.
- Day, week, and month views with total hours.
- Employee personal reports and Owner/Admin workspace reports.
- Workspace timezone setting (default: Asia/Manila) used across all date/time calculations.
- Authenticated app shell with top navbar, sidebar, workspace switcher, and profile controls.
- Light/dark mode theme toggle.
- Toast notifications for all create, update, and delete operations.
- Reports page (`/app/workspace/reports`) with CSV, Excel, and PDF export — accessible to Owner, Admin, and Catalog Manager. Flat table with date, member, department, role, task, project, tags, hours, and billable columns. Supports Day/Week/Month view with date navigation.
- Extended user profile: first/last name, contact number, birthdate, gender, marital status.
- User address record (building, street, city, province, postal code, country).

## Future Phases

- Client/customer records.
- Billable rates and cost reports.
- Timesheet approval workflows.
- Custom role permissions.
- Invite links and domain-based auto-join.
- Integrations with payroll, accounting, and project management tools.

