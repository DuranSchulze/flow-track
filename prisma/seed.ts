import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { auth } from '../src/lib/auth.js'
import { DEV_CREDENTIALS } from '../src/lib/dev-credentials.js'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Workspace ─────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'my-company' },
    update: {},
    create: {
      name: 'My Company',
      slug: 'my-company',
      timezone: 'Asia/Manila',
    },
  })
  console.log(`  Workspace: ${workspace.name} (${workspace.id})`)

  // ─── Default roles ─────────────────────────────────────────────────────────
  const roleDefinitions = [
    { name: 'Owner',    permissionLevel: 'OWNER',    color: '#0f172a' },
    { name: 'Admin',    permissionLevel: 'ADMIN',    color: '#7c3aed' },
    { name: 'Manager',  permissionLevel: 'MANAGER',  color: '#2563eb' },
    { name: 'Employee', permissionLevel: 'EMPLOYEE', color: '#14b8a6' },
  ] as const

  const roles = new Map<string, string>() // permissionLevel → id

  for (const def of roleDefinitions) {
    const role = await prisma.workspaceRole.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: def.name } },
      update: { color: def.color, permissionLevel: def.permissionLevel },
      create: {
        workspaceId: workspace.id,
        name: def.name,
        permissionLevel: def.permissionLevel,
        color: def.color,
      },
    })
    roles.set(def.permissionLevel, role.id)
  }
  console.log(`  Roles: ${[...roles.keys()].join(', ')}`)

  // ─── Dev users + workspace members ─────────────────────────────────────────
  // Seed real Better Auth users (for the /auth "Dev logins" popover) and
  // link each to the workspace with the corresponding role.
  console.log('  Seeding dev users:')
  for (const cred of DEV_CREDENTIALS) {
    const existing = await prisma.user.findUnique({ where: { email: cred.email } })
    let userId = existing?.id

    if (!existing) {
      try {
        const result = await auth.api.signUpEmail({
          body: { name: cred.name, email: cred.email, password: cred.password },
        })
        userId = result.user.id
        console.log(`    + Created auth user: ${cred.email} (${cred.roleLabel})`)
      } catch (err) {
        console.warn(
          `    ! Could not create auth user for ${cred.email}:`,
          err instanceof Error ? err.message : err,
        )
        continue
      }
    } else {
      console.log(`    = Auth user exists: ${cred.email} (${cred.roleLabel})`)
    }

    const roleId = roles.get(cred.permissionLevel)
    if (!roleId) continue

    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_email: { workspaceId: workspace.id, email: cred.email },
      },
      update: {
        workspaceRoleId: roleId,
        userId: userId ?? null,
        status: 'ACTIVE',
      },
      create: {
        workspaceId: workspace.id,
        email: cred.email,
        workspaceRoleId: roleId,
        userId: userId ?? null,
        status: 'ACTIVE',
      },
    })
  }

  console.log('\n✅ Done. You can now sign in with any of the seeded credentials.')
  console.log('   All dev accounts use password:', DEV_CREDENTIALS[0]?.password)
  console.log('   In dev mode, use the "Dev logins" button on the /auth page for one-click sign in.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
