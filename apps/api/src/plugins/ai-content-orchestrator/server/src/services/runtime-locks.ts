import { randomUUID } from 'crypto';
import { hostname } from 'os';

import { RUNTIME_LOCK_UID } from '../constants';
import type { RuntimeLockRecord, Strapi } from '../types';
import { getEntityService } from '../utils/entity-service';
import { toSafeErrorMessage } from '../utils/json';

type AcquireLockInput = {
  key: string;
  ttlMs?: number;
  metadata?: Record<string, unknown>;
  now?: Date;
};

type LockResult =
  | { acquired: true; lock: RuntimeLockRecord }
  | { acquired: false; reason: 'disabled' | 'held'; lock?: RuntimeLockRecord };

const DEFAULT_LOCK_TTL_MS = 55_000;
const MAX_LOCK_TTL_MS = 6 * 60 * 60_000;
const OWNER_ID = `${hostname()}:${process.pid}:${randomUUID()}`;

const isExpired = (lock: RuntimeLockRecord, now: Date): boolean => {
  const expiresAt = new Date(lock.expires_at);
  return !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime();
};

const runtimeLocks = ({ strapi }: { strapi: Strapi }) => {
  const entityService = getEntityService(strapi);

  return {
    async acquire(input: AcquireLockInput): Promise<LockResult> {
      if (process.env.AICO_RUNTIME_LOCKS_DISABLED === 'true') {
        return { acquired: false, reason: 'disabled' };
      }

      const now = input.now ?? new Date();
      const ttlMs = Math.max(5_000, Math.min(MAX_LOCK_TTL_MS, Number(input.ttlMs ?? DEFAULT_LOCK_TTL_MS)));
      const expiresAt = new Date(now.getTime() + ttlMs);
      const existing = (
        await entityService.findMany<RuntimeLockRecord>(RUNTIME_LOCK_UID, {
          filters: { lock_key: input.key },
          limit: 1,
        })
      )[0];

      if (!existing) {
        try {
          const lock = await entityService.create<RuntimeLockRecord>(RUNTIME_LOCK_UID, {
            data: {
              lock_key: input.key,
              owner_id: OWNER_ID,
              status: 'active',
              acquired_at: now,
              expires_at: expiresAt,
              released_at: null,
              metadata: input.metadata ?? {},
            },
          });
          return { acquired: true, lock };
        } catch (error) {
          strapi.log.warn(
            `[aico] runtime lock create race for ${input.key}: ${toSafeErrorMessage(error)}`
          );
          return { acquired: false, reason: 'held' };
        }
      }

      if (existing.status === 'released' || isExpired(existing, now)) {
        const lock = await entityService.update<RuntimeLockRecord>(RUNTIME_LOCK_UID, existing.id, {
          data: {
            owner_id: OWNER_ID,
            status: 'active',
            acquired_at: now,
            expires_at: expiresAt,
            released_at: null,
            metadata: input.metadata ?? {},
          },
        });
        return { acquired: true, lock };
      }

      return { acquired: false, reason: 'held', lock: existing };
    },

    async release(lock: RuntimeLockRecord, releasedAt = new Date()): Promise<void> {
      if (lock.owner_id !== OWNER_ID) {
        return;
      }

      const current = (
        await entityService.findMany<RuntimeLockRecord>(RUNTIME_LOCK_UID, {
          filters: { lock_key: lock.lock_key, owner_id: OWNER_ID, status: 'active' },
          limit: 1,
        })
      )[0];

      if (!current || current.id !== lock.id) {
        return;
      }

      await entityService.update<RuntimeLockRecord>(RUNTIME_LOCK_UID, lock.id, {
        data: {
          status: 'released',
          released_at: releasedAt,
        },
      });
    },

    async withLock<T>(
      key: string,
      input: Omit<AcquireLockInput, 'key'>,
      runner: () => Promise<T>
    ): Promise<T | undefined> {
      const result = await this.acquire({ ...input, key });

      if (result.acquired === false) {
        strapi.log.info(`[aico] runtime lock skipped ${key}: ${result.reason}`);
        if (result.reason === 'disabled') {
          return runner();
        }

        return undefined;
      }

      try {
        return await runner();
      } finally {
        await this.release(result.lock);
      }
    },
  };
};

export default runtimeLocks;
