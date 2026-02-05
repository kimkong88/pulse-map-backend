import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: RedisClientType;

  async onModuleInit() {
    await this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.logger.log('Initializing Redis client...');

      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || undefined,
      });

      await this.redisClient.connect();
      this.logger.log('Redis client connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  getClient(): RedisClientType {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return this.redisClient;
  }

  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  async get(key: string): Promise<string | null> {
    const result = await this.redisClient.get(key);
    return result as string | null;
  }

  async set(key: string, value: string): Promise<string> {
    const result = await this.redisClient.set(key, value);
    return result as string;
  }

  async setex(key: string, ttl: number, value: string): Promise<string> {
    const result = await this.redisClient.setEx(key, ttl, value);
    return result as string;
  }

  async incr(key: string): Promise<number> {
    return await this.redisClient.incr(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    return await this.redisClient.expire(key, ttl);
  }

  async del(keys: string | string[]): Promise<number> {
    return await this.redisClient.del(keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis client disconnected');
    }
  }
}
