-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "FileAccessLog" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "accessType" TEXT NOT NULL,
    "accessTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    CONSTRAINT "FileAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileAccessLog_userId_idx" ON "FileAccessLog"("userId");
CREATE INDEX "FileAccessLog_fileId_idx" ON "FileAccessLog"("fileId");
CREATE INDEX "FileAccessLog_accessTimestamp_idx" ON "FileAccessLog"("accessTimestamp");

-- AddForeignKey
ALTER TABLE "FileAccessLog" ADD CONSTRAINT "FileAccessLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAccessLog" ADD CONSTRAINT "FileAccessLog_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE; 