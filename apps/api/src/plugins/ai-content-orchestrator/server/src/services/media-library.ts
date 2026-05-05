import type { Strapi } from '../types';
import { suggestMediaMapping } from '../utils/media-mapping';

type MediaLibraryListInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  mapped?: 'all' | 'mapped' | 'unmapped';
  purpose?: 'all' | 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
  sign?: 'all' | string;
  active?: 'all' | 'active' | 'inactive';
  sort?: 'createdAtDesc' | 'createdAtAsc' | 'nameAsc' | 'nameDesc';
};

type UploadFileRecord = {
  id: number;
  name?: string;
  url?: string;
  mime?: string;
  width?: number;
  height?: number;
  createdAt?: string;
  formats?: Record<string, unknown>;
};

type MediaAssetSummary = Record<string, unknown> & {
  id?: number;
  purpose?: string;
  sign_slug?: string | null;
  active?: boolean;
  asset?: unknown;
};

const getId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'number'
  ) {
    return (value as { id: number }).id;
  }

  return null;
};

const parseNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const parseOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mediaLibrary = ({ strapi }: { strapi: Strapi }) => {
  const mediaAssetsService = () => strapi.plugin('ai-content-orchestrator').service('media-assets');
  const uploadService = () => strapi.plugin('upload').service('upload');

  const buildUploadFilters = (
    input: MediaLibraryListInput,
    fileIds?: { include?: number[]; exclude?: number[] }
  ) => {
    const clauses: Array<Record<string, unknown>> = [];
    const search = parseOptionalString(input.search);

    if (search) {
      clauses.push({
        $or: [
          { name: { $containsi: search } },
          { alternativeText: { $containsi: search } },
          { caption: { $containsi: search } },
        ],
      });
    }

    if (fileIds?.include) {
      clauses.push({ id: { $in: fileIds.include } });
    }

    if (fileIds?.exclude && fileIds.exclude.length > 0) {
      clauses.push({ id: { $notIn: fileIds.exclude } });
    }

    if (clauses.length === 0) {
      return undefined;
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    return { $and: clauses };
  };

  const fetchUploadFilesPage = async (
    input: MediaLibraryListInput,
    page: number,
    pageSize: number,
    fileIds?: { include?: number[]; exclude?: number[] }
  ): Promise<{
    results: UploadFileRecord[];
    pagination: { page: number; pageSize: number; pageCount: number; total: number };
  }> => {
    const sortMap: Record<
      NonNullable<MediaLibraryListInput['sort']>,
      Array<Record<string, 'asc' | 'desc'>>
    > = {
      createdAtDesc: [{ createdAt: 'desc' }],
      createdAtAsc: [{ createdAt: 'asc' }],
      nameAsc: [{ name: 'asc' }],
      nameDesc: [{ name: 'desc' }],
    };

    const sort = sortMap[input.sort ?? 'createdAtDesc'];
    const filters = buildUploadFilters(input, fileIds);

    return (await uploadService().findPage({
      page,
      pageSize,
      sort,
      filters,
    })) as {
      results: UploadFileRecord[];
      pagination: { page: number; pageSize: number; pageCount: number; total: number };
    };
  };

  return {
    async list(input: MediaLibraryListInput): Promise<Record<string, unknown>> {
      const page = parseNumber(input.page, 1, 1, 9999);
      const pageSize = parseNumber(input.pageSize, 24, 1, 96);
      const mappedFilter = input.mapped ?? 'all';
      const purposeFilter = input.purpose ?? 'all';
      const signFilter = parseOptionalString(input.sign) ?? 'all';
      const activeFilter = input.active ?? 'all';

      const mediaAssetsRaw = await mediaAssetsService().list();
      const mediaAssets = mediaAssetsRaw.map((item: Record<string, unknown>) =>
        mediaAssetsService().serialize(item)
      ) as MediaAssetSummary[];
      const mappingByFileId = new Map<number, Record<string, unknown>>();
      for (const item of mediaAssets) {
        const fileId = getId(item.asset);
        if (fileId) {
          mappingByFileId.set(fileId, item);
        }
      }

      const existingAssetKeys = new Set<string>();
      for (const item of mediaAssets) {
        const key = parseOptionalString(item.asset_key);
        if (key) {
          existingAssetKeys.add(key);
        }
      }

      const mappedFileIds = Array.from(mappingByFileId.keys());
      const matchingMappedFileIds = mediaAssets
        .filter((item) => {
          if (purposeFilter !== 'all' && parseOptionalString(item.purpose) !== purposeFilter) {
            return false;
          }

          if (signFilter !== 'all' && parseOptionalString(item.sign_slug) !== signFilter) {
            return false;
          }

          if (activeFilter !== 'all') {
            const active = Boolean(item.active);
            if (activeFilter === 'active' && !active) {
              return false;
            }
            if (activeFilter === 'inactive' && active) {
              return false;
            }
          }

          return true;
        })
        .map((item) => getId(item.asset))
        .filter((id): id is number => typeof id === 'number');

      if (
        mappedFilter === 'unmapped' &&
        (purposeFilter !== 'all' || signFilter !== 'all' || activeFilter !== 'all')
      ) {
        return {
          items: [],
          pagination: {
            page,
            pageSize,
            pageCount: 1,
            total: 0,
          },
        };
      }

      const needsMappedInclude =
        mappedFilter === 'mapped' ||
        purposeFilter !== 'all' ||
        signFilter !== 'all' ||
        activeFilter !== 'all';

      if (needsMappedInclude && matchingMappedFileIds.length === 0) {
        return {
          items: [],
          pagination: {
            page,
            pageSize,
            pageCount: 1,
            total: 0,
          },
        };
      }

      const fileIds = needsMappedInclude
        ? { include: matchingMappedFileIds }
        : mappedFilter === 'unmapped'
          ? { exclude: mappedFileIds }
          : undefined;

      const filesPage = await fetchUploadFilesPage(input, page, pageSize, fileIds);
      const files = filesPage.results ?? [];

      const enriched = files.map((file) => {
        const mapping = mappingByFileId.get(file.id) ?? null;
        const suggestion = suggestMediaMapping({
          fileName: file.name ?? `file-${file.id}`,
          existingAssetKeys,
        });

        return {
          id: file.id,
          name: file.name ?? `file-${file.id}`,
          url: file.url ?? '',
          mime: file.mime ?? '',
          width: typeof file.width === 'number' ? file.width : null,
          height: typeof file.height === 'number' ? file.height : null,
          createdAt: file.createdAt ?? null,
          formats: file.formats ?? null,
          mapping,
          suggestion,
        };
      });

      return {
        items: enriched,
        pagination: filesPage.pagination ?? {
          page,
          pageSize,
          pageCount: 1,
          total: enriched.length,
        },
      };
    },
  };
};

export default mediaLibrary;
