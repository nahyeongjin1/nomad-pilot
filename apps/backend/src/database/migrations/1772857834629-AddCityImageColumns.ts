import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCityImageColumns1772857834629 implements MigrationInterface {
  name = 'AddCityImageColumns1772857834629';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cities" ADD "image_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cities" ADD "image_author_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cities" ADD "image_author_url" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cities" DROP COLUMN "image_author_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cities" DROP COLUMN "image_author_name"`,
    );
    await queryRunner.query(`ALTER TABLE "cities" DROP COLUMN "image_url"`);
  }
}
