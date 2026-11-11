import { describe, expect, test } from 'vitest'
import { STATEMENTS } from '../src/content/statements'
import { WORDS } from '../src/content/words'

describe('2단계 행동 문장', () => {
  const all = Object.values(STATEMENTS).flat()
  test('34개 단어마다 문장이 8개 있고 모두 서로 다르다', () => {
    expect(Object.keys(STATEMENTS).sort()).toEqual(WORDS.map(w => w.id).sort())
    for (const [id, s] of Object.entries(STATEMENTS)) expect(s, id).toHaveLength(8)
    expect(new Set(all).size).toBe(272)
  })
  test('일상 행동 한 장면: 12~30자, "~다"로 끝나고 마침표가 없다', () => {
    for (const s of all) { expect(s.length, s).toBeGreaterThanOrEqual(12); expect(s.length, s).toBeLessThanOrEqual(30); expect(s, s).toMatch(/다$/) }
  })
  test('단어 이름, 보상 표현, 극단 표현을 쓰지 않는다', () => {
    for (const s of all) {
      for (const w of WORDS) expect(s, `${s} / ${w.ko}`).not.toContain(w.ko)
      expect(s).not.toMatch(/좋아요|좋다|즐거|힘이 나|뿌듯|재미|항상|절대|(^| )늘 /)
    }
  })
})
