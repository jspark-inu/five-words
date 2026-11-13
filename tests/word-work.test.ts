// "일에서 이렇게 쓰여요" 문구: 34개 단어 모두에 있고, 직업을 정해 주거나 돈·합격을 단정하지 않는다.
import { expect, test } from 'vitest'
import { WORDS } from '../src/content/words'
import { WORK } from '../src/content/word-work'

test('34개 단어마다 한 문장 + "이런 일에서 힘을 씁니다:" 예시가 있고, 남는 항목이 없다', () => {
  expect(Object.keys(WORK).sort()).toEqual(WORDS.map(w => w.id).sort())
  for (const w of WORDS) {
    const t = WORK[w.id]!
    expect(t, w.id).toMatch(/^[^:]+다\. 이런 일에서 힘을 씁니다: [^:]+\.$/)
    expect(t.length, w.id).toBeLessThanOrEqual(110)
    const examples = t.split('이런 일에서 힘을 씁니다: ')[1]!.replace(/\.$/, '').split(', ')
    expect(examples.length, w.id).toBeGreaterThanOrEqual(3)
    expect(examples.length, w.id).toBeLessThanOrEqual(5)
  }
})

test('직업을 단정하거나 돈·합격·건강을 약속하는 말이 없다', () => {
  const banned = /(천직|딱 맞는 직업|해야 합니다|반드시|돈을 잘|연봉|합격|성공합니다|부자|건강|진단|장애(?! 대응))/
  for (const [id, t] of Object.entries(WORK)) expect(t, id).not.toMatch(banned)
})

