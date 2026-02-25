import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChecksAndPoiIdIndex1772010717519 implements MigrationInterface {
  name = 'AddChecksAndPoiIdIndex1772010717519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "IDX_ce15dd92e8ac39e231614e4331" ON "trip_day_pois" ("poi_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "pois"
            ADD CONSTRAINT "CHK_pois_price_level" CHECK (
                    "price_level" IS NULL
                    OR (
                        "price_level" BETWEEN 1 AND 4
                    )
                )
        `);
    await queryRunner.query(`
            ALTER TABLE "pois"
            ADD CONSTRAINT "CHK_pois_rating" CHECK (
                    "rating" IS NULL
                    OR (
                        "rating" >= 0
                        AND "rating" <= 5
                    )
                )
        `);
    await queryRunner.query(`
            ALTER TABLE "trips"
            ADD CONSTRAINT "CHK_trips_dates" CHECK (
                    "end_date" IS NULL
                    OR "start_date" IS NULL
                    OR "end_date" >= "start_date"
                )
        `);
    await queryRunner.query(`
            ALTER TABLE "trips"
            ADD CONSTRAINT "CHK_trips_duration" CHECK ("duration_days" >= 1)
        `);
    await queryRunner.query(`
            ALTER TABLE "trips"
            ADD CONSTRAINT "CHK_trips_month" CHECK (
                    "travel_month" BETWEEN 1 AND 12
                )
        `);
    await queryRunner.query(`
            ALTER TABLE "trips"
            ADD CONSTRAINT "CHK_trips_budget" CHECK ("total_budget_krw" >= 0)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "trips" DROP CONSTRAINT "CHK_trips_budget"
        `);
    await queryRunner.query(`
            ALTER TABLE "trips" DROP CONSTRAINT "CHK_trips_month"
        `);
    await queryRunner.query(`
            ALTER TABLE "trips" DROP CONSTRAINT "CHK_trips_duration"
        `);
    await queryRunner.query(`
            ALTER TABLE "trips" DROP CONSTRAINT "CHK_trips_dates"
        `);
    await queryRunner.query(`
            ALTER TABLE "pois" DROP CONSTRAINT "CHK_pois_rating"
        `);
    await queryRunner.query(`
            ALTER TABLE "pois" DROP CONSTRAINT "CHK_pois_price_level"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_ce15dd92e8ac39e231614e4331"
        `);
  }
}
