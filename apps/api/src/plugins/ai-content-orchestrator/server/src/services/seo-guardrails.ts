import { CONTENT_UIDS } from '../constants';
import type { ArticlePayload, DailyCardPayload, Strapi } from '../types';
import { getEntityService } from '../utils/entity-service';
import { slugify } from '../utils/slug';

type SeoCheckStatus = 'pass' | 'warn' | 'fail';

type SeoCheck = {
  id: string;
  status: SeoCheckStatus;
  message: string;
  details?: Record<string, unknown>;
};

export type SeoGuardrailReport = {
  decision: 'pass' | 'warn' | 'fail';
  checks: SeoCheck[];
  score: number;
};

type EvaluateInput = {
  payload: ArticlePayload | DailyCardPayload;
  slug: string;
  categoryId: number | null;
  currentId?: number;
  autoPublish?: boolean;
  guardrails?: Record<string, unknown>;
};

const stripMarkup = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const countWords = (value: string): number => {
  const clean = stripMarkup(value);
  if (!clean) {
    return 0;
  }
  return clean.split(/\s+/).filter(Boolean).length;
};

const hasInternalLink = (value: string): boolean => {
  return /href=["']\/|href=["']https?:\/\/(www\.)?star-sign\.pl|\/(artykuly|horoskopy|tarot|premium)/i.test(
    value
  );
};

const getThreshold = (
  guardrails: Record<string, unknown> | undefined,
  key: string,
  fallback: number
): number => {
  const value = Number(guardrails?.[key] ?? fallback);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
};

const seoGuardrails = ({ strapi }: { strapi: Strapi }) => {
  const entityService = getEntityService(strapi);

  return {
    async evaluateArticleDraft(input: EvaluateInput): Promise<SeoGuardrailReport> {
      const checks: SeoCheck[] = [];
      const minContentWords = getThreshold(input.guardrails, 'minContentWords', 80);
      const minPremiumWords = getThreshold(input.guardrails, 'minPremiumWords', 40);

      const title = input.payload.title.trim();
      const excerpt = input.payload.excerpt.trim();
      const contentWords = countWords(input.payload.content);
      const premiumWords = countWords(input.payload.premiumContent ?? '');
      const normalizedSlug = slugify(input.slug || title);

      checks.push(
        title.length >= 12
          ? { id: 'title.length', status: 'pass', message: 'Tytuł ma wystarczającą długość.' }
          : { id: 'title.length', status: 'fail', message: 'Tytuł jest zbyt krótki.' }
      );

      checks.push(
        excerpt.length >= 40
          ? { id: 'excerpt.length', status: 'pass', message: 'Excerpt jest gotowy.' }
          : { id: 'excerpt.length', status: 'warn', message: 'Excerpt jest krótki.' }
      );

      checks.push(
        contentWords >= minContentWords
          ? {
              id: 'content.length',
              status: 'pass',
              message: 'Treść publiczna spełnia minimalną długość.',
              details: { contentWords, minContentWords },
            }
          : {
              id: 'content.length',
              status: 'fail',
              message: 'Treść publiczna jest zbyt krótka dla auto-publish.',
              details: { contentWords, minContentWords },
            }
      );

      checks.push(
        premiumWords >= minPremiumWords
          ? {
              id: 'premium.length',
              status: 'pass',
              message: 'Treść premium spełnia minimalną długość.',
              details: { premiumWords, minPremiumWords },
            }
          : {
              id: 'premium.length',
              status: 'fail',
              message: 'Treść premium jest zbyt krótka dla auto-publish.',
              details: { premiumWords, minPremiumWords },
            }
      );

      checks.push(
        input.categoryId
          ? { id: 'category.present', status: 'pass', message: 'Kategoria jest przypisana.' }
          : { id: 'category.present', status: 'fail', message: 'Brak kategorii artykułu.' }
      );

      checks.push(
        hasInternalLink(input.payload.content)
          ? {
              id: 'internal-link.present',
              status: 'pass',
              message: 'Treść zawiera link wewnętrzny lub ścieżkę Star Sign.',
            }
          : {
              id: 'internal-link.present',
              status: 'warn',
              message: 'Brak wykrytego linku wewnętrznego.',
            }
      );

      const duplicate = await this.findDuplicate({
        slug: normalizedSlug,
        title,
        currentId: input.currentId,
      });

      checks.push(
        duplicate
          ? {
              id: 'duplicate.slug-title',
              status: 'fail',
              message: 'Wykryto konflikt slug lub tytułu z istniejącym artykułem.',
              details: duplicate,
            }
          : {
              id: 'duplicate.slug-title',
              status: 'pass',
              message: 'Nie znaleziono konfliktu slug/tytułu.',
            }
      );

      const failCount = checks.filter((check) => check.status === 'fail').length;
      const warnCount = checks.filter((check) => check.status === 'warn').length;
      const score = Math.max(0, 100 - failCount * 30 - warnCount * 8);

      return {
        decision: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
        checks,
        score,
      };
    },

    async findDuplicate(input: {
      slug: string;
      title: string;
      currentId?: number;
    }): Promise<Record<string, unknown> | null> {
      const rows = await entityService.findMany<{ id: number; title?: string; slug?: string }>(
        CONTENT_UIDS.article,
        {
          filters: {
            $or: [{ slug: input.slug }, { title: input.title }],
          },
          fields: ['id', 'title', 'slug'],
          limit: 5,
        }
      );

      const duplicate = rows.find((row) => row.id !== input.currentId);
      if (!duplicate) {
        return null;
      }

      return {
        id: duplicate.id,
        title: duplicate.title,
        slug: duplicate.slug,
      };
    },
  };
};

export default seoGuardrails;
