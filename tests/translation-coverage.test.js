import { expect, it } from 'vitest';
import spanish from '../src/i18n/es.json';
import myanmar from '../src/i18n/my.json';
it('covers every existing message in Spanish with matching variables', () => {
  expect(Object.keys(spanish).sort()).toEqual(Object.keys(myanmar).sort());
  for (const [source, translation] of Object.entries(spanish)) {
    expect(translation.trim().length, source).toBeGreaterThan(0);
    expect((translation.match(/\{\w+\}/g) || []).sort(), source).toEqual(
      (source.match(/\{\w+\}/g) || []).sort(),
    );
  }
});
