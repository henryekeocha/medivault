-- Handle unique constraints for Image table
UPDATE "Image" i1
SET s3key = i1.s3key || '_' || i1.id
FROM (
    SELECT s3key, id,
           ROW_NUMBER() OVER (PARTITION BY s3key ORDER BY id) as rn
    FROM "Image"
    WHERE s3key IS NOT NULL
) i2
WHERE i1.s3key = i2.s3key
  AND i2.rn > 1;

-- Handle unique constraints for Share table
UPDATE "Share" s1
SET shareurl = s1.shareurl || '_' || s1.id
FROM (
    SELECT shareurl, id,
           ROW_NUMBER() OVER (PARTITION BY shareurl ORDER BY id) as rn
    FROM "Share"
    WHERE shareurl IS NOT NULL
) s2
WHERE s1.shareurl = s2.shareurl
  AND s2.rn > 1;

UPDATE "Share" s1
SET token = s1.token || '_' || s1.id
FROM (
    SELECT token, id,
           ROW_NUMBER() OVER (PARTITION BY token ORDER BY id) as rn
    FROM "Share"
    WHERE token IS NOT NULL
) s2
WHERE s1.token = s2.token
  AND s2.rn > 1;

-- Add unique constraints
ALTER TABLE "Image" ADD CONSTRAINT "Image_s3key_key" UNIQUE (s3key);
ALTER TABLE "Share" ADD CONSTRAINT "Share_shareurl_key" UNIQUE (shareurl);
ALTER TABLE "Share" ADD CONSTRAINT "Share_token_key" UNIQUE (token); 