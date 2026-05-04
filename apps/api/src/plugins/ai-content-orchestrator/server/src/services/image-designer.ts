import { getString, isRecord } from '../utils/json';
import { getPluginService } from '../utils/plugin';
import type { Strapi, OpenRouterUsage } from '../types';
import { getAicoPromptTemplate, renderAicoPromptTemplate } from '../utils/aico-contract';

export interface ImageDesign {
  prompt: string;
  colorMotif: string;
  label: string;
}

const DEFAULT_STYLE =
  'Luxury vertical tarot card (2:3), exclusive collectible astrological design, composition fills almost the entire card with elegant internal padding. CENTER: [PROMPT] (magnetic, majestic focal point, highly detailed), colors: dominant [COLOR] theme, BACKGROUND: deep black cosmic void, LIGHTING: cinematic focus, premium fantasy editorial art, 8k ultra-detailed masterpiece';

const imageDesigner = ({ strapi }: { strapi: Strapi }) => {
  const llmService = () => getPluginService<any>(strapi, 'open-router');

  return {
    async designForContent(input: {
      title: string;
      content?: string;
      categoryName?: string;
      workflowType: string;
      apiToken: string;
      model: string;
    }): Promise<{ design: ImageDesign; usage: OpenRouterUsage }> {
      const prompt = renderAicoPromptTemplate(getAicoPromptTemplate('imageDesigner'), {
        title: input.title,
        categoryName: input.categoryName || 'Ogólna',
        workflowType: input.workflowType,
        contentExcerpt: input.content ? `${input.content.slice(0, 1000)}...` : '',
      });

      const response = await llmService().requestJson({
        model: input.model,
        apiToken: input.apiToken,
        prompt,
        schemaDescription: 'JSON object with prompt, colorMotif and label',
        temperature: 0.8,
      });

      const payload = response.payload;
      if (!isRecord(payload)) {
        throw new Error('Nieprawidłowa odpowiedź od Image Designer LLM');
      }

      return {
        design: {
          prompt: getString(payload.prompt, 'prompt'),
          colorMotif: getString(payload.colorMotif, 'colorMotif'),
          label: getString(payload.label, 'label'),
        },
        usage: response.usage,
      };
    },

    buildFullPrompt(design: ImageDesign): string {
      return DEFAULT_STYLE.replace('[PROMPT]', design.prompt).replace('[COLOR]', design.colorMotif);
    },
  };
};

export default imageDesigner;
