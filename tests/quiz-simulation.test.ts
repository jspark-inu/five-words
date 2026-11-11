// 가상 학생 시험(고정 시드, 결정적): 60문항 방식이 (1) 스스로 고른 순서보다 진짜 성향을 더 잘 맞히는지,
// (2) 1단계에서 놓친 진짜 단어를 찾아내는지, (3) 좋아 보이는 쪽만 고르는 학생·아무렇게나 누르는 학생에게서 특정 단어가 더 나오지 않는지 본다.
// 학생 모델은 design/experiments/measured-test-20261109.ts(원형)를 옮긴 것이고 모두 제 가정이다. 기준값도 "제가 정한 기준"이다.
import { describe, expect, test } from 'vitest'
import { WORDS } from '../src/content/words'
import { nextStep, resultOf, type FunnelState } from '../src/quiz/funnel/engine'

const IDS = WORDS.map(w => w.id)
const N = IDS.length
const mulberry = (seed: number) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const sig = (x: number) => 1 / (1 + Math.exp(-x))

function world(seed: number, dscale: number, sscale: number) {
  const rnd = mulberry(seed)
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
  // 단어마다 고정된 "좋아 보이는 정도"(문구 탓). 실제 문구를 쓰기 전이라 무작위로 둔다.
  const desir = IDS.map(() => dscale * gauss())
  type Student = { u: number[]; v: number[]; picked: number[]; far: number[]; true5: number[]; desirOnly: boolean }
  /** insight: 스스로 아는 나 = 실제 + insight × 잡음. */
  function student(insight: number, desirOnly = false): Student {
    const u = IDS.map(() => gauss())
    const v = u.map(x => x + insight * gauss())
    const byV = [...Array(N).keys()].sort((a, b) => v[b]! - v[a]!)
    const k = 8 + Math.floor(rnd() * 8)
    const true5 = [...Array(N).keys()].sort((a, b) => u[b]! - u[a]!).slice(0, 5)
    return { u, v, picked: byV.slice(0, k), far: byV.slice(N - 3), true5, desirOnly }
  }
  // 둘 중 하나: 실제 성향 차이 + 문장 고유의 좋아 보임(물을 때마다 새로 뽑힌다) + 잡음
  const chooseA = (s: Student, a: number, b: number) => {
    const da = desir[a]! + sscale * gauss(), db = desir[b]! + sscale * gauss()
    const x = s.desirOnly ? 2 * (da - db) : (s.u[a]! - s.u[b]!) / 0.6
    return rnd() < sig(x)
  }
  /** 엔진에 60문항을 묻고 답한다. respond가 없으면 학생 모델로 a/b를 고른다. */
  function take(s: Student, respond?: () => string): string[] {
    const state: FunnelState = { picked: s.picked.map(i => IDS[i]!), far: s.far.map(i => IDS[i]!), answers: [] }
    for (let step = nextStep(state); step; step = nextStep(state)) {
      state.answers.push(respond ? respond() : chooseA(s, IDS.indexOf(step.a), IDS.indexOf(step.b)) ? 'a' : 'b')
    }
    return state.answers
  }
  const topOf = (s: Student, answers: string[]) => resultOf({ picked: s.picked.map(i => IDS[i]!), far: s.far.map(i => IDS[i]!), answers }).top.map(id => IDS.indexOf(id))
  return { rnd, student, take, topOf }
}

describe('가상 학생 시험 (60문항, 실제 엔진)', { timeout: 300_000 }, () => {
  test('자기를 반쯤 아는 학생 2000명: 스스로 고른 순서보다 0.5 이상 더 맞히고, 1단계에서 놓친 진짜 단어를 25% 이상 찾아낸다', () => {
    const M = 2000
    const w = world(12345, 0.2, 1)
    let self = 0, mine = 0, missN = 0, fixed = 0, wrongN = 0, dropped = 0
    for (let m = 0; m < M; m++) {
      const s = w.student(1.0)
      const selfTop = [...s.picked].sort((a, b) => s.v[b]! - s.v[a]!).slice(0, 5)
      const hit = (t: number[]) => t.filter(i => s.true5.includes(i)).length
      const top = w.topOf(s, w.take(s))
      self += hit(selfTop); mine += hit(top)
      const missed = s.true5.filter(i => !s.picked.includes(i)) // 진짜 단어인데 1단계에서 안 고름
      missN += missed.length; fixed += missed.filter(i => top.includes(i)).length
      const wrong = selfTop.filter(i => !s.true5.includes(i)) // 스스로 다섯에 넣었지만 진짜가 아님
      wrongN += wrong.length; dropped += wrong.filter(i => !top.includes(i)).length
    }
    console.log(`[자기를 반쯤 아는 학생 ${M}명] 맞힘(5개 중): 스스로 고른 그대로 ${(self / M).toFixed(2)} | 60문항 ${(mine / M).toFixed(2)} | 놓친 진짜 단어를 찾아낸 비율 ${(100 * fixed / missN).toFixed(0)}% (학생당 ${(missN / M).toFixed(2)}개) | 스스로 잘못 넣은 단어를 빼낸 비율 ${(100 * dropped / wrongN).toFixed(0)}%`)
    // 제가 정한 기준: 원형 측정(600명)은 2.54 → 3.41(+0.87), 놓친 단어 찾기 29~48%였다. 그보다 느슨하게 잡았다.
    expect(mine / M - self / M).toBeGreaterThanOrEqual(0.5)
    expect(fixed / missN).toBeGreaterThanOrEqual(0.25)
  })

  test('좋아 보이는 쪽만 고르는 학생: 단어별 다섯 진입률 최대가 40% 이하다 (문장을 돌려 쓰는 효과)', () => {
    const M = 2000
    const w = world(777, 0.2, 1) // 원형 SSCALE=1(문장마다 쏠림 새로 뽑기), DSCALE=0.2(단어 자체 쏠림)
    const cnt = new Array(N).fill(0)
    for (let m = 0; m < M; m++) { const s = w.student(1.0, true); for (const i of w.topOf(s, w.take(s))) cnt[i]++ }
    const pct = cnt.map(c => (100 * c) / M)
    console.log(`[좋아 보이는 쪽만 고르는 학생 ${M}명] 단어별 다섯 진입률 ${Math.min(...pct).toFixed(1)}~${Math.max(...pct).toFixed(1)}% (평평하면 모두 ${(500 / N).toFixed(1)}%)`)
    // 제가 정한 기준: 같은 문장만 쓰면 최대 92%였고 문장을 돌려 쓴 원형은 최대 31.6%였다. 40%를 넘으면 문장 돌려 쓰기가 효과가 없는 것이다.
    expect(Math.max(...pct)).toBeLessThanOrEqual(40)
  })

  test('아무렇게나 누르는 학생: 단어별 다섯 진입률의 최대/최소 비가 2.0 이하다', () => {
    const M = 2000
    const w = world(4242, 0.2, 1)
    const keys = ['a2', 'a', 'b', 'b2', 'both', 'none']
    const cnt = new Array(N).fill(0)
    for (let m = 0; m < M; m++) { const s = w.student(1.0); for (const i of w.topOf(s, w.take(s, () => keys[Math.floor(w.rnd() * 4)]!))) cnt[i]++ }
    const pct = cnt.map(c => (100 * c) / M)
    const ratio = Math.max(...pct) / Math.min(...pct)
    console.log(`[아무렇게나 누르는 학생 ${M}명] 단어별 다섯 진입률 ${Math.min(...pct).toFixed(1)}~${Math.max(...pct).toFixed(1)}%, 최대/최소 ${ratio.toFixed(2)}`)
    // 제가 정한 기준: 학생이 아무 정보도 주지 않으면 어느 단어도 두 배 넘게 더 나오거나 덜 나오면 안 된다.
    expect(ratio).toBeLessThanOrEqual(2.0)
  })
})
