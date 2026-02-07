export enum MagicLinkLocale {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  PT_BR = 'pt-br',
}

export const MAGIC_LINK_LOCALES: MagicLinkLocale[] = [
  MagicLinkLocale.EN,
  MagicLinkLocale.ES,
  MagicLinkLocale.FR,
  MagicLinkLocale.PT_BR,
];

export const isMagicLinkLocale = (value?: string | null): value is MagicLinkLocale => {
  if (!value) {
    return false;
  }
  return MAGIC_LINK_LOCALES.includes(value as MagicLinkLocale);
};
