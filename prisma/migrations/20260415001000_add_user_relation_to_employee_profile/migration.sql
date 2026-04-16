-- AlterTable
ALTER TABLE "employee_profiles" ADD COLUMN     "user_id" VARCHAR(30) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_workspace_id_user_id_key" ON "employee_profiles"("workspace_id", "user_id");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
