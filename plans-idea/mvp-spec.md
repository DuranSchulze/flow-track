# Time Tracker MVP Spec

## Goal

Create a private company time tracking app where employees can track work by workspace, project, tag, department, group/cohort, and billable status.

## User Roles

- Owner: creates a workspace, manages members, catalogs, settings, and all reports.
- Admin: manages members, catalogs, and all workspace reports.
- Employee: tracks personal time and views personal totals.
- Time Agent Tracker: manages projects/tags and views member time progress by department.

## Core Flow

1. A user signs up or signs in.
2. The user lands in their workspace.
3. The user starts a task timer or adds time manually.
4. Each entry can include a task description, project, tags, billable status, start/end time, duration, and notes.
5. The user views entries by day, week, or month.
6. Owner/Admin users can manage members, departments, groups/cohorts, projects, tags, and workspace reports.

## MVP Rules

- Employees can only have one active timer at a time.
- Owner/Admin users control all workspace catalogs.
- Employees only see and manage their own entries.
- Owner/Admin users can view all entries and totals in the workspace.
- Every query and write must be scoped by workspace membership.
