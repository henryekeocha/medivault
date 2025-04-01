/*
  Warnings:

  - You are about to drop the column `clerkUserId` on the `User` table. All the data in the column will be lost.
  - Made the column `authId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- First update existing authId values from clerkUserId
UPDATE "User" SET "authId" = "clerkUserId" WHERE "authId" IS NULL;

-- Drop the clerkUserId column
ALTER TABLE "User" DROP COLUMN "clerkUserId";

-- Make authId required
ALTER TABLE "User" ALTER COLUMN "authId" SET NOT NULL;
