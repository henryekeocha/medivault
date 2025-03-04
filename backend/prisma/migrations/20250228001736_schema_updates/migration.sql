/*
  Warnings:

  - The values [NOTE] on the enum `AnnotationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [NEW_SHARE,NEW_MESSAGE,ANNOTATION_ADDED,SECURITY_ALERT,SYSTEM_UPDATE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING_REVIEW,ARCHIVED] on the enum `PatientStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [GENERAL_PRACTITIONER,RADIOLOGIST,CARDIOLOGIST,NEUROLOGIST,ORTHOPEDIST] on the enum `ProviderSpecialty` will be removed. If these variants are still used in the database, this will fail.
  - The values [FULL] on the enum `SharePermission` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `datetime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AuditLog` table. All the data in the column will be lost.
  - The `details` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `metadata` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `endedAt` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `ChatSession` table. All the data in the column will be lost.
  - You are about to drop the column `receiverId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `activePatients` on the `ProviderAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `averageRating` on the `ProviderAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `imageReviewTime` on the `ProviderAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `responseTime` on the `ProviderAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `totalPatients` on the `ProviderAnalytics` table. All the data in the column will be lost.
  - You are about to drop the column `bytesUsed` on the `StorageUsage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SystemLog` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SystemLog` table. All the data in the column will be lost.
  - You are about to drop the column `action` on the `UserActivity` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `UserActivity` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `UserActivity` table. All the data in the column will be lost.
  - You are about to drop the column `resourceType` on the `UserActivity` table. All the data in the column will be lost.
  - You are about to drop the `Analytics` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[s3Key]` on the table `Image` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shareUrl]` on the table `Share` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `Share` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endTime` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chatSessionId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `HealthMetric` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `s3Key` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3Url` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metric` to the `ProviderAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `ProviderAnalytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bytes` to the `StorageUsage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `SystemLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `UserActivity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AnnotationType_new" AS ENUM ('MARKER', 'MEASUREMENT', 'TEXT', 'DRAWING');
ALTER TABLE "Annotation" ALTER COLUMN "type" TYPE "AnnotationType_new" USING ("type"::text::"AnnotationType_new");
ALTER TYPE "AnnotationType" RENAME TO "AnnotationType_old";
ALTER TYPE "AnnotationType_new" RENAME TO "AnnotationType";
DROP TYPE "AnnotationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('APPOINTMENT', 'MESSAGE', 'SHARE', 'SYSTEM');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PatientStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
ALTER TABLE "PatientProvider" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PatientProvider" ALTER COLUMN "status" TYPE "PatientStatus_new" USING ("status"::text::"PatientStatus_new");
ALTER TYPE "PatientStatus" RENAME TO "PatientStatus_old";
ALTER TYPE "PatientStatus_new" RENAME TO "PatientStatus";
DROP TYPE "PatientStatus_old";
ALTER TABLE "PatientProvider" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProviderSpecialty_new" AS ENUM ('GENERAL', 'RADIOLOGY', 'CARDIOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 'OTHER');
ALTER TABLE "User" ALTER COLUMN "specialty" TYPE "ProviderSpecialty_new" USING ("specialty"::text::"ProviderSpecialty_new");
ALTER TYPE "ProviderSpecialty" RENAME TO "ProviderSpecialty_old";
ALTER TYPE "ProviderSpecialty_new" RENAME TO "ProviderSpecialty";
DROP TYPE "ProviderSpecialty_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SharePermission_new" AS ENUM ('VIEW', 'COMMENT', 'EDIT');
ALTER TABLE "Share" ALTER COLUMN "permissions" DROP DEFAULT;
ALTER TABLE "Share" ALTER COLUMN "permissions" TYPE "SharePermission_new" USING ("permissions"::text::"SharePermission_new");
ALTER TYPE "SharePermission" RENAME TO "SharePermission_old";
ALTER TYPE "SharePermission_new" RENAME TO "SharePermission";
DROP TYPE "SharePermission_old";
ALTER TABLE "Share" ALTER COLUMN "permissions" SET DEFAULT 'VIEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_receiverId_fkey";

-- DropIndex
DROP INDEX "Appointment_datetime_idx";

-- DropIndex
DROP INDEX "AuditLog_action_idx";

-- DropIndex
DROP INDEX "ChatMessage_sessionId_idx";

-- DropIndex
DROP INDEX "ChatMessage_status_idx";

-- DropIndex
DROP INDEX "ChatMessage_type_idx";

-- DropIndex
DROP INDEX "ChatSession_isActive_idx";

-- DropIndex
DROP INDEX "HealthMetric_type_idx";

-- DropIndex
DROP INDEX "MedicalRecord_recordType_idx";

-- DropIndex
DROP INDEX "Message_receiverId_idx";

-- DropIndex
DROP INDEX "SystemLog_createdAt_idx";

-- DropIndex
DROP INDEX "SystemLog_type_idx";

-- DropIndex
DROP INDEX "UserActivity_action_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "datetime",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "createdAt",
DROP COLUMN "resourceId",
DROP COLUMN "updatedAt",
DROP COLUMN "details",
ADD COLUMN     "details" JSONB;

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "metadata",
DROP COLUMN "sessionId",
DROP COLUMN "status",
DROP COLUMN "type",
DROP COLUMN "updatedAt",
ADD COLUMN     "chatSessionId" TEXT NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "endedAt",
DROP COLUMN "isActive",
DROP COLUMN "metadata",
DROP COLUMN "startedAt",
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "HealthMetric" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "s3Key" TEXT NOT NULL,
ADD COLUMN     "s3Url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "receiverId",
ADD COLUMN     "recipientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PatientProvider" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "providerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProviderAnalytics" DROP COLUMN "activePatients",
DROP COLUMN "averageRating",
DROP COLUMN "imageReviewTime",
DROP COLUMN "responseTime",
DROP COLUMN "totalPatients",
ADD COLUMN     "metric" TEXT NOT NULL,
ADD COLUMN     "value" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Share" ADD COLUMN     "token" TEXT;

-- AlterTable
ALTER TABLE "StorageUsage" DROP COLUMN "bytesUsed",
ADD COLUMN     "bytes" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "SystemLog" DROP COLUMN "createdAt",
DROP COLUMN "type",
ADD COLUMN     "level" TEXT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backupCodes" TEXT[];

-- AlterTable
ALTER TABLE "UserActivity" DROP COLUMN "action",
DROP COLUMN "metadata",
DROP COLUMN "resourceId",
DROP COLUMN "resourceType",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "type" TEXT NOT NULL;

-- DropTable
DROP TABLE "Analytics";

-- DropEnum
DROP TYPE "ChatMessageStatus";

-- DropEnum
DROP TYPE "ChatMessageType";

-- DropEnum
DROP TYPE "HealthMetricType";

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "allowNewRegistrations" BOOLEAN NOT NULL DEFAULT true,
    "maxUploadSize" INTEGER NOT NULL DEFAULT 10485760,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/dicom']::TEXT[],
    "defaultStorageQuota" INTEGER NOT NULL DEFAULT 5368709120,
    "smtpConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_endTime_idx" ON "Appointment"("endTime");

-- CreateIndex
CREATE INDEX "ChatMessage_chatSessionId_idx" ON "ChatMessage"("chatSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Image_s3Key_key" ON "Image"("s3Key");

-- CreateIndex
CREATE INDEX "MedicalRecord_createdAt_idx" ON "MedicalRecord"("createdAt");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE INDEX "Prescription_providerId_idx" ON "Prescription"("providerId");

-- CreateIndex
CREATE INDEX "Prescription_startDate_idx" ON "Prescription"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Share_shareUrl_key" ON "Share"("shareUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_token_idx" ON "Share"("token");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_timestamp_idx" ON "SystemLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
