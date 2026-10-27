import { describe, expect, it } from 'vitest';
import { toolDescriptions } from './tool-descriptions';

describe('toolDescriptions', () => {
  it('gives every tool one sentence for what it is and one for how to use it', () => {
    for (const [kind, description] of Object.entries(toolDescriptions)) {
      for (const sentence of [description.what, description.use]) {
        expect(sentence, kind).toMatch(/^[A-Z][^.]*\.$/);
      }
    }
  });
});
