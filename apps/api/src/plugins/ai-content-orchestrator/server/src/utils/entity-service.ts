export type EntityServiceId = string | number;
export type EntityServiceParams = Record<string, unknown>;

export type TypedEntityService = {
  findMany: <T = unknown>(uid: string, params?: EntityServiceParams) => Promise<T[]>;
  findOne: <T = unknown>(
    uid: string,
    id: EntityServiceId,
    params?: EntityServiceParams
  ) => Promise<T | null>;
  create: <T = unknown>(uid: string, params: EntityServiceParams) => Promise<T>;
  update: <T = unknown>(
    uid: string,
    id: EntityServiceId,
    params: EntityServiceParams
  ) => Promise<T>;
  delete: <T = unknown>(
    uid: string,
    id: EntityServiceId,
    params?: EntityServiceParams
  ) => Promise<T>;
  count: (uid: string, params?: EntityServiceParams) => Promise<number>;
};

export const getEntityService = (strapi: Strapi): TypedEntityService =>
  strapi.entityService as unknown as TypedEntityService;
import type { Strapi } from '../types';
