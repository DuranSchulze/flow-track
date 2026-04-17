# Data Model Notes

## Main Records

- User: authentication identity and profile details.
- Workspace: company workspace.
- WorkspaceMember: role, department, groups/cohorts, and membership state for a user in a workspace.
- Department: controlled workspace department list.
- Cohort: optional group/team/cohort labels for members.
- Project: controlled workspace project list.
- Tag: controlled workspace tag list.
- TimeEntry: tracked time with project, tags, billable status, timestamps, and duration.

## Security Rules

- All workspace data is isolated by `workspaceId`.
- A user can only access a workspace through an active `WorkspaceMember` record.
- Employee reads and writes are limited to their own `TimeEntry` records.
- Owner/Admin users can manage catalogs and reports for their workspace.
- Time Agent Tracker users can view all members and their time progress (read-only), manage Projects and Tags (create/edit/delete with restrictions).

## Timer Rule

An active timer is a `TimeEntry` with `startedAt` set and `endedAt` null. The application must prevent more than one active timer per user per workspace.
