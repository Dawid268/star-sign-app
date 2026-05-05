import contract from './aico-content-contract.json';

export type AicoWorkflowType = 'horoscope' | 'daily_card' | 'article';

export type AicoWorkflowContract = {
  key: string;
  name: string;
  workflowType: AicoWorkflowType;
  generateCron: string;
  publishCron: string;
  topicMode: 'manual' | 'mixed';
  horoscopePeriod: 'Dzienny' | 'Tygodniowy' | 'Miesięczny' | 'Roczny';
  horoscopeTypeValues: string[];
  allSigns: boolean;
  promptKey: keyof typeof contract.prompts;
  temperature: number;
  maxCompletionTokens: number;
};

export type AicoWorkflowDefinition = {
  name: string;
  enabled: boolean;
  status: 'idle';
  workflow_type: AicoWorkflowType;
  generate_cron: string;
  publish_cron: string;
  topic_mode: 'manual' | 'mixed';
  timezone: string;
  locale: string;
  llm_model: string;
  llm_api_token_encrypted: string | null;
  temperature: number;
  max_completion_tokens: number;
  retry_max: number;
  retry_backoff_seconds: number;
  daily_request_limit: number;
  daily_token_limit: number;
  allow_manual_edit: boolean;
  auto_publish: boolean;
  force_regenerate: boolean;
  horoscope_period: 'Dzienny' | 'Tygodniowy' | 'Miesięczny' | 'Roczny';
  horoscope_type_values: string[];
  all_signs: boolean;
  article_category: number | null;
  prompt_template: string;
};

export const AICO_CONTENT_CONTRACT = contract;

export const AICO_CONTRACT_PROMPTS = contract.prompts;

export const AICO_CONTRACT_WORKFLOWS =
  contract.workflows as AicoWorkflowContract[];

export const AICO_LEGACY_WORKFLOW_NAMES = contract.legacyWorkflowNames.filter(
  (name) => !AICO_CONTRACT_WORKFLOWS.some((workflow) => workflow.name === name),
);

export const buildAicoWorkflowDefinitions = (input: {
  model: string;
  encryptedToken: string | null;
  enableWorkflows: boolean;
  categoryId: number | null;
}): AicoWorkflowDefinition[] => {
  const defaults = contract.workflowDefaults;

  return AICO_CONTRACT_WORKFLOWS.map((workflow) => ({
    name: workflow.name,
    enabled: input.enableWorkflows,
    status: 'idle',
    workflow_type: workflow.workflowType,
    generate_cron: workflow.generateCron,
    publish_cron: workflow.publishCron,
    topic_mode: workflow.topicMode,
    timezone: contract.timezone,
    locale: contract.locale,
    llm_model: input.model,
    llm_api_token_encrypted: input.encryptedToken,
    temperature: workflow.temperature,
    max_completion_tokens: workflow.maxCompletionTokens,
    retry_max: defaults.retryMax,
    retry_backoff_seconds: defaults.retryBackoffSeconds,
    daily_request_limit: defaults.dailyRequestLimit,
    daily_token_limit: defaults.dailyTokenLimit,
    allow_manual_edit: defaults.allowManualEdit,
    auto_publish: defaults.autoPublish,
    force_regenerate: defaults.forceRegenerate,
    horoscope_period: workflow.horoscopePeriod,
    horoscope_type_values: workflow.horoscopeTypeValues,
    all_signs: workflow.allSigns,
    article_category:
      workflow.workflowType === 'article' ||
      workflow.workflowType === 'daily_card'
        ? input.categoryId
        : null,
    prompt_template: contract.prompts[workflow.promptKey],
  }));
};
