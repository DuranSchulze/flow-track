-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "google_sheet_synced_at" TIMESTAMP(3),
ADD COLUMN     "google_sheet_synced_by" VARCHAR(30),
ADD COLUMN     "google_sheet_url" VARCHAR(500);
