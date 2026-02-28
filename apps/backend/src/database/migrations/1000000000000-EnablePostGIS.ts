import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostGIS1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // postgis는 DB 전역 공유 확장이므로 다른 의존성 때문에 제거하지 않음
  }
}
