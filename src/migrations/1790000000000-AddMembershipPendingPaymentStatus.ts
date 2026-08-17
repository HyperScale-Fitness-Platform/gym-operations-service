import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipPendingPaymentStatus1790000000000 implements MigrationInterface {
    name = 'AddMembershipPendingPaymentStatus1790000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "public"."memberships_status_enum"
            ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL cannot remove a value from an enum type.
        // No safe down migration is possible once the value is used.
    }
}