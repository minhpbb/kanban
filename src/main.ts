import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Bootstrap function - Entry point of NestJS application
 * Initialize app, configure middleware and start server
 */
async function bootstrap() {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);
  
  // Configure CORS to allow frontend to call API
  // credentials: true allows sending cookies
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Middleware to parse cookies from request
  // Required to read access_token and refresh_token from cookies
  app.use(cookieParser());
  
  // Global validation pipe to validate all incoming requests
  // whitelist: true - only allow properties defined in DTOs
  // forbidNonWhitelisted: true - reject requests with undefined properties
  // transform: true - automatically transform data types (string -> Date, number, etc.)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global interceptor to transform all responses to standard format
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global exception filter to handle all errors in standard format
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Kanban API')
    .setDescription('Kanban project management system API documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('projects', 'Project management endpoints')
    .addTag('tasks', 'Task management endpoints')
    .addTag('kanban', 'Kanban board endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for references
    )
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
      description: 'Access token stored in HTTP-only cookie',
    })
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
      description: 'Refresh token stored in HTTP-only cookie',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Kanban API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Get port from environment config and start server
  const port = envConfig.APP_PORT;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}

// Start the application
bootstrap();
