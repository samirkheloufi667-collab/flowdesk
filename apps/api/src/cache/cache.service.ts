import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Cache clé-valeur avec expiration.
 *
 * Redis quand REDIS_URL est défini (Docker, production), sinon une Map en
 * mémoire. Les deux exposent la même interface, donc le reste de l'API ne sait
 * pas lequel tourne. Sert à deux choses : mettre en cache le tableau de bord,
 * et compter les tentatives de connexion pour bloquer la force brute.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis?: Redis;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
      this.redis.on('error', (err) => this.logger.warn(`Redis indisponible : ${err.message}`));
    }
    this.logger.log(`Cache : ${this.backend}`);
  }

  get backend(): 'redis' | 'memory' {
    return this.redis ? 'redis' : 'memory';
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = this.redis ? await this.redis.get(key) : this.readMemory(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, raw, 'EX', ttlSeconds);
    } else {
      this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    if (this.redis) {
      await this.redis.del(...keys);
    } else {
      keys.forEach((k) => this.memory.delete(k));
    }
  }

  /**
   * Incrémente un compteur et fixe son expiration au premier incrément :
   * c'est une fenêtre fixe, suffisante pour limiter les tentatives de connexion.
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (this.redis) {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, ttlSeconds);
      return count;
    }
    const current = this.readMemory(key);
    const count = (current ? Number(current) : 0) + 1;
    const existing = this.memory.get(key);
    this.memory.set(key, {
      value: String(count),
      expiresAt: existing && current ? existing.expiresAt : Date.now() + ttlSeconds * 1000,
    });
    return count;
  }

  private readMemory(key: string): string | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }
}
