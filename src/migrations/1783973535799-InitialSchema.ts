import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783973535799 implements MigrationInterface {
    name = 'InitialSchema1783973535799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "trainer_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trainer_id" character varying NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL DEFAULT 'open', CONSTRAINT "PK_ec15a4ad07cad3671c7f60ceebd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae9259c5b9f8d98ca8a00904b4" ON "trainer_slots" ("trainer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_20ed9b32fb141df5821774d93b" ON "trainer_slots" ("status") `);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" character varying NOT NULL, "class_session_id" uuid, "trainer_slot_id" uuid, "type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'confirmed', "sessionSource" character varying NOT NULL DEFAULT 'membership', "pt_package_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        // enforces only one active (confirmed) booking per trainer slot at a time
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_active_trainer_slot_booking" ON "bookings" ("trainer_slot_id") WHERE "status" = 'confirmed' AND "trainer_slot_id" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_8e21b7ae33e7b0673270de4146" ON "bookings" ("customer_id") `);
        await queryRunner.query(`CREATE TABLE "class_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "class_id" uuid NOT NULL, "trainer_id" character varying NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_dc034da48c6e0cf95c51f606c4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" character varying NOT NULL, "capacity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_d133f2641835ea407b6f2fba0b0" FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_e9fac8aa8db31aa546011e5caa8" FOREIGN KEY ("trainer_slot_id") REFERENCES "trainer_slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "class_sessions" ADD CONSTRAINT "FK_700b21b3e72e731ec274e22b743" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "class_sessions" DROP CONSTRAINT "FK_700b21b3e72e731ec274e22b743"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_e9fac8aa8db31aa546011e5caa8"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_d133f2641835ea407b6f2fba0b0"`);
        await queryRunner.query(`DROP TABLE "classes"`);
        await queryRunner.query(`DROP TABLE "class_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e21b7ae33e7b0673270de4146"`);
        // drop the partial unique index before dropping the table
        await queryRunner.query(`DROP INDEX "public"."unique_active_trainer_slot_booking"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20ed9b32fb141df5821774d93b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae9259c5b9f8d98ca8a00904b4"`);
        await queryRunner.query(`DROP TABLE "trainer_slots"`);
    }

}
