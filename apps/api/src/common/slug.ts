import { randomBytes } from 'node:crypto';

/** « Équipe Produit & Co » -> « equipe-produit-co-3f9a ». Le suffixe garantit l'unicité. */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base || 'espace'}-${randomBytes(2).toString('hex')}`;
}
