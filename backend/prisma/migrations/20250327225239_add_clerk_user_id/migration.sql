/*
  Warnings:

  - A unique constraint covering the columns `[clerkUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clerkUserId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;

-- Update existing records with a default value
UPDATE "User" SET "clerkUserId" = 'temp_' || id WHERE "clerkUserId" IS NULL;

-- Make the column required and unique
ALTER TABLE "User" ALTER COLUMN "clerkUserId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_clerkUserId_key" UNIQUE ("clerkUserId");
