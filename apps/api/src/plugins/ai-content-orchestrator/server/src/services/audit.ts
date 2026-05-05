import {
  PLUGIN_ID,
  RBAC_ACTIONS,
  RUN_LOG_UID,
  SOCIAL_POST_TICKET_UID,
  WORKFLOW_UID,
} from '../constants';
import { pluginActions } from '../permissions/actions';
import adminRoutesFactory from '../routes/admin';
import type { SocialPlatform, Strapi, WorkflowRecord } from '../types';
import { getEntityService } from '../utils/entity-service';

const toEnabledChannels = (workflow: WorkflowRecord): SocialPlatform[] => {
  if (!Array.isArray(workflow.enabled_channels) || workflow.enabled_channels.length === 0) {
    return ['facebook', 'instagram', 'twitter'];
  }

  return workflow.enabled_channels as SocialPlatform[];
};

type CheckSeverity = 'critical' | 'warning';
type CheckStatus = 'pass' | 'warn' | 'fail';
type AuditDecision = 'GO' | 'GO_WITH_WARNINGS' | 'NO_GO';

type AuditCheck = {
  id: string;
  area: string;
  severity: CheckSeverity;
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
};

type AuditFinding = {
  id: string;
  area: string;
  message: string;
  remediation: string;
};

type AccessExpectation = {
  id: string;
  flow: string;
  method: string;
  path: string;
  action: string;
  remediation: string;
};

type AdminRouteDefinition = {
  method?: unknown;
  path?: unknown;
  config?: {
    policies?: unknown;
  };
};

type SafeRunSummary = {
  id?: unknown;
  run_type?: unknown;
  status?: unknown;
  started_at?: unknown;
  finished_at?: unknown;
  attempts?: unknown;
  workflow?: unknown;
};

const toSafeRunSummary = (run: Record<string, unknown> | null | undefined): SafeRunSummary | null => {
  if (!run) {
    return null;
  }

  return {
    id: run.id,
    run_type: run.run_type,
    status: run.status,
    started_at: run.started_at,
    finished_at: run.finished_at,
    attempts: run.attempts,
    workflow: run.workflow,
  };
};

const OPERATOR_ACCESS_EXPECTATIONS: AccessExpectation[] = [
  {
    id: 'access.dashboard-read',
    flow: 'dashboard',
    method: 'GET',
    path: '/dashboard',
    action: RBAC_ACTIONS.read,
    remediation: 'Nadaj rolom operatorskim akcję Read i sprawdź konfigurację route GET /dashboard.',
  },
  {
    id: 'access.workflows-read',
    flow: 'workflows',
    method: 'GET',
    path: '/workflows',
    action: RBAC_ACTIONS.read,
    remediation: 'Utrzymaj endpoint GET /workflows pod akcją Read.',
  },
  {
    id: 'access.social-tickets-read',
    flow: 'social',
    method: 'GET',
    path: '/social/tickets',
    action: RBAC_ACTIONS.viewRuns,
    remediation:
      'Nadaj akcję View runs dla operatorów social i potwierdź route GET /social/tickets.',
  },
  {
    id: 'access.social-test-connection',
    flow: 'social',
    method: 'POST',
    path: '/social/test-connection',
    action: RBAC_ACTIONS.manageSocial,
    remediation:
      'Nadaj akcję Manage social dla operatora i sprawdź route POST /social/test-connection.',
  },
  {
    id: 'access.social-dry-run',
    flow: 'social',
    method: 'POST',
    path: '/social/dry-run',
    action: RBAC_ACTIONS.manageSocial,
    remediation: 'Nadaj akcję Manage social dla operatora i sprawdź route POST /social/dry-run.',
  },
  {
    id: 'access.audit-preflight',
    flow: 'audit',
    method: 'GET',
    path: '/audit/preflight',
    action: RBAC_ACTIONS.runAudit,
    remediation: 'Preflight wykonuje sprawdzenia operacyjne, więc wymaga akcji Run audit.',
  },
  {
    id: 'access.audit-run',
    flow: 'audit',
    method: 'POST',
    path: '/audit/preflight',
    action: RBAC_ACTIONS.runAudit,
    remediation: 'Nadaj akcję Run audit i potwierdź route POST /audit/preflight.',
  },
  {
    id: 'access.audit-events',
    flow: 'audit',
    method: 'GET',
    path: '/audit/events',
    action: RBAC_ACTIONS.viewAuditTrail,
    remediation: 'Nadaj akcję View audit trail i potwierdź route GET /audit/events.',
  },
  {
    id: 'access.strategy-plan',
    flow: 'strategy',
    method: 'GET',
    path: '/strategy/plan',
    action: RBAC_ACTIONS.manageStrategy,
    remediation: 'Nadaj akcję Manage strategy planning i potwierdź route GET /strategy/plan.',
  },
  {
    id: 'access.performance-read',
    flow: 'performance',
    method: 'GET',
    path: '/performance',
    action: RBAC_ACTIONS.viewPerformance,
    remediation: 'Nadaj akcję View performance feedback i potwierdź route GET /performance.',
  },
  {
    id: 'access.performance-aggregate',
    flow: 'performance',
    method: 'POST',
    path: '/performance/aggregate',
    action: RBAC_ACTIONS.managePerformance,
    remediation:
      'Nadaj akcję Manage performance feedback i potwierdź route POST /performance/aggregate.',
  },
  {
    id: 'access.homepage-recommendations',
    flow: 'homepage',
    method: 'POST',
    path: '/homepage/recommendations/run',
    action: RBAC_ACTIONS.manageHomepage,
    remediation:
      'Nadaj akcję Manage homepage recommendations i potwierdź route POST /homepage/recommendations/run.',
  },
];

const CHECK_REMEDIATION: Record<string, string> = {
  'config.enabled-workflows': 'Włącz minimum jeden workflow i ustaw jego harmonogram.',
  'config.server-url': 'Ustaw publiczne SERVER_URL (server.url) dostępne z internetu.',
  'social.credentials': 'Uzupełnij wszystkie credentiale kanałów FB/IG/X dla włączonych workflow.',
  'social.connectivity': 'Uruchom Test Connection i popraw tokeny/uprawnienia kanałów z błędami.',
  'config.auto-publish-kill-switch':
    'Zweryfikuj ustawienie aico_auto_publish_enabled w AICO Settings przed live auto-publish.',
  'config.auto-publish-guardrails':
    'Uzupełnij auto_publish_guardrails dla workflow auto-publish lub świadomie zaakceptuj domyślne progi.',
  'queues.social-failed': 'Przejrzyj failed tickety social i uruchom retry po poprawie przyczyny.',
  'queues.social-stale':
    'Usuń blokadę kolejki: ponów lub anuluj przeterminowane tickety scheduled.',
  'observability.recent-runs': 'Uruchom kontrolny run i potwierdź, że scheduler działa.',
  'observability.stuck-runs': 'Przeanalizuj runy running >3h i zatrzymaj/napraw workflow.',
  'dr.backup': 'Włącz i potwierdź backup/DR (AICO_BACKUP_ENABLED=true + runbook odzyskiwania).',
  'security.secret-redaction':
    'Usuń pola *_encrypted z payloadów API i zostaw wyłącznie has_*_token.',
  'user-flow.operator-flows': 'Napraw przepływy operatora oznaczone w failed_flows.',
  'access.rbac-matrix': 'Napraw mapowanie RBAC/route wskazane w failed_access_checks.',
};

const isPublicHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractRouteActions = (policies: unknown): Set<string> => {
  const actions = new Set<string>();
  if (!Array.isArray(policies)) {
    return actions;
  }

  for (const policy of policies) {
    if (!isRecord(policy)) {
      continue;
    }

    const config = isRecord(policy.config) ? policy.config : null;
    const policyActions = Array.isArray(config?.actions) ? config.actions : null;
    if (!policyActions) {
      continue;
    }

    for (const action of policyActions) {
      if (typeof action === 'string' && action.trim()) {
        actions.add(action.trim());
      }
    }
  }

  return actions;
};

const normalizeMethod = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase();
const normalizePath = (value: unknown): string => String(value ?? '').trim();

const getCheckRemediation = (checkId: string): string =>
  CHECK_REMEDIATION[checkId] || 'Przeanalizuj szczegóły checka i napraw konfigurację operacyjną.';

const audit = ({ strapi }: { strapi: Strapi }) => {
  const entityService = getEntityService(strapi);

  return {
    async preflight(input?: { strict?: boolean; includeConnectivity?: boolean }): Promise<{
      decision: AuditDecision;
      strict: boolean;
      generatedAt: string;
      summary: {
        criticalFailures: number;
        warnings: number;
      };
      checks: AuditCheck[];
      failed_flows: string[];
      failed_access_checks: string[];
      critical_findings: AuditFinding[];
      non_critical_findings: AuditFinding[];
    }> {
      const strict = Boolean(input?.strict);
      const includeConnectivity = input?.includeConnectivity === true;

      const [
        workflows,
        serializedWorkflows,
        recentRuns,
        staleRunningRuns,
        socialFailed,
        socialStaleScheduled,
      ] = (await Promise.all([
        entityService.findMany(WORKFLOW_UID, {
          sort: [{ id: 'asc' }],
          limit: 1000,
        }),
        strapi.plugin('ai-content-orchestrator').service('workflows').list(),
        entityService.findMany(RUN_LOG_UID, {
          sort: [{ started_at: 'desc' }],
          limit: 100,
        }),
        entityService.findMany(RUN_LOG_UID, {
          filters: {
            status: 'running',
            started_at: {
              $lte: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            },
          },
          sort: [{ started_at: 'asc' }],
          limit: 100,
        }),
        entityService.count(SOCIAL_POST_TICKET_UID, {
          filters: { status: 'failed' },
        }),
        entityService.count(SOCIAL_POST_TICKET_UID, {
          filters: {
            status: 'scheduled',
            scheduled_at: {
              $lte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        }),
      ])) as [
        WorkflowRecord[],
        Array<Record<string, unknown>>,
        Array<Record<string, unknown>>,
        Array<Record<string, unknown>>,
        number,
        number,
      ];

      const checks: AuditCheck[] = [];
      const enabledWorkflows = workflows.filter((workflow) => Boolean(workflow.enabled));
      const autoPublishWorkflows = enabledWorkflows.filter((workflow) =>
        Boolean(workflow.auto_publish)
      );
      const flowFailures = new Set<string>();
      const accessFailures = new Set<string>();
      const settingsStore = strapi.store({
        type: 'plugin',
        name: 'ai-content-orchestrator',
        key: 'settings',
      });
      const pluginSettings = ((await settingsStore.get()) as Record<string, unknown> | null) ?? {};
      const autoPublishEnabled = pluginSettings.aico_auto_publish_enabled !== false;

      if (enabledWorkflows.length === 0) {
        checks.push({
          id: 'config.enabled-workflows',
          area: 'Configuration',
          severity: 'critical',
          status: 'fail',
          message: 'Brak włączonych workflow. System nie ma czego publikować.',
        });
        flowFailures.add('operator-flow: brak aktywnego workflow do obsługi publikacji.');
      } else {
        checks.push({
          id: 'config.enabled-workflows',
          area: 'Configuration',
          severity: 'critical',
          status: 'pass',
          message: `Włączone workflow: ${enabledWorkflows.length}.`,
        });
      }

      checks.push({
        id: 'config.auto-publish-kill-switch',
        area: 'Configuration',
        severity: 'warning',
        status: 'pass',
        message: autoPublishEnabled
          ? 'Globalny kill switch auto-publish jest włączony; system może planować publikacje po guardrails.'
          : 'Globalny kill switch auto-publish jest wyłączony; workflow nie będą planować publikacji.',
        details: {
          aico_auto_publish_enabled: autoPublishEnabled,
          autoPublishWorkflows: autoPublishWorkflows.length,
        },
      });

      const workflowsWithoutGuardrails = autoPublishWorkflows.filter((workflow) => {
        const guardrails = workflow.auto_publish_guardrails;
        return !isRecord(guardrails) || Object.keys(guardrails).length === 0;
      });

      if (workflowsWithoutGuardrails.length > 0) {
        checks.push({
          id: 'config.auto-publish-guardrails',
          area: 'Configuration',
          severity: strict ? 'critical' : 'warning',
          status: strict ? 'fail' : 'warn',
          message: strict
            ? 'Workflow auto-publish bez jawnych guardrails blokują strict preflight.'
            : 'Część workflow auto-publish używa domyślnych guardrails.',
          details: {
            workflows: workflowsWithoutGuardrails.map((workflow) => ({
              id: workflow.id,
              name: workflow.name,
            })),
          },
        });

        if (strict) {
          flowFailures.add('publish-flow: auto-publish bez jawnych guardrails.');
        }
      } else {
        checks.push({
          id: 'config.auto-publish-guardrails',
          area: 'Configuration',
          severity: 'warning',
          status: 'pass',
          message: 'Workflow auto-publish mają jawne guardrails lub nie ma aktywnego auto-publish.',
        });
      }

      const serverUrl = String(strapi.config.get('server.url') || '').trim();
      if (enabledWorkflows.length > 0 && !serverUrl) {
        checks.push({
          id: 'config.server-url',
          area: 'Configuration',
          severity: 'critical',
          status: 'fail',
          message:
            'Brak SERVER_URL (server.url). Ustaw publiczny adres API, aby social media mogły pobierać obrazy.',
        });
        flowFailures.add('publish-flow: brak SERVER_URL uniemożliwia publikację mediów.');
      } else if (enabledWorkflows.length > 0 && !isPublicHttpUrl(serverUrl)) {
        checks.push({
          id: 'config.server-url',
          area: 'Configuration',
          severity: 'critical',
          status: 'fail',
          message: `SERVER_URL nie jest publicznym adresem http/https: "${serverUrl}".`,
        });
        flowFailures.add('publish-flow: SERVER_URL nie jest publicznym adresem http/https.');
      } else {
        checks.push({
          id: 'config.server-url',
          area: 'Configuration',
          severity: 'critical',
          status: 'pass',
          message: `SERVER_URL ustawiony: ${serverUrl || '(brak workflow enabled - check informational)'}.`,
        });
      }

      const socialCredentialIssues: Array<{
        workflowId: number;
        workflow: string;
        issues: string[];
      }> = [];

      for (const workflow of enabledWorkflows) {
        const channels = toEnabledChannels(workflow);
        const issues: string[] = [];

        if (channels.includes('facebook')) {
          if (!workflow.fb_page_id) issues.push('facebook: brak fb_page_id');
          if (!workflow.fb_access_token_encrypted) issues.push('facebook: brak tokena');
        }

        if (channels.includes('instagram')) {
          if (!workflow.ig_user_id) issues.push('instagram: brak ig_user_id');
          if (!workflow.ig_access_token_encrypted) issues.push('instagram: brak tokena');
        }

        if (channels.includes('twitter')) {
          if (!workflow.x_api_key) issues.push('x: brak x_api_key');
          if (!workflow.x_api_secret_encrypted) issues.push('x: brak x_api_secret');
          if (!workflow.x_access_token_encrypted) issues.push('x: brak x_access_token');
          if (!workflow.x_access_token_secret_encrypted)
            issues.push('x: brak x_access_token_secret');
        }

        if (issues.length > 0) {
          socialCredentialIssues.push({
            workflowId: workflow.id,
            workflow: workflow.name,
            issues,
          });
        }
      }

      if (socialCredentialIssues.length > 0) {
        checks.push({
          id: 'social.credentials',
          area: 'Social Readiness',
          severity: 'critical',
          status: 'fail',
          message: 'Wykryto braki credentiali social dla włączonych workflow.',
          details: {
            workflows: socialCredentialIssues,
          },
        });
        flowFailures.add('social-flow: onboarding social ma braki credentiali.');
      } else {
        checks.push({
          id: 'social.credentials',
          area: 'Social Readiness',
          severity: 'critical',
          status: 'pass',
          message: 'Credentiale social kompletne dla włączonych workflow.',
        });
      }

      const connectivityChecks: Array<{
        workflowId: number;
        workflow: string;
        overall: string;
        channels: unknown;
      }> = [];

      if (includeConnectivity) {
        const socialService = strapi.plugin('ai-content-orchestrator').service('social-publisher');

        for (const workflow of enabledWorkflows.slice(0, 10)) {
          try {
            const result = await socialService.testConnection({
              workflowId: workflow.id,
              channels: toEnabledChannels(workflow),
            });

            connectivityChecks.push({
              workflowId: workflow.id,
              workflow: workflow.name,
              overall: result.overall,
              channels: result.channels,
            });
          } catch (error) {
            connectivityChecks.push({
              workflowId: workflow.id,
              workflow: workflow.name,
              overall: 'degraded',
              channels: [{ error: String(error) }],
            });
          }
        }
      } else {
        checks.push({
          id: 'social.connectivity',
          area: 'Social Connectivity',
          severity: 'warning',
          status: 'warn',
          message:
            'Pominięto live connectivity checks. Uruchom jawny audyt z includeConnectivity=true, gdy masz zgodę na requesty do providerów.',
          details: {
            skipped: true,
            reason: 'offline_default',
            enabledWorkflowCount: enabledWorkflows.length,
          },
        });
      }

      const blockedConnectivity = connectivityChecks.filter((item) => item.overall === 'blocked');
      const degradedConnectivity = connectivityChecks.filter((item) => item.overall === 'degraded');
      const needsActionConnectivity = connectivityChecks.filter(
        (item) => item.overall === 'needs_action'
      );

      if (!includeConnectivity) {
        // Offline default already added a warning check above.
      } else if (blockedConnectivity.length > 0) {
        checks.push({
          id: 'social.connectivity',
          area: 'Social Connectivity',
          severity: 'critical',
          status: 'fail',
          message: 'Połączenia social zablokowane (auth/permissions).',
          details: {
            blocked: blockedConnectivity,
          },
        });
        flowFailures.add('social-flow: połączenia social są zablokowane (blocked).');
      } else if (needsActionConnectivity.length > 0 || degradedConnectivity.length > 0) {
        checks.push({
          id: 'social.connectivity',
          area: 'Social Connectivity',
          severity: strict ? 'critical' : 'warning',
          status: strict ? 'fail' : 'warn',
          message: strict
            ? 'Połączenia social wymagają interwencji (strict mode).'
            : 'Połączenia social wymagają interwencji lub są niestabilne.',
          details: {
            needsAction: needsActionConnectivity,
            degraded: degradedConnectivity,
          },
        });
        if (strict) {
          flowFailures.add('social-flow: strict audit wykrył niestabilne połączenia social.');
        }
      } else {
        checks.push({
          id: 'social.connectivity',
          area: 'Social Connectivity',
          severity: 'critical',
          status: 'pass',
          message: 'Połączenia social gotowe.',
        });
      }

      if (socialFailed > 0) {
        checks.push({
          id: 'queues.social-failed',
          area: 'Queues',
          severity: 'warning',
          status: 'warn',
          message: `W kolejce social są tickety failed: ${socialFailed}.`,
        });
      } else {
        checks.push({
          id: 'queues.social-failed',
          area: 'Queues',
          severity: 'warning',
          status: 'pass',
          message: 'Brak failed ticketów social.',
        });
      }

      if (socialStaleScheduled > 0) {
        checks.push({
          id: 'queues.social-stale',
          area: 'Queues',
          severity: 'critical',
          status: 'fail',
          message: `W kolejce social są przeterminowane tickety scheduled: ${socialStaleScheduled}.`,
        });
        flowFailures.add('social-flow: przeterminowane tickety scheduled blokują publikację.');
      } else {
        checks.push({
          id: 'queues.social-stale',
          area: 'Queues',
          severity: 'critical',
          status: 'pass',
          message: 'Brak przeterminowanych ticketów social.',
        });
      }

      const lastRunAt = recentRuns[0]?.started_at
        ? new Date(String(recentRuns[0].started_at)).getTime()
        : null;
      if (!lastRunAt || Number.isNaN(lastRunAt) || Date.now() - lastRunAt > 24 * 60 * 60 * 1000) {
        checks.push({
          id: 'observability.recent-runs',
          area: 'Observability',
          severity: 'warning',
          status: 'warn',
          message: 'Brak świeżych runów w ostatnich 24h.',
          details: {
            latestRun: toSafeRunSummary(recentRuns[0]),
          },
        });
      } else {
        checks.push({
          id: 'observability.recent-runs',
          area: 'Observability',
          severity: 'warning',
          status: 'pass',
          message: 'Wykryto świeże runy w ostatnich 24h.',
        });
      }

      if (staleRunningRuns.length > 0) {
        checks.push({
          id: 'observability.stuck-runs',
          area: 'Observability',
          severity: 'critical',
          status: 'fail',
          message: `Wykryto runy "running" starsze niż 3h: ${staleRunningRuns.length}.`,
          details: {
            runs: staleRunningRuns.map((run) => toSafeRunSummary(run)),
          },
        });
        flowFailures.add('execution-flow: runy utknęły w statusie running > 3h.');
      } else {
        checks.push({
          id: 'observability.stuck-runs',
          area: 'Observability',
          severity: 'critical',
          status: 'pass',
          message: 'Brak zakleszczonych runów.',
        });
      }

      const backupConfigured =
        String(process.env.AICO_BACKUP_ENABLED || '').toLowerCase() === 'true';
      if (!backupConfigured) {
        checks.push({
          id: 'dr.backup',
          area: 'Backup/DR',
          severity: 'warning',
          status: 'warn',
          message: 'Brak potwierdzenia backup/DR (ustaw AICO_BACKUP_ENABLED=true).',
        });
      } else {
        checks.push({
          id: 'dr.backup',
          area: 'Backup/DR',
          severity: 'warning',
          status: 'pass',
          message: 'Backup/DR oznaczony jako skonfigurowany.',
        });
      }

      const leakedTokenFields = serializedWorkflows.some((workflow) =>
        Object.keys(workflow as Record<string, unknown>).some((key) => key.endsWith('_encrypted'))
      );

      checks.push(
        leakedTokenFields
          ? {
              id: 'security.secret-redaction',
              area: 'Security',
              severity: 'critical',
              status: 'fail',
              message: 'W API workflow wykryto pola *_encrypted (wyciek sekretów).',
            }
          : {
              id: 'security.secret-redaction',
              area: 'Security',
              severity: 'critical',
              status: 'pass',
              message: 'Sekrety są redagowane w odpowiedziach API.',
            }
      );

      if (leakedTokenFields) {
        flowFailures.add('security-flow: API workflow ujawnia pola *_encrypted.');
      }

      const declaredPluginActions = new Set(
        pluginActions.map((item) => `plugin::${item.pluginName || PLUGIN_ID}.${item.uid}`)
      );
      const routeConfig = adminRoutesFactory();
      const adminRoutes = Array.isArray(routeConfig.routes)
        ? (routeConfig.routes as AdminRouteDefinition[])
        : [];

      for (const expectation of OPERATOR_ACCESS_EXPECTATIONS) {
        const route = adminRoutes.find(
          (item) =>
            normalizeMethod(item.method) === expectation.method &&
            normalizePath(item.path) === expectation.path
        );

        if (!route) {
          checks.push({
            id: expectation.id,
            area: 'Access Control',
            severity: 'critical',
            status: 'fail',
            message: `Brak route ${expectation.method} ${expectation.path} (flow: ${expectation.flow}).`,
          });
          accessFailures.add(
            `${expectation.method} ${expectation.path}: missing route definition.`
          );
          continue;
        }

        const routeActions = extractRouteActions(route.config?.policies);
        if (!routeActions.has(expectation.action)) {
          checks.push({
            id: expectation.id,
            area: 'Access Control',
            severity: 'critical',
            status: 'fail',
            message: `${expectation.method} ${expectation.path} nie wymaga oczekiwanej akcji RBAC ${expectation.action}.`,
          });
          accessFailures.add(
            `${expectation.method} ${expectation.path}: missing RBAC action ${expectation.action}.`
          );
          continue;
        }

        checks.push({
          id: expectation.id,
          area: 'Access Control',
          severity: 'critical',
          status: 'pass',
          message: `${expectation.method} ${expectation.path} zabezpieczony akcją ${expectation.action}.`,
        });
      }

      for (const action of new Set(OPERATOR_ACCESS_EXPECTATIONS.map((item) => item.action))) {
        if (declaredPluginActions.has(action)) {
          continue;
        }

        checks.push({
          id: `access.action.${action}`,
          area: 'Access Control',
          severity: 'critical',
          status: 'fail',
          message: `Brak deklaracji akcji RBAC w pluginActions: ${action}.`,
        });
        accessFailures.add(`RBAC action declaration missing: ${action}.`);
      }

      if (flowFailures.size > 0) {
        checks.push({
          id: 'user-flow.operator-flows',
          area: 'User Flow',
          severity: 'critical',
          status: 'fail',
          message: 'Wykryto krytyczne luki w przepływach operatora AICO.',
          details: {
            failed_flows: Array.from(flowFailures),
          },
        });
      } else {
        checks.push({
          id: 'user-flow.operator-flows',
          area: 'User Flow',
          severity: 'critical',
          status: 'pass',
          message: 'Przepływy operatora AICO gotowe.',
        });
      }

      if (accessFailures.size > 0) {
        checks.push({
          id: 'access.rbac-matrix',
          area: 'Access Control',
          severity: 'critical',
          status: 'fail',
          message: 'Wykryto krytyczne luki RBAC/route dla przepływów operatora.',
          details: {
            failed_access_checks: Array.from(accessFailures),
          },
        });
      } else {
        checks.push({
          id: 'access.rbac-matrix',
          area: 'Access Control',
          severity: 'critical',
          status: 'pass',
          message: 'Macierz RBAC/route dla operatora jest spójna.',
        });
      }

      const criticalFindingsMap = new Map<string, AuditFinding>();
      const warningFindingsMap = new Map<string, AuditFinding>();

      for (const check of checks) {
        if (check.status === 'pass') {
          continue;
        }

        const finding: AuditFinding = {
          id: check.id,
          area: check.area,
          message: check.message,
          remediation: getCheckRemediation(check.id),
        };

        if (check.severity === 'critical' && check.status === 'fail') {
          criticalFindingsMap.set(finding.id, finding);
          continue;
        }

        warningFindingsMap.set(finding.id, finding);
      }

      for (const [index, flow] of Array.from(flowFailures).entries()) {
        const id = `flow.${index + 1}`;
        if (!criticalFindingsMap.has(id)) {
          criticalFindingsMap.set(id, {
            id,
            area: 'User Flow',
            message: flow,
            remediation:
              'Usuń blokadę wskazanego przepływu i potwierdź pełny scenariusz operatora.',
          });
        }
      }

      for (const [index, accessIssue] of Array.from(accessFailures).entries()) {
        const id = `access.failure.${index + 1}`;
        if (!criticalFindingsMap.has(id)) {
          criticalFindingsMap.set(id, {
            id,
            area: 'Access Control',
            message: accessIssue,
            remediation: 'Popraw mapowanie RBAC w route/policies i uprawnienia roli admina.',
          });
        }
      }

      const critical_findings = Array.from(criticalFindingsMap.values());
      const non_critical_findings = Array.from(warningFindingsMap.values());

      const criticalFailures = critical_findings.length;
      const warnings = non_critical_findings.length;

      const hasCritical =
        criticalFailures > 0 ||
        checks.some((item) => item.severity === 'critical' && item.status === 'fail');

      const decision: AuditDecision = hasCritical
        ? 'NO_GO'
        : warnings > 0
          ? 'GO_WITH_WARNINGS'
          : 'GO';

      return {
        decision,
        strict,
        generatedAt: new Date().toISOString(),
        summary: {
          criticalFailures,
          warnings,
        },
        checks,
        failed_flows: Array.from(flowFailures),
        failed_access_checks: Array.from(accessFailures),
        critical_findings,
        non_critical_findings,
      };
    },
  };
};

export default audit;
