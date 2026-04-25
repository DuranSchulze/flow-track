DROP INDEX "cohorts_workspace_id_name_key";

ALTER TABLE "cohorts"
ADD COLUMN "department_id" VARCHAR(30);

CREATE INDEX "cohorts_department_id_idx" ON "cohorts"("department_id");

CREATE UNIQUE INDEX "cohorts_workspace_id_department_id_name_key" ON "cohorts"("workspace_id", "department_id", "name");

ALTER TABLE "cohorts"
ADD CONSTRAINT "cohorts_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "departments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
