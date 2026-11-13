export const OTOMIX_REDIS_PREFIX = 'otomix:';
export const OTOMIX_STORAGE_PREFIX = 'otomix/';
export const OTOMIX_TOPIC_PREFIX = 'otomix.';

export class NamespaceViolationError extends Error {
  readonly code = 'INVALID_ARGUMENT' as const;
  constructor(message: string) { super(message); this.name = 'NamespaceViolationError'; }
}

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttlSeconds?: number, nx?: boolean): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  quit(): Promise<void>;
}

export interface StorageClient {
  putObject(key: string, data: Uint8Array | Buffer): Promise<void>;
  getObject(key: string): Promise<Uint8Array | null>;
  deleteObject(key: string): Promise<void>;
}

export interface PublisherClient {
  publish(topic: string, message: unknown): Promise<void>;
}

export interface NamespacedRedis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  quit(): Promise<void>;
}

export interface NamespacedStorage {
  put(key: string, data: Uint8Array | Buffer): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface NamespacedPublisher {
  publish(topic: string, message: unknown): Promise<void>;
}

function fullRedisKey(key: string): string {
  if (typeof key !== 'string' || key.length === 0) {
    throw new NamespaceViolationError('redis key must be a non-empty string');
  }
  if (key.startsWith(OTOMIX_REDIS_PREFIX)) return key;
  if (key.startsWith('otodj:')) {
    throw new NamespaceViolationError("redis key cannot start with 'otodj:' in OTOMIX wrapper");
  }
  if (key.startsWith('otomix')) {
    throw new NamespaceViolationError("redis key '" + key + "' is not a valid otomix key (expected prefix '" + OTOMIX_REDIS_PREFIX + "')");
  }
  return OTOMIX_REDIS_PREFIX + key;
}

function fullStorageKey(key: string): string {
  if (typeof key !== 'string' || key.length === 0) {
    throw new NamespaceViolationError('storage key must be a non-empty string');
  }
  if (key.startsWith(OTOMIX_STORAGE_PREFIX)) return key;
  if (key.startsWith('otodj/')) {
    throw new NamespaceViolationError("storage key cannot start with 'otodj/'");
  }
  if (key.startsWith('otomix')) {
    throw new NamespaceViolationError("storage key '" + key + "' is not a valid otomix key (expected prefix '" + OTOMIX_STORAGE_PREFIX + "')");
  }
  return OTOMIX_STORAGE_PREFIX + key;
}

function fullTopic(topic: string): string {
  if (typeof topic !== 'string' || topic.length === 0) {
    throw new NamespaceViolationError('topic must be a non-empty string');
  }
  if (topic.startsWith(OTOMIX_TOPIC_PREFIX)) return topic;
  if (topic.startsWith('otodj.')) {
    throw new NamespaceViolationError("topic cannot start with 'otodj.'");
  }
  if (topic.startsWith('otomix')) {
    throw new NamespaceViolationError("topic '" + topic + "' is not a valid otomix topic (expected prefix '" + OTOMIX_TOPIC_PREFIX + "')");
  }
  return OTOMIX_TOPIC_PREFIX + topic;
}

export function createNamespacedRedis(redis: RedisLike): NamespacedRedis {
  return {
    async get(key) { return redis.get(fullRedisKey(key)); },
    async set(key, value, ttlSeconds) {
      const full = fullRedisKey(key);
      if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
        return redis.set(full, value, 'EX', ttlSeconds);
      }
      return redis.set(full, value);
    },
    async del(key) { return redis.del(fullRedisKey(key)); },
    async exists(key) { return redis.exists(fullRedisKey(key)); },
    async ttl(key) { return redis.ttl(fullRedisKey(key)); },
    async quit() { return redis.quit(); },
  };
}

export function createNamespacedStorage(storage: StorageClient): NamespacedStorage {
  return {
    async put(key, data) { return storage.putObject(fullStorageKey(key), data); },
    async get(key) { return storage.getObject(fullStorageKey(key)); },
    async delete(key) { return storage.deleteObject(fullStorageKey(key)); },
  };
}

export function createNamespacedPublisher(publisher: PublisherClient): NamespacedPublisher {
  return {
    async publish(topic, message) { return publisher.publish(fullTopic(topic), message); },
  };
}