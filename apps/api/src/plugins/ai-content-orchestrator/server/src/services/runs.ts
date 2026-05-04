import { RUN_LOG_UID, RUN_STATUS } from '../constants';
import type { CompleteRunInput, CreateRunInput, RunLogRecord, Strapi } from '../types';
import { getEntityService } from '../utils/entity-service';
import { isRecord } from '../utils/json';
import { getPluginService } from '../utils/plugin';

type OrchestratorService = {
  runNow: (workflowId: number, reason?: string) => Promise<Record<string, unknown>>;
};

const runs = ({ strapi }: { strapi: Strapi }) => {
  const entityService = getEntityService(strapi);

  return {
    async create(input: CreateRunInput): Promise<RunLogRecord> {
      const data: Record<string, unknown> = {
        run_type: input.runType,
        status: input.status,
        started_at: input.startedAt,
        attempts: input.attempts ?? 1,
        details: input.details ?? {},
        error_message: input.errorMessage,
      };

      if (typeof input.workflowId === 'number' && input.workflowId > 0) {
        data.workflow = input.workflowId;
      }

      const created = (await entityService.create(RUN_LOG_UID, {
        data,
      })) as RunLogRecord;

      return created;
    },

    async complete(input: CompleteRunInput): Promise<void> {
      const current = await this.getById(input.runId);
      const currentDetails = isRecord(current?.details) ? current.details : {};
      const nextDetails = input.details ? { ...currentDetails, ...input.details } : currentDetails;

      await entityService.update(RUN_LOG_UID, input.runId, {
        data: {
          status: input.status,
          finished_at: new Date(),
          error_message: input.errorMessage,
          details: nextDetails,
          usage_prompt_tokens: input.usage?.prompt_tokens ?? 0,
          usage_completion_tokens: input.usage?.completion_tokens ?? 0,
          usage_total_tokens: input.usage?.total_tokens ?? 0,
        },
      });
    },

    async updateDetails(runId: number, details: Record<string, unknown>): Promise<void> {
      const current = await this.getById(runId);
      const currentDetails = isRecord(current?.details) ? current.details : {};

      await entityService.update(RUN_LOG_UID, runId, {
        data: {
          details: {
            ...currentDetails,
            ...details,
          },
        },
      });
    },

    async fail(
      runId: number,
      errorMessage: string,
      details?: Record<string, unknown>
    ): Promise<void> {
      await this.complete({
        runId,
        status: RUN_STATUS.failed,
        errorMessage,
        details,
      });
    },

    async list(limit = 50): Promise<RunLogRecord[]> {
      const runs = (await entityService.findMany(RUN_LOG_UID, {
        sort: { started_at: 'desc' },
        populate: ['workflow'],
        limit,
      })) as RunLogRecord[];

      return runs;
    },

    async getById(id: number): Promise<RunLogRecord | null> {
      const run = (await entityService.findOne(RUN_LOG_UID, id, {
        populate: ['workflow'],
      })) as RunLogRecord | null;

      return run;
    },

    async retry(runId: number): Promise<Record<string, unknown>> {
      const run = await this.getById(runId);

      if (!run) {
        throw new Error(`Run #${runId} nie istnieje.`);
      }

      const workflowId =
        typeof run.workflow === 'number'
          ? run.workflow
          : typeof run.workflow?.id === 'number'
            ? run.workflow.id
            : null;

      if (!workflowId) {
        throw new Error(`Run #${runId} nie ma przypisanego workflow.`);
      }

      const orchestrator = getPluginService<OrchestratorService>(strapi, 'orchestrator');
      return orchestrator.runNow(workflowId, `retry-run:${runId}`);
    },
  };
};

export default runs;
