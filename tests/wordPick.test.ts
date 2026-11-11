import { describe, expect, test } from 'vitest'
import { WORDS } from '../src/content/words'
import { shuffledWords } from '../src/quiz/wordPick'

const ids = WORDS.map(w => w.id)
const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

describe('단어 방식', () => {
  test('셔플은 34개 단어를 빠짐없이 한 번씩 담는다', () => {
    for (let s = 1; s <= 50; s++) {
      const out = shuffledWords(seeded(s)).map(w => w.id)
      expect(out).toHaveLength(34)
      expect([...out].sort()).toEqual([...ids].sort())
    }
  })
  test('셔플은 난수에 따라 순서가 달라지고, 같은 난수면 같은 순서', () => {
    expect(shuffledWords(seeded(1)).map(w => w.id)).toEqual(shuffledWords(seeded(1)).map(w => w.id))
    expect(shuffledWords(seeded(1)).map(w => w.id)).not.toEqual(shuffledWords(seeded(2)).map(w => w.id))
  })
  test('셔플이 원래 목록을 바꾸지 않는다', () => {
    const before = WORDS.map(w => w.id)
    shuffledWords(seeded(3))
    expect(WORDS.map(w => w.id)).toEqual(before)
  })
  test('셔플이 첫 자리를 한쪽으로 몰지 않는다 (2000번 중 각 단어 0.5~1.5%)', () => {
    const first = new Map<string, number>()
    const rnd = seeded(77)
    for (let i = 0; i < 2000; i++) { const id = shuffledWords(rnd)[0]!.id; first.set(id, (first.get(id) ?? 0) + 1) }
    for (const id of ids) expect((first.get(id) ?? 0) / 2000, id).toBeGreaterThan(0.002)
    expect(Math.max(...first.values()) / 2000).toBeLessThan(0.06)
  })
})
