import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedJapaneseCities1772006200680 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "cities" ("name_ko", "name_en", "name_local", "country_code", "location", "timezone", "iata_codes", "currency_code")
      VALUES
        ('도쿄',     'Tokyo',   '東京', 'JP', ST_SetSRID(ST_MakePoint(139.6503, 35.6762), 4326)::geography, 'Asia/Tokyo', '{NRT,HND}', 'JPY'),
        ('오사카',   'Osaka',   '大阪', 'JP', ST_SetSRID(ST_MakePoint(135.5023, 34.6937), 4326)::geography, 'Asia/Tokyo', '{KIX,ITM}', 'JPY'),
        ('교토',     'Kyoto',   '京都', 'JP', ST_SetSRID(ST_MakePoint(135.7681, 35.0116), 4326)::geography, 'Asia/Tokyo', '{KIX}',     'JPY'),
        ('후쿠오카', 'Fukuoka', '福岡', 'JP', ST_SetSRID(ST_MakePoint(130.4017, 33.5904), 4326)::geography, 'Asia/Tokyo', '{FUK}',     'JPY'),
        ('삿포로',   'Sapporo', '札幌', 'JP', ST_SetSRID(ST_MakePoint(141.3545, 43.0618), 4326)::geography, 'Asia/Tokyo', '{CTS}',     'JPY'),
        ('나하',     'Naha',    '那覇', 'JP', ST_SetSRID(ST_MakePoint(127.6809, 26.2124), 4326)::geography, 'Asia/Tokyo', '{OKA}',     'JPY')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "cities" WHERE "country_code" = 'JP'
    `);
  }
}
