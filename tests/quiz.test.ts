import { describe, expect, test } from 'vitest'
import { WORDS, type Word } from '../src/content/words'

const byKo = (ko: string) => {
  const w = WORDS.find((x) => x.ko === ko)
  if (!w) throw new Error(`없는 단어: ${ko}`)
  return w
}
const countByArea = (words: Word[]) => {
  const out: Record<string, number> = { execute: 0, influence: 0, relation: 0, strategy: 0 }
  for (const w of words) out[w.area] = (out[w.area] ?? 0) + 1
  return out
}

describe('단어', () => {
  test('단어는 34개이고 영역별 개수가 맞다', () => {
    expect(WORDS).toHaveLength(34)
    expect(countByArea(WORDS)).toEqual({ execute: 9, influence: 8, relation: 9, strategy: 8 })
  })
  test('확정한 단어가 글자 그대로 들어 있고, 영어 표기는 없다(2026-11-11 PI 결정: 우리말로만 공개)', () => {
    expect(WORDS.map(w => w.ko)).toEqual(['성취', '조율', '신념', '공정', '신중', '질서', '집중', '책임', '해결', '실행', '주도', '표현', '경쟁', '탁월', '자신감', '인정', '사교', '유연', '연결', '코칭', '공감', '조화', '포용', '맞춤', '낙관', '친밀', '분석', '맥락', '미래', '발상', '수집', '사색', '배움', '전략'])
    for (const w of WORDS) expect(Object.keys(w), w.ko).not.toContain('en')
  })
  test('단어마다 담백한 뜻풀이(gloss)가 있고 서로 다르며 짧다', () => {
    for (const w of WORDS) {
      expect(w.gloss.trim().length, w.ko).toBeGreaterThan(4)
      expect(w.gloss.length, w.ko).toBeLessThanOrEqual(20)
      expect(w.gloss, w.ko).not.toMatch(/잠이|항상|절대|계약/)
    }
    expect(new Set(WORDS.map((w) => w.gloss)).size).toBe(34)
    expect(WORDS.filter((w) => w.gloss.includes('맞춰')).length).toBeLessThanOrEqual(1) // 조율과 유연의 뜻풀이가 같은 말로 겹치지 않는다
    expect(byKo('실행').gloss).not.toMatch(/먼저 움직/)
    expect(byKo('신념').gloss).not.toMatch(/안 바뀌/)
  })
  test('id와 우리말이 겹치지 않고 뜻이 있다', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(34)
    expect(new Set(WORDS.map((w) => w.ko)).size).toBe(34)
    for (const w of WORDS) expect(w.meaning.length).toBeGreaterThan(5)
  })
  test('단어마다 1단계에서 뜻을 풀어 주는 자세한 설명(detail)이 있다: 뜻 한 문장과 장면 한 문장', () => {
    for (const w of WORDS) {
      expect(w.detail.length, w.ko).toBeGreaterThanOrEqual(30)
      expect(w.detail.length, w.ko).toBeLessThanOrEqual(70)
      expect(w.detail.split('. ').length, w.ko).toBe(2)
      expect(w.detail, w.ko).toMatch(/다\.$/)
      expect(w.detail, w.ko).not.toContain(w.gloss)
      expect(w.detail, w.ko).not.toMatch(/좋아요|좋다|즐거|힘이 나|뿌듯|재미|잠이|항상|절대/)
    }
    expect(new Set(WORDS.map((w) => w.detail)).size).toBe(34)
  })
  test('1단계 설명(gloss)은 기분이 좋다·즐겁다 같은 보상 표현을 어느 단어에도 쓰지 않는다', () => {
    for (const w of WORDS) expect(w.gloss, w.ko).not.toMatch(/좋아요|좋다|즐거|힘이 나|뿌듯|재미/)
  })
})
