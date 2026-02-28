import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgTrgm1772255104055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await queryRunner.query(
      `CREATE INDEX "IDX_pois_name_trgm_gin" ON "pois" USING GIN ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pois_name_local_trgm_gin" ON "pois" USING GIN ("name_local" gin_trgm_ops) WHERE "name_local" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pois_name_local_trgm_gin"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pois_name_trgm_gin"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`);
  }
}
