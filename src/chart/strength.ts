// 명식의 "있다/없다"를 "얼마나 센가"로 바꾸는 계산. 풀이 문구는 없고 숫자와 단계만 만든다.
// 이 파일의 자리 점수와 기준값은 전부 제가 정한 단순 기준이다(전통 문헌에서 가져온 값이 아니다).
// 근거와 바꾸는 법은 design-current.md의 "명식 세기 계산" 절에 있다. 화면에는 쓰지 않는다.
//
// 공개 함수(운세 문단에서도 그대로 쓴다):
//   measureChart({ pillars, dayStem })  → ChartStrength 전체
//   elementWeights(pillars)             → 오행별 세기 합 (겉 + 지장간)
//   godScores(pillars, dayStem)         → 십신별 점수·단계·자리
//   dayStemStrength(pillars, dayStem)   → 신강·중화·신약
//   godLevelOf(strength, god)           → 한글·한자 어느 쪽 이름으로도 단계 조회
import { getHiddenStems, getJeonggi, getRelation } from '@orrery/core'
import type { Element, Pillar } from './chart'
import { GROUPS, GROUP_OF, type Group } from './features'

export type Level = '없음' | '약' | '중' | '강'
export type DayLevel = '신강' | '중화' | '신약'

const STEM_ELEMENT: Record<string, Element> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' }

/** 제가 정한 기준: 오행 세기. 천간 1, 지지 본기 1, 지장간 중기·여기는 0.5. */
export const ELEMENT_W = { stem: 1, branchMain: 1, hidden: 0.5 } as const
/**
 * 제가 정한 기준: "넘친다"의 문턱. 한 오행의 세기가 전체 세기에서 차지하는 몫이 이 값 이상이면 넘친다고 본다.
 * 전체가 8자(시각 모름은 6자)이고 오행이 다섯이라 평균 몫은 0.2다. 평균의 1.8배(0.36)로 두면
 * 무작위 학생의 약 4분의 1에게 켜진다(시험에서 확인). 몫으로 재서 6자와 8자를 같은 기준으로 비교한다.
 */
export const EXCESS_SHARE = 0.4

/** 제가 정한 기준: 십신 점수의 자리 점수. 월지가 가장 무겁다는 월령 원칙을 따르고, 나머지는 가까운 자리일수록 무겁게 줬다. */
export const GOD_PLACE_W = {
  '월지': 3, '일지': 2, '연지': 1, '시지': 1,
  '월간': 1, '시간': 1, '연간': 0.7,
  hidden: 0.5,
} as const
/** 제가 정한 기준: 천간에 드러난 십신이 지지(지장간 포함)에 같은 오행의 뿌리를 두면 더하는 점수. */
export const ROOT_BONUS = 1
/**
 * 제가 정한 기준: 십신 점수 → 단계. 강 3 이상(월지 본기 하나, 또는 그와 맞먹는 합), 중 2 이상(일지 본기 하나, 또는 월간·시간이 뿌리를 둔 경우), 그 아래는 약. 0이면 없음.
 * 중을 1.5로 두면 "연간 하나 + 뿌리"(1.7)처럼 연주·시주 한 자리에 기댄 십신도 중이 되어 통합 칸의 약한 자리 근거가 40%에서 22%까지만 줄었다. 2로 올려 15%로 줄였다.
 */
export const GOD_LEVEL_AT = { strong: 3, mid: 2 } as const
/**
 * 제가 정한 기준: 십신 무리(비겁·식상·재성·관성·인성) 점수 → 단계. 중은 월지 본기 하나(3).
 * 강은 처음 5(월지 본기+일지 본기)로 두었더니 무작위 학생의 79%가 "넘치는 무리"를 하나 이상 가졌다(점수 합이 평균 14라 다섯 무리 평균이 2.8이기 때문).
 * 6이면 44%, 7이면 18%여서 목표(약 20~30%)에 맞춰 6.5(30%)로 올렸다.
 */
export const GROUP_LEVEL_AT = { strong: 6.5, mid: 3 } as const
/** 제가 정한 기준: 일간 강약. 일간을 돕는 십신(비겁·인성)이 전체 점수에서 차지하는 몫. */
export const DAY_LEVEL_AT = { strong: 0.5, weak: 0.3 } as const

export const GOD_HANJA_LIST = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '正印'] as const
export const GOD_HANGUL: Record<string, string> = {
  比肩: '비견', 劫財: '겁재', 食神: '식신', 傷官: '상관', 偏財: '편재', 正財: '정재', 偏官: '편관', 正官: '정관', 偏印: '편인', 正印: '정인',
}
const HANGUL_TO_HANJA = Object.fromEntries(Object.entries(GOD_HANGUL).map(([h, k]) => [k, h])) as Record<string, string>
/** 일간을 돕는 십신: 비겁(같은 오행)과 인성(나를 낳는 오행). */
const HELPING = new Set(['比肩', '劫財', '偏印', '正印'])

export type GodStrength = {
  /** 자리 점수의 합(뿌리 가산 포함). */
  score: number
  level: Level
  /** 겉(천간·지지 본기)에 있는 자리. 월지·일지·연지·시지·월간·시간·연간 중. */
  places: string[]
  /** 지장간(중기·여기)에만 있는 자리가 있는가. 겉에 없고 여기에만 있으면 places가 비어 있다. */
  hidden: boolean
  /** 천간에 드러났고 지지에 뿌리가 있는가. */
  rooted: boolean
}

export type ChartStrength = {
  /** 오행별 세기 합(겉 + 지장간). */
  weights: Record<Element, number>
  /** 겉(천간 + 지지 본기)에는 없고 지장간에만 있는 오행. */
  hiddenOnly: Element[]
  /** 겉에도 지장간에도 없는 오행. 시각을 모르면 시주가 채울 수 있어서 호출하는 쪽이 판단한다. */
  absent: Element[]
  /** 세기 몫이 문턱 이상인 오행, 세기 큰 순. */
  excess: Element[]
  /** 십신(한자 이름)별. */
  gods: Record<string, GodStrength>
  /** 십신 무리별 점수와 단계. */
  groups: Record<Group, { score: number; level: Level }>
  day: DayStemStrength
}

export type DayStemStrength = {
  level: DayLevel
  /** 일간을 돕는 점수 ÷ 전체 점수. */
  ratio: number
  /** 월지 본기가 일간과 같은 오행이거나 일간을 낳는 오행인가. */
  deukryeong: boolean
  /** 일지 본기가 그런가. */
  deukji: boolean
  /** 나머지 자리(천간, 연지·시지, 지장간)에서 일간을 돕는 점수의 합. */
  deukse: number
}

const toLevel = (score: number, at: { strong: number; mid: number }): Level => (score <= 0 ? '없음' : score >= at.strong ? '강' : score >= at.mid ? '중' : '약')

/** 지장간 글자(여기→중기→본기 순, 마지막이 본기). */
const hiddenOf = (branch: string): string => getHiddenStems(branch).replace(/\s/g, '')

type Slot = { place: string; god: string; weight: number; hidden: boolean }
const PLACE_OF = { 시주: '시', 일주: '일', 월주: '월', 연주: '연' } as const

/** 십신이 있는 자리를 하나씩 펼친다. 일간 자신은 십신이 없어 빠진다. */
function slotsOf(pillars: Pillar[], dayStem: string): { slots: Slot[]; stemOf: Map<string, string[]> } {
  const slots: Slot[] = []
  const stemOf = new Map<string, string[]>()
  const godOf = (ch: string): string => getRelation(dayStem, ch)?.hanja ?? ''
  for (const p of pillars) {
    const s = PLACE_OF[p.label]
    if (p.label !== '일주') {
      const g = godOf(p.stem)
      const place = `${s}간`
      if (g) { slots.push({ place, god: g, weight: GOD_PLACE_W[place as '월간' | '시간' | '연간'], hidden: false }); stemOf.set(g, [...(stemOf.get(g) ?? []), p.stem]) }
    }
    const main = getJeonggi(p.branch)
    const bplace = `${s}지`
    const bg = godOf(main)
    if (bg) slots.push({ place: bplace, god: bg, weight: GOD_PLACE_W[bplace as '월지' | '일지' | '연지' | '시지'], hidden: false })
    for (const ch of hiddenOf(p.branch).slice(0, -1)) {
      const g = godOf(ch)
      if (g) slots.push({ place: bplace, god: g, weight: GOD_PLACE_W.hidden, hidden: true })
    }
  }
  return { slots, stemOf }
}

/** 오행별 세기 합(겉 + 지장간)과 겉에만 센 개수. */
export function elementWeights(pillars: Pillar[]): { weights: Record<Element, number>; surface: Record<Element, number> } {
  const weights: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const surface: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const p of pillars) {
    const se = STEM_ELEMENT[p.stem]
    if (se) { weights[se] += ELEMENT_W.stem; surface[se]++ }
    const hs = hiddenOf(p.branch)
    const main = hs.slice(-1)
    const be = STEM_ELEMENT[main]
    if (be) { weights[be] += ELEMENT_W.branchMain; surface[be]++ }
    for (const ch of hs.slice(0, -1)) {
      const e = STEM_ELEMENT[ch]
      if (e) weights[e] += ELEMENT_W.hidden
    }
  }
  return { weights, surface }
}

/** 십신별 점수·단계·자리. 키는 한자 이름(比肩…正印). 점수가 0인 십신도 키를 둔다. */
export function godScores(pillars: Pillar[], dayStem: string): Record<string, GodStrength> {
  const { slots, stemOf } = slotsOf(pillars, dayStem)
  // 뿌리: 천간에 드러난 글자와 같은 오행의 글자가 어느 지지의 지장간(본기 포함)에든 있는가.
  const branchElements = new Set<Element>()
  for (const p of pillars) for (const ch of hiddenOf(p.branch)) { const e = STEM_ELEMENT[ch]; if (e) branchElements.add(e) }
  const out: Record<string, GodStrength> = {}
  for (const g of GOD_HANJA_LIST) out[g] = { score: 0, level: '없음', places: [], hidden: false, rooted: false }
  for (const s of slots) {
    const o = out[s.god]!
    o.score += s.weight
    if (s.hidden) o.hidden = true
    else o.places.push(s.place)
  }
  // 뿌리 가산: 지장간 점수와 겹쳐 세지 않도록, 뿌리가 있는 십신의 지장간 점수는 뿌리 가산(1)과 둘 중 큰 쪽만 쓴다.
  const hiddenPts: Record<string, number> = {}
  for (const s of slots) if (s.hidden) hiddenPts[s.god] = (hiddenPts[s.god] ?? 0) + s.weight
  for (const [g, stems] of stemOf) {
    const o = out[g]!
    if (stems.some(st => branchElements.has(STEM_ELEMENT[st]!))) { o.rooted = true; o.score += Math.max(ROOT_BONUS - (hiddenPts[g] ?? 0), 0) }
  }
  for (const g of GOD_HANJA_LIST) {
    const o = out[g]!
    let level = toLevel(o.score, GOD_LEVEL_AT)
    // 강은 월지·일지 본기가 있거나 겉 자리가 2곳 이상일 때만. 연·시 한 자리를 숨은 글자와 뿌리로 받친 정도는 중까지.
    if (level === '강' && !(o.places.includes('월지') || o.places.includes('일지') || o.places.length >= 2)) level = '중'
    o.level = level
  }
  return out
}

export function dayStemStrength(pillars: Pillar[], dayStem: string): DayStemStrength {
  const { slots } = slotsOf(pillars, dayStem)
  let total = 0, support = 0, deukse = 0
  let deukryeong = false, deukji = false
  for (const s of slots) {
    total += s.weight
    const helps = HELPING.has(s.god)
    if (!helps) continue
    support += s.weight
    if (!s.hidden && s.place === '월지') deukryeong = true
    else if (!s.hidden && s.place === '일지') deukji = true
    else deukse += s.weight
  }
  const ratio = total === 0 ? 0 : support / total
  const level: DayLevel = ratio >= DAY_LEVEL_AT.strong ? '신강' : ratio < DAY_LEVEL_AT.weak ? '신약' : '중화'
  return { level, ratio, deukryeong, deukji, deukse }
}

const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** 명식 하나의 세기 전부. 같은 입력은 늘 같은 결과다. */
export function measureChart(c: { pillars: Pillar[]; dayStem: string }): ChartStrength {
  const { weights, surface } = elementWeights(c.pillars)
  const sum = ELEMENTS.reduce((a, e) => a + weights[e], 0)
  const gods = godScores(c.pillars, c.dayStem)
  const groups = Object.fromEntries(GROUPS.map(g => {
    const score = GOD_HANJA_LIST.filter(h => GROUP_OF[GOD_HANGUL[h]!] === g).reduce((a, h) => a + gods[h]!.score, 0)
    return [g, { score, level: toLevel(score, GROUP_LEVEL_AT) }]
  })) as ChartStrength['groups']
  return {
    weights,
    hiddenOnly: ELEMENTS.filter(e => surface[e] === 0 && weights[e] > 0),
    absent: ELEMENTS.filter(e => weights[e] === 0),
    excess: ELEMENTS.filter(e => sum > 0 && weights[e] / sum >= EXCESS_SHARE).sort((a, b) => weights[b] - weights[a]),
    gods, groups,
    day: dayStemStrength(c.pillars, c.dayStem),
  }
}

/**
 * 제가 정한 기준: 자미두수 주성의 단계. 밝기 묘·왕은 강, 득·리는 중, 평·불·함은 약이다(밝기가 낮으면 별의 성질이 곧게 나오지 않는다는 전통 설명을 따랐다).
 * 명궁이 비어 맞은편 궁의 별을 빌려 읽는 경우는 한 단계 낮춘다(빌린 별은 힘이 약하다는 전통 설명). 밝기를 모르면(시험용 입력) 중으로 본다.
 */
export function starLevel(brightness: string | undefined, borrowed: boolean): Level {
  const base: Level = !brightness ? '중' : '廟旺'.includes(brightness) ? '강' : '得利'.includes(brightness) ? '중' : '약'
  return !borrowed ? base : base === '강' ? '중' : '약'
}

/** 십신의 단계. 한글(식신)과 한자(食神) 어느 쪽 이름이든 받는다. */
export function godLevelOf(s: ChartStrength, god: string): Level {
  return s.gods[HANGUL_TO_HANJA[god] ?? god]?.level ?? '없음'
}
