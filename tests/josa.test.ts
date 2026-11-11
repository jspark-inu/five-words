import { expect, test } from 'vitest';
import { hasFinalConsonant } from '../src/report/josa';

test('받침에 따라 조사를 고를 수 있다', () => {
  expect(hasFinalConsonant('발상')).toBe(true);
  expect(hasFinalConsonant('미래')).toBe(false);
  expect(hasFinalConsonant('경쟁')).toBe(true);
  expect(hasFinalConsonant('공감')).toBe(true);
  expect(hasFinalConsonant('조화')).toBe(false);
});
