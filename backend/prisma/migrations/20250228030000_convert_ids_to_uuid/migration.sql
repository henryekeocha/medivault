-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Convert User table
ALTER TABLE "User" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Convert Image table
ALTER TABLE "Image" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Image" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Image" ALTER COLUMN "userId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Image" ALTER COLUMN "patientId" TYPE UUID USING NULLIF(patientId, '')::UUID;

-- Update foreign keys in existing tables
ALTER TABLE "UserSettings" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "UserSettings" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "UserSettings" ALTER COLUMN "userId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "SecurityLog" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "SecurityLog" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "SecurityLog" ALTER COLUMN "userId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "MedicalRecordImage" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "MedicalRecordImage" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "MedicalRecordImage" ALTER COLUMN "medicalRecordId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "MedicalRecordImage" ALTER COLUMN "imageId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "Share" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Share" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Share" ALTER COLUMN "imageId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Share" ALTER COLUMN "sharedByUserId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Share" ALTER COLUMN "sharedWithUserId" TYPE UUID USING NULLIF(sharedWithUserId, '')::UUID;

ALTER TABLE "Annotation" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Annotation" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Annotation" ALTER COLUMN "imageId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Annotation" ALTER COLUMN "userId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "Message" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Message" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Message" ALTER COLUMN "senderId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Message" ALTER COLUMN "receiverId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "Notification" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Notification" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Notification" ALTER COLUMN "userId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "PatientProvider" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "PatientProvider" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "PatientProvider" ALTER COLUMN "patientId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "PatientProvider" ALTER COLUMN "doctorId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "Appointment" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Appointment" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Appointment" ALTER COLUMN "patientId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Appointment" ALTER COLUMN "doctorId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Appointment" ALTER COLUMN "imageId" TYPE UUID USING NULLIF(imageId, '')::UUID;

ALTER TABLE "MedicalRecord" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "MedicalRecord" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "MedicalRecord" ALTER COLUMN "patientId" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "MedicalRecord" ALTER COLUMN "providerId" TYPE UUID USING (uuid_generate_v4());

ALTER TABLE "Prescription" ALTER COLUMN "id" TYPE UUID USING (uuid_generate_v4());
ALTER TABLE "Prescription" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Prescription" ALTER COLUMN "patientId" TYPE UUID USING (uuid_generate_v4()); 