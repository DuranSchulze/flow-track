/*
  Warnings:

  - You are about to drop the column `user_id` on the `time_entries` table. All the data in the column will be lost.
  - Added the required column `workspace_member_id` to the `time_entries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_user_id_fkey";

-- DropIndex
DROP INDEX "time_entries_workspace_id_user_id_started_at_idx";

-- AlterTable
ALTER TABLE "time_entries" DROP COLUMN "user_id",
ADD COLUMN     "workspace_member_id" VARCHAR(30) NOT NULL;

-- CreateIndex
CREATE INDEX "time_entries_workspace_id_workspace_member_id_started_at_idx" ON "time_entries"("workspace_id", "workspace_member_id", "started_at");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_workspace_member_id_fkey" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
