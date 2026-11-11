import { describe, expect, test } from 'vitest'
import { STATEMENTS } from '../src/content/statements'
import { WORDS } from '../src/content/words'
import { COVER, QUESTIONS, answeredCount, finalCandidates, finalRequired, nextStep, resultOf, scoresOf, validAnswers, validFinal, type FunnelState, type FunnelStep } from '../src/quiz/funnel/engine'

const ids = WORDS.map(w => w.id)
const prng = (seed: number) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const BASE = { picked: ids.slice(0, 10), far: ids.slice(10, 13) }
const unpicked = ids.slice(13)

/** 모든 문항에 respond로 답해 끝까지 돌린다. */
function run(base: Omit<FunnelState, 'answers'>, respond: (step: FunnelStep, i: number) => string): { state: FunnelState; steps: FunnelStep[] } {
  const state: FunnelState = { ...base, answers: [] }
  const steps: FunnelStep[] = []
  for (let step = nextStep(state); step; step = nextStep(state)) {
    steps.push(step)
    state.answers.push(respond(step, steps.length - 1))
    if (state.answers.length > 100) throw new Error('끝나지 않음')
  }
  return { state, steps }
}
/** wins에 든 단어가 나오면 늘 그 단어를 이기게, 둘 다 아니면 첫 번째를 고른다. */
const favor = (wins: string[]) => (s: FunnelStep) => (wins.includes(s.a) && !wins.includes(s.b) ? 'a' : wins.includes(s.b) && !wins.includes(s.a) ? 'b' : 'a')

describe('답으로 판정하는 60문항', () => {
  test('어떤 답이든 정확히 60문항 뒤 null이고, 같은 입력이면 같은 문항·같은 결과다', () => {
    const r = prng(1)
    const keys = ['a', 'b', 'both', 'none']
    const answers = Array.from({ length: QUESTIONS }, () => keys[Math.floor(r() * 4)]!)
    const respond = (_s: FunnelStep, i: number) => answers[i]!
    const one = run(BASE, respond), two = run(BASE, respond)
    expect(one.steps).toHaveLength(QUESTIONS)
    expect(two.steps).toEqual(one.steps)
    expect(resultOf(two.state)).toEqual(resultOf(one.state))
    expect(nextStep(one.state)).toBeNull()
    expect(run(BASE, () => 'both').steps).toHaveLength(QUESTIONS)
    expect(run(BASE, () => 'none').steps).toHaveLength(QUESTIONS)
  })

  test('이어 계산한 문항과 처음부터 계산한 문항이 같다 (이전 버튼으로 답을 지워도 같은 문항)', () => {
    const { state, steps } = run(BASE, favor(ids.slice(0, 6)))
    for (const n of [0, 1, 20, 34, 35, 47, 59]) {
      const part = { ...BASE, answers: state.answers.slice(0, n) }
      expect(nextStep(part)).toEqual(steps[n])
    }
    expect(nextStep({ ...BASE, answers: state.answers.slice(0, 40) })).toEqual(steps[40]) // 59 뒤 다시 앞으로
  })

  test('처음 34문항에서 34개 단어가 모두 정확히 두 번씩 나오고, 한 문항의 두 단어는 다르다', () => {
    for (const picked of [ids.slice(0, 8), ids.slice(5, 20), ids.slice(0, 15)]) {
      const { steps } = run({ picked, far: ids.slice(25, 28) }, () => 'a')
      const count = new Map<string, number>()
      for (const s of steps.slice(0, COVER)) { expect(s.a).not.toBe(s.b); for (const w of [s.a, s.b]) count.set(w, (count.get(w) ?? 0) + 1) }
      expect(count.size).toBe(34)
      for (const [w, c] of count) expect(c, w).toBe(2)
      for (const s of steps) expect(s.a).not.toBe(s.b)
    }
  })

  test('처음 34문항에서 같은 짝이 두 바퀴에 반복되지 않는다', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = prng(seed)
      const picked = ids.filter(() => r() < 0.4).slice(0, 12)
      const far = ids.filter(w => !picked.includes(w)).slice(0, 3)
      const { steps } = run({ picked: picked.length >= 8 ? picked : ids.slice(0, 9), far }, () => 'a')
      const keys = steps.slice(0, COVER).map(s => [s.a, s.b].sort().join('|'))
      expect(new Set(keys).size).toBe(COVER)
    }
  })

  test('문항 화면에는 단어 이름이 아닌 문장만 나오고 문장은 사전에 있는 것이다', () => {
    const { steps } = run(BASE, () => 'a')
    for (const s of steps) {
      expect(STATEMENTS[s.a]).toContain(s.textA)
      expect(STATEMENTS[s.b]).toContain(s.textB)
      expect(s.total).toBe(QUESTIONS)
    }
    expect(steps.map(s => s.index)).toEqual(Array.from({ length: QUESTIONS }, (_, i) => i + 1))
  })

  test('1단계에서 안 고른 단어도 답에서 계속 이기면 다섯 단어에 들어온다 (개수 제한 없음)', () => {
    const wins = unpicked.slice(0, 3)
    const { state } = run(BASE, favor(wins))
    const top = resultOf(state).top
    for (const w of wins) expect(top, w).toContain(w)
    // 안 고른 단어 3개가 한꺼번에 들어와도 막지 않는다: 마지막 확인 후보 8개에도 모두 있다
    expect(finalCandidates(state)).toEqual(expect.arrayContaining(wins))
  })

  test('1단계에서 고른 단어가 늘 지거나 "둘 다 아니에요"를 받으면 다섯 단어에서 빠진다', () => {
    const loser = BASE.picked[0]!
    const lose = run(BASE, s => (s.a === loser ? 'b' : s.b === loser ? 'a' : 'a'))
    expect(resultOf(lose.state).top).not.toContain(loser)
    const none = run(BASE, s => (s.a === loser || s.b === loser ? 'none' : 'a'))
    expect(resultOf(none.state).top).not.toContain(loser)
  })

  test('고른 단어가 "둘 다 아니에요"를 받으면, 문항 35 이후 아직 다시 안 나왔을 때 다음 적응 문항에 그 단어가 나온다', () => {
    // 처음 34문항 중 그 단어가 마지막으로 나온 문항에 none을 주면 그 뒤 다시 묻지 않는다
    const probe = run(BASE, () => 'a').steps
    const target = BASE.picked[0]!
    const lastAt = probe.slice(0, COVER).map(s => s.a === target || s.b === target).lastIndexOf(true)
    const { steps } = run(BASE, (s, i) => (i === lastAt ? 'none' : i < COVER ? 'a' : 'b'))
    // 앞 34문항은 답이 달라도 문항이 같다(답과 무관한 고루 보기)
    expect(steps.slice(0, COVER)).toEqual(probe.slice(0, COVER))
    const first = steps[COVER]!
    expect([first.a, first.b]).toContain(target)
    // 이미 둘 다 아니에요를 받은 두 단어가 모두 고른 단어였다면 둘 다 다시 확인 대상이다
    const others = [steps[lastAt]!.a, steps[lastAt]!.b].filter(w => BASE.picked.includes(w))
    expect(others.length).toBeGreaterThan(0)
    expect(others).toContain(first.a)
  })

  test('안 고른 단어가 "둘 다 아니에요"를 받아도 다시 확인하라고 강제하지 않는다 (스스로 고른 단어만)', () => {
    const word = unpicked[0]!
    const { steps } = run(BASE, (s, i) => (i < COVER && (s.a === word || s.b === word) ? 'none' : 'a'))
    expect(steps).toHaveLength(QUESTIONS)
  })

  test('둘 다 맞아요는 두 단어를 올리고 둘 다 아니에요는 내린다 (θ 비교)', () => {
    const base: FunnelState = { ...BASE, answers: [] }
    const free = scoresOf(base)
    // 첫 문항의 두 단어에 답한다
    const s0 = nextStep(base)!
    const both = scoresOf({ ...base, answers: ['both'] }), none = scoresOf({ ...base, answers: ['none'] }), win = scoresOf({ ...base, answers: ['a'] })
    for (const w of [s0.a, s0.b]) {
      expect(both.get(w)!, w).toBeGreaterThan(free.get(w)!)
      expect(none.get(w)!, w).toBeLessThan(free.get(w)!)
    }
    expect(win.get(s0.a)!).toBeGreaterThan(free.get(s0.a)!)
    expect(win.get(s0.b)!).toBeLessThan(free.get(s0.b)!)
  })

  test('"훨씬 더"(a2·b2)는 "조금 더"(a·b)보다 두 단어 점수를 더 벌리고, 저장된 답으로도 유효하다', () => {
    const base: FunnelState = { ...BASE, answers: [] }
    const s0 = nextStep(base)!
    const gap = (k: string) => { const t = scoresOf({ ...base, answers: [k] }); return t.get(s0.a)! - t.get(s0.b)! }
    expect(gap('a2')).toBeGreaterThan(gap('a'))
    expect(gap('a')).toBeGreaterThan(0)
    expect(gap('b2')).toBeLessThan(gap('b'))
    expect(gap('b')).toBeLessThan(0)
    expect(validAnswers({ ...base, answers: ['a2', 'b2', 'a', 'b', 'both', 'none', 'x', 'a'] })).toEqual(['a2', 'b2', 'a', 'b', 'both', 'none'])
    // 60문항 끝까지 "훨씬 더"만 눌러도 정상으로 끝난다
    const { steps, state } = run(BASE, (_s, i) => (i % 2 ? 'a2' : 'b2'))
    expect(steps).toHaveLength(QUESTIONS)
    expect(resultOf(state).thin).toBe(false)
  })

  test('한 학생 안에서 같은 문장이 두 번 나오지 않는다 (단어마다 문장 8개, 한 단어는 8번까지만 묻는다)', () => {
    let x = 99
    const coin = () => ((x = (x * 16807) % 2147483647) / 2147483647)
    const randomly = () => { const r = coin(); return r < 0.1 ? 'both' : r < 0.2 ? 'none' : r < 0.6 ? 'a' : 'b' }
    for (const respond of [() => 'a', () => 'b', favor(ids.slice(15, 20)), () => 'both', () => 'none', ...Array.from({ length: 40 }, () => randomly)]) {
      const { steps } = run(BASE, respond)
      expect(steps).toHaveLength(60)
      const texts = steps.flatMap(s => [s.textA, s.textB])
      expect(new Set(texts).size).toBe(texts.length)
      const count = new Map<string, number>()
      for (const s of steps) for (const w of [s.a, s.b]) count.set(w, (count.get(w) ?? 0) + 1)
      expect(Math.max(...count.values())).toBeLessThanOrEqual(STATEMENTS[ids[0]!]!.length)
    }
  })

  test('thin: 전부 both/none이면 true, 전부 a/b면 false, 60%를 넘으면 true', () => {
    expect(resultOf(run(BASE, (_s, i) => (i % 2 ? 'both' : 'none')).state).thin).toBe(true)
    expect(resultOf(run(BASE, (_s, i) => (i % 2 ? 'a' : 'b')).state).thin).toBe(false)
    expect(resultOf(run(BASE, (_s, i) => (i < 37 ? 'both' : 'a')).state).thin).toBe(true) // 37/60 > 60%
    expect(resultOf(run(BASE, (_s, i) => (i < 36 ? 'both' : 'a')).state).thin).toBe(false) // 36/60 = 60%
  })

  test('결과는 서로 겹치지 않는 top 5, support 2, 먼 단어 그대로이고 영역 메모는 없다', () => {
    const { state } = run(BASE, favor(ids.slice(0, 5)))
    const r = resultOf(state)
    expect(r.top).toHaveLength(5)
    expect(r.support).toHaveLength(2)
    expect(new Set([...r.top, ...r.support]).size).toBe(7)
    expect(r.far).toEqual(BASE.far)
    expect(r.contexts).toEqual([])
  })

  test('고른 순서와 단어 목록 순서는 결과에 영향이 없다 (같은 단어 집합, 같은 답)', () => {
    const respond = favor(ids.slice(2, 6))
    const x = run(BASE, respond)
    const y = run({ picked: [...BASE.picked].reverse(), far: [...BASE.far].reverse() }, respond)
    expect(y.steps).toEqual(x.steps)
    expect({ ...resultOf(y.state), far: [] }).toEqual({ ...resultOf(x.state), far: [] }) // 먼 단어는 받은 순서 그대로 돌려준다
  })

  test('답을 하나 지우면 같은 문항으로 돌아가고, 깨진 답은 그 자리에서 잘린다', () => {
    const { state, steps } = run(BASE, () => 'a')
    const part = { ...BASE, answers: state.answers.slice(0, 20) }
    expect(nextStep(part)).toEqual(steps[20])
    expect(nextStep({ ...part, answers: part.answers.slice(0, 19) })).toEqual(steps[19])
    const broken = { ...BASE, answers: ['a', 'b', 'x', 'a'] }
    expect(validAnswers(broken)).toEqual(['a', 'b'])
    expect(answeredCount(broken)).toBe(2)
    expect(nextStep(broken)).toEqual(steps[2])
    expect(validAnswers({ ...BASE, answers: Array(70).fill('a') })).toHaveLength(QUESTIONS)
  })
})

describe('마지막 확인', () => {
  const { state } = run(BASE, favor(ids.slice(0, 5)))

  test('후보는 점수 상위 8개이고 섞여 있으며, 같은 입력이면 같은 순서다', () => {
    const c = finalCandidates(state)
    expect(c).toHaveLength(8)
    expect(finalCandidates(state)).toEqual(c)
    const score = scoresOf(state)
    const eighth = [...score.values()].sort((p, q) => q - p)[7]!
    for (const id of c) expect(score.get(id)!).toBeGreaterThanOrEqual(eighth)
    expect(resultOf(state).top.every(id => c.includes(id))).toBe(true)
  })

  test('고른 5개의 순서가 그대로 다섯 단어이고, 다음 두 단어는 남은 후보 중 점수가 높은 둘이다', () => {
    const c = finalCandidates(state)
    const final = [c[7]!, c[6]!, c[5]!, c[4]!, c[3]!]
    const r = resultOf({ ...state, final })
    expect(r.top).toEqual(final)
    expect(r.support.every(id => c.includes(id) && !final.includes(id))).toBe(true)
    expect(r.support).toHaveLength(2)
    expect(r.far).toEqual(BASE.far)
  })

  test('후보 밖 단어를 넣은 직접 순서는 인정하지 않는다', () => {
    const c = finalCandidates(state)
    const outsider = ids.find(id => !c.includes(id))!
    expect(resultOf({ ...state, final: [outsider, ...c.slice(0, 4)] }).top).toEqual(resultOf(state).top)
  })

  test('고르는 개수와 검증: 후보가 5개 이상이면 5개, 그보다 적으면 전부, 개수가 맞는 순서만 유효하다', () => {
    expect(finalRequired(8)).toBe(5)
    expect(finalRequired(3)).toBe(3)
    const c = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(validFinal(c, ['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(validFinal(c, ['a', 'b', 'c', 'd'])).toBeNull()
    expect(validFinal(c, ['a', 'a', 'c', 'd', 'e'])).toBeNull()
    expect(validFinal(c, ['a', 'b', 'c', 'd', 'z'])).toBeNull()
    expect(validFinal(c, undefined)).toBeNull()
  })

  test('근거가 얇은 결과는 마지막 확인 뒤에도 thin이 유지된다', () => {
    const t = run(BASE, () => 'none').state
    const c = finalCandidates(t)
    expect(resultOf({ ...t, final: c.slice(0, 5) }).thin).toBe(true)
  })
})
