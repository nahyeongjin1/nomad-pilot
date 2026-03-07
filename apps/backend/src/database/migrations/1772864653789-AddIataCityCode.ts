import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIataCityCode1772864653789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cities" ADD "iata_city_code" character(3)`,
    );

    await queryRunner.query(
      `UPDATE cities SET iata_city_code = 'TYO' WHERE name_en = 'Tokyo'`,
    );
    await queryRunner.query(
      `UPDATE cities SET iata_city_code = 'OSA' WHERE name_en = 'Osaka'`,
    );
    // Kyoto has no IATA city code (no airport, uses Osaka KIX)
    await queryRunner.query(
      `UPDATE cities SET iata_city_code = 'FUK' WHERE name_en = 'Fukuoka'`,
    );
    await queryRunner.query(
      `UPDATE cities SET iata_city_code = 'SPK' WHERE name_en = 'Sapporo'`,
    );
    await queryRunner.query(
      `UPDATE cities SET iata_city_code = 'OKA' WHERE name_en = 'Naha'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cities" DROP COLUMN "iata_city_code"`,
    );
  }
}
