import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { entities } from './entities/entities';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { KanbanModule } from './kanban/kanban.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';

/**
 * Root Module of NestJS application
 * This is the main module containing all other modules
 */
@Module({
  imports: [
    // ConfigModule: Manage environment variables
    // isGlobal: true - can be used anywhere in the app
    // envFilePath: '.env' - path to .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // TypeOrmModule: Connect to MySQL database
    // Use entities array from entities.ts instead of auto-scan
    // This helps avoid type errors and ensures only necessary entities are loaded
    TypeOrmModule.forRoot({
      ...databaseConfig,
      entities: entities, // Use entities array directly
    }),
    
    AuthModule,
    ProjectsModule,
    TasksModule,
    KanbanModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [AppController], // Root controller
  providers: [AppService], // Root service
})
export class AppModule {}
