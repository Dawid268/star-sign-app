import fs from 'node:fs';
import path from 'node:path';

type AicoContentContract = {
  prompts: Record<string, string>;
};

let cachedContract: AicoContentContract | null = null;

const contractCandidates = () => [
  path.resolve(process.cwd(), 'src/bootstrap/aico-content-contract.json'),
  path.resolve(process.cwd(), 'apps/api/src/bootstrap/aico-content-contract.json'),
  path.resolve(process.cwd(), '../../bootstrap/aico-content-contract.json'),
  path.resolve(process.cwd(), '../../../bootstrap/aico-content-contract.json'),
  path.resolve(process.cwd(), 'dist/src/bootstrap/aico-content-contract.json'),
];

export const getAicoContentContract = (): AicoContentContract => {
  if (cachedContract) return cachedContract;

  const filePath = contractCandidates().find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    throw new Error('AICO content contract file not found.');
  }

  cachedContract = JSON.parse(fs.readFileSync(filePath, 'utf8')) as AicoContentContract;
  return cachedContract;
};

export const getAicoPromptTemplate = (key: string): string => {
  const template = getAicoContentContract().prompts[key];
  if (!template) {
    throw new Error(`AICO prompt template "${key}" not found.`);
  }
  return template;
};

export const renderAicoPromptTemplate = (
  template: string,
  values: Record<string, string | number | null | undefined>
): string => template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(values[key] ?? ''));
