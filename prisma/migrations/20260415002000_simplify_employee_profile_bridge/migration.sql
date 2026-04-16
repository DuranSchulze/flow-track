-- DropForeignKey
ALTER TABLE "employee_profiles" DROP CONSTRAINT "employee_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "employee_profiles" DROP CONSTRAINT "employee_profiles_workspace_id_fkey";

-- DropIndex
DROP INDEX "employee_profiles_workspace_id_employee_number_key";

-- DropIndex
DROP INDEX "employee_profiles_workspace_id_employment_status_idx";

-- DropIndex
DROP INDEX "employee_profiles_workspace_id_user_id_key";

-- AlterTable
ALTER TABLE "employee_profiles" DROP COLUMN "user_id",
DROP COLUMN "workspace_id";

-- CreateIndex
CREATE INDEX "cohort_members_member_id_idx" ON "cohort_members"("member_id");

-- CreateIndex
CREATE INDEX "departments_head_member_id_idx" ON "departments"("head_member_id");

-- CreateIndex
CREATE INDEX "employee_profiles_employment_status_idx" ON "employee_profiles"("employment_status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employee_number_key" ON "employee_profiles"("employee_number");

-- CreateIndex
CREATE INDEX "time_entries_project_id_idx" ON "time_entries"("project_id");

-- CreateIndex
CREATE INDEX "time_entry_tags_tag_id_idx" ON "time_entry_tags"("tag_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "workspace_members_invited_by_id_idx" ON "workspace_members"("invited_by_id");
