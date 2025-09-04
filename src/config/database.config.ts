import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { envConfig } from './env.config';
import { entities } from '../entities/entities';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  username: envConfig.DB_USERNAME,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_DATABASE,
  entities: entities, // Use entities array directly
  synchronize: envConfig.NODE_ENV === 'development',
  logging: envConfig.NODE_ENV === 'development',
  charset: 'utf8mb4',
};

// Separate config for DataSource (used in seeder)
export const dataSourceConfig: DataSourceOptions = {
  type: 'mysql',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  username: envConfig.DB_USERNAME,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_DATABASE,
  entities: entities, // Use entities array directly
  synchronize: envConfig.NODE_ENV === 'development',
  logging: envConfig.NODE_ENV === 'development',
  charset: 'utf8mb4',
};
