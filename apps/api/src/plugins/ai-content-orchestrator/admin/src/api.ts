import type { FetchClient } from '@strapi/strapi/admin';

import type {
  ApiEnvelope,
  DashboardSummary,
  DiagnosticsSummary,
  MediaAsset,
  MediaBulkUpsertItemRequest,
  MediaBulkUpsertResult,
  MediaIdentityPreview,
  MediaLibraryListResult,
  MediaUsage,
  Run,
  SettingsPayload,
  Topic,
  Workflow,
} from './types';

const BASE = '/ai-content-orchestrator';

export const api = {
  async getDashboard(client: FetchClient): Promise<DashboardSummary> {
    const { data } = await client.get<ApiEnvelope<DashboardSummary>>(`${BASE}/dashboard`);
    return data.data;
  },

  async getDiagnostics(client: FetchClient): Promise<DiagnosticsSummary> {
    const { data } = await client.get<ApiEnvelope<DiagnosticsSummary>>(`${BASE}/diagnostics`);
    return data.data;
  },

  async getWorkflows(client: FetchClient): Promise<Workflow[]> {
    const { data } = await client.get<ApiEnvelope<Workflow[]>>(`${BASE}/workflows`);
    return data.data;
  },

  async createWorkflow(client: FetchClient, payload: Record<string, unknown>): Promise<Workflow> {
    const { data } = await client.post<ApiEnvelope<Workflow>, Record<string, unknown>>(`${BASE}/workflows`, payload);
    return data.data;
  },

  async updateWorkflow(client: FetchClient, id: number, payload: Record<string, unknown>): Promise<Workflow> {
    const { data } = await client.put<ApiEnvelope<Workflow>, Record<string, unknown>>(
      `${BASE}/workflows/${id}`,
      payload
    );
    return data.data;
  },

  async runNow(client: FetchClient, id: number): Promise<Record<string, unknown>> {
    const { data } = await client.post<ApiEnvelope<Record<string, unknown>>>(`${BASE}/workflows/${id}/run-now`);
    return data.data;
  },

  async stopWorkflow(client: FetchClient, id: number): Promise<Record<string, unknown>> {
    const { data } = await client.post<ApiEnvelope<Record<string, unknown>>>(`${BASE}/workflows/${id}/stop`);
    return data.data;
  },

  async deleteWorkflow(client: FetchClient, id: number): Promise<Workflow> {
    const { data } = await client.post<ApiEnvelope<Workflow>>(`${BASE}/workflows/${id}/delete`);
    return data.data;
  },

  async backfill(
    client: FetchClient,
    id: number,
    payload: { startDate: string; endDate: string; dryRun?: boolean }
  ): Promise<Record<string, unknown>> {
    const { data } = await client.post<ApiEnvelope<Record<string, unknown>>, typeof payload>(
      `${BASE}/workflows/${id}/backfill`,
      payload
    );
    return data.data;
  },

  async getTopics(client: FetchClient): Promise<Topic[]> {
    const { data } = await client.get<ApiEnvelope<Topic[]>>(`${BASE}/topics`);
    return data.data;
  },

  async createTopic(client: FetchClient, payload: Record<string, unknown>): Promise<Topic> {
    const { data } = await client.post<ApiEnvelope<Topic>, Record<string, unknown>>(`${BASE}/topics`, payload);
    return data.data;
  },

  async updateTopic(client: FetchClient, id: number, payload: Record<string, unknown>): Promise<Topic> {
    const { data } = await client.put<ApiEnvelope<Topic>, Record<string, unknown>>(`${BASE}/topics/${id}`, payload);
    return data.data;
  },

  async getRuns(client: FetchClient, params?: { limit?: number }): Promise<Run[]> {
    const query = new URLSearchParams();
    if (params?.limit) {
      query.set('limit', String(params.limit));
    }

    const queryString = query.toString();
    const { data } = await client.get<ApiEnvelope<Run[]>>(`${BASE}/runs${queryString ? `?${queryString}` : ''}`);
    return data.data;
  },

  async retryRun(client: FetchClient, id: number): Promise<Record<string, unknown>> {
    const { data } = await client.post<ApiEnvelope<Record<string, unknown>>>(`${BASE}/runs/${id}/retry`);
    return data.data;
  },

  async getSettings(client: FetchClient): Promise<SettingsPayload> {
    const { data } = await client.get<ApiEnvelope<SettingsPayload>>(`${BASE}/settings`);
    return data.data;
  },

  async updateSettings(client: FetchClient, payload: SettingsPayload): Promise<SettingsPayload> {
    const { data } = await client.put<ApiEnvelope<SettingsPayload>, SettingsPayload>(`${BASE}/settings`, payload);
    return data.data;
  },

  async getMediaAssets(client: FetchClient): Promise<MediaAsset[]> {
    const { data } = await client.get<ApiEnvelope<MediaAsset[]>>(`${BASE}/media-assets`);
    return data.data;
  },

  async createMediaAsset(client: FetchClient, payload: Record<string, unknown>): Promise<MediaAsset> {
    const { data } = await client.post<ApiEnvelope<MediaAsset>, Record<string, unknown>>(
      `${BASE}/media-assets`,
      payload
    );
    return data.data;
  },

  async updateMediaAsset(client: FetchClient, id: number, payload: Record<string, unknown>): Promise<MediaAsset> {
    const { data } = await client.put<ApiEnvelope<MediaAsset>, Record<string, unknown>>(
      `${BASE}/media-assets/${id}`,
      payload
    );
    return data.data;
  },

  async getMediaLibraryFiles(
    client: FetchClient,
    params?: {
      page?: number;
      pageSize?: number;
      search?: string;
      mapped?: 'all' | 'mapped' | 'unmapped';
      purpose?: 'all' | 'horoscope_sign' | 'daily_card' | 'blog_article' | 'fallback_general';
      sign?: string;
      active?: 'all' | 'active' | 'inactive';
      sort?: 'createdAtDesc' | 'createdAtAsc' | 'nameAsc' | 'nameDesc';
    }
  ): Promise<MediaLibraryListResult> {
    const query = new URLSearchParams();

    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.mapped) query.set('mapped', params.mapped);
    if (params?.purpose) query.set('purpose', params.purpose);
    if (params?.sign) query.set('sign', params.sign);
    if (params?.active) query.set('active', params.active);
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString();
    const { data } = await client.get<ApiEnvelope<MediaLibraryListResult>>(
      `${BASE}/media-library/files${queryString ? `?${queryString}` : ''}`
    );

    return data.data;
  },

  async bulkUpsertMediaAssets(
    client: FetchClient,
    payload: { items: MediaBulkUpsertItemRequest[]; dryRun?: boolean; apply?: boolean }
  ): Promise<MediaBulkUpsertResult> {
    const { data } = await client.post<ApiEnvelope<MediaBulkUpsertResult>, typeof payload>(
      `${BASE}/media-assets/bulk-upsert`,
      payload
    );
    return data.data;
  },

  async previewMediaIdentity(
    client: FetchClient,
    payload: {
      fileId: number;
      purpose: MediaIdentityPreview['purpose'];
      sign_slug?: string | null;
      period_scope?: MediaIdentityPreview['period_scope'];
      excludeId?: number | null;
    }
  ): Promise<MediaIdentityPreview> {
    const { data } = await client.post<ApiEnvelope<MediaIdentityPreview>, typeof payload>(
      `${BASE}/media-assets/preview-identity`,
      payload
    );
    return data.data;
  },

  async validateMediaCoverage(
    client: FetchClient,
    payload?: { applyWorkflowDisabling?: boolean }
  ): Promise<Record<string, unknown>> {
    const { data } = await client.post<ApiEnvelope<Record<string, unknown>>, typeof payload>(
      `${BASE}/media-assets/validate-coverage`,
      payload
    );
    return data.data;
  },

  async getMediaUsage(client: FetchClient, limit = 200): Promise<MediaUsage[]> {
    const { data } = await client.get<ApiEnvelope<MediaUsage[]>>(`${BASE}/media-usage?limit=${limit}`);
    return data.data;
  },
};
