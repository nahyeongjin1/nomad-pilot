import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSearchVector1772255035406 implements MigrationInterface {
  name = 'DropSearchVector1772255035406';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_pois_search_vector"`);
    await queryRunner.query(`ALTER TABLE "pois" DROP COLUMN "search_vector"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pois" ADD "search_vector" tsvector`);
    await queryRunner.query(
      `CREATE INDEX "IDX_pois_search_vector" ON "pois" ("search_vector") `,
    );
  }
}
