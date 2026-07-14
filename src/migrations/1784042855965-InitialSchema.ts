import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784042855965 implements MigrationInterface {
    name = 'InitialSchema1784042855965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trainer_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trainer_id" character varying NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL DEFAULT 'open', CONSTRAINT "PK_ec15a4ad07cad3671c7f60ceebd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae9259c5b9f8d98ca8a00904b4" ON "trainer_slots" ("trainer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_20ed9b32fb141df5821774d93b" ON "trainer_slots" ("status") `);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" character varying NOT NULL, "class_session_id" uuid, "trainer_slot_id" uuid, "type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'confirmed', "sessionSource" character varying NOT NULL DEFAULT 'membership', "pt_package_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8e21b7ae33e7b0673270de4146" ON "bookings" ("customer_id") `);
        await queryRunner.query(`CREATE TABLE "class_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "class_id" uuid NOT NULL, "trainer_id" character varying NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_dc034da48c6e0cf95c51f606c4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" character varying NOT NULL, "capacity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."membership_benefits_benefitname_enum" AS ENUM('PT_SESSIONS')`);
        await queryRunner.query(`CREATE TABLE "membership_benefits" ("id" SERIAL NOT NULL, "benefitName" "public"."membership_benefits_benefitname_enum" NOT NULL, "benefitValue" integer NOT NULL, "planId" integer, CONSTRAINT "PK_0701a790d9a9feaf44dac91b61c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "membership_plans" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "price" numeric NOT NULL, "durationInDays" integer NOT NULL, "maxFreezes" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9ffb17ec0acbcfcc0d60ddfcb16" UNIQUE ("name"), CONSTRAINT "PK_85ca9d6f4262a6bbff2a540c640" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."customer_benefits_benefitname_enum" AS ENUM('PT_SESSIONS')`);
        await queryRunner.query(`CREATE TABLE "customer_benefits" ("id" SERIAL NOT NULL, "benefitName" "public"."customer_benefits_benefitname_enum" NOT NULL, "totalValue" integer NOT NULL, "remainingValue" integer NOT NULL, "membership_id" integer, CONSTRAINT "PK_6d433062c02fd36f6e7ef3d0d6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "membership_freezes" ("id" SERIAL NOT NULL, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "membership_id" integer, CONSTRAINT "PK_646d90c2567c3e5789e3bc0ae37" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."memberships_status_enum" AS ENUM('ACTIVE', 'FROZEN', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "memberships" ("id" SERIAL NOT NULL, "customerId" character varying NOT NULL, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "status" "public"."memberships_status_enum" NOT NULL DEFAULT 'ACTIVE', "freezesUsed" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "plan_id" integer, CONSTRAINT "PK_25d28bd932097a9e90495ede7b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pt_packages_status_enum" AS ENUM('PENDING_PAYMENT', 'ACTIVE', 'EXHAUSTED', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "pt_packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" character varying NOT NULL, "trainerId" character varying NOT NULL, "packageType" character varying NOT NULL, "sessionsTotal" integer NOT NULL, "sessionsUsed" integer NOT NULL DEFAULT '0', "status" "public"."pt_packages_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT', "purchasedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_26676b153d36c8810caf48bf914" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "occupancies" ("id" SERIAL NOT NULL, "customer_id" character varying NOT NULL, "check_in" TIMESTAMP NOT NULL, "check_out" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0fe5d113cbd6e522b3c4e1a3b86" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_d133f2641835ea407b6f2fba0b0" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_e9fac8aa8db31aa546011e5caa8" FOREIGN KEY ("trainer_slot_id") REFERENCES "trainer_slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "class_sessions" ADD CONSTRAINT "FK_700b21b3e72e731ec274e22b743" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "membership_benefits" ADD CONSTRAINT "FK_b4ab0565f477948f40eca27348c" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_benefits" ADD CONSTRAINT "FK_0cb777597ab2deb5215bcb8260d" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "membership_freezes" ADD CONSTRAINT "FK_264c73c11eac71a196ad444cd8b" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "memberships" ADD CONSTRAINT "FK_5c867a1e86e7c2a1abc92d6ecfc" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "FK_5c867a1e86e7c2a1abc92d6ecfc"`);
        await queryRunner.query(`ALTER TABLE "membership_freezes" DROP CONSTRAINT "FK_264c73c11eac71a196ad444cd8b"`);
        await queryRunner.query(`ALTER TABLE "customer_benefits" DROP CONSTRAINT "FK_0cb777597ab2deb5215bcb8260d"`);
        await queryRunner.query(`ALTER TABLE "membership_benefits" DROP CONSTRAINT "FK_b4ab0565f477948f40eca27348c"`);
        await queryRunner.query(`ALTER TABLE "class_sessions" DROP CONSTRAINT "FK_700b21b3e72e731ec274e22b743"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_e9fac8aa8db31aa546011e5caa8"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_d133f2641835ea407b6f2fba0b0"`);
        await queryRunner.query(`DROP TABLE "occupancies"`);
        await queryRunner.query(`DROP TABLE "pt_packages"`);
        await queryRunner.query(`DROP TYPE "public"."pt_packages_status_enum"`);
        await queryRunner.query(`DROP TABLE "memberships"`);
        await queryRunner.query(`DROP TYPE "public"."memberships_status_enum"`);
        await queryRunner.query(`DROP TABLE "membership_freezes"`);
        await queryRunner.query(`DROP TABLE "customer_benefits"`);
        await queryRunner.query(`DROP TYPE "public"."customer_benefits_benefitname_enum"`);
        await queryRunner.query(`DROP TABLE "membership_plans"`);
        await queryRunner.query(`DROP TABLE "membership_benefits"`);
        await queryRunner.query(`DROP TYPE "public"."membership_benefits_benefitname_enum"`);
        await queryRunner.query(`DROP TABLE "classes"`);
        await queryRunner.query(`DROP TABLE "class_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e21b7ae33e7b0673270de4146"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20ed9b32fb141df5821774d93b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae9259c5b9f8d98ca8a00904b4"`);
        await queryRunner.query(`DROP TABLE "trainer_slots"`);
    }

}
