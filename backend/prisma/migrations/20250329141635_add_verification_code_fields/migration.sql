-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verificationCodeExpiresAt" TIMESTAMP(3);
