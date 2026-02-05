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
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Suppress DEBUG logs from BaZi calculator library
const originalConsoleLog = console.log;
const originalConsoleDebug = console.debug;
const originalConsoleWarn = console.warn;
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

const shouldSuppress = (message: string): boolean => {
  return (
    message.includes('DEBUG') ||
    message.includes('checkStemClashTimed') ||
    message.includes('SelfPunishment')
  );
};

console.log = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalConsoleLog(...args);
  }
};

console.debug = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalConsoleDebug(...args);
  }
};

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldSuppress(message)) {
    originalConsoleWarn(...args);
  }
};

// Override stdout/stderr to catch library logs that bypass console methods
// Also ensure output is safe for PowerShell (prevent command interpretation)
process.stdout.write = function (chunk: any, encoding?: any, cb?: any): boolean {
  const message = typeof chunk === 'string' ? chunk : chunk?.toString() || '';
  if (shouldSuppress(message)) {
    return true; // Suppress by returning success without writing
  }
  // Ensure output is written safely (NestJS logs are already safe, but be explicit)
  return originalStdoutWrite(chunk, encoding, cb);
};

process.stderr.write = function (chunk: any, encoding?: any, cb?: any): boolean {
  const message = typeof chunk === 'string' ? chunk : chunk?.toString() || '';
  if (shouldSuppress(message)) {
    return true; // Suppress by returning success without writing
  }
  // Ensure output is written safely
  return originalStderrWrite(chunk, encoding, cb);
};

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

    // Global exception filter (catches ALL exceptions including guard failures)
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());

    // CORS must be enabled FIRST, before any other middleware
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

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      preflightContinue: false,
    });

    // Trust proxy (Railway, Vercel, etc.) - must be set early
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }

    // const redisAdapter = new RedisIoAdapter(app);

    // Wait for Redis to be fully initialized
    // logger.log('[2/5] Waiting for Redis adapter initialization...');
    // await redisAdapter.waitForInitialization();
    // logger.log('[4/5] Redis adapter ready, setting WebSocket adapter...');

    // app.useWebSocketAdapter(redisAdapter);

    // Global logging interceptor

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
        crossOriginResourcePolicy: false, // CRITICAL: Allow CORS
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

    app.use(cookieParser());

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

    const port = process.env.PORT || 3002;

    logger.log(`🔌 PORT from Railway: ${process.env.PORT}`);
    logger.log(`🔌 Attempting to bind to port: ${port}`);

    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(
      `📚 Swagger documentation: http://localhost:${port}/documentation`,
    );
    logger.log(`🔧 Environment: ${process.env.NODE_ENV}`);

    // TEST MODE: Generate a sample question answer for auditing
    if (process.env.TEST_QUESTION === 'true') {
      logger.log('\n🧪 TEST MODE: Generating sample question answer...\n');
      // await testQuestionGeneration(app);
      await testTodayForecast(app);
    }
  } catch (error) {
    logger.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

async function testTodayForecast(app: any) {
  const fs = await import('fs');
  const path = await import('path');
  const { ForecastService } = await import('./forecast/forecast.service');
  const forecastService = app.get(ForecastService);

  const testInput = {
    userId: 'e39eee9a-2607-40dd-8239-a834681d7ad1',
  };

  const result = await forecastService.getTodayForecast(testInput.userId);

  const outputPath = path.join(
    process.cwd(),
    `today-forecast-output.json`,
  );
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
}


/**
 * Test question generation and save output to file
 */
async function testQuestionGeneration(app: any) {
  console.log('🧪 TEST MODE: Generating sample question answer...');
  const fs = await import('fs');
  const path = await import('path');
  const { QuestionsService } = await import('./questions/questions.service');
  const { toDate } = await import('date-fns-tz');

  const questionsService = app.get(QuestionsService);

  // Use Korean timezone - 1988-06-11 19:00:00 in Seoul time
  // Convert from local time string to timezone-aware Date
  const birthDateString = '1988-06-11T19:00:00';
  const birthDate = toDate(birthDateString, { timeZone: 'Asia/Seoul' });

  const testInput = {
    userId: 'test-user-123',
    questionId: process.env.TEST_QUESTION_ID || 'wealth',
    birthDate,
    gender: 'male' as const,
    birthTimezone: 'Asia/Seoul',
    isTimeKnown: true,
  };

  try {
    console.log(`📝 Testing question: ${testInput.questionId}`);
    console.log('⏳ Generating answer (may take 10-30 seconds)...\n');

    const result = await questionsService.answerQuestion(testInput);

    // Save to file
    const outputPath = path.join(
      process.cwd(),
      `question-${testInput.questionId}-output.json`,
    );
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`\n✅ Question answer saved to: ${outputPath}`);
    console.log('\n📊 METRICS:');
    console.log(`   Likelihood:      ${result.metrics.likelihood}%`);
    console.log(`   Timing Clarity:  ${result.metrics.timingClarity}%`);
    console.log(`   Challenge Level: ${result.metrics.challengeLevel}%`);
    console.log('\n💬 ANSWER (first 200 chars):');
    console.log(`   ${result.answer.fullText.substring(0, 200)}...`);
    console.log(
      `\n📈 Stats: ${result.metadata.toolCallsCount} tool calls, ${result.metadata.tokensUsed} tokens\n`,
    );
  } catch (error) {
    console.error('❌ Failed to generate question answer:', error.message);
  }
}

bootstrap();
