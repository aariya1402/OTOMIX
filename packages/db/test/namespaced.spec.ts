import { describe, it, expect } from 'vitest';
import {
  createNamespacedRedis,
  createNamespacedStorage,
  createNamespacedPublisher,
  NamespaceViolationError,
  OTOMIX_REDIS_PREFIX,
  OTOMIX_STORAGE_PREFIX,
  OTOMIX_TOPIC_PREFIX,
  RedisLike,
  StorageClient,
  PublisherClient,
} from '../src/namespaced-clients';

function makeRedis(): { client: RedisLike; calls: string[] } {
  const calls: string[] = [];
  const client: RedisLike = {
    async get(k) { calls.push('get:' + k); return null; },
    async set(k, _v, _m, _ttl) { calls.push('set:' + k); return 'OK'; },
    async del(k) { calls.push('del:' + k); return 1; },
    async exists(k) { calls.push('exists:' + k); return 0; },
    async ttl(k) { calls.push('ttl:' + k); return -2; },
    async quit() { calls.push('quit'); },
  };
  return { client, calls };
}

function makeStorage(): { client: StorageClient; calls: string[] } {
  const calls: string[] = [];
  const client: StorageClient = {
    async putObject(k, _d) { calls.push('put:' + k); },
    async getObject(k) { calls.push('get:' + k); return null; },
    async deleteObject(k) { calls.push('del:' + k); },
  };
  return { client, calls };
}

function makePublisher(): { client: PublisherClient; calls: string[] } {
  const calls: string[] = [];
  const client: PublisherClient = {
    async publish(t, _m) { calls.push('pub:' + t); },
  };
  return { client, calls };
}

describe('namespaced clients (P06-T04-S02-M04)', () => {
  it('(a) Redis: rejects empty, otodj:, and passes through otomix:; auto-prefixes bare keys', async () => {
    const { client, calls } = makeRedis();
    const ns = createNamespacedRedis(client);

    await expect(ns.get('')).rejects.toBeInstanceOf(NamespaceViolationError);
    await expect(ns.get('otodj:x')).rejects.toBeInstanceOf(NamespaceViolationError);
    await expect(ns.set('x', 'v')).resolves.toBe('OK');
    await expect(ns.set('otomix:x', 'v')).resolves.toBe('OK');
    await expect(ns.set('k', 'v', 60)).resolves.toBe('OK');
    await ns.del('k2'); await ns.exists('k3'); await ns.ttl('k4');

    expect(calls).toEqual([
      'set:' + OTOMIX_REDIS_PREFIX + 'x',
      'set:otomix:x',
      'set:' + OTOMIX_REDIS_PREFIX + 'k',
      'del:' + OTOMIX_REDIS_PREFIX + 'k2',
      'exists:' + OTOMIX_REDIS_PREFIX + 'k3',
      'ttl:' + OTOMIX_REDIS_PREFIX + 'k4',
    ]);
  });

  it('(b) Storage: rejects empty/otodj/; auto-prefixes bare keys', async () => {
    const { client, calls } = makeStorage();
    const ns = createNamespacedStorage(client);

    await expect(ns.put('', Buffer.from('x'))).rejects.toBeInstanceOf(NamespaceViolationError);
    await expect(ns.put('otodj/f', Buffer.from('x'))).rejects.toBeInstanceOf(NamespaceViolationError);
    await ns.put('user/f.mp3', Buffer.from('x'));
    await ns.put('otomix/user/g.mp3', Buffer.from('x'));
    await ns.get('h.mp3');
    await ns.delete('i.mp3');

    expect(calls).toEqual([
      'put:' + OTOMIX_STORAGE_PREFIX + 'user/f.mp3',
      'put:otomix/user/g.mp3',
      'get:' + OTOMIX_STORAGE_PREFIX + 'h.mp3',
      'del:' + OTOMIX_STORAGE_PREFIX + 'i.mp3',
    ]);
  });

  it('(c) Publisher: rejects empty/otodj.; auto-prefixes bare topics', async () => {
    const { client, calls } = makePublisher();
    const ns = createNamespacedPublisher(client);

    await expect(ns.publish('', {})).rejects.toBeInstanceOf(NamespaceViolationError);
    await expect(ns.publish('otodj.ingest', {})).rejects.toBeInstanceOf(NamespaceViolationError);
    await ns.publish('ingest', { a: 1 });
    await ns.publish('otomix.ingest', { a: 2 });

    expect(calls).toEqual([
      'pub:' + OTOMIX_TOPIC_PREFIX + 'ingest',
      'pub:otomix.ingest',
    ]);
  });

  it('(d) cross-namespace guard: a wrapper never calls the underlying with an unprefixed or foreign key', async () => {
    const { client, calls } = makeRedis();
    const ns = createNamespacedRedis(client);

    try { await ns.get('otodj:x'); } catch { /* expected */ }
    try { await ns.get(''); } catch { /* expected */ }
    await ns.get('safe');

    expect(calls.every((c) => c === 'get:otomix:safe')).toBe(true);
  });
});