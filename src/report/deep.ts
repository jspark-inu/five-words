import type { ChartDetail, ChartFacts, YearFacts } from '../chart/chart'
import { type DeepContent, pairKey } from '../content/deep'
import { extractFeatures } from '../chart/features'
import { composeLuck, starReading, type LuckPara } from './luck'
import { WORDS, type Area } from '../content/words'
import type { Content } from '../content/types'
import { selectAssets, selectFar, selectRisks, selectSummary, selectTriangle, type AssetView, type FarView, type RiskView, type TriangleView } from './pick'

/** 심층 보고서에서 문구가 있어야만 보이는 조각과, 사실이라 늘 보이는 조각(areaBars, 신살 목록)을 나눠 담는다. */
export type WordCard = {
  id: string; rank: number; ko: string
  meaning: string | null; essence: string | null; scenes: string[]
  goodEnv: string | null; badEnv: string | null; trap: string | null; howTo: string | null
  /** 펼침 안에 보일 것이 하나라도 있는가. */
  hasDetail: boolean
}
export type LuckView = { summary: string | null; paragraphs: LuckPara[]; howTo: string | null; why: string | null }
export type YearView = {
  id: 'now' | 'next'; year: number; label: string
  /** 사실로 만든 칩: 천간·지지 십신, 12운성, 합충파. */
  facts: string[]
  summary: string | null; good: string | null; bad: string | null; money: string | null; liunian: string | null; liunianHeading: string | null; goodNews: string | null; compare: string | null
  howTo: string | null; why: string | null
}
export type DeepReport = {
  frames: DeepContent['frames']
  /** 한 줄로 말하면. 첫 두 단어의 짝 요약이나 그 짝의 한 줄. 둘 다 없으면 null. */
  summary: string | null
  wordCards: WordCard[]
  support: { ko: string; text: string }[]
  roles: { ko: string; text: string }[]
  pairs: { a: string; b: string; body: string }[]
  areaBars: { id: Area; label: string; count: number }[]
  areaNotes: string[]
  assets: AssetView[]
  risks: RiskView[]
  triangle: TriangleView | null
  /** 단어 방식에서만: 먼 단어와 그 단어가 센 사람 줄. */
  far: FarView[] | null
  activities: { ko: string; text: string }[]
  avoid: { ko: string; text: string }[]
  luck: {
    glance: { id: 'total' | 'now' | 'next' | 'study'; label: string; text: string }[]
    total: LuckView | null
    years: YearView[]
    study: LuckView | null
    /** 자미두수·시주·대운을 못 쓴 까닭 한 줄. 문구가 하나라도 있을 때만. */
    note: string | null
    /** 이 보고서에 실제 쓰인 블록 키(중복 없음). */
    used: string[]
    /** 조립기가 요청한 블록 키(없는 문구 포함). */
    requested: string[]
  }
  /** 접힌 명식의 풀이 줄: 신살 키(cheonul 등), 글자 관계(卯酉沖), 별:궁(예 거문:재백). 문구가 없으면 빠진다. */
  chartNotes: { sinsal: Record<string, string>; relation: Record<string, string>; palace: Record<string, string> }
}

const AREAS: { id: Area; label: string }[] = [
  { id: 'strategy', label: '전략적 사고' }, { id: 'execute', label: '실행' }, { id: 'influence', label: '영향' }, { id: 'relation', label: '관계' },
]

const wordOf = (id: string) => {
  const w = WORDS.find(x => x.id === id)
  if (!w) throw new Error(`없는 단어: ${id}`)
  return w
}
const nz = (s: string | undefined): string | null => (s && s.trim() !== '' ? s : null)
const countAreas = (ids: string[]) => AREAS.map(a => ({ ...a, count: ids.filter(id => wordOf(id).area === a.id).length }))

/** 다섯 단어의 영역 개수를 "strategy2-execute1-influence1-relation1" 꼴로. */
export const areaSignature = (top: string[]): string => countAreas(top).map(a => `${a.id}${a.count}`).join('-')

function yearChips(y: YearFacts): string[] {
  const chips = [`천간 ${y.stemSipsin.hangul}`, `지지 ${y.branchSipsin.hangul}`, y.unseong.hangul]
  // 한 글자와 맺는 관계는 칩 하나로 묶는다. 따로 두면 본문에 없는 경고가 여러 개처럼 읽힌다.
  const byGlyph = new Map<string, string[]>()
  for (const r of y.relations) {
    const key = `${r.place} ${r.natal}`
    byGlyph.set(key, [...(byGlyph.get(key) ?? []), r.name])
  }
  for (const [key, names] of byGlyph) chips.push(`${key} ${names.join('·')}`)
  return chips
}

export function composeDeep(a: {
  top: string[]; far: string[] | null; support: string[] | null
  chart: ChartFacts; detail: ChartDetail; copy: DeepContent; readings: Record<string, string>; content: Content
}): DeepReport {
  const { top, chart, detail, copy } = a
  const words = top.map(wordOf)
  const wd = (id: string) => copy.words[id]

  const wordCards: WordCard[] = words.map((w, i) => {
    const d = wd(w.id)
    const card = {
      id: w.id, rank: i + 1, ko: w.ko,
      meaning: nz(d?.meaning), essence: nz(d?.essence), scenes: (d?.scenes ?? []).filter(s => s.trim() !== ''),
      goodEnv: nz(d?.goodEnv), badEnv: nz(d?.badEnv), trap: nz(d?.trap), howTo: nz(d?.howTo),
    }
    return { ...card, hasDetail: card.scenes.length > 0 || !!(card.goodEnv || card.badEnv || card.trap || card.howTo) }
  })

  // 열 가지 짝: 순위 순서(1-2, 1-3, …, 4-5)로.
  const pairs: DeepReport['pairs'] = []
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const wi = words[i]!, wj = words[j]!
      const body = nz(copy.pairs[pairKey(wi.id, wj.id)]?.body)
      if (body) pairs.push({ a: wi.ko, b: wj.ko, body })
    }
  }

  const bars = countAreas(top)
  const emptyAreas = bars.filter(b => b.count === 0).map(b => b.id)
  const areaNotes: string[] = []
  const sig = nz(copy.areas[areaSignature(top)])
  if (sig) areaNotes.push(sig)
  // 영역 하나가 비는 것은 다섯 단어를 고르면 흔한 일이라(무작위 학생의 약 72%) 말하지 않는다. 둘 이상 비었을 때만(약 13%) 메모를 쓴다.
  const emptyNote = emptyAreas.length >= 2 ? nz(copy.areaEmpty[emptyAreas.join('+')]) : null
  if (emptyNote) areaNotes.push(emptyNote)
  // 먼 단어 셋 중 둘이 같은 영역인 것도 흔해서(약 59%), 셋이 모두 같은 영역일 때만 쓴다.
  for (const b of countAreas(a.far ?? [])) {
    const t = b.count >= 3 ? nz(copy.areaFar[b.id]) : null
    if (t) areaNotes.push(t)
  }

  const sup = (a.support ?? []).flatMap(id => {
    const w = wordOf(id)
    const text = nz(wd(id)?.support)
    return text ? [{ ko: w.ko, text }] : []
  })

  // 운세: 특징을 뽑아 블록을 고른다(src/report/luck.ts).
  const feats = extractFeatures(chart, detail)
  const blocks = copy.luckBlocks
  // 다섯 단어에 쉼을 막지 않는 단어가 있으면 운세가 "쉼이 늘 모자란 사람"이라고 말하지 않는다(강점 리포트와 모순). 판단은 조립기가 한다.
  const anyRestAllow = top.some(id => nz(copy.words[id]?.restAllow))
  const L = composeLuck(feats, blocks, a.readings, { restOpposed: restOpposed(top, copy), restAllowed: anyRestAllow })
  const [nowY, nextY] = detail.years
  const ko = (h: string) => a.readings[h] ?? h
  const yearById = { now: nowY, next: nextY }
  const years: YearView[] = L.years.map(ys => {
    const y = yearById[ys.id]!
    return {
      id: ys.id, year: y.year, label: `${y.year}년 ${ko(y.stem)}${ko(y.branch)}(${y.ganzi})`, facts: yearChips(y),
      summary: ys.summary, good: ys.good, bad: ys.bad, money: ys.money, liunian: ys.liunian?.text ?? null, liunianHeading: ys.liunian?.heading ?? null,
      goodNews: ys.goodNews, compare: ys.compare, howTo: ys.howTo, why: ys.why,
    }
  })
  const glance: DeepReport['luck']['glance'] = L.glance.map(g => ({
    id: g.id, text: g.text,
    label: g.id === 'total' ? '총운' : g.id === 'study' ? '학업운' : `${g.id === 'now' ? '올해운' : '내년운'} · ${yearById[g.id]!.year}년`,
  }))
  const anyLuck = !!(L.total || L.study || years.length > 0)

  return {
    frames: copy.frames,
    summary: selectSummary(top, copy),
    wordCards, support: sup,
    roles: words.flatMap(w => (nz(wd(w.id)?.role) ? [{ ko: w.ko, text: wd(w.id)!.role as string }] : [])),
    pairs,
    areaBars: bars.map(b => ({ id: b.id, label: b.label, count: b.count })),
    areaNotes,
    assets: selectAssets(top, copy), risks: selectRisks(top, a.far, a.support, copy), triangle: selectTriangle(top, copy),
    far: selectFar(top, a.far, a.content),
    activities: words.flatMap(w => (nz(wd(w.id)?.activity) ? [{ ko: w.ko, text: wd(w.id)!.activity as string }] : [])),
    avoid: words.flatMap(w => (nz(wd(w.id)?.avoid) ? [{ ko: w.ko, text: wd(w.id)!.avoid as string }] : [])),
    luck: { glance, total: L.total, years, study: L.study, note: anyLuck ? L.note : null, used: L.used.filter(k => blocks[k]), requested: L.requested },
    chartNotes: chartNotes(feats, blocks),
  }
}

/** 다섯 단어가 모두 쉼에 반대하는가(쉬자는 단어가 하나도 없는가). 평생 주제 문단이 강점 리포트와 맞물릴 때만 쓴다. */
function restOpposed(top: string[], copy: DeepContent): boolean {
  return !!copy.restRisk && top.every(id => !copy.words[id]?.restAllow)
}

const SAL_KEY_KO: Record<string, string> = {
  cheonul: '천을귀인', cheonduk: '천덕귀인', wolduk: '월덕귀인', munchang: '문창귀인', yangin: '양인', baekho: '백호', goegang: '괴강', dohwa: '도화', hongyeom: '홍염', geumyeo: '금여',
}
/** 접힌 명식의 풀이 줄. 운세 블록의 같은 문구를 쓴다(앞 문장 없이도 읽히는 문구라는 약속). */
function chartNotes(f: ReturnType<typeof extractFeatures>, b: Record<string, string>): DeepReport['chartNotes'] {
  const out: DeepReport['chartNotes'] = { sinsal: {}, relation: {}, palace: {} }
  for (const [key, name] of Object.entries(SAL_KEY_KO)) { const t = b[`sinsal[${name}]`]; if (t?.trim()) out.sinsal[key] = t }
  for (const r of f.relations) { const t = b[`relation[${r.chars}${r.type}]`]; if (t?.trim()) out.relation[`${r.chars}${r.type}`] = t }
  if (f.palaces) {
    let dimSeen = false
    for (const p of Object.values(f.palaces)) {
      for (const s of p.mains) {
        const dim = s.brightness === '陷' || s.brightness === '不'
        const t = starReading(s, p.name, b, dim && dimSeen)
        if (dim && t) dimSeen = true
        if (t) out.palace[`${p.name}:${s.star}`] = t
      }
    }
  }
  return out
}
