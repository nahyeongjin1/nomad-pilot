import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchema1772005806516 implements MigrationInterface {
  name = 'CreateSchema1772005806516';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "trip_days" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "trip_id" uuid NOT NULL,
                "day_number" smallint NOT NULL,
                "date" date,
                "memo" text,
                CONSTRAINT "UQ_b3189725ebd9b27e19ceb1c2d50" UNIQUE ("trip_id", "day_number"),
                CONSTRAINT "PK_050b16d50cf830df078e0ad0efb" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "trip_day_pois" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "trip_day_id" uuid NOT NULL,
                "poi_id" uuid NOT NULL,
                "visit_order" smallint NOT NULL,
                "planned_arrival" TIME,
                "planned_departure" TIME,
                "estimated_cost_local" numeric(10, 2),
                "notes" text,
                CONSTRAINT "UQ_ed20dd5e2f523fefcc74d22dbc0" UNIQUE ("trip_day_id", "visit_order"),
                CONSTRAINT "PK_ae61c41828d8db6900ef49acdc5" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."pois_category_enum" AS ENUM(
                'restaurant',
                'cafe',
                'attraction',
                'shopping',
                'temple_shrine',
                'park',
                'museum',
                'entertainment',
                'nightlife',
                'transport_hub',
                'other'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."pois_source_enum" AS ENUM('osm', 'google', 'manual')
        `);
    await queryRunner.query(`
            CREATE TABLE "pois" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "city_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "name_local" character varying(255),
                "locale" character varying(10),
                "location" geography(Point, 4326) NOT NULL,
                "category" "public"."pois_category_enum" NOT NULL,
                "sub_category" character varying(100),
                "description" text,
                "description_local" text,
                "address" character varying(500),
                "address_local" character varying(500),
                "rating" numeric(3, 2),
                "price_level" smallint,
                "opening_hours" jsonb,
                "image_url" character varying(1000),
                "source" "public"."pois_source_enum" NOT NULL,
                "source_id" character varying(255),
                "tags" text array NOT NULL DEFAULT '{}',
                "is_active" boolean NOT NULL DEFAULT true,
                "search_vector" tsvector,
                CONSTRAINT "PK_99443c840638a5ab1359e8a6145" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_2eb4742d23bc5ca972a8c2c71c" ON "pois" ("city_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_efa2d5c9e06f797ff4dc30cd0a" ON "pois" USING GiST ("location")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5f64e1e22d6bd990486ad1a2ae" ON "pois" ("category")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_f104ad75c6819e8a827af2799d" ON "pois" ("source")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_pois_source_source_id" ON "pois" ("source", "source_id")
            WHERE "source_id" IS NOT NULL
        `);
    await queryRunner.query(`
            CREATE TABLE "cities" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "name_ko" character varying(100) NOT NULL,
                "name_en" character varying(100) NOT NULL,
                "name_local" character varying(100) NOT NULL,
                "country_code" character(2) NOT NULL,
                "location" geography(Point, 4326) NOT NULL,
                "timezone" character varying(50) NOT NULL,
                "iata_codes" text array NOT NULL,
                "currency_code" character(3) NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_4762ffb6e5d198cfec5606bc11e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_36b7590678c98e71c292f33839" ON "cities" ("country_code")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_b0c5868a3c4663b0e72a6030a6" ON "cities" USING GiST ("location")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."budget_allocations_category_enum" AS ENUM(
                'flight',
                'accommodation',
                'food',
                'activity',
                'transport',
                'shopping',
                'other'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "budget_allocations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "trip_id" uuid NOT NULL,
                "category" "public"."budget_allocations_category_enum" NOT NULL,
                "amount" numeric(12, 2) NOT NULL,
                "currency" character(3) NOT NULL,
                "exchange_rate" numeric(10, 4),
                "is_estimated" boolean NOT NULL DEFAULT true,
                CONSTRAINT "UQ_2cc85b85263787fc54d8b23e60e" UNIQUE ("trip_id", "category"),
                CONSTRAINT "PK_933f4bf5c342928196cc20be363" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."trips_status_enum" AS ENUM(
                'planning',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "trips" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "city_id" uuid NOT NULL,
                "title" character varying(255) NOT NULL,
                "status" "public"."trips_status_enum" NOT NULL DEFAULT 'planning',
                "total_budget_krw" integer NOT NULL,
                "travel_month" smallint NOT NULL,
                "travel_year" smallint NOT NULL,
                "duration_days" smallint NOT NULL,
                "start_date" date,
                "end_date" date,
                "share_token" character varying(21),
                CONSTRAINT "UQ_1bbfd6850805f4167af45942101" UNIQUE ("share_token"),
                CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c32589af53db811884889e0366" ON "trips" ("user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_34a315dda51042108ff9fa2ee4" ON "trips" ("city_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_1e9de13bac402d95dad6f116e0" ON "trips" ("status")
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "email" character varying(255) NOT NULL,
                "password_hash" character varying(255),
                "nickname" character varying(100) NOT NULL,
                "deleted_at" TIMESTAMP,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_pois_search_vector" ON "pois" USING GIN ("search_vector")
        `);
    await queryRunner.query(`
            ALTER TABLE "trip_days"
            ADD CONSTRAINT "FK_45782e783a4f545fbf2a2fa181c" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "trip_day_pois"
            ADD CONSTRAINT "FK_932eb5caa147e1bf3f5767b1105" FOREIGN KEY ("trip_day_id") REFERENCES "trip_days"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "trip_day_pois"
            ADD CONSTRAINT "FK_ce15dd92e8ac39e231614e43314" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "pois"
            ADD CONSTRAINT "FK_2eb4742d23bc5ca972a8c2c71ca" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "budget_allocations"
            ADD CONSTRAINT "FK_0559112b0c50e0afc55eb5ea9fc" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "trips"
            ADD CONSTRAINT "FK_c32589af53db811884889e03663" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "trips"
            ADD CONSTRAINT "FK_34a315dda51042108ff9fa2ee45" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "trips" DROP CONSTRAINT "FK_34a315dda51042108ff9fa2ee45"
        `);
    await queryRunner.query(`
            ALTER TABLE "trips" DROP CONSTRAINT "FK_c32589af53db811884889e03663"
        `);
    await queryRunner.query(`
            ALTER TABLE "budget_allocations" DROP CONSTRAINT "FK_0559112b0c50e0afc55eb5ea9fc"
        `);
    await queryRunner.query(`
            ALTER TABLE "pois" DROP CONSTRAINT "FK_2eb4742d23bc5ca972a8c2c71ca"
        `);
    await queryRunner.query(`
            ALTER TABLE "trip_day_pois" DROP CONSTRAINT "FK_ce15dd92e8ac39e231614e43314"
        `);
    await queryRunner.query(`
            ALTER TABLE "trip_day_pois" DROP CONSTRAINT "FK_932eb5caa147e1bf3f5767b1105"
        `);
    await queryRunner.query(`
            ALTER TABLE "trip_days" DROP CONSTRAINT "FK_45782e783a4f545fbf2a2fa181c"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_1e9de13bac402d95dad6f116e0"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_34a315dda51042108ff9fa2ee4"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c32589af53db811884889e0366"
        `);
    await queryRunner.query(`
            DROP TABLE "trips"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."trips_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "budget_allocations"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."budget_allocations_category_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b0c5868a3c4663b0e72a6030a6"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_36b7590678c98e71c292f33839"
        `);
    await queryRunner.query(`
            DROP TABLE "cities"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_pois_search_vector"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."UQ_pois_source_source_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_f104ad75c6819e8a827af2799d"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5f64e1e22d6bd990486ad1a2ae"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_efa2d5c9e06f797ff4dc30cd0a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_2eb4742d23bc5ca972a8c2c71c"
        `);
    await queryRunner.query(`
            DROP TABLE "pois"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."pois_source_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."pois_category_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "trip_day_pois"
        `);
    await queryRunner.query(`
            DROP TABLE "trip_days"
        `);
  }
}
