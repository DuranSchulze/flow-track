# Time Tracker MVP Spec

## Goal

Create a private company time tracking app where employees can track work by workspace, project, tag, department, group/cohort, and billable status.

## User Roles

- Owner: creates a workspace, manages members, catalogs, settings, and all reports. Only Owner can change workspace name and timezone.
- Admin: manages members, catalogs, departments, cohorts, and all workspace reports.
- Catalog Manager: manages Projects and Tags (full CRUD); can view department listing with total tracked hours per department; cannot manage members, roles, departments/cohorts CRUD, or workspace settings.
- Manager: manages their own time entries; elevated reporting access is a future phase item.
- Employee: tracks personal time and views personal totals.

## Core Flow

1. A user signs up or signs in.
2. If the user is not yet added to a workspace, they land on the lounge/waiting page until an Owner/Admin adds them.
3. Once added and activated (MemberStatus: ACTIVE), the user lands in their workspace.
4. The user starts a task timer or adds time manually.
5. Each entry can include a task description, project, tags, billable status, start/end time, duration, and notes.
6. The user views entries by day, week, or month.
7. Owner/Admin users can manage members, departments, groups/cohorts, projects, tags, and workspace reports.

## MVP Rules

- Employees and Managers can only have one active timer at a time.
- Owner/Admin users control all workspace catalogs (projects, tags, departments, cohorts).
- Employees and Managers only see and manage their own entries.
- Owner/Admin users can view all entries and totals in the workspace.
- Members with INVITED status land on the lounge page and cannot access the app shell.
- Members with DISABLED status cannot access the workspace.
- Every query and write must be scoped by workspace membership.

