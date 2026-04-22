/*
  Warnings:

  - You are about to drop the column `role` on the `workspace_members` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RolePermission" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE');

-- DropIndex
DROP INDEX "workspace_members_workspace_id_role_idx";

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "role",
ADD COLUMN     "workspace_role_id" VARCHAR(30);

-- DropEnum
DROP TYPE "WorkspaceRole";

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" VARCHAR(30) NOT NULL,
    "workspace_id" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "workspace_role_id" VARCHAR(30),
    "department_id" VARCHAR(30),
    "invited_by_id" VARCHAR(30),
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_roles" (
    "id" VARCHAR(30) NOT NULL,
    "workspace_id" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "permission_level" "RolePermission" NOT NULL DEFAULT 'EMPLOYEE',
    "color" VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_token_hash_key" ON "workspace_invites"("token_hash");

-- CreateIndex
CREATE INDEX "workspace_invites_workspace_id_idx" ON "workspace_invites"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invites_invited_by_id_idx" ON "workspace_invites"("invited_by_id");

-- CreateIndex
CREATE INDEX "workspace_invites_department_id_idx" ON "workspace_invites"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_workspace_id_email_key" ON "workspace_invites"("workspace_id", "email");

-- CreateIndex
CREATE INDEX "workspace_roles_workspace_id_permission_level_idx" ON "workspace_roles"("workspace_id", "permission_level");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_roles_workspace_id_name_key" ON "workspace_roles"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_workspace_role_id_idx" ON "workspace_members"("workspace_id", "workspace_role_id");

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_role_id_fkey" FOREIGN KEY ("workspace_role_id") REFERENCES "workspace_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_roles" ADD CONSTRAINT "workspace_roles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_role_id_fkey" FOREIGN KEY ("workspace_role_id") REFERENCES "workspace_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
