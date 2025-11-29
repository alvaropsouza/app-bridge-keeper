import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend integration
  // Configure CORS based on environment
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
