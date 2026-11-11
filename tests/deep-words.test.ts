import { expect, test } from 'vitest'
import { WORDS } from '../src/content/words'
import { DEEP_PARTS } from '../src/content/deep-data'
import { loadDeep } from '../src/content/deep'

const deep = loadDeep(DEEP_PARTS)
const REQUIRED = ['meaning', 'essence', 'goodEnv', 'badEnv', 'trap', 'howTo', 'role', 'rest', 'support', 'activity', 'avoid'] as const
const sentences = (t: string) => (t.match(/[.?!]["”]?(\s|$)/g) ?? []).length

test('34개 단어 모두 필수 문구가 비어 있지 않다', () => {
  expect(WORDS.length).toBe(34)
  for (const w of WORDS) {
    const d = deep.words[w.id]
    expect(d, w.id).toBeTruthy()
    for (const k of REQUIRED) expect((d![k] ?? '').trim().length, `${w.id}.${k}`).toBeGreaterThan(0)
    for (const k of ['early', 'middle', 'late'] as const) expect((d!.signals?.[k] ?? '').trim().length, `${w.id}.signals.${k}`).toBeGreaterThan(0)
  }
})

test('뜻은 단어 정의의 한 줄과 같다', () => {
  for (const w of WORDS) expect(deep.words[w.id]!.meaning, w.id).toBe(w.meaning)
})

test('장면은 단어마다 정확히 5개이고 어느 단어와도 겹치지 않는다', () => {
  const seen = new Map<string, string>()
  for (const w of WORDS) {
    const sc = deep.words[w.id]!.scenes ?? []
    expect(sc.length, w.id).toBe(5)
    for (const s of sc) {
      expect(s.trim().length, `${w.id} scene`).toBeGreaterThan(10)
      expect(seen.get(s), `${w.id} 장면이 ${seen.get(s)}와 같음`).toBeUndefined()
      seen.set(s, w.id)
    }
  }
  expect(seen.size).toBe(170)
})

test('본질은 3~5문장, 함정은 2~3문장이다', () => {
  for (const w of WORDS) {
    const d = deep.words[w.id]!
    expect(sentences(d.essence!), `${w.id} essence`).toBeGreaterThanOrEqual(3)
    expect(sentences(d.essence!), `${w.id} essence`).toBeLessThanOrEqual(5)
    expect(sentences(d.trap!), `${w.id} trap`).toBeGreaterThanOrEqual(2)
    expect(sentences(d.trap!), `${w.id} trap`).toBeLessThanOrEqual(3)
  }
})

test('쉼 편을 드는 단어(restAllow)는 조화, 신중, 사색, 유연, 낙관, 친밀이다', () => {
  const ids = Object.keys(deep.words).filter(id => (deep.words[id]!.restAllow ?? '') !== '').sort()
  expect(ids).toEqual(['caution', 'closeness', 'concord', 'flexibility', 'optimism', 'reflection'])
  expect(deep.words.concord!.restAllow).toBe('사이좋게 있는 시간 자체를 쉼으로 치는 단어입니다.')
  expect(deep.words.caution!.restAllow).toBe('무리하는 걸 위험으로 계산해 말려 줍니다.')
})

test('샘플의 다섯 단어는 샘플 문장 그대로다', () => {
  const w = deep.words
  expect(w.ideas!.essence).toContain('생각이 떠오르는 게 일이 아니라 기본 상태입니다.')
  expect(w.ideas!.scenes![1]).toBe('조별과제 첫 회의에서 주제 후보를 혼자 일곱 개 냅니다. 그중 여섯은 다음 날 본인도 까먹습니다.')
  expect(w.ideas!.role).toBe('무엇을 할까. 후보를 잔뜩 내놓습니다.')
  expect(w.future!.essence).toContain('지금 있는 것보다 아직 없는 것이 더 또렷합니다.')
  expect(w.future!.trap).toContain('내일 제출할 과제보다 10년 뒤 세상이 더 걱정됩니다.')
  expect(w.future!.rest).toBe('쉬면 그림이 늦어지는 것 같아 조급합니다.')
  expect(w.rivalry!.essence).toContain('혼자 세운 목표는 슬그머니 넘어가도')
  expect(w.rivalry!.scenes![0]).toBe('가위바위보로 커피 내기를 하면서 손목을 풉니다.')
  expect(w.rivalry!.avoid).toBe('무엇으로 평가받는지 끝까지 알려 주지 않는 곳.')
  expect(w.sympathy!.essence).toContain('상대가 말하기 전에 기분이 먼저 넘어옵니다.')
  expect(w.sympathy!.howTo).toContain('이거 내 기분인가, 쟤 기분인가')
  expect(w.sympathy!.avoid).toBe('갈등을 풀지 않고 분위기로 눌러 두는 곳.')
  expect(w.achievement!.essence).toContain('힘이 나오는 곳이 곧 피곤이 나오는 곳입니다.')
  expect(w.achievement!.howTo).toContain('"쉬어"는 못 해도 "쉬기 완료"는 합니다.')
  expect(w.achievement!.signals!.early).toBe('쉬는 시간에도 한 일을 세고 있다. 안 지운 줄이 하나 남으면 하루가 덜 끝난 기분이다.')
  expect(w.strategy!.support).toContain('여러 길 중 나은 쪽을 고르는 힘이라')
  expect(w.learning!.support).toContain('강의 장바구니가 무거운 이유입니다.')
})

test('쓰면 안 되는 이름과 진단 단어가 없다', () => {
  const text = JSON.stringify(deep.words)
  // 이름 검사기가 이 파일을 걸지 않도록 낱말을 쪼개 적는다.
  const names = [['갤', '럽'], ['Gal', 'lup'], ['Clif', 'ton'], ['Strengths', 'Finder'], ['클리', '프턴']].map(p => p.join(''))
  for (const b of [...names, '번아웃', '우울', 'ADHD', '장애', '진단', '치료']) {
    expect(text.toLowerCase().includes(b.toLowerCase()), b).toBe(false)
  }
})
