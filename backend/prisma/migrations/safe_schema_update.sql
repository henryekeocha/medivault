-- Handle AnnotationType enum changes
UPDATE "Annotation"
SET "type" = 'MARKER'
WHERE "type" = 'NOTE';

-- Handle NotificationType enum changes
UPDATE "Notification"
SET "type" = 'SHARE'
WHERE "type" IN ('NEW_SHARE', 'ANNOTATION_ADDED');

UPDATE "Notification"
SET "type" = 'MESSAGE'
WHERE "type" = 'NEW_MESSAGE';

UPDATE "Notification"
SET "type" = 'SYSTEM'
WHERE "type" IN ('SECURITY_ALERT', 'SYSTEM_UPDATE');

-- Handle PatientStatus enum changes
UPDATE "PatientProvider"
SET "status" = 'PENDING'
WHERE "status" IN ('PENDING_REVIEW');

UPDATE "PatientProvider"
SET "status" = 'INACTIVE'
WHERE "status" = 'ARCHIVED';

-- Handle ProviderSpecialty enum changes
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

-- Handle SharePermission enum changes
UPDATE "Share"
SET "permissions" = 'EDIT'
WHERE "permissions" = 'FULL';

-- Handle potential duplicate s3Key values in Image table
WITH duplicates AS (
  SELECT s3Key, MIN(id) as keep_id
  FROM "Image"
  GROUP BY s3Key
  HAVING COUNT(*) > 1
)
UPDATE "Image" i
SET s3Key = s3Key || '_' || id
WHERE id NOT IN (
  SELECT keep_id FROM duplicates
)
AND s3Key IN (
  SELECT s3Key FROM duplicates
);

-- Handle potential duplicate shareUrl values in Share table
WITH duplicates AS (
  SELECT shareUrl, MIN(id) as keep_id
  FROM "Share"
  WHERE shareUrl IS NOT NULL
  GROUP BY shareUrl
  HAVING COUNT(*) > 1
)
UPDATE "Share" s
SET shareUrl = shareUrl || '_' || id
WHERE id NOT IN (
  SELECT keep_id FROM duplicates
)
AND shareUrl IN (
  SELECT shareUrl FROM duplicates
);

-- Handle potential duplicate token values in Share table
WITH duplicates AS (
  SELECT token, MIN(id) as keep_id
  FROM "Share"
  WHERE token IS NOT NULL
  GROUP BY token
  HAVING COUNT(*) > 1
)
UPDATE "Share" s
SET token = token || '_' || id
WHERE id NOT IN (
  SELECT keep_id FROM duplicates
)
AND token IN (
  SELECT token FROM duplicates
); 