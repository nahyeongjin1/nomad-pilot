import { DataSource, DataSourceOptions } from 'typeorm';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'nomad_pilot',
      }),
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
