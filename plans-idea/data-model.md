# Data Model Notes

## Auth Records (Better Auth managed)

- User: authentication identity (email, password hash, name).
- Session: active user sessions with IP and user-agent tracking.
- Account: OAuth / external provider account links.
- Verification: email verification tokens.

## Profile Records

- UserProfile: extended user info — firstName, lastName, birthDate, gender, maritalStatus, contactNumber.
- UserAddress: full address — building, street, city, province, postal code, country.
- EmployeeProfile: employment metadata — employmentType, employmentStatus, hireDate, regularizationDate, separationDate. (Built in Prisma; no UI screen yet.)
- EmployeeGovernmentId: government IDs — SSS, PhilHealth, TIN, PagIbig numbers. (Built in Prisma; no UI screen yet.)

## Workspace & Organization Records

- Workspace: company workspace container with name and timezone (default: Asia/Manila).
- WorkspaceRole: role definition with a `RolePermission` level (OWNER, ADMIN, MANAGER, EMPLOYEE).
- WorkspaceMember: user membership record — role, department, `MemberStatus` (INVITED → ACTIVE → DISABLED), and join date.
- Department: controlled workspace department list; supports an optional `headMemberId` pointing to the department head.
- Cohort: optional group/team/cohort label for members.
- CohortMember: junction table linking WorkspaceMember records to Cohorts.

## Catalog & Time-Tracking Records

- Project: controlled workspace project list with optional color and `archived` flag.
- Tag: controlled workspace tag list with optional color and `archived` flag.
- TimeEntry: tracked time entry — workspaceId, userId, description, projectId, billable flag, startedAt, endedAt, durationSeconds, notes.
- TimeEntryTag: junction table linking TimeEntry records to Tags.

## Enums

- `RolePermission`: OWNER > ADMIN > CATALOG_MANAGER > MANAGER > EMPLOYEE (permission hierarchy).
- `MemberStatus`: INVITED, ACTIVE, DISABLED.
- `EmploymentType`: FULL_TIME, PART_TIME, CONTRACTOR, INTERN, PROBATIONARY.
- `EmploymentStatus`: ACTIVE, ON_LEAVE, RESIGNED, TERMINATED.
- `Gender`: MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY.
- `MaritalStatus`: SINGLE, MARRIED, SEPARATED, WIDOWED, DIVORCED.

## Security Rules

- All workspace data is isolated by `workspaceId`.
- A user can only access a workspace through an ACTIVE `WorkspaceMember` record; INVITED users land on the lounge/waiting page.
- Employee and Manager reads and writes are limited to their own `TimeEntry` records.
- Owner/Admin users can manage catalogs, members, departments, cohorts, and all workspace reports.
- Owner-only operations: workspace settings (name, timezone).

## Timer Rule

An active timer is a `TimeEntry` with `startedAt` set and `endedAt` null. The application must prevent more than one active timer per user per workspace. This is enforced at the service level in `startTimer()`.

