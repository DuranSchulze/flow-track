/**
 * Seeded dev accounts used by both `prisma/seed.ts` and the floating
 * "Dev logins" button on `/auth`. Safe to ship — the DevLoginButton
 * component gates itself behind `import.meta.env.DEV`.
 */

export type PermissionLevel = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

export type DevCredential = {
  name: string
  email: string
  password: string
  permissionLevel: PermissionLevel
  /** Human-readable role label shown in the UI. */
  roleLabel: string
  /** Short description shown next to the login in the popover. */
  description: string
}

export const DEV_PASSWORD = 'password123'

export const DEV_CREDENTIALS: readonly DevCredential[] = [
  {
    name: 'Olivia Owner',
    email: 'owner@mycompany.com',
    password: DEV_PASSWORD,
    permissionLevel: 'OWNER',
    roleLabel: 'Owner',
    description: 'Full access to workspace + billing',
  },
  {
    name: 'Adam Admin',
    email: 'admin@mycompany.com',
    password: DEV_PASSWORD,
    permissionLevel: 'ADMIN',
    roleLabel: 'Admin',
    description: 'Manage members, catalogs, and settings',
  },
  {
    name: 'Mia Manager',
    email: 'manager@mycompany.com',
    password: DEV_PASSWORD,
    permissionLevel: 'MANAGER',
    roleLabel: 'Manager',
    description: 'Oversee department time and reports',
  },
  {
    name: 'Ethan Employee',
    email: 'employee@mycompany.com',
    password: DEV_PASSWORD,
    permissionLevel: 'EMPLOYEE',
    roleLabel: 'Employee',
    description: 'Track own time only',
  },
] as const
