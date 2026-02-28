import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPoiPipelineFields1772276686166 implements MigrationInterface {
  name = 'AddPoiPipelineFields1772276686166';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pois" ADD "website" character varying(1000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "pois" ADD "phone" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "pois" ADD "google_place_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "pois" ADD "last_synced_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pois_google_place_id" ON "pois" ("google_place_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pois_last_synced_at" ON "pois" ("last_synced_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_pois_last_synced_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pois_google_place_id"`);
    await queryRunner.query(`ALTER TABLE "pois" DROP COLUMN "last_synced_at"`);
    await queryRunner.query(`ALTER TABLE "pois" DROP COLUMN "google_place_id"`);
    await queryRunner.query(`ALTER TABLE "pois" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "pois" DROP COLUMN "website"`);
  }
}
