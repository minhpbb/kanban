import { DataSource } from 'typeorm';
import { AuthSeeder } from './auth.seeder';
import { dataSourceConfig } from '../../config/database.config';

async function runSeeds() {
  const dataSource = new DataSource(dataSourceConfig);
  
  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    // Run auth seeder
    const authSeeder = new AuthSeeder(dataSource);
    await authSeeder.run();

    console.log('All seeds completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
