-- Add missing columns
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "s3Key" text;
ALTER TABLE "Share" ADD COLUMN IF NOT EXISTS "token" text;

-- Handle unique constraints
UPDATE "Image" i1
SET "s3Key" = i1."s3Key" || '_' || i1.id
FROM (
    SELECT "s3Key", id,
           ROW_NUMBER() OVER (PARTITION BY "s3Key" ORDER BY id) as rn
    FROM "Image"
    WHERE "s3Key" IS NOT NULL
) i2
WHERE i1."s3Key" = i2."s3Key"
  AND i2.rn > 1;

UPDATE "Share" s1
SET "shareUrl" = s1."shareUrl" || '_' || s1.id
FROM (
    SELECT "shareUrl", id,
           ROW_NUMBER() OVER (PARTITION BY "shareUrl" ORDER BY id) as rn
    FROM "Share"
    WHERE "shareUrl" IS NOT NULL
) s2
WHERE s1."shareUrl" = s2."shareUrl"
  AND s2.rn > 1;

UPDATE "Share" s1
SET "token" = s1."token" || '_' || s1.id
FROM (
    SELECT "token", id,
           ROW_NUMBER() OVER (PARTITION BY "token" ORDER BY id) as rn
    FROM "Share"
    WHERE "token" IS NOT NULL
) s2
WHERE s1."token" = s2."token"
  AND s2.rn > 1;

-- Add unique constraints
ALTER TABLE "Image" ADD CONSTRAINT "Image_s3Key_key" UNIQUE ("s3Key");
ALTER TABLE "Share" ADD CONSTRAINT "Share_shareUrl_key" UNIQUE ("shareUrl");
ALTER TABLE "Share" ADD CONSTRAINT "Share_token_key" UNIQUE ("token"); 