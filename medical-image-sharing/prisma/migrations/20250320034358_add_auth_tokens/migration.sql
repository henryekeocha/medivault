/*
  Warnings:

  - The values [GENERAL_PRACTITIONER,RADIOLOGIST,CARDIOLOGIST,NEUROLOGIST,ORTHOPEDIST] on the enum `ProviderSpecialty` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterEnum
BEGIN;
CREATE TYPE "ProviderSpecialty_new" AS ENUM ('GENERAL', 'RADIOLOGY', 'CARDIOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 'ONCOLOGY', 'GASTROENTEROLOGY', 'PEDIATRICS', 'INTERNAL_MEDICINE', 'FAMILY_MEDICINE', 'EMERGENCY_MEDICINE', 'OBSTETRICS_GYNECOLOGY', 'DERMATOLOGY', 'OPHTHALMOLOGY', 'PSYCHIATRY', 'UROLOGY', 'OTOLARYNGOLOGY', 'ANESTHESIOLOGY', 'PATHOLOGY', 'NUCLEAR_MEDICINE', 'PHYSICAL_MEDICINE', 'PLASTIC_SURGERY', 'GENERAL_SURGERY', 'VASCULAR_SURGERY', 'THORACIC_SURGERY', 'NEPHROLOGY', 'OTHER');
ALTER TABLE "User" ALTER COLUMN "specialty" TYPE "ProviderSpecialty_new" USING ("specialty"::text::"ProviderSpecialty_new");
ALTER TYPE "ProviderSpecialty" RENAME TO "ProviderSpecialty_old";
ALTER TYPE "ProviderSpecialty_new" RENAME TO "ProviderSpecialty";
DROP TYPE "ProviderSpecialty_old";
COMMIT;

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "fileExtension" TEXT NOT NULL DEFAULT '.dcm',
ALTER COLUMN "fileType" SET DEFAULT 'application/dicom';

-- AlterTable
ALTER TABLE "SecurityLog" ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "success" SET DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountLockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProviderVerification" (
    "id" TEXT NOT NULL,
    "providerId" UUID NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "licenseExpiryDate" TIMESTAMP(3) NOT NULL,
    "specialtyName" TEXT,
    "identityDocumentS3Key" TEXT,
    "licenseDocumentS3Key" TEXT,
    "selfieS3Key" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastVerificationDate" TIMESTAMP(3),
    "nextVerificationDate" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProviderVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "phone" TEXT,
    "specialties" TEXT[],
    "acceptingNewPatients" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailProvider" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT,
    "port" INTEGER,
    "username" TEXT,
    "password" TEXT,
    "apiKey" TEXT,
    "from" TEXT NOT NULL,
    "replyTo" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderVerification_providerId_key" ON "ProviderVerification"("providerId");

-- CreateIndex
CREATE INDEX "ProviderVerification_providerId_idx" ON "ProviderVerification"("providerId");

-- CreateIndex
CREATE INDEX "ProviderVerification_verificationStatus_idx" ON "ProviderVerification"("verificationStatus");

-- CreateIndex
CREATE INDEX "ProviderVerification_licenseNumber_idx" ON "ProviderVerification"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_userId_key" ON "VerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_userId_key" ON "PasswordReset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- AddForeignKey
ALTER TABLE "ProviderVerification" ADD CONSTRAINT "ProviderVerification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
