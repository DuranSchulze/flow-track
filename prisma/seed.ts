import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

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

  // ─── Owner member ──────────────────────────────────────────────────────────
  // Change this email to your own — when you sign up with this email,
  // you will automatically be linked as the workspace Owner.
  const ownerEmail = 'owner@mycompany.com'

  const ownerMember = await prisma.workspaceMember.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email: ownerEmail } },
    update: { workspaceRoleId: roles.get('OWNER') },
    create: {
      workspaceId: workspace.id,
      email: ownerEmail,
      workspaceRoleId: roles.get('OWNER'),
      status: 'INVITED',
    },
  })
  console.log(`  Owner member: ${ownerEmail} (${ownerMember.id})`)

  console.log('\n✅ Done. Sign up with', ownerEmail, 'to access the workspace as Owner.')
  console.log('   Then use the Catalogs screen to add projects, tags, departments, and cohorts.')
  console.log('   Use the Members screen to invite additional employees.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
