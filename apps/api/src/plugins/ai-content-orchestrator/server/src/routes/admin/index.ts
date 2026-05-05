import { RBAC_ACTIONS } from '../../constants';

const withPermission = (action: string) => [
  'admin::isAuthenticatedAdmin',
  {
    name: 'admin::hasPermissions',
    config: {
      actions: [action],
    },
  },
];

export default () => ({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/dashboard',
      handler: 'dashboard.index',
      config: {
        policies: withPermission(RBAC_ACTIONS.read),
      },
    },
    {
      method: 'GET',
      path: '/diagnostics',
      handler: 'diagnostics.index',
      config: {
        policies: withPermission(RBAC_ACTIONS.read),
      },
    },
    {
      method: 'GET',
      path: '/strategy/plan',
      handler: 'strategy.listPlan',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageStrategy),
      },
    },
    {
      method: 'POST',
      path: '/strategy/generate-plan',
      handler: 'strategy.generatePlan',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageStrategy),
      },
    },
    {
      method: 'POST',
      path: '/strategy/approve-plan',
      handler: 'strategy.approvePlan',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageStrategy),
      },
    },
    {
      method: 'GET',
      path: '/performance',
      handler: 'performance.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.viewPerformance),
      },
    },
    {
      method: 'POST',
      path: '/performance/aggregate',
      handler: 'performance.aggregate',
      config: {
        policies: withPermission(RBAC_ACTIONS.managePerformance),
      },
    },
    {
      method: 'GET',
      path: '/homepage/recommendations',
      handler: 'homepage.findRecommendations',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageHomepage),
      },
    },
    {
      method: 'POST',
      path: '/homepage/recommendations/run',
      handler: 'homepage.runRecommendations',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageHomepage),
      },
    },
    {
      method: 'GET',
      path: '/workflows',
      handler: 'workflows.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.read),
      },
    },
    {
      method: 'POST',
      path: '/workflows',
      handler: 'workflows.create',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageWorkflows),
      },
    },
    {
      method: 'PUT',
      path: '/workflows/:id',
      handler: 'workflows.update',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageWorkflows),
      },
    },
    {
      method: 'DELETE',
      path: '/workflows/:id',
      handler: 'workflows.delete',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageWorkflows),
      },
    },
    {
      method: 'POST',
      path: '/workflows/:id/delete',
      handler: 'workflows.delete',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageWorkflows),
      },
    },
    {
      method: 'POST',
      path: '/workflows/:id/run-now',
      handler: 'workflows.runNow',
      config: {
        policies: withPermission(RBAC_ACTIONS.run),
      },
    },
    {
      method: 'POST',
      path: '/workflows/:id/stop',
      handler: 'workflows.stop',
      config: {
        policies: withPermission(RBAC_ACTIONS.run),
      },
    },
    {
      method: 'POST',
      path: '/workflows/:id/backfill',
      handler: 'workflows.backfill',
      config: {
        policies: withPermission(RBAC_ACTIONS.backfill),
      },
    },
    {
      method: 'GET',
      path: '/runs',
      handler: 'runs.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.viewRuns),
      },
    },
    {
      method: 'POST',
      path: '/runs/:id/retry',
      handler: 'runs.retry',
      config: {
        policies: withPermission(RBAC_ACTIONS.run),
      },
    },
    {
      method: 'GET',
      path: '/social/tickets',
      handler: 'social.listTickets',
      config: {
        policies: withPermission(RBAC_ACTIONS.viewRuns),
      },
    },
    {
      method: 'POST',
      path: '/social/test-connection',
      handler: 'social.testConnection',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageSocial),
      },
    },
    {
      method: 'POST',
      path: '/social/dry-run',
      handler: 'social.dryRun',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageSocial),
      },
    },
    {
      method: 'POST',
      path: '/social/tickets/:id/retry',
      handler: 'social.retryTicket',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageSocial),
      },
    },
    {
      method: 'POST',
      path: '/social/tickets/:id/cancel',
      handler: 'social.cancelTicket',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageSocial),
      },
    },
    {
      method: 'GET',
      path: '/audit/preflight',
      handler: 'audit.preflight',
      config: {
        policies: withPermission(RBAC_ACTIONS.runAudit),
      },
    },
    {
      method: 'POST',
      path: '/audit/preflight',
      handler: 'audit.preflightStrict',
      config: {
        policies: withPermission(RBAC_ACTIONS.runAudit),
      },
    },
    {
      method: 'GET',
      path: '/audit/events',
      handler: 'audit.events',
      config: {
        policies: withPermission(RBAC_ACTIONS.viewAuditTrail),
      },
    },
    {
      method: 'GET',
      path: '/topics',
      handler: 'topics.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageTopics),
      },
    },
    {
      method: 'POST',
      path: '/topics',
      handler: 'topics.create',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageTopics),
      },
    },
    {
      method: 'PUT',
      path: '/topics/:id',
      handler: 'topics.update',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageTopics),
      },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.read),
      },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.update',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageWorkflows),
      },
    },
    {
      method: 'GET',
      path: '/media-assets',
      handler: 'media-assets.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'POST',
      path: '/media-assets',
      handler: 'media-assets.create',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'PUT',
      path: '/media-assets/:id',
      handler: 'media-assets.update',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'POST',
      path: '/media-assets/bulk-upsert',
      handler: 'media-assets.bulkUpsert',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'POST',
      path: '/media-assets/preview-identity',
      handler: 'media-assets.previewIdentity',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'POST',
      path: '/media-assets/validate-coverage',
      handler: 'media-assets.validateCoverage',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'GET',
      path: '/media-library/files',
      handler: 'media-library.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.manageMedia),
      },
    },
    {
      method: 'GET',
      path: '/media-usage',
      handler: 'media-usage.find',
      config: {
        policies: withPermission(RBAC_ACTIONS.viewMediaUsage),
      },
    },
  ],
});
