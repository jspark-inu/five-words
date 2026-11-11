// 운세 조립용 특징 추출. computeDetail이 낸 사실에서 "어떤 블록을 고를지"를 정하는 값만 뽑는다. 풀이 문구는 없다.
import type { ChartDetail, ChartFacts, Element, Pillar, RelationFact, YearFacts } from './chart'
import { palaceKo, starKo } from './names'
import type { ChartStrength, DayLevel, Level } from './strength'
import { readCore, type CoreReading } from './core'

export const GROUPS = ['비겁', '식상', '재성', '관성', '인성'] as const
export type Group = (typeof GROUPS)[number]
export type GroupState = '없음' | '있음' | '많음'

export const GROUP_OF: Record<string, Group> = {
  비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성',
}
export const GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const
export const GOD_HANJA: Record<string, string> = {
  비견: '比肩', 겁재: '劫財', 식신: '食神', 상관: '傷官', 편재: '偏財', 정재: '正財', 편관: '偏官', 정관: '正官', 편인: '偏印', 정인: '正印',
}
export const ELEMENT_KO: Record<Element, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' }
export const ELEMENT_HANJA: Record<Element, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }
const STEM_ELEMENT: Record<string, Element> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' }
const STEM_HAP: Record<string, string> = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' }
const STEM_CHUNG: Record<string, string> = { 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' }
const BRANCH_ELEMENT: Record<string, Element> = { 寅: 'wood', 卯: 'wood', 巳: 'fire', 午: 'fire', 辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth', 申: 'metal', 酉: 'metal', 亥: 'water', 子: 'water' }
export const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'] as const
export const MAIN_STAR_HANJA = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'] as const
export const MINOR_STAR_HANJA = ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'] as const
const opposite = (p: string): string => PALACES[(PALACES.indexOf(p as (typeof PALACES)[number]) + 6) % 12] as string

export type Hit = { god: string; place: string }
export type StarView = { star: string; ko: string; brightness: string; siHua: string }
export type PalaceView = { name: string; ko: string; mains: StarView[]; borrowed: boolean; minors: StarView[] }
export type SalView = { key: string; name: string; hanja: string; places: string[] }
export type DaewoonView = {
  startYear: number; endYear: number; ganzi: string; stemGod: string; branchGod: string
  stemElement: Element; branchElement: Element; current: boolean
}
export type YearView = {
  year: number; ganzi: string; stem: string; branch: string
  stemGod: string; branchGod: string; unseong: string; unseongHanja: string
  relations: { place: string; natal: string; type: string; name: string; chars: string }[]
  /** 세운 천간과 지지의 십신이 속한 무리. */
  stemGroup: Group; branchGroup: Group
  /** 세운 천간이 일간과 합이면 '합', 충이면 '충'. 합은 정관·정재와, 충은 편관·편재와만 일어난다. */
  dayStemKind: '합' | '충' | null
  /** 자미두수가 없으면 null. */
  ziwei: {
    mingPalace: string
    hua: { star: string; hua: string; palace: string }[]
    /** 유년 관록궁·재백궁이 본래 명반의 어느 궁에 앉는가. */
    careerPalace: string; moneyPalace: string
  } | null
}

export type LuckFeatures = {
  nowYear: number; birthYear: number; koreanAge: number
  timeKnown: boolean; genderKnown: boolean; hasZiwei: boolean
  dayStem: string; dayPillar: string; dayBranch: string; monthBranch: string
  /** 월간·연간·시간·월지·일지·시지·연지의 십신(일간 자신은 빠진다). */
  gods: Hit[]
  monthStemGod: string | null; hourStemGod: string | null; monthBranchGod: string; dayBranchGod: string
  groupCount: Record<Group, number>
  /** 세기 모듈(chart.strength)의 판정. 지장간까지 합친 점수로 센 단계. */
  strength: ChartStrength
  /** 명식의 줄기: 격과 상대 기운, 둘의 관계(core.ts). */
  core: CoreReading
  /** 일간 강약: 신강·중화·신약(단순화한 규칙, strength.ts). */
  dayLevel: DayLevel
  /** 십신 무리(비겁…인성)의 단계. 없음은 겉에도 지장간에도 없을 때만. */
  groupLevel: Record<Group, Level>
  /** 십신(한글 이름)의 단계. */
  godLevel: Record<string, Level>
  zero: Element[]; excess: Element[]
  patterns: string[]
  /** patterns 중 총운 첫 문장에 올릴 것. */
  leadPatterns: string[]
  relations: RelationFact[]
  sals: SalView[]
  /** 12신살: 이름별로 자리를 모은 것(일지·월지·연지·시지 순서). */
  sinsal12: { name: string; hanja: string; places: string[] }[]
  /** 열두 궁(한자 이름 → 보는 값). 자미두수가 없으면 null. */
  palaces: Record<string, PalaceView> | null
  shenPalace: string | null
  daewoon: DaewoonView[]
  /** 현재 대한(나이 구간)의 궁. 없으면 null. */
  daxian: { palace: string; ageStart: number; ageEnd: number } | null
  years: YearView[]
}

/**
 * 십신 무리의 상태. 겉 글자 개수가 아니라 세기 단계로 가른다: 없음은 겉에도 지장간에도 없을 때만,
 * 많음은 월지·일지가 받치는 센 무리(강)일 때만이다. 개수만 세던 때는 지장간에 있는데도 없다고 말한 경우가 많았다.
 */
export function groupState(f: Pick<LuckFeatures, 'groupLevel'>, g: Group): GroupState {
  const lv = f.groupLevel[g]
  return lv === '없음' ? '없음' : lv === '강' ? '많음' : '있음'
}

/** 원국 안에서 붙어 있는 자리(같은 기둥의 간지, 이웃한 기둥의 천간끼리·지지끼리). 일간은 십신이 없어 빠진다. */
const ADJACENT = new Set(['연간-연지', '월간-월지', '시간-시지', '연간-월간', '연지-월지', '월지-일지', '일지-시지'])
const isAdjacent = (a: string, b: string): boolean => ADJACENT.has(`${a}-${b}`) || ADJACENT.has(`${b}-${a}`)
const GROUP_GODS: Record<Group, string[]> = { 비겁: ['비견', '겁재'], 식상: ['식신', '상관'], 재성: ['편재', '정재'], 관성: ['편관', '정관'], 인성: ['편인', '정인'] }

/**
 * 이름 있는 구조. 두 글자가 함께 있기만 해서는 이름을 붙이지 않는다: 낳는 쪽 글자가 천간에 드러났거나(투출) 두 글자가 붙어 있어야 한다.
 * 재생관·관인상생은 정관이 있어야 한다. 정관 없이 편관만 있으면 재생살·살인상생이고 읽는 법이 다르다.
 * [이름, 낳는 쪽 십신, 받는 쪽 십신]
 */
const PATTERN_RULES: [string, string[], string[]][] = [
  ['식신생재', ['식신'], GROUP_GODS.재성],
  ['상관생재', ['상관'], GROUP_GODS.재성],
  ['관인상생', ['정관'], GROUP_GODS.인성],
  ['살인상생', ['편관'], GROUP_GODS.인성],
  ['재생관', GROUP_GODS.재성, ['정관']],
  ['재생살', GROUP_GODS.재성, ['편관']],
  ['편인도식', ['편인'], ['식신']],
  ['비겁탈재', ['겁재'], GROUP_GODS.재성],
  ['상관견관', ['상관'], ['정관']],
]
const PATTERN_FROM_STEM = (place: string) => place.endsWith('간')

/** 같은 글자 쌍의 같은 관계를 한 줄로 합치고 자리를 모은다. 접힌 명식에서 풀이 없는 줄이 되풀이되지 않게 한다. */
export function mergeRelations<R extends { chars: string; type: string; places: string[] }>(rels: R[]): R[] {
  const merged = new Map<string, R>()
  for (const r of rels) {
    const key = `${r.chars}${r.type}`
    const m = merged.get(key)
    merged.set(key, m ? { ...m, places: [...m.places, ...r.places.filter(pl => !m.places.includes(pl))] } : r)
  }
  return [...merged.values()]
}

/** 십신 자리 목록에서 성립하는 구조 이름. 시험에서 자리를 직접 넣어 볼 수 있게 내놓는다. */
/** 총운 첫 문장에 이름을 올릴 구조: 낳는 쪽 글자가 힘이 가장 크다는 월간에 앉았을 때만. 나머지 학생은 일간으로 시작해서 첫 줄이 고르게 갈린다. */
export function leadPatterns(gods: Hit[], patterns: string[]): string[] {
  return PATTERN_RULES.filter(([n, from]) => patterns.includes(n) && gods.some(h => h.place === '월간' && from.includes(h.god))).map(([n]) => n)
}

/**
 * 제가 정한 기준: 구조 이름을 붙이려면 두 글자가 모두 '중' 이상으로 센 글자여야 한다(godLevel을 넘긴 경우).
 * 전에는 낳는 글자가 천간에 있고 받는 글자가 아무 칸에나 있기만 하면 성립해서 학생의 93%가 구조 하나를 받았고,
 * 성립한 구조의 30%는 두 글자가 떨어져 있었다. 구조는 격국·용신과 함께 보는 전통이라 센 글자 둘이 이어질 때만 쓴다.
 */
export function findPatterns(gods: Hit[], godLevel?: Record<string, Level>, dayLevel?: DayLevel): string[] {
  const strongEnough = (g: string) => !godLevel || godLevel[g] === '중' || godLevel[g] === '강'
  return PATTERN_RULES.filter(([name, from, to]) => {
    // 제가 정한 기준: 구조 문구가 일간 강약과 어긋나지 않게 한다. 비겁탈재("내 힘이 세서")는 일간이 약한 편이면 쓰지 않고(약하면 비겁은 돕는 쪽),
    // 재생살(압박이 커지는 짜임을 조심스럽게 읽음)은 일간이 센 편이면 쓰지 않는다(센 일간은 압박을 감당하는 쪽).
    if (dayLevel === '신약' && name === '비겁탈재') return false
    if (dayLevel === '신강' && name === '재생살') return false
    const fs = gods.filter(h => from.includes(h.god) && strongEnough(h.god))
    const ts = gods.filter(h => to.includes(h.god) && strongEnough(h.god))
    if (fs.length === 0 || ts.length === 0) return false
    if (!godLevel) return fs.some(f => PATTERN_FROM_STEM(f.place)) || fs.some(f => ts.some(t => isAdjacent(f.place, t.place)))
    // 센 글자 둘이 붙어 있고, 그 쌍에 월령(월간·월지)이나 일지가 끼어 있을 때만. 연주·시주 안에서만 붙은 쌍은 힘이 작다.
    return fs.some(f => ts.some(t => isAdjacent(f.place, t.place) && [f.place, t.place].some(pl => ANCHOR_PLACES.has(pl))))
  }).map(([n]) => n)
}
const ANCHOR_PLACES = new Set(['월간', '월지', '일지'])

/** 엔진이 건록을 乾祿으로 돌려준다. 표준 표기는 建祿이라 화면으로 나가기 전에 고친다. */
export const unseongHanjaFix = (h: string): string => (h === '乾祿' ? '建祿' : h)

const SEO = { 시주: '시', 일주: '일', 월주: '월', 연주: '연' } as const

export function extractFeatures(chart: ChartFacts, detail: ChartDetail): LuckFeatures {
  const nowYear = detail.years[0]!.year
  const { birthYear, timeKnown, genderKnown } = detail.meta
  const ps = detail.saju.pillars
  const byLabel = (l: string) => ps.find(p => p.label === l)
  const day = byLabel('일주')!
  const month = byLabel('월주')!
  const hour = byLabel('시주')
  const gods: Hit[] = []
  const add = (god: string | undefined, place: string) => { if (god) gods.push({ god, place }) }
  for (const l of ['월주', '연주', '시주'] as const) add(byLabel(l)?.stemSipsin?.hangul, `${SEO[l]}간`)
  for (const l of ['월주', '일주', '시주', '연주'] as const) add(byLabel(l)?.branchSipsin.hangul, `${SEO[l]}지`)
  const groupCount: Record<Group, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const h of gods) groupCount[GROUP_OF[h.god]!]++
  const st = chart.strength
  const godLevel: Record<string, Level> = Object.fromEntries(GODS.map(g => [g, st.gods[GOD_HANJA[g]!]!.level]))
  const groupLevel = Object.fromEntries(GROUPS.map(g => [g, st.groups[g].level])) as Record<Group, Level>
  const patterns = findPatterns(gods, godLevel, st.day.level)

  const sals: SalView[] = detail.saju.sals.map(s => ({ key: s.key, name: s.name, hanja: s.hanja, places: s.places }))

  const sinsal12: LuckFeatures['sinsal12'] = []
  for (const l of ['일주', '월주', '연주', '시주'] as const) {
    const p = byLabel(l)
    if (!p) continue
    const place = `${SEO[l]}지`
    const found = sinsal12.find(x => x.name === p.sinsal.hangul)
    if (found) found.places.push(place)
    else sinsal12.push({ name: p.sinsal.hangul, hanja: p.sinsal.hanja, places: [place] })
  }

  let palaces: Record<string, PalaceView> | null = null
  let shenPalace: string | null = null
  if (detail.ziwei) {
    const raw = Object.fromEntries(detail.ziwei.palaces.map(p => [p.name, p]))
    const view = (s: { name: string; brightness: string; siHua: string }): StarView => ({ star: s.name, ko: starKo(s.name), brightness: s.brightness, siHua: s.siHua })
    palaces = {}
    for (const name of PALACES) {
      const p = raw[name]
      if (!p) continue
      const own = p.stars.filter(s => s.main)
      const opp = raw[opposite(name)]
      const borrowed = own.length === 0
      const mains = (borrowed ? (opp?.stars ?? []).filter(s => s.main) : own).map(view)
      palaces[name] = { name, ko: palaceKo(name), mains, borrowed, minors: p.stars.filter(s => !s.main).map(view) }
      if (p.isShen) shenPalace = name
    }
  }

  const koreanAge = nowYear - birthYear + 1
  const daewoon: DaewoonView[] = detail.saju.daewoon.map(d => {
    const startYear = birthYear + d.age
    return {
      startYear, endYear: startYear + 9, ganzi: d.ganzi, stemGod: d.stemSipsin.hangul, branchGod: d.branchSipsin.hangul,
      stemElement: STEM_ELEMENT[d.ganzi[0] as string] as Element, branchElement: BRANCH_ELEMENT[d.ganzi[1] as string] as Element,
      current: startYear <= nowYear && nowYear <= startYear + 9,
    }
  })
  const dx = detail.ziwei?.daxian ?? []
  const dxNow = dx.filter(d => d.ageStart <= koreanAge).pop()
  const daxian = dxNow && koreanAge <= dxNow.ageStart + 9 ? { palace: dxNow.palaceName, ageStart: dxNow.ageStart, ageEnd: dxNow.ageStart + 9 } : null

  const years: YearView[] = detail.years.map((y: YearFacts) => ({
    year: y.year, ganzi: y.ganzi, stem: y.stem, branch: y.branch,
    stemGod: y.stemSipsin.hangul, branchGod: y.branchSipsin.hangul, unseong: y.unseong.hangul, unseongHanja: unseongHanjaFix(y.unseong.hanja),
    stemGroup: GROUP_OF[y.stemSipsin.hangul]!, branchGroup: GROUP_OF[y.branchSipsin.hangul]!,
    dayStemKind: STEM_HAP[day.stem] === y.stem ? '합' : STEM_CHUNG[day.stem] === y.stem ? '충' : null,
    relations: y.relations.map(r => ({ place: r.place, natal: r.natal, type: r.type, name: r.name, chars: BRANCH_ORDER(y.branch, r.natal) })),
    ziwei: y.ziwei
      ? {
          mingPalace: y.ziwei.mingNatalPalace,
          hua: y.ziwei.siHua.map(h => ({ star: h.star, hua: h.hua, palace: h.natalPalace })),
          careerPalace: y.ziwei.palaces.find(p => p.name === '官祿')?.natalPalace ?? '',
          moneyPalace: y.ziwei.palaces.find(p => p.name === '財帛')?.natalPalace ?? '',
        }
      : null,
  }))

  return {
    nowYear, birthYear, koreanAge,
    timeKnown, genderKnown, hasZiwei: detail.ziwei !== null,
    dayStem: day.stem, dayPillar: day.stem + day.branch, dayBranch: day.branch, monthBranch: month.branch,
    gods, monthStemGod: month.stemSipsin?.hangul ?? null, hourStemGod: hour?.stemSipsin?.hangul ?? null,
    monthBranchGod: month.branchSipsin.hangul, dayBranchGod: day.branchSipsin.hangul,
    groupCount, strength: st, core: readCore(ps.map(p => ({ label: p.label as Pillar['label'], stem: p.stem, branch: p.branch })), day.stem, st), dayLevel: st.day.level, groupLevel, godLevel, zero: chart.missing, excess: chart.excess,
    patterns, leadPatterns: leadPatterns(gods, patterns), relations: detail.saju.relations, sals, sinsal12, palaces, shenPalace, daewoon, daxian, years,
  }
}

const BR = '子丑寅卯辰巳午未申酉戌亥'
/** 두 지지를 자축인묘… 순서로 붙인 글자(관계 키와 같은 순서). */
export function BRANCH_ORDER(a: string, b: string): string {
  return BR.indexOf(a) <= BR.indexOf(b) ? a + b : b + a
}
