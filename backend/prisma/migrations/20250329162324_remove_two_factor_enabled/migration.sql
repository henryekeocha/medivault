/*
  Warnings:

  - You are about to drop the column `twoFactorEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCodeExpiresAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "twoFactorEnabled",
DROP COLUMN "twoFactorSecret",
DROP COLUMN "verificationCode",
DROP COLUMN "verificationCodeExpiresAt";
