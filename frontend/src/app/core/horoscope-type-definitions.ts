export type SpecialHoroscopeTypeSlug = 'chinski' | 'celtycki' | 'egipski';

export type SpecialHoroscopeTypeName = 'Chiński' | 'Celtycki' | 'Egipski';

export interface SpecialHoroscopeTypeDefinition {
  slug: SpecialHoroscopeTypeSlug;
  typeName: SpecialHoroscopeTypeName;
  title: string;
  icon: string;
  description: string;
}

export const SPECIAL_HOROSCOPE_TYPES: SpecialHoroscopeTypeDefinition[] = [
  {
    slug: 'chinski',
    typeName: 'Chiński',
    icon: '☯',
    title: 'Horoskop Chiński',
    description:
      'Odkryj mądrość Wschodu opartą na dwunastu zwierzętach chińskiego zodiaku.',
  },
  {
    slug: 'celtycki',
    typeName: 'Celtycki',
    icon: '☘',
    title: 'Horoskop Celtycki',
    description:
      'Poznaj swój celtycki odpowiednik oparty na horoskopie drzew i naturze.',
  },
  {
    slug: 'egipski',
    typeName: 'Egipski',
    icon: '☥',
    title: 'Horoskop Egipski',
    description:
      'Starożytne bóstwa Egiptu i ich wpływ na Twoją ścieżkę życiową.',
  },
];

export const SPECIAL_HOROSCOPE_TYPE_BY_SLUG = Object.fromEntries(
  SPECIAL_HOROSCOPE_TYPES.map((type) => [type.slug, type]),
) as Record<SpecialHoroscopeTypeSlug, SpecialHoroscopeTypeDefinition>;

export const findSpecialHoroscopeType = (
  slug: string | null | undefined,
): SpecialHoroscopeTypeDefinition | undefined =>
  slug && slug in SPECIAL_HOROSCOPE_TYPE_BY_SLUG
    ? SPECIAL_HOROSCOPE_TYPE_BY_SLUG[slug as SpecialHoroscopeTypeSlug]
    : undefined;
