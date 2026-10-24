// Must run before anything opens a DB connection.
import './common/db-timezone';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { EcsLogger } from './common/logging/ecs-logger';
import { HttpErrorLogFilter } from './common/logging/http-error-log.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // All logs are ECS JSON lines (see common/logging/ecs-logger.ts).
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new EcsLogger());
  // Every failed request is logged once with its exact reason.
  app.useGlobalFilters(
    new HttpErrorLogFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  app.setGlobalPrefix('api');

  // Enable CORS for the dashboard + storefront. Any localhost port is allowed
  // in dev (Next picks 3000/3001/3002…); production domains come from the
  // ALLOWED_ORIGINS env var (comma-separated), e.g.
  //   ALLOWED_ORIGINS=https://glitter-store.vercel.app,https://glitter-dashboard.vercel.app
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      ...allowedOrigins,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Glitter Shop API')
    .setDescription('E-commerce backend API for Glitter Shop')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);

  new Logger('Bootstrap').log({
    message: `API listening on port ${PORT}`,
    event: { action: 'app.start', outcome: 'success' },
    url: { port: Number(PORT), path: '/api' },
  });
}

void bootstrap();
