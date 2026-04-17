import { PrismaClient } from '../src/generated/prisma/client.js'

import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'duran-file-pino' },
    update: {
      name: 'Duran File Pino',
      timezone: 'Asia/Manila',
    },
    create: {
      name: 'Duran File Pino',
      slug: 'duran-file-pino',
      timezone: 'Asia/Manila',
    },
  })

  const defaultRoles = [
    { name: 'Owner', permissionLevel: 'OWNER' as const, color: '#0f172a' },
    { name: 'Admin', permissionLevel: 'ADMIN' as const, color: '#7c3aed' },
    { name: 'Catalog Manager', permissionLevel: 'CATALOG_MANAGER' as const, color: '#0891b2' },
    { name: 'Manager', permissionLevel: 'MANAGER' as const, color: '#2563eb' },
    { name: 'Employee', permissionLevel: 'EMPLOYEE' as const, color: '#14b8a6' },
  ]

  const roleByPermission = new Map<string, string>()

  for (const role of defaultRoles) {
    const savedRole = await prisma.workspaceRole.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: role.name,
        },
      },
      update: { color: role.color, permissionLevel: role.permissionLevel },
      create: {
        workspaceId: workspace.id,
        name: role.name,
        permissionLevel: role.permissionLevel,
        color: role.color,
      },
    })
    roleByPermission.set(role.permissionLevel, savedRole.id)
  }

  const departments = [
    { name: 'Engineering', color: '#2563eb' },
    { name: 'Operations', color: '#14b8a6' },
    { name: 'Design', color: '#f97316' },
  ]

  const departmentByName = new Map<string, string>()

  for (const department of departments) {
    const savedDepartment = await prisma.department.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: department.name,
        },
      },
      update: {
        color: department.color,
      },
      create: {
        workspaceId: workspace.id,
        name: department.name,
        color: department.color,
      },
    })
    departmentByName.set(savedDepartment.name, savedDepartment.id)
  }

  const cohorts = ['Alpha Cohort', 'Night Shift']
  const cohortByName = new Map<string, string>()

  for (const cohortName of cohorts) {
    const cohort = await prisma.cohort.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: cohortName,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: cohortName,
      },
    })
    cohortByName.set(cohort.name, cohort.id)
  }

  const projects = [
    { name: 'Client Portal', color: '#2563eb' },
    { name: 'Internal Operations', color: '#14b8a6' },
    { name: 'Brand Systems', color: '#f97316' },
  ]

  for (const project of projects) {
    await prisma.project.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: project.name,
        },
      },
      update: {
        color: project.color,
      },
      create: {
        workspaceId: workspace.id,
        name: project.name,
        color: project.color,
      },
    })
  }

  const tags = [
    { name: 'Billable', color: '#16a34a' },
    { name: 'Admin', color: '#64748b' },
    { name: 'Research', color: '#8b5cf6' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: tag.name,
        },
      },
      update: {
        color: tag.color,
      },
      create: {
        workspaceId: workspace.id,
        name: tag.name,
        color: tag.color,
      },
    })
  }

  const members = [
    {
      email: 'ana@duranfilepino.com',
      permissionLevel: 'OWNER' as const,
      departmentName: 'Engineering',
      cohortNames: ['Alpha Cohort'],
      employeeNumber: 'DFP-0001',
      positionTitle: 'Owner',
    },
    {
      email: 'mika@duranfilepino.com',
      permissionLevel: 'ADMIN' as const,
      departmentName: 'Operations',
      cohortNames: ['Night Shift'],
      employeeNumber: 'DFP-0002',
      positionTitle: 'Operations Admin',
    },
    {
      email: 'joel@duranfilepino.com',
      permissionLevel: 'EMPLOYEE' as const,
      departmentName: 'Design',
      cohortNames: ['Alpha Cohort'],
      employeeNumber: 'DFP-0003',
      positionTitle: 'Designer',
    },
  ]

  for (const member of members) {
    const workspaceRoleId = roleByPermission.get(member.permissionLevel)
    const savedMember = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_email: {
          workspaceId: workspace.id,
          email: member.email,
        },
      },
      update: {
        workspaceRoleId,
        departmentId: departmentByName.get(member.departmentName),
      },
      create: {
        workspaceId: workspace.id,
        email: member.email,
        workspaceRoleId,
        status: 'INVITED',
        departmentId: departmentByName.get(member.departmentName),
      },
    })

    await prisma.employeeProfile.upsert({
      where: {
        workspaceMemberId: savedMember.id,
      },
      update: {
        employeeNumber: member.employeeNumber,
        positionTitle: member.positionTitle,
      },
      create: {
        workspaceMemberId: savedMember.id,
        employeeNumber: member.employeeNumber,
        positionTitle: member.positionTitle,
      },
    })

    for (const cohortName of member.cohortNames) {
      const cohortId = cohortByName.get(cohortName)
      if (!cohortId) {
        continue
      }

      await prisma.cohortMember.upsert({
        where: {
          cohortId_memberId: {
            cohortId,
            memberId: savedMember.id,
          },
        },
        update: {},
        create: {
          cohortId,
          memberId: savedMember.id,
        },
      })
    }
  }

  console.log('✅ Seeded workspace catalogs')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
