-- Older baselines keep an unknown source; do not infer it from the current target.
ALTER TABLE "Endpoint" ADD COLUMN "baselineSourceUrl" TEXT;
