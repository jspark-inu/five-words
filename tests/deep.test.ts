import { expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { emptyDeep, loadDeep, pairKey } from '../src/content/deep'
import { composeDeep, areaSignature } from '../src/report/deep'
import { READINGS } from '../src/content/readings'
import { CONTENT } from '../src/content'

const sample: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }
const top = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
const run = (copy = emptyDeep(), birth = sample, opts: { far?: string[]; support?: string[] } = {}) =>
  composeDeep({ top, far: opts.far ?? null, support: opts.support ?? null, chart: computeChart(birth), detail: computeDetail(birth, 2026), copy, readings: READINGS, content: CONTENT })

test('문구가 하나도 없으면 문구가 필요한 블록은 모두 비어 있다', () => {
  const d = run()
  expect(d.summary).toBeNull()
  expect(d.wordCards.every(c => !c.hasDetail && c.essence === null && c.meaning === null)).toBe(true)
  expect(d.roles).toEqual([])
  expect(d.pairs).toEqual([])
  expect(d.assets).toEqual([])
  expect(d.risks).toEqual([])
  expect(d.triangle).toBeNull()
  expect(d.activities).toEqual([])
  expect(d.avoid).toEqual([])
  expect(d.areaNotes).toEqual([])
  expect(d.luck.total).toBeNull()
  expect(d.luck.study).toBeNull()
  expect(d.luck.years).toEqual([])
  expect(d.luck.glance).toEqual([])
  expect(d.chartNotes).toEqual({ sinsal: {}, relation: {}, palace: {} })
})
test('영역 분포는 사실이라 문구 없이도 나온다', () => {
  const d = run()
  expect(d.areaBars.map(b => [b.id, b.count])).toEqual([['strategy', 2], ['execute', 1], ['influence', 1], ['relation', 1]])
  expect(areaSignature(top)).toBe('strategy2-execute1-influence1-relation1')
})
test('운세 블록은 파일끼리 합쳐지고 뒤의 것이 이긴다. 조립은 tests/deep-luck.test.ts', () => {
  const copy = loadDeep([{ luckBlocks: { 'dayStem[丁]': 'a', 'pattern[식신생재]': 'b' } }, { luckBlocks: { 'dayStem[丁]': 'c' } }])
  expect(copy.luckBlocks).toEqual({ 'dayStem[丁]': 'c', 'pattern[식신생재]': 'b' })
  const d = run(copy)
  expect(d.luck.total?.paragraphs.some(p => p.text.includes('c'))).toBe(true)
  expect(d.luck.years).toEqual([])
})
test('열 가지 짝 본문은 다섯 단어 사이 열 쌍만, 순위 순서로 고른다', () => {
  const p = (body: string) => ({ type: 'syn' as const, line: 'l', body })
  const copy = loadDeep([{ pairs: { [pairKey('future', 'ideas')]: p('A'), [pairKey('ideas', 'zzz')]: p('X'), [pairKey('sympathy', 'achievement')]: p('B') } }])
  const d = run(copy)
  expect(d.pairs.map(p => [p.a, p.b, p.body])).toEqual([['발상', '미래', 'A'], ['공감', '성취', 'B']])
})
test('단어 카드는 문구가 있는 필드만 담는다', () => {
  const copy = loadDeep([{ words: { ideas: { meaning: '뜻', scenes: ['a', 'b'], trap: '함정' } } }])
  const c = run(copy).wordCards[0]!
  expect(c.meaning).toBe('뜻')
  expect(c.scenes).toEqual(['a', 'b'])
  expect([c.trap, c.howTo, c.goodEnv, c.badEnv, c.essence]).toEqual(['함정', null, null, null, null])
  expect(c.hasDetail).toBe(true)
})
test('받침 단어는 문구가 있을 때만 나온다', () => {
  expect(run(emptyDeep(), sample, { support: ['strategy'] }).support).toEqual([])
  const copy = loadDeep([{ words: { strategy: { support: '받침 설명' } } }])
  expect(run(copy, sample, { support: ['strategy', 'learning'] }).support).toEqual([{ ko: '전략', text: '받침 설명' }])
})
