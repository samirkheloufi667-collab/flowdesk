import { slugify } from './slug';

describe('slugify', () => {
  it('retire accents et caractères spéciaux, et ajoute un suffixe unique', () => {
    expect(slugify('Équipe Produit & Co')).toMatch(/^equipe-produit-co-[0-9a-f]{4}$/);
  });

  it('se rabat sur un nom générique si rien ne subsiste', () => {
    expect(slugify('!!!')).toMatch(/^espace-[0-9a-f]{4}$/);
  });
});
