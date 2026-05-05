export const PERMISSIONS = {
  read: [{ action: 'plugin::ai-content-orchestrator.read', subject: null }],
  manageWorkflows: [{ action: 'plugin::ai-content-orchestrator.manage-workflows', subject: null }],
  run: [{ action: 'plugin::ai-content-orchestrator.run', subject: null }],
  backfill: [{ action: 'plugin::ai-content-orchestrator.backfill', subject: null }],
  manageTopics: [{ action: 'plugin::ai-content-orchestrator.manage-topics', subject: null }],
  viewRuns: [{ action: 'plugin::ai-content-orchestrator.view-runs', subject: null }],
  manageMedia: [{ action: 'plugin::ai-content-orchestrator.manage-media', subject: null }],
  viewMediaUsage: [{ action: 'plugin::ai-content-orchestrator.view-media-usage', subject: null }],
  manageSocial: [{ action: 'plugin::ai-content-orchestrator.manage-social', subject: null }],
  runAudit: [{ action: 'plugin::ai-content-orchestrator.run-audit', subject: null }],
  manageStrategy: [{ action: 'plugin::ai-content-orchestrator.manage-strategy', subject: null }],
  viewPerformance: [{ action: 'plugin::ai-content-orchestrator.view-performance', subject: null }],
  managePerformance: [
    { action: 'plugin::ai-content-orchestrator.manage-performance', subject: null },
  ],
  manageHomepage: [{ action: 'plugin::ai-content-orchestrator.manage-homepage', subject: null }],
  viewAuditTrail: [{ action: 'plugin::ai-content-orchestrator.view-audit-trail', subject: null }],
};
