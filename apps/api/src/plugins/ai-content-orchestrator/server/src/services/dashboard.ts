import {
  PUBLICATION_TICKET_UID,
  RUN_LOG_UID,
  TOPIC_QUEUE_UID,
  WORKFLOW_UID,
  WORKFLOW_STATUS,
} from '../constants';
import type { Strapi } from '../types';

const dashboard = ({ strapi }: { strapi: Strapi }) => {
  const entityService = strapi.entityService as any;

  return ({
  async getSummary(): Promise<Record<string, unknown>> {
    const [
      workflowsTotal,
      workflowsEnabled,
      workflowsFailed,
      runsFailed,
      runsLast,
      topicsPending,
      topicsFailed,
      ticketsScheduled,
      ticketsFailed,
    ] = await Promise.all([
      entityService.count(WORKFLOW_UID),
      entityService.count(WORKFLOW_UID, { filters: { enabled: true } }),
      entityService.count(WORKFLOW_UID, { filters: { status: WORKFLOW_STATUS.failed } }),
      entityService.count(RUN_LOG_UID, { filters: { status: 'failed' } }),
      entityService.findMany(RUN_LOG_UID, {
        sort: { started_at: 'desc' },
        limit: 10,
        populate: ['workflow'],
      }),
      entityService.count(TOPIC_QUEUE_UID, { filters: { status: 'pending' } }),
      entityService.count(TOPIC_QUEUE_UID, { filters: { status: 'failed' } }),
      entityService.count(PUBLICATION_TICKET_UID, { filters: { status: 'scheduled' } }),
      entityService.count(PUBLICATION_TICKET_UID, { filters: { status: 'failed' } }),
    ]);

    return {
      workflows: {
        total: workflowsTotal,
        enabled: workflowsEnabled,
        failed: workflowsFailed,
      },
      runs: {
        failed: runsFailed,
        latest: runsLast,
      },
      topics: {
        pending: topicsPending,
        failed: topicsFailed,
      },
      publications: {
        scheduled: ticketsScheduled,
        failed: ticketsFailed,
      },
    };
  },
  });
};

export default dashboard;
