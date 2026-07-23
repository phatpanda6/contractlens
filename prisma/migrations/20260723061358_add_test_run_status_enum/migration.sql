-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('BASELINE_CREATED', 'PASS', 'FAIL', 'ERROR');

-- AlterTable
ALTER TABLE "TestRun"
ALTER COLUMN "status" TYPE "TestRunStatus"
USING ("status"::text::"TestRunStatus");
