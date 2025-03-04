-- Add new values to existing enums
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SHARE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SYSTEM';

ALTER TYPE "PatientStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TYPE "ProviderSpecialty" ADD VALUE IF NOT EXISTS 'GENERAL';
ALTER TYPE "ProviderSpecialty" ADD VALUE IF NOT EXISTS 'RADIOLOGY';
ALTER TYPE "ProviderSpecialty" ADD VALUE IF NOT EXISTS 'CARDIOLOGY';
ALTER TYPE "ProviderSpecialty" ADD VALUE IF NOT EXISTS 'NEUROLOGY';
ALTER TYPE "ProviderSpecialty" ADD VALUE IF NOT EXISTS 'ORTHOPEDICS';

-- Now update the data
UPDATE "Annotation"
SET "type" = 'MARKER'
WHERE "type" = 'NOTE';

UPDATE "Notification"
SET "type" = 'SHARE'
WHERE "type" IN ('NEW_SHARE', 'ANNOTATION_ADDED');

UPDATE "Notification"
SET "type" = 'MESSAGE'
WHERE "type" = 'NEW_MESSAGE';

UPDATE "Notification"
SET "type" = 'SYSTEM'
WHERE "type" IN ('SECURITY_ALERT', 'SYSTEM_UPDATE');

UPDATE "PatientProvider"
SET "status" = 'PENDING'
WHERE "status" IN ('PENDING_REVIEW');

UPDATE "PatientProvider"
SET "status" = 'INACTIVE'
WHERE "status" = 'ARCHIVED';

UPDATE "User"
SET "specialty" = 'GENERAL'
WHERE "specialty" = 'GENERAL_PRACTITIONER';

UPDATE "User"
SET "specialty" = 'RADIOLOGY'
WHERE "specialty" = 'RADIOLOGIST';

UPDATE "User"
SET "specialty" = 'CARDIOLOGY'
WHERE "specialty" = 'CARDIOLOGIST';

UPDATE "User"
SET "specialty" = 'NEUROLOGY'
WHERE "specialty" = 'NEUROLOGIST';

UPDATE "User"
SET "specialty" = 'ORTHOPEDICS'
WHERE "specialty" = 'ORTHOPEDIST';

UPDATE "Share"
SET "permissions" = 'EDIT'
WHERE "permissions" = 'FULL';

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