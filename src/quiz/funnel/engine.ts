// 답으로 판정하는 검사 엔진: 1단계에서 고른 단어(picked, far)는 출발점일 뿐이고, 60개의 "둘 중 어느 쪽이 더 나 같나요?" 답으로 점수를 정한다.
// 순수 함수라 같은 입력이면 항상 같은 문항과 같은 결과다. 이전 버튼은 답 하나를 지우면 된다.
// 알고리즘은 design/experiments/measured-test-20261109.ts(가상 학생으로 검증한 원형)를 그대로 옮긴 것이다.
import { STATEMENTS } from '../../content/statements'
import { WORDS } from '../../content/words'

export const MIN_PICK = 8
export const MAX_PICK = 15
export const FAR_COUNT = 3
/** 마지막 확인에 보여 줄 후보 수와 그중 고르는 수(다섯 단어). 다음 두 단어는 남은 후보 중 점수 순으로 엔진이 정한다. */
export const FINAL_CANDIDATES = 8
export const FINAL_PICK = 5
/** 제가 정한 값: 문항은 60개. 처음 34개는 모든 단어를 두 번씩 고루 보고, 나머지 26개는 다섯 단어 경계에 몰아 묻는다. */
export const QUESTIONS = 60
export const COVER = 34
/** 제가 정한 값: 1단계 선택은 출발점 점수일 뿐이다. 고른 단어 +0.6, 먼 단어 -0.6, 사전 강도 1.0(답이 쌓이면 답이 이긴다). */
export const PRIOR_PICKED = 0.6
export const PRIOR_FAR = -0.6
export const PRIOR_PREC = 1.0
/** 제가 정한 값: 경계 근처 단어를 고르는 민감도(1.5)와 뉴턴 갱신 횟수(30). */
const NEED_SLOPE = 1.5
const FIT_ITERS = 30
/** 제가 정한 값: 둘 다 맞아요·둘 다 아니에요가 이 비율을 넘으면 둘을 거의 가르지 않은 것이다. */
const THIN_RATIO = 0.6

/**
 * final: 마지막 확인에서 학생이 누른 순서(후보 id). 있으면 점수 순서 대신 이 순서가 결과가 된다.
 * answers는 'a2'|'a'|'b'|'b2'|'both'|'none'. a·b는 "조금 더 나 같아요", a2·b2는 "훨씬 더 나 같아요"(PI 결정 2026-11-10).
 */
export type FunnelState = { picked: string[]; far: string[]; answers: string[]; final?: string[] }
/** 한 문항: 단어 a·b의 행동 문장 두 개. 화면에는 단어 이름 없이 문장만 보인다. index는 1부터. */
export type FunnelStep = { kind: 'pair'; a: string; b: string; textA: string; textB: string; index: number; total: number }

/** 예전 영역 메모. 보고서 호환을 위해 타입만 남기고 결과에서는 늘 빈 목록이다. */
export type ContextNote = { a: string; b: string; usual: string | null; people: string | null }
/** thin: 둘 다 맞아요·둘 다 아니에요가 60%를 넘어 학생이 둘을 거의 가르지 않았다는 뜻(근거가 얇다). */
export type FunnelResult = { top: string[]; support: string[]; far: string[]; contexts: ContextNote[]; thin: boolean }

const KEYS = ['a2', 'a', 'b', 'b2', 'both', 'none']
const IDS = WORDS.map(w => w.id)
/** 단어마다 문장 수(8). 한 단어는 이만큼까지만 물어서 한 학생이 같은 문장을 두 번 보지 않는다(PI 결정 2026-11-09). */
const SHOWN_MAX = STATEMENTS[IDS[0]!]!.length
const N = IDS.length
const ANCHOR = N // 보통 단어 기준점(θ=0 고정)
const IDX = new Map(IDS.map((id, i) => [id, i]))

/** 같은 입력이면 같은 값. 고른 순서와 단어 목록 순서가 섞기·동점에 영향을 주지 않게 한다. */
export function tieHash(seed: string, id: string): number {
  let h = 2166136261
  for (const c of `${seed}|${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  // 마지막 글자만 다른 이름(A·B·C)도 서로 다른 순서가 되도록 비트를 한 번 더 섞는다.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16
  return h >>> 0
}
/** 고른 단어 묶음의 이름: 고른 순서와 무관하다. */
export const setKey = (picked: string[]): string => [...picked].sort().join(',')

const sig = (x: number) => 1 / (1 + Math.exp(-x))

/** Bradley–Terry + 사전 점수(MAP). games의 [이긴 쪽, 진 쪽]으로 θ를 맞춘다. 기준점(ANCHOR)은 0에 고정. */
function fit(prior: number[], games: [number, number][]): number[] {
  const th = [...prior]
  for (let it = 0; it < FIT_ITERS; it++) {
    const g = th.map((t, i) => -PRIOR_PREC * (t - prior[i]!))
    const h = th.map(() => PRIOR_PREC)
    for (const [w, l] of games) {
      const p = sig(th[w]! - th[l]!)
      g[w]! += 1 - p; g[l]! -= 1 - p
      h[w]! += p * (1 - p); h[l]! += p * (1 - p)
    }
    for (let i = 0; i < N; i++) th[i]! += g[i]! / h[i]!
  }
  return th
}

/**
 * 답 하나를 승부로 바꾼다: a/b("조금 더")는 한 번 이기고, a2/b2("훨씬 더")는 두 번 이긴 것으로 센다(제가 정한 값),
 * both는 둘 다 기준점을 이기고, none은 기준점이 둘 다 이긴다.
 * 가상 학생 비교(design/experiments/response-format-20261110.md)에서 이렇게 나누면 맞힘이 5개 중 0.05~0.09개 늘었다.
 */
function gamesOf(a: number, b: number, key: string): [number, number][] {
  if (key === 'a') return [[a, b]]
  if (key === 'b') return [[b, a]]
  if (key === 'a2') return [[a, b], [a, b]]
  if (key === 'b2') return [[b, a], [b, a]]
  if (key === 'both') return [[a, ANCHOR], [b, ANCHOR]]
  return [[ANCHOR, a], [ANCHOR, b]]
}

/** 처음 34문항: 단어 34개를 한 바퀴에 한 번씩, 두 바퀴. 바퀴마다 결정적으로 섞어 둘씩 짝짓고, 앞 바퀴와 같은 짝이면 바로 다음 단어와 바꾼다. */
function coverPairs(seed: string): [number, number][] {
  const out: [number, number][] = []
  const seen = new Set<string>()
  const key = (x: number, y: number) => (x < y ? `${x}:${y}` : `${y}:${x}`)
  for (let round = 0; round < 2; round++) {
    const order = IDS.map((_, i) => i).sort((p, q) => tieHash(`${seed}#${round}`, IDS[p]!) - tieHash(`${seed}#${round}`, IDS[q]!))
    for (let i = 0; i + 1 < N; i += 2) {
      if (!seen.has(key(order[i]!, order[i + 1]!))) continue
      const j = i + 2 < N ? i + 2 : i - 1 // 바로 다음 단어(마지막 짝이면 앞 짝의 둘째)와 자리를 바꾼다
      ;[order[i + 1], order[j]] = [order[j]!, order[i + 1]!]
    }
    for (let i = 0; i + 1 < N; i += 2) { out.push([order[i]!, order[i + 1]!]); seen.add(key(order[i]!, order[i + 1]!)) }
  }
  return out
}

/** 지금까지의 답으로 쌓은 상태. 같은 학생이 답을 이어 가면 처음부터 다시 계산하지 않고 이어서 계산한다. */
type Session = {
  key: string
  seed: string
  prior: number[]
  cover: [number, number][]
  answers: string[]
  steps: FunnelStep[] // steps[i]는 i번째 문항(0부터). answers.length번째까지 만들어 둔다
  games: [number, number][]
  count: number[] // 단어별 물어본 횟수
  asked: Set<string> // 이미 물어본 짝
  pending: number[] // 1단계에서 고른 단어가 "둘 다 아니에요"를 받은 뒤 아직 다시 묻지 않은 단어
  theta: number[] | null
  picked: Set<string>
  hash: number[] // 단어별 문장 시작 위치(고른 단어 묶음에 따라 달라진다)
}
let cached: Session | null = null

const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)
const thetaOf = (s: Session): number[] => (s.theta ??= fit(s.prior, s.games))

function start(state: FunnelState): Session {
  const picked = new Set(state.picked), far = new Set(state.far)
  const sk = setKey(state.picked)
  const s: Session = {
    key: `${sk}!${setKey(state.far)}`,
    seed: sk,
    prior: [...IDS.map(id => (picked.has(id) ? PRIOR_PICKED : far.has(id) ? PRIOR_FAR : 0)), 0],
    cover: coverPairs(`${sk}#${setKey(state.far)}`),
    answers: [], steps: [], games: [], count: new Array(N).fill(0), asked: new Set(), pending: [], theta: null, picked,
    hash: IDS.map(id => tieHash(sk, id) % SHOWN_MAX),
  }
  plan(s)
  return s
}

/** 다음 문항을 정해 steps에 넣는다. 60개가 쌓였으면 아무것도 하지 않는다. */
function plan(s: Session): void {
  const i = s.answers.length
  if (i >= QUESTIONS) return
  const [a, b] = i < COVER ? s.cover[i]! : adaptive(s, i)
  const text = (w: number) => STATEMENTS[IDS[w]!]![(s.count[w]! + s.hash[w]!) % SHOWN_MAX]!
  s.steps[i] = { kind: 'pair', a: IDS[a]!, b: IDS[b]!, textA: text(a), textB: text(b), index: i + 1, total: QUESTIONS }
}

/** 문항 35~60: 다섯 단어 경계(5위와 6위의 가운데)에 가깝고 덜 물어본 단어를, 점수가 비슷한 상대와 붙인다. */
function adaptive(s: Session, i: number): [number, number] {
  const th = thetaOf(s)
  const rank = IDS.map((_, k) => k).sort((p, q) => th[q]! - th[p]! || tieHash(`${s.seed}#${s.answers.join('')}#rank`, IDS[p]!) - tieHash(`${s.seed}#${s.answers.join('')}#rank`, IDS[q]!))
  const cut = (th[rank[FINAL_PICK - 1]!]! + th[rank[FINAL_PICK]!]!) / 2
  const seed = `${s.seed}#${s.answers.join('')}#${i}`
  const need = (k: number) => Math.exp(-NEED_SLOPE * Math.abs(th[k]! - cut)) / Math.sqrt(1 + s.count[k]!)
  const byNeed = (p: number, q: number) => need(q) - need(p) || tieHash(seed, IDS[p]!) - tieHash(seed, IDS[q]!)
  // 문장 8개를 다 쓴 단어는 더 묻지 않는다.
  const open = (k: number) => s.count[k]! < SHOWN_MAX
  // 스스로 고른 단어가 "둘 다 아니에요"를 받았는데 아직 다시 안 물어봤다면 먼저 한 번 더 확인한다.
  const pending = s.pending.filter(open)
  const a = pending.length > 0 ? [...pending].sort(byNeed)[0]! : IDS.map((_, k) => k).filter(open).sort(byNeed)[0]!
  const side = th[a]! >= cut ? rank.slice(3, 9) : rank.slice(2, 7) // 위쪽이면 4~9위, 아래쪽이면 3~7위
  const near = side.filter(x => x !== a && open(x))
  // 그 범위가 모두 문장을 다 썼으면 순위가 가장 가까운 단어로 넓힌다.
  const pos = rank.indexOf(a)
  const cands = near.length > 0 ? near : rank.filter(x => x !== a && open(x)).sort((p, q) => Math.abs(rank.indexOf(p) - pos) - Math.abs(rank.indexOf(q) - pos)).slice(0, 1)
  const fresh = cands.filter(x => !s.asked.has(pairKey(a, x)))
  const pool = fresh.length > 0 ? fresh : cands // 모두 물어봤으면 반복을 허용한다
  const b = [...pool].sort((p, q) => s.count[p]! - s.count[q]! || tieHash(seed + 'b', IDS[p]!) - tieHash(seed + 'b', IDS[q]!))[0]!
  return [a, b]
}

function apply(s: Session, key: string): void {
  const i = s.answers.length
  const step = s.steps[i]!
  const a = IDX.get(step.a)!, b = IDX.get(step.b)!
  s.games.push(...gamesOf(a, b, key))
  s.count[a]!++; s.count[b]!++
  s.asked.add(pairKey(a, b))
  s.pending = s.pending.filter(w => w !== a && w !== b)
  if (key === 'none') for (const w of [a, b]) if (s.picked.has(IDS[w]!)) s.pending.push(w)
  s.answers.push(key)
  s.theta = null
  plan(s)
}

/** 저장값이 깨진 경우를 위해 앞에서부터 유효한 답(6개 중 하나, 60개 이하)만 남긴다. */
export function validAnswers(state: FunnelState): string[] {
  const out: string[] = []
  for (const k of state.answers) { if (out.length >= QUESTIONS || !KEYS.includes(k)) break; out.push(k) }
  return out
}

function session(state: FunnelState): Session {
  const answers = validAnswers(state)
  const key = `${setKey(state.picked)}!${setKey(state.far)}`
  let s = cached
  if (!s || s.key !== key || s.answers.length > answers.length || s.answers.some((k, i) => k !== answers[i])) s = start(state)
  for (let i = s.answers.length; i < answers.length; i++) apply(s, answers[i]!)
  cached = s
  return s
}

/** 다음 문항. 60개를 모두 답했으면 null. */
export function nextStep(state: FunnelState): FunnelStep | null {
  const s = session(state)
  return s.steps[s.answers.length] ?? null
}

/** 지금까지 답한 개수(유효한 것만). */
export function answeredCount(state: FunnelState): number { return validAnswers(state).length }

/** 단어별 점수 θ(보통 단어 기준점이 0). 마지막 확인 화면의 안내에 쓴다. */
export function scoresOf(state: FunnelState): Map<string, number> {
  const th = thetaOf(session(state))
  return new Map(IDS.map((id, i) => [id, th[i]!]))
}

/** θ 순서의 모든 단어. 동점은 입력에서 정한 해시 순서라 단어 목록 위치나 고른 순서가 유리하지 않다. */
function rankedOf(state: FunnelState): string[] {
  const s = session(state)
  const th = thetaOf(s)
  const seed = `${s.seed}#${s.answers.join('')}`
  return IDS.map((_, i) => i).sort((p, q) => th[q]! - th[p]! || tieHash(seed, IDS[p]!) - tieHash(seed, IDS[q]!)).map(i => IDS[i]!)
}

/** 마지막 확인에서 골라야 하는 개수: 후보가 5개 이상이면 5개, 그보다 적으면 후보 전부. */
export function finalRequired(candidateCount: number): number {
  return Math.min(candidateCount, FINAL_PICK)
}

/**
 * 마지막 확인에 보여 줄 후보: 점수 상위 8개(점수는 보이지 않는다). 화면에서 점수 순서가 드러나지 않게
 * 입력으로 정해지는 해시 순서로 섞는다. 같은 입력이면 같은 순서라 새로고침해도 그대로다.
 */
export function finalCandidates(state: FunnelState): string[] {
  const seed = `${setKey(state.picked)}#${validAnswers(state).join('')}#final`
  return rankedOf(state).slice(0, FINAL_CANDIDATES).sort((p, q) => tieHash(seed, p) - tieHash(seed, q))
}

/** 학생이 직접 정한 순서(final)를 후보 안에서만 인정한다. 개수가 맞고 중복이 없고 후보 안의 단어일 때만 유효하다. */
export function validFinal(candidates: string[], final: string[] | undefined): string[] | null {
  if (!final || final.length !== finalRequired(candidates.length)) return null
  if (new Set(final).size !== final.length || !final.every(id => candidates.includes(id))) return null
  return final
}

/**
 * θ 순서가 결과다: top 5, support 6~7위. 마지막 확인(final)이 있으면 후보 8개 중 학생이 순서대로 고른 5개가 다섯 단어이고,
 * 다음 두 단어는 남은 후보 중 점수가 높은 둘이다. 먼 단어는 그대로. 영역 메모는 없다(contexts는 늘 빈 목록).
 */
export function resultOf(state: FunnelState): FunnelResult {
  const ranked = rankedOf(state)
  const head = ranked.slice(0, FINAL_CANDIDATES)
  const final = validFinal(head, state.final)
  const order = final ? [...final, ...head.filter(id => !final.includes(id))] : ranked
  const answers = validAnswers(state)
  const vague = answers.filter(k => k === 'both' || k === 'none').length
  return { top: order.slice(0, 5), support: order.slice(5, 7), far: [...state.far], contexts: [], thin: answers.length > 0 && vague > THIN_RATIO * answers.length }
}
