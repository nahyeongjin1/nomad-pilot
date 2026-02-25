import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { City } from '../src/cities/entities/city.entity';
import { Poi } from '../src/pois/entities/poi.entity';
import { Trip } from '../src/trips/entities/trip.entity';
import { BudgetAllocation } from '../src/trips/entities/budget-allocation.entity';
import { TripDay } from '../src/trips/entities/trip-day.entity';
import { TripDayPoi } from '../src/trips/entities/trip-day-poi.entity';
import { PoiCategory, PoiSource } from '../src/common/enums';
import { TripStatus, BudgetCategory } from '../src/common/enums';

describe('Entity Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let cityRepo: Repository<City>;
  let poiRepo: Repository<Poi>;
  let tripRepo: Repository<Trip>;
  let budgetRepo: Repository<BudgetAllocation>;
  let tripDayRepo: Repository<TripDay>;
  let tripDayPoiRepo: Repository<TripDayPoi>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    userRepo = dataSource.getRepository(User);
    cityRepo = dataSource.getRepository(City);
    poiRepo = dataSource.getRepository(Poi);
    tripRepo = dataSource.getRepository(Trip);
    budgetRepo = dataSource.getRepository(BudgetAllocation);
    tripDayRepo = dataSource.getRepository(TripDay);
    tripDayPoiRepo = dataSource.getRepository(TripDayPoi);
  });

  afterAll(async () => {
    await app.close();
  });

  const cleanupTestData = async () => {
    await dataSource.query(
      'TRUNCATE "trip_day_pois", "trip_days", "budget_allocations", "trips", "pois" CASCADE',
    );
    await dataSource.query(
      `DELETE FROM "users" WHERE "email" LIKE '%@test.com'`,
    );
  };

  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  describe('User', () => {
    it('should create and retrieve a user', async () => {
      const user = userRepo.create({
        email: 'test@test.com',
        nickname: 'tester',
      });
      const saved = await userRepo.save(user);

      expect(saved.id).toBeDefined();
      expect(saved.email).toBe('test@test.com');
      expect(saved.passwordHash).toBeNull();
      expect(saved.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email', async () => {
      await userRepo.save(
        userRepo.create({ email: 'dup@test.com', nickname: 'a' }),
      );

      await expect(
        userRepo.save(
          userRepo.create({ email: 'dup@test.com', nickname: 'b' }),
        ),
      ).rejects.toThrow();
    });

    it('should soft delete a user', async () => {
      const user = await userRepo.save(
        userRepo.create({ email: 'del@test.com', nickname: 'del' }),
      );
      await userRepo.softDelete(user.id);

      const found = await userRepo.findOne({ where: { id: user.id } });
      expect(found).toBeNull();

      const withDeleted = await userRepo.findOne({
        where: { id: user.id },
        withDeleted: true,
      });
      expect(withDeleted).not.toBeNull();
      expect(withDeleted!.deletedAt).not.toBeNull();
    });
  });

  describe('City (seed data)', () => {
    it('should have 6 Japanese cities seeded', async () => {
      const cities = await cityRepo.find({
        where: { countryCode: 'JP' },
      });
      expect(cities).toHaveLength(6);
    });

    it('should query cities by spatial proximity', async () => {
      // Find cities within 500km of Osaka (34.6937, 135.5023)
      const nearbyCities = await cityRepo
        .createQueryBuilder('city')
        .where(
          'ST_DWithin(city.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :distance)',
        )
        .setParameters({ lon: 135.5023, lat: 34.6937, distance: 500000 })
        .getMany();

      const names = nearbyCities.map((c) => c.nameEn);
      expect(names).toContain('Osaka');
      expect(names).toContain('Kyoto'); // ~43km away
      expect(names).not.toContain('Sapporo'); // ~1100km away
    });
  });

  describe('Poi', () => {
    it('should create a POI with geography point', async () => {
      const tokyo = await cityRepo.findOneByOrFail({ nameEn: 'Tokyo' });
      const poi = poiRepo.create({
        cityId: tokyo.id,
        name: 'Senso-ji Temple',
        nameLocal: '浅草寺',
        locale: 'ja',
        location: {
          type: 'Point',
          coordinates: [139.7966, 35.7148],
        },
        category: PoiCategory.TEMPLE_SHRINE,
        source: PoiSource.OSM,
        sourceId: 'osm-12345',
      });
      const saved = await poiRepo.save(poi);
      expect(saved.id).toBeDefined();
      expect(saved.category).toBe(PoiCategory.TEMPLE_SHRINE);
    });

    it('should enforce partial unique on (source, sourceId)', async () => {
      const tokyo = await cityRepo.findOneByOrFail({ nameEn: 'Tokyo' });
      const base = {
        cityId: tokyo.id,
        name: 'Test',
        location: { type: 'Point' as const, coordinates: [139.7, 35.7] },
        category: PoiCategory.RESTAURANT,
        source: PoiSource.OSM,
        sourceId: 'dup-123',
      };

      await poiRepo.save(poiRepo.create(base));
      await expect(
        poiRepo.save(poiRepo.create({ ...base, name: 'Test2' })),
      ).rejects.toThrow();
    });

    it('should allow duplicate null sourceId', async () => {
      const tokyo = await cityRepo.findOneByOrFail({ nameEn: 'Tokyo' });
      const base = {
        cityId: tokyo.id,
        name: 'Manual POI',
        location: { type: 'Point' as const, coordinates: [139.7, 35.7] },
        category: PoiCategory.RESTAURANT,
        source: PoiSource.MANUAL,
        sourceId: null,
      };

      const a = await poiRepo.save(poiRepo.create(base));
      const b = await poiRepo.save(
        poiRepo.create({ ...base, name: 'Manual POI 2' }),
      );
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('Trip + cascade', () => {
    it('should create a trip with budget allocations and days', async () => {
      const user = await userRepo.save(
        userRepo.create({ email: 'trip@test.com', nickname: 'traveler' }),
      );
      const tokyo = await cityRepo.findOneByOrFail({ nameEn: 'Tokyo' });

      const trip = await tripRepo.save(
        tripRepo.create({
          userId: user.id,
          cityId: tokyo.id,
          title: 'Tokyo Trip',
          totalBudgetKrw: 500000,
          travelMonth: 3,
          travelYear: 2026,
          durationDays: 3,
        }),
      );
      expect(trip.status).toBe(TripStatus.PLANNING);

      const budget = await budgetRepo.save(
        budgetRepo.create({
          tripId: trip.id,
          category: BudgetCategory.FLIGHT,
          amount: '200000',
          currency: 'KRW',
        }),
      );
      expect(budget.isEstimated).toBe(true);

      await tripDayRepo.save(
        tripDayRepo.create({
          tripId: trip.id,
          dayNumber: 1,
        }),
      );

      // Hard delete trip should CASCADE to budget + days
      await tripRepo.delete(trip.id);

      const budgets = await budgetRepo.find({ where: { tripId: trip.id } });
      expect(budgets).toHaveLength(0);

      const days = await tripDayRepo.find({ where: { tripId: trip.id } });
      expect(days).toHaveLength(0);
    });

    it('should enforce unique (tripId, category) on budget', async () => {
      const user = await userRepo.save(
        userRepo.create({ email: 'bud@test.com', nickname: 'b' }),
      );
      const tokyo = await cityRepo.findOneByOrFail({ nameEn: 'Tokyo' });
      const trip = await tripRepo.save(
        tripRepo.create({
          userId: user.id,
          cityId: tokyo.id,
          title: 'T',
          totalBudgetKrw: 100000,
          travelMonth: 1,
          travelYear: 2026,
          durationDays: 1,
        }),
      );

      await budgetRepo.save(
        budgetRepo.create({
          tripId: trip.id,
          category: BudgetCategory.FOOD,
          amount: '50000',
          currency: 'JPY',
        }),
      );

      await expect(
        budgetRepo.save(
          budgetRepo.create({
            tripId: trip.id,
            category: BudgetCategory.FOOD,
            amount: '30000',
            currency: 'JPY',
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('TripDayPoi + RESTRICT', () => {
    it('should prevent deleting a POI linked to a trip', async () => {
      const user = await userRepo.save(
        userRepo.create({ email: 'restrict@test.com', nickname: 'r' }),
      );
      const tokyo = await cityRepo.findOneByOrFail({ nameEn: 'Tokyo' });

      const poi = await poiRepo.save(
        poiRepo.create({
          cityId: tokyo.id,
          name: 'Linked POI',
          location: { type: 'Point', coordinates: [139.7, 35.7] },
          category: PoiCategory.ATTRACTION,
          source: PoiSource.MANUAL,
        }),
      );

      const trip = await tripRepo.save(
        tripRepo.create({
          userId: user.id,
          cityId: tokyo.id,
          title: 'T',
          totalBudgetKrw: 100000,
          travelMonth: 1,
          travelYear: 2026,
          durationDays: 1,
        }),
      );

      const day = await tripDayRepo.save(
        tripDayRepo.create({ tripId: trip.id, dayNumber: 1 }),
      );

      await tripDayPoiRepo.save(
        tripDayPoiRepo.create({
          tripDayId: day.id,
          poiId: poi.id,
          visitOrder: 1,
        }),
      );

      // Should fail: POI is referenced by trip_day_pois (RESTRICT)
      await expect(poiRepo.delete(poi.id)).rejects.toThrow();
    });
  });
});
