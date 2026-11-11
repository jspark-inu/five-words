// "세 리포트가 만나는 곳": 다섯 단어와 사주·자미두수가 겹치는 곳(일치)과 부딪치는 곳(충돌)을 고른다.
// 있다/없다가 아니라 얼마나 센가로 고른다. 기준값은 전부 제가 정한 단순 기준이다(design-current.md "통합 칸" 절).
import type { ChartFacts, Element } from '../chart/chart'
import { GROUP_HANJA, readCore } from '../chart/core'
import { GOD_PLACE_W, starLevel, type GodStrength, type Level } from '../chart/strength'
import type { Content, WordCopy } from '../content/types'
import { named as readingOf } from '../content/readings'
import type { DeepContent } from '../content/deep'
import { WORDS } from '../content/words'
import { BRIGHT_PHRASE, CLASH_FACET, CLASH_TAG, FAR_EVIDENT, MATCH_FACET, MATCH_TAG, SIPSIN_GROUPS, WATER_ZERO, waterClosing } from '../content/assemble-copy'
import { coreBridge } from '../content/core-copy'
import { hasFinalConsonant } from './josa'

/** 한 칸에 보이는 명식 풀이 하나. chartLabel은 "식신(食神)"처럼 읽기와 한자를 함께 적은 이름이고, source는 그 풀이가 사주인지 자미두수인지다. */
export type MeetingItem = { source: 'saju' | 'ziwei'; chartLabel: string; chartText: string }
/**
 * 세 리포트가 만나는 곳의 한 줄. group은 core(명식 한가운데: 격 십신과 맞닿는 단어), word(다섯 단어), far(먼 단어), water(수가 겉에도 지장간에도 없음)다.
 * level은 근거의 센 정도(강=크게 겹치거나 싸운다, 중=겹치거나 싸운다, 약=조금 겹치거나 부딪힌다)이고 far·water는 null이다.
 * chartLabel·source·chartText는 첫 풀이이고, 사주와 자미두수가 둘 다 맞으면 also에 두 번째가 들어간다.
 */
export type Meeting = {
  id: string; kind: 'match' | 'clash'; group: 'core' | 'word' | 'far' | 'water'; tag: string; level: Strength | null
  rank: number | null; wordKo: string; chartLabel: string; source: 'saju' | 'ziwei'; chartText: string
  also: MeetingItem | null; closing: string
}
type Strength = '강' | '중' | '약'
export type Entry = { ko: string; copy: WordCopy }
export type MEntry = Entry & { id: string }

/** 제가 정한 기준: 단어 순위 무게. 1위 1.0에서 5위 0.6까지 0.1씩 줄인다. 앞 순위 단어의 근거를 더 쳐 준다. */
export const RANK_WEIGHT = [1, 0.9, 0.8, 0.7, 0.6] as const
/** 제가 정한 기준: 근거 단계 무게. 강 1.0, 중 0.6, 약 0.3. */
export const LEVEL_WEIGHT = { 강: 1, 중: 0.6, 약: 0.3 } as const
/** 제가 정한 기준: 순위 무게 × 단계 무게가 이 값 이상일 때만 쓴다. 강은 5위까지 모두 통과하고(최소 0.6), 중은 1~3위만 통과한다(0.6, 0.54, 0.48). */
export const MIN_EVIDENCE = 0.45
/**
 * 문턱을 넘는 근거로 4줄을 못 채우면 문턱 아래 근거(4·5위의 중, 모든 약)로 남은 줄을 채운다(PI 결정 2026-11-09: 약한 것도 세기를 밝혀 보여 준다).
 * 이름표 앞머리가 "강한·중간·약한 일치/충돌"이라 약한 줄을 센 줄처럼 읽지 않는다. 채우는 차례는 일치 하나, 충돌 하나를 번갈아.
 */
const FILL = ['match', 'clash', 'match', 'clash', 'match', 'clash'] as const
const STRENGTH_ORDER: Record<Strength, number> = { 강: 0, 중: 1, 약: 2 }
/** 제가 정한 기준: 통합 칸은 모두 합쳐 4줄까지, 일치와 충돌은 각각 3줄까지. 쌓일수록 줄마다 눈길이 흩어져서 상한을 둔다. */
export const MAX_LINES = 4
export const MAX_PER_KIND = 3
/** 줄을 채우는 차례. 일치 하나, 충돌 하나를 먼저 보이고 규칙이 만든 희소한 칸(먼 단어, 수)을 그다음에 넣는다. */
const SEQUENCE = ['match', 'clash', 'far', 'water', 'match', 'clash', 'match', 'clash'] as const

type Ev = { label: string; source: 'saju' | 'ziwei'; level: Strength; score: number }
type Picked = { idx: number; evs: Ev[]; score: number }

const josaI = (ko: string) => (hasFinalConsonant(ko) ? '이' : '가')
/** 풀이 문구 끝의 조사: "~별"은 "로", "~기운"은 "으로". */
const tail = (facet: string) => (facet.endsWith('별') ? '로' : '으로')
const josaEul = (ko: string) => (hasFinalConsonant(ko) ? '을' : '를')

/**
 * 근거 문장의 자리 표기. 겉(천간·지지 본기) 자리는 무거운 순으로 2곳까지만 쓴다.
 * 지장간은 "숨은 글자"로 풀어 쓰고, 숨은 글자로 받쳐 주는 말(지장간 점수, 뿌리)은 한 번만 쓴다. 겉 자리가 없으면 "숨은 글자에만 있어".
 */
function whereText(g: GodStrength): string {
  const places = [...g.places].sort((a, b) => (GOD_PLACE_W[b as keyof typeof GOD_PLACE_W] ?? 0) - (GOD_PLACE_W[a as keyof typeof GOD_PLACE_W] ?? 0)).slice(0, 2)
  if (places.length === 0) return '숨은 글자에만 있어'
  return `${places.join('·')}에 있${g.hidden || g.rooted ? '고 숨은 글자로도 받쳐 주어,' : '어'}`
}

export function pickMeetings(
  entries: MEntry[], chart: ChartFacts, content: Content, far: string[] | undefined, timeKnown: boolean, deep?: DeepContent,
): { meetings: Meeting[]; closing: { id: string; wordKo: string; text: string }[] } {
  const stars = chart.ziwei?.mainStars ?? []
  const borrowed = chart.ziwei?.borrowed ?? false
  const named = (label: string) => readingOf(content.readings, label)
  const koOf = (label: string) => content.readings[label] ?? label
  const row = (m: Omit<Meeting, 'source' | 'chartLabel' | 'chartText' | 'also'> & { items: MeetingItem[] }): Meeting => {
    const [first, second] = m.items as [MeetingItem, MeetingItem | undefined]
    const { items: _items, ...rest } = m
    return { ...rest, source: first.source, chartLabel: first.chartLabel, chartText: first.chartText, also: second ?? null }
  }

  const sajuItem = (label: string, facets: Record<string, string>): MeetingItem => {
    const ko = koOf(label)
    const g = chart.strength.gods[label]!
    const where = whereText(g)
    return { source: 'saju', chartLabel: named(label), chartText: `${named(label)}${josaI(ko)} ${where} ${facets[label]}${tail(facets[label]!)} 풉니다.` }
  }
  const starItem = (label: string, facets: Record<string, string>): MeetingItem => {
    const star = `${koOf(label)}성(${label})`
    const b = chart.ziwei?.brightness?.[label]
    const bright = b && BRIGHT_PHRASE[b] ? ` ${koOf(label)}의 밝기는 ${BRIGHT_PHRASE[b]}입니다.` : ''
    const lead = borrowed
      ? `명궁이 비어 맞은편 궁의 ${star}${josaEul('성')} 빌려 읽고, 그만큼 한 단계 낮춰 읽습니다.${bright}`
      : `명궁에 ${star}${josaI('성')} 있습니다.${bright}`
    return { source: 'ziwei', chartLabel: named(label), chartText: `${lead} ${facets[label]}${tail(facets[label]!)} 풉니다.` }
  }

  /** 단어 하나에서 쓸 수 있는 근거: 십신 하나와 주성 하나 중 문턱을 넘는 가장 센 것. 이미 쓴 이름은 뺀다. */
  const evidence = (kind: 'match' | 'clash', e: Entry, idx: number, used: Set<string>, min: number): Ev[] => {
    const rw = RANK_WEIGHT[idx] ?? RANK_WEIGHT[RANK_WEIGHT.length - 1]!
    const best = (cands: Ev[]): Ev | null => cands.reduce<Ev | null>((b, c) => (!b || c.score > b.score ? c : b), null)
    const sipLabels = kind === 'match' ? e.copy.sipsinMatch : e.copy.sipsinClash
    const starLabels = kind === 'match' ? e.copy.starMatch : e.copy.starClash
    const sip: Ev[] = []
    for (const l of sipLabels) {
      const level = chart.strength.gods[l]?.level
      if (used.has(l) || !level || level === '없음') continue
      const score = rw * LEVEL_WEIGHT[level]
      if (score >= min) sip.push({ label: l, source: 'saju', level, score })
    }
    const star: Ev[] = []
    for (const l of starLabels) {
      if (used.has(l) || !stars.includes(l)) continue
      const level: Level = starLevel(chart.ziwei?.brightness?.[l], borrowed)
      if (level === '없음') continue
      const score = rw * LEVEL_WEIGHT[level]
      if (score >= min) star.push({ label: l, source: 'ziwei', level, score })
    }
    const s = best(sip), z = best(star)
    if (kind === 'match') return [s, z].filter((x): x is Ev => x !== null)
    const one = s && z ? (z.score > s.score ? z : s) : s ?? z
    return one ? [one] : []
  }

  const usedWords = new Set<number>()
  const usedLabels = new Set<string>()
  let minScore: number = MIN_EVIDENCE
  const pickBest = (kind: 'match' | 'clash'): Picked | null => {
    let best: Picked | null = null
    entries.forEach((e, idx) => {
      if (usedWords.has(idx)) return
      const evs = evidence(kind, e, idx, usedLabels, minScore)
      if (evs.length === 0) return
      const score = Math.max(...evs.map(x => x.score))
      if (!best || score > best.score) best = { idx, evs, score }
    })
    return best
  }

  // 먼 단어: 그 단어와 맞닿는 십신 묶음이 겉에도 지장간에도 통째로 없으면 "안 한 말까지 맞대요" 칸.
  // 왜 맞는지 그 줄만 읽고 알 수 있는 짝만 쓴다(FAR_EVIDENT). 시각을 모르면 비어 있다고 말할 수 없어서 칸을 만들지 않는다.
  const farRows: Meeting[] = []
  const usedGroups = new Set<string>()
  for (const id of timeKnown ? far ?? [] : []) {
    const w = WORDS.find(x => x.id === id)
    if (!w) continue
    const g = SIPSIN_GROUPS.find(x => x.label === FAR_EVIDENT[id] && !usedGroups.has(x.label) && x.members.every(m => (chart.strength.gods[m]?.score ?? 0) === 0))
    if (!g) continue
    usedGroups.add(g.label)
    farRows.push(row({ id: `meet:far:${id}`, kind: 'match', group: 'far', tag: MATCH_TAG.far, level: null, rank: null, wordKo: w.ko, items: [{ source: 'saju', chartLabel: g.label, chartText: g.text }], closing: `결론: ${need(content.farLines, id, '먼 단어')}` }))
  }

  // 수(水): 겉에도 지장간에도 없고, 다섯 단어에 쉼을 막지 않는 단어(restAllow)가 없을 때만. 쉼 얘기(rest 줄)가 있는 단어 가운데 순위가 높은 것으로 말한다.
  const waterOn = timeKnown && (chart.missing as Element[]).includes('water') && !entries.some(e => !!deep?.words[e.id]?.restAllow?.trim())
  const makeWater = (): Meeting | null => {
    if (!waterOn) return null
    // 일치·충돌의 근거가 될 수 있는 단어를 빼앗지 않도록, 근거가 없는 단어를 먼저 보고 그중 쉼 줄이 있는 높은 순위 단어를 고른다. 모두 근거가 있으면 가장 낮은 순위 단어를 쓴다.
    const free = [...entries.keys()].filter(i => !usedWords.has(i))
    const idle = free.filter(i => evidence('match', entries[i]!, i, usedLabels, minScore).length === 0 && evidence('clash', entries[i]!, i, usedLabels, minScore).length === 0)
    const hasRest = (i: number) => !!deep?.words[entries[i]!.id]?.rest?.trim()
    const idx = idle.find(hasRest) ?? idle[0] ?? free[free.length - 1]
    if (idx === undefined) return null
    usedWords.add(idx)
    const e = entries[idx]!
    return row({ id: 'meet:water', kind: 'match', group: 'water', tag: MATCH_TAG.water, level: null, rank: idx + 1, wordKo: e.ko, items: [{ source: 'saju', chartLabel: WATER_ZERO.label, chartText: WATER_ZERO.text }], closing: waterClosing(e.ko) })
  }

  // 명식 한가운데: 격(월지에서 잡은 명식의 중심) 십신이 1~3위 단어의 일치·충돌 십신에 있으면 그 단어로 맨 앞 줄을 만든다. 단계는 늘 강으로 보인다(중심이라서).
  // 월주가 없는 입력(시험용 부분 명식)은 격을 잡을 수 없어 이 줄을 만들지 않는다.
  const coreReading = chart.pillars.some(p => p.label === '월주') ? readCore(chart.pillars, chart.dayStem, chart.strength) : null
  const makeCore = (): Meeting | null => {
    if (!coreReading) return null
    const god = coreReading.geok.god
    for (let idx = 0; idx < Math.min(3, entries.length); idx++) {
      const e = entries[idx]!
      const kind = e.copy.sipsinMatch.includes(god) ? 'match' : e.copy.sipsinClash.includes(god) ? 'clash' : null
      if (!kind || usedWords.has(idx)) continue
      const facet = (kind === 'match' ? MATCH_FACET : CLASH_FACET)[god]!
      // 뒷말: 상대 기운이 중심을 받치거나 누를 때만, 그것이 이 단어에 무슨 뜻인지로 말한다(coreBridge).
      const r = coreReading.relation
      const rel = r && r.to === coreReading.group ? ` ${coreBridge(kind, r.kind, named(god), `${r.from}(${GROUP_HANJA[r.from]})`, e.ko)}` : ''
      const where = coreReading.geok.byTouchul ? '월지 숨은 글자에서 드러난' : '월지의'
      const chartText = `이 명식의 중심은 ${where} ${named(god)}입니다(${coreReading.name.ko}). ${facet}${tail(facet)} 풉니다.${rel}`
      usedWords.add(idx)
      usedLabels.add(god)
      return row({ id: `meet:core:${e.id}`, kind, group: 'core', tag: kind === 'match' ? MATCH_TAG.core : CLASH_TAG.core, level: '강', rank: idx + 1, wordKo: e.ko, items: [{ source: 'saju', chartLabel: named(god), chartText }], closing: kind === 'match' ? e.copy.matchLine : e.copy.clashQuestion })
    }
    return null
  }

  const rows: Meeting[] = []
  const count = { match: 0, clash: 0 }
  /** 일치 또는 충돌 단어 칸 하나를 지금 문턱(minScore)으로 고를 수 있으면 넣는다. */
  const addWord = (step: 'match' | 'clash'): void => {
    if (count[step] >= MAX_PER_KIND) return
    const p = pickBest(step)
    if (!p) return
    usedWords.add(p.idx)
    p.evs.forEach(x => usedLabels.add(x.label))
    count[step]++
    const e = entries[p.idx]!
    // 사주와 자미두수가 함께면 더 약한 쪽에 맞춘다.
    const level = p.evs.reduce<Strength>((w, x) => (STRENGTH_ORDER[x.level] > STRENGTH_ORDER[w] ? x.level : w), '강')
    const facets = step === 'match' ? MATCH_FACET : CLASH_FACET
    const items = p.evs.map(x => (x.source === 'saju' ? sajuItem(x.label, facets) : starItem(x.label, facets)))
    const tag = step === 'match'
      ? items.length === 2 ? { 강: MATCH_TAG.bothBig, 중: MATCH_TAG.bothMid, 약: MATCH_TAG.bothWeak }[level] : { 강: MATCH_TAG.big, 중: MATCH_TAG.mid, 약: MATCH_TAG.weak }[level]
      : { 강: CLASH_TAG.big, 중: CLASH_TAG.mid, 약: CLASH_TAG.weak }[level]
    rows.push(row({ id: `meet:${step}:${e.id}`, kind: step, group: 'word', tag, level, rank: p.idx + 1, wordKo: e.ko, items, closing: step === 'match' ? e.copy.matchLine : e.copy.clashQuestion }))
  }

  const coreRow = makeCore()
  if (coreRow) rows.push(coreRow)
  let farUsed = false, waterUsed = false
  for (const step of SEQUENCE) {
    if (rows.length >= MAX_LINES) break
    if (step === 'far') { const f = farRows[0]; if (f && !farUsed) { farUsed = true; rows.push(f) } continue }
    if (step === 'water') { const wm = waterUsed ? null : makeWater(); waterUsed = true; if (wm) rows.push(wm); continue }
    addWord(step)
  }
  minScore = 0
  for (const step of FILL) { if (rows.length >= MAX_LINES) break; addWord(step) }

  // 같은 일치·충돌 안에서는 센 줄이 먼저, 같은 세기면 순위 순.
  const byRank = (a: Meeting, b: Meeting) => STRENGTH_ORDER[a.level ?? '강'] - STRENGTH_ORDER[b.level ?? '강'] || (a.rank ?? 99) - (b.rank ?? 99)
  const matches = rows.filter(m => m.kind === 'match' && m.group === 'word').sort(byRank)
  const meetings = [...rows.filter(m => m.group === 'core'), ...matches, ...rows.filter(m => m.group === 'far'), ...rows.filter(m => m.group === 'water'), ...rows.filter(m => m.kind === 'clash' && m.group !== 'core').sort(byRank)]

  // 닫기 전의 두 질문: 충돌 칸에 쓰이지 않은 단어 가운데 순위가 높은 둘.
  const inClash = new Set(meetings.filter(m => m.kind === 'clash').map(m => m.wordKo))
  const pool = [...entries.filter(e => !inClash.has(e.ko)), ...entries.filter(e => inClash.has(e.ko))]
  const closing = pool.slice(0, 2).map(e => ({ id: `close:${e.id}`, wordKo: e.ko, text: e.copy.clashQuestion }))
  return { meetings, closing }
}

function need<T>(map: Record<string, T>, key: string, what: string): T {
  const v = map[key]
  if (v === undefined || (v as unknown) === '') throw new Error(`풀이 문구가 없음 (${what}): ${key}`)
  return v
}
