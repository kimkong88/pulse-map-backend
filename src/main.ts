import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { Logger, ValidationPipe } from '@nestjs/common';
// TODO: DO NOT REMOVE, this will be implemented later
// import { RedisIoAdapter } from './websocket/redisIo.adapter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Main');

  // Global error handlers to prevent server crashes
  process.on('uncaughtException', (error) => {
    logger.error('🚨 Uncaught Exception:', error);
    // Don't exit - let the app continue running
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - let the app continue running
  });

  try {
    logger.log('🚀 Starting application...');

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // const redisAdapter = new RedisIoAdapter(app);

    // Wait for Redis to be fully initialized
    // logger.log('[2/5] Waiting for Redis adapter initialization...');
    // await redisAdapter.waitForInitialization();
    // logger.log('[4/5] Redis adapter ready, setting WebSocket adapter...');

    // app.useWebSocketAdapter(redisAdapter);

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());

    // Security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false, // For Swagger UI
      }),
    );

    app.use(compression());

    // app.use(
    //   rateLimit({
    //     windowMs: 15 * 60 * 1000,
    //     max: 500,
    //     message: 'Too many requests from this IP, please try again later.',
    //     standardHeaders: true,
    //     legacyHeaders: false,
    //   }),
    // );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }

    app.use(cookieParser());

    const allowedOrigins = [
      'https://pulse-map-frontend.vercel.app',
      'https://www.pulse-map-frontend.vercel.app',
      'https://pulsemap.app',
      'https://www.pulsemap.app',
    ];

    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000');
    }

    logger.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);

    // Use NestJS built-in CORS instead of middleware
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    app.enableShutdownHooks();

    // Graceful shutdown for hot-reload/dev and process signals
    const shutdown = async (signal: string) => {
      try {
        logger.warn(`Received ${signal}. Shutting down gracefully...`);
        // Close websocket/redis adapter first
        // if (typeof (redisAdapter as any).close === 'function') {
        //   await (redisAdapter as any).close();
        // }
        await app.close();
        // Small delay to ensure ports are released on macOS
        await new Promise((r) => setTimeout(r, 100));
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    const port = process.env.PORT;

    if (!port) {
      throw new Error('🚨 PORT is not defined');
    }
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(
      `📚 Swagger documentation: http://localhost:${port}/documentation`,
    );
    logger.log(`🔧 Environment: ${process.env.NODE_ENV}`);
  } catch (error) {
    logger.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

bootstrap();
