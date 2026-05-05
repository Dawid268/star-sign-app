import { describe, expect, it } from 'vitest';

import {
  AICO_CONTENT_CONTRACT,
  AICO_CONTRACT_PROMPTS,
  AICO_CONTRACT_WORKFLOWS,
  buildAicoWorkflowDefinitions,
} from './aico-contract';

const premiumSections = AICO_CONTENT_CONTRACT.premium.sections;

describe('AICO content contract', () => {
  it('defines every canonical workflow from the shared prompt catalog', () => {
    const names = AICO_CONTRACT_WORKFLOWS.map((workflow) => workflow.name);

    expect(names).toContain('AICO Horoskop Dzienny - Ogólny (23:00 → 00:00)');
    expect(names).toContain('AICO Horoskop Dzienny - Chiński (23:20 → 00:00)');
    expect(names).toContain('AICO Horoskop Dzienny - Celtycki (23:25 → 00:00)');
    expect(names).toContain('AICO Horoskop Dzienny - Egipski (23:30 → 00:00)');
    expect(names).toContain('AICO Horoskop Roczny - Ogólny');
    expect(names).toContain('AICO Tarot - Karta Dnia');
    expect(names).toContain('AICO Blog - Magia i Astrologia');
  });

  it('requires premiumContent and all Premium sections in generative prompts', () => {
    for (const key of [
      'dailyHoroscope',
      'periodicHoroscope',
      'dailyCard',
      'article',
      'articleQualityRepair',
    ]) {
      const prompt =
        AICO_CONTRACT_PROMPTS[key as keyof typeof AICO_CONTRACT_PROMPTS];

      expect(prompt).toContain('valid JSON');
      expect(prompt).toContain('premiumContent');
      for (const section of premiumSections) {
        expect(prompt).toContain(section);
      }
    }
  });

  it('requires Polish prose quality rules and a schema-preserving repair prompt', () => {
    for (const key of [
      'dailyHoroscope',
      'periodicHoroscope',
      'dailyCard',
      'article',
      'articleQualityRepair',
      'socialTeaser',
    ]) {
      const prompt =
        AICO_CONTRACT_PROMPTS[key as keyof typeof AICO_CONTRACT_PROMPTS];

      expect(prompt).toContain('JAKOŚĆ POLSZCZYZNY');
      expect(prompt).toMatch(/ortograf|składni|interpunkc/i);
      expect(prompt).toMatch(/naturaln|ludz/i);
      expect(prompt).toMatch(/myślnik|półpauz|pauz/i);
    }

    expect(AICO_CONTRACT_PROMPTS.polishStyleRepair).toContain('valid JSON');
    expect(AICO_CONTRACT_PROMPTS.polishStyleRepair).toContain(
      'Zachowaj wszystkie klucze JSON',
    );
    expect(AICO_CONTRACT_PROMPTS.polishStyleRepair).toContain(
      'Nie zmieniaj slugów',
    );
  });

  it('builds bootstrap workflow definitions with exact catalog prompts and retry settings', () => {
    const definitions = buildAicoWorkflowDefinitions({
      model: 'openai/gpt-4.1-mini',
      encryptedToken: 'encrypted-token',
      enableWorkflows: true,
      categoryId: 12,
    });

    const yearly = definitions.find(
      (workflow) => workflow.name === 'AICO Horoskop Roczny - Ogólny',
    );
    expect(yearly).toMatchObject({
      workflow_type: 'horoscope',
      horoscope_period: 'Roczny',
      horoscope_type_values: ['Ogólny'],
      retry_max: AICO_CONTENT_CONTRACT.workflowDefaults.retryMax,
      max_completion_tokens: 24_000,
      prompt_template: AICO_CONTRACT_PROMPTS.periodicHoroscope,
    });

    expect(definitions.every((workflow) => workflow.retry_max === 5)).toBe(
      true,
    );
  });
});
