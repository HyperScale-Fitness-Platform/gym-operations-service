import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPtSessions1786840000000 implements MigrationInterface {
    name = 'AddPtSessions1786840000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "pt_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "sessions" integer NOT NULL,
                "priceCents" integer NOT NULL,
                "currency" character varying NOT NULL DEFAULT 'egp',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_pt_sessions" PRIMARY KEY ("id")
            )
        `);

        // Seed default PT session packages
        await queryRunner.query(`
            INSERT INTO "pt_sessions" ("name", "sessions", "priceCents", "currency")
            SELECT '20 Sessions Package', 20, 500000, 'egp'
            WHERE NOT EXISTS (SELECT 1 FROM "pt_sessions" WHERE "sessions" = 20)
        `);
        await queryRunner.query(`
            INSERT INTO "pt_sessions" ("name", "sessions", "priceCents", "currency")
            SELECT '40 Sessions Package', 40, 900000, 'egp'
            WHERE NOT EXISTS (SELECT 1 FROM "pt_sessions" WHERE "sessions" = 40)
        `);
        await queryRunner.query(`
            INSERT INTO "pt_sessions" ("name", "sessions", "priceCents", "currency")
            SELECT '60 Sessions Package', 60, 1200000, 'egp'
            WHERE NOT EXISTS (SELECT 1 FROM "pt_sessions" WHERE "sessions" = 60)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pt_sessions"`);
    }
}