-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN     "billable_rate" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "billable_currency" VARCHAR(8) NOT NULL DEFAULT 'PHP',
ADD COLUMN     "default_billable_rate" DECIMAL(12,2) NOT NULL DEFAULT 0;
