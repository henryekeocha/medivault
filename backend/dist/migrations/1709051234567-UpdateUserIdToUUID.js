export class UpdateUserIdToUUID1709051234567 {
    name = 'UpdateUserIdToUUID1709051234567';
    async up(queryRunner) {
        // Drop all foreign key constraints that reference the user table
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP CONSTRAINT IF EXISTS "FK_482a023d073b81fc68252147fd4"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP CONSTRAINT IF EXISTS "FK_d93cb9b52b78277d4ef77808d09"`);
        await queryRunner.query(`ALTER TABLE "health_metric" DROP CONSTRAINT IF EXISTS "FK_1be36af7071b344b064ef02c850"`);
        await queryRunner.query(`ALTER TABLE "health_metric" DROP CONSTRAINT IF EXISTS "FK_a85d51779dc2fae705f4b653223"`);
        await queryRunner.query(`ALTER TABLE "medical_record" DROP CONSTRAINT IF EXISTS "FK_3b1546f4a372400ada63bdc1287"`);
        await queryRunner.query(`ALTER TABLE "medical_record" DROP CONSTRAINT IF EXISTS "FK_b53c9d9d9741bac9726574f34f7"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT IF EXISTS "FK_514bcc3fb1b8140f85bf1cde6e2"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT IF EXISTS "FK_5ce4c3130796367c93cd817948e"`);
        await queryRunner.query(`ALTER TABLE "image" DROP CONSTRAINT IF EXISTS "FK_dc40417dfa0c7fbd70b8eb880cc"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_bc096b4e18b1f9508197cd98066"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_445b786f516688cf2b81b8981b6"`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "FK_2621409ebc295c5da7ff3e41396"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "FK_986a2b6d3c05eb4091bb8066f78"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "FK_1fa209cf48ae975a109366542a5"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_9a8a82462cab47c73d25f49261f"`);
        // Create UUID extension if not exists
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        // Add new UUID column to user table
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "uuid_id" UUID DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`UPDATE "user" SET "uuid_id" = uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "uuid_id" SET NOT NULL`);
        // Add UUID columns to all tables that reference user
        await queryRunner.query(`ALTER TABLE "patient_provider" ADD COLUMN IF NOT EXISTS "patient_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "patient_provider" ADD COLUMN IF NOT EXISTS "doctor_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "health_metric" ADD COLUMN IF NOT EXISTS "patient_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "medical_record" ADD COLUMN IF NOT EXISTS "patient_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD COLUMN IF NOT EXISTS "patient_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "image" ADD COLUMN IF NOT EXISTS "user_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "sender_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "recipient_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "user_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "user_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "user_uuid" UUID`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_uuid" UUID`);
        // Update references in all tables
        await queryRunner.query(`
            UPDATE "patient_provider" pp 
            SET "patient_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE pp."patientId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "patient_provider" pp 
            SET "doctor_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE pp."doctorId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "health_metric" hm 
            SET "patient_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE hm."patientId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "medical_record" mr 
            SET "patient_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE mr."patientId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "appointment" a 
            SET "patient_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE a."patientId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "image" i 
            SET "user_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE i."userId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "message" m 
            SET "sender_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE m."senderId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "message" m 
            SET "recipient_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE m."recipientId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "audit_log" al 
            SET "user_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE al."userId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "user_settings" us 
            SET "user_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE us."userId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "chat_sessions" cs 
            SET "user_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE cs."userId"::text = u.id::text
        `);
        await queryRunner.query(`
            UPDATE "notifications" n 
            SET "user_uuid" = u."uuid_id" 
            FROM "user" u 
            WHERE n."userId"::text = u.id::text
        `);
        // Drop old columns and rename UUID columns
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "PK_cace4a159ff9f2512dd42373760"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "id"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "uuid_id" TO "id"`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "PK_user_id" PRIMARY KEY ("id")`);
        // Update all tables to use new UUID columns
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP COLUMN IF EXISTS "patientId"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP COLUMN IF EXISTS "doctorId"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" RENAME COLUMN "patient_uuid" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" RENAME COLUMN "doctor_uuid" TO "doctorId"`);
        await queryRunner.query(`ALTER TABLE "health_metric" DROP COLUMN IF EXISTS "patientId"`);
        await queryRunner.query(`ALTER TABLE "health_metric" RENAME COLUMN "patient_uuid" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "medical_record" DROP COLUMN IF EXISTS "patientId"`);
        await queryRunner.query(`ALTER TABLE "medical_record" RENAME COLUMN "patient_uuid" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN IF EXISTS "patientId"`);
        await queryRunner.query(`ALTER TABLE "appointment" RENAME COLUMN "patient_uuid" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "image" DROP COLUMN IF EXISTS "userId"`);
        await queryRunner.query(`ALTER TABLE "image" RENAME COLUMN "user_uuid" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "recipientId"`);
        await queryRunner.query(`ALTER TABLE "message" RENAME COLUMN "sender_uuid" TO "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" RENAME COLUMN "recipient_uuid" TO "recipientId"`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "userId"`);
        await queryRunner.query(`ALTER TABLE "audit_log" RENAME COLUMN "user_uuid" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "userId"`);
        await queryRunner.query(`ALTER TABLE "user_settings" RENAME COLUMN "user_uuid" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "userId"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" RENAME COLUMN "user_uuid" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "userId"`);
        await queryRunner.query(`ALTER TABLE "notifications" RENAME COLUMN "user_uuid" TO "userId"`);
        // Add new foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "patient_provider" 
            ADD CONSTRAINT "FK_patient_provider_patient" 
            FOREIGN KEY ("patientId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "patient_provider" 
            ADD CONSTRAINT "FK_patient_provider_doctor" 
            FOREIGN KEY ("doctorId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "health_metric" 
            ADD CONSTRAINT "FK_health_metric_patient" 
            FOREIGN KEY ("patientId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "medical_record" 
            ADD CONSTRAINT "FK_medical_record_patient" 
            FOREIGN KEY ("patientId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "appointment" 
            ADD CONSTRAINT "FK_appointment_patient" 
            FOREIGN KEY ("patientId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "image" 
            ADD CONSTRAINT "FK_image_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "message" 
            ADD CONSTRAINT "FK_message_sender" 
            FOREIGN KEY ("senderId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "message" 
            ADD CONSTRAINT "FK_message_recipient" 
            FOREIGN KEY ("recipientId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "audit_log" 
            ADD CONSTRAINT "FK_audit_log_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "user_settings" 
            ADD CONSTRAINT "FK_user_settings_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            ADD CONSTRAINT "FK_chat_sessions_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "notifications" 
            ADD CONSTRAINT "FK_notifications_user" 
            FOREIGN KEY ("userId") 
            REFERENCES "user"("id")
        `);
    }
    async down(queryRunner) {
        // Drop all new foreign key constraints
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP CONSTRAINT IF EXISTS "FK_patient_provider_patient"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP CONSTRAINT IF EXISTS "FK_patient_provider_doctor"`);
        await queryRunner.query(`ALTER TABLE "health_metric" DROP CONSTRAINT IF EXISTS "FK_health_metric_patient"`);
        await queryRunner.query(`ALTER TABLE "medical_record" DROP CONSTRAINT IF EXISTS "FK_medical_record_patient"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT IF EXISTS "FK_appointment_patient"`);
        await queryRunner.query(`ALTER TABLE "image" DROP CONSTRAINT IF EXISTS "FK_image_user"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_sender"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_recipient"`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "FK_audit_log_user"`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "FK_user_settings_user"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "FK_chat_sessions_user"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notifications_user"`);
        // Add integer ID column to user table
        await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "int_id" SERIAL`);
        await queryRunner.query(`UPDATE "user" SET "int_id" = nextval('user_id_seq')`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "PK_user_id"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "int_id" TO "id"`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`);
        // Restore integer columns in all tables
        await queryRunner.query(`ALTER TABLE "patient_provider" ADD COLUMN "patient_id" integer`);
        await queryRunner.query(`ALTER TABLE "patient_provider" ADD COLUMN "doctor_id" integer`);
        await queryRunner.query(`UPDATE "patient_provider" pp SET "patient_id" = u."id"::integer FROM "user" u WHERE pp."patientId" = u.id::text`);
        await queryRunner.query(`UPDATE "patient_provider" pp SET "doctor_id" = u."id"::integer FROM "user" u WHERE pp."doctorId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP COLUMN "patientId"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" DROP COLUMN "doctorId"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" RENAME COLUMN "patient_id" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "patient_provider" RENAME COLUMN "doctor_id" TO "doctorId"`);
        await queryRunner.query(`ALTER TABLE "health_metric" ADD COLUMN "patient_id" integer`);
        await queryRunner.query(`UPDATE "health_metric" hm SET "patient_id" = u."id"::integer FROM "user" u WHERE hm."patientId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "health_metric" DROP COLUMN "patientId"`);
        await queryRunner.query(`ALTER TABLE "health_metric" RENAME COLUMN "patient_id" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "medical_record" ADD COLUMN "patient_id" integer`);
        await queryRunner.query(`UPDATE "medical_record" mr SET "patient_id" = u."id"::integer FROM "user" u WHERE mr."patientId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "medical_record" DROP COLUMN "patientId"`);
        await queryRunner.query(`ALTER TABLE "medical_record" RENAME COLUMN "patient_id" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD COLUMN "patient_id" integer`);
        await queryRunner.query(`UPDATE "appointment" a SET "patient_id" = u."id"::integer FROM "user" u WHERE a."patientId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "patientId"`);
        await queryRunner.query(`ALTER TABLE "appointment" RENAME COLUMN "patient_id" TO "patientId"`);
        await queryRunner.query(`ALTER TABLE "image" ADD COLUMN "user_id" integer`);
        await queryRunner.query(`UPDATE "image" i SET "user_id" = u."id"::integer FROM "user" u WHERE i."userId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "image" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "image" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "message" ADD COLUMN "sender_id" integer`);
        await queryRunner.query(`ALTER TABLE "message" ADD COLUMN "recipient_id" integer`);
        await queryRunner.query(`UPDATE "message" m SET "sender_id" = u."id"::integer FROM "user" u WHERE m."senderId" = u.id::text`);
        await queryRunner.query(`UPDATE "message" m SET "recipient_id" = u."id"::integer FROM "user" u WHERE m."recipientId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "recipientId"`);
        await queryRunner.query(`ALTER TABLE "message" RENAME COLUMN "sender_id" TO "senderId"`);
        await queryRunner.query(`ALTER TABLE "message" RENAME COLUMN "recipient_id" TO "recipientId"`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD COLUMN "user_id" integer`);
        await queryRunner.query(`UPDATE "audit_log" al SET "user_id" = u."id"::integer FROM "user" u WHERE al."userId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "audit_log" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD COLUMN "user_id" integer`);
        await queryRunner.query(`UPDATE "user_settings" us SET "user_id" = u."id"::integer FROM "user" u WHERE us."userId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "user_settings" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD COLUMN "user_id" integer`);
        await queryRunner.query(`UPDATE "chat_sessions" cs SET "user_id" = u."id"::integer FROM "user" u WHERE cs."userId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "user_id" integer`);
        await queryRunner.query(`UPDATE "notifications" n SET "user_id" = u."id"::integer FROM "user" u WHERE n."userId" = u.id::text`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "notifications" RENAME COLUMN "user_id" TO "userId"`);
        // Restore original foreign key constraints
        await queryRunner.query(`ALTER TABLE "patient_provider" ADD CONSTRAINT "FK_482a023d073b81fc68252147fd4" FOREIGN KEY ("doctorId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "patient_provider" ADD CONSTRAINT "FK_d93cb9b52b78277d4ef77808d09" FOREIGN KEY ("patientId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "health_metric" ADD CONSTRAINT "FK_1be36af7071b344b064ef02c850" FOREIGN KEY ("patientId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "medical_record" ADD CONSTRAINT "FK_3b1546f4a372400ada63bdc1287" FOREIGN KEY ("patientId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_514bcc3fb1b8140f85bf1cde6e2" FOREIGN KEY ("patientId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "image" ADD CONSTRAINT "FK_dc40417dfa0c7fbd70b8eb880cc" FOREIGN KEY ("userId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_445b786f516688cf2b81b8981b6" FOREIGN KEY ("recipientId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_2621409ebc295c5da7ff3e41396" FOREIGN KEY ("userId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "chat_sessions" ADD CONSTRAINT "FK_1fa209cf48ae975a109366542a5" FOREIGN KEY ("userId") REFERENCES "user"("id")`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("userId") REFERENCES "user"("id")`);
    }
}
//# sourceMappingURL=1709051234567-UpdateUserIdToUUID.js.map