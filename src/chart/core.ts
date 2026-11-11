// 명식의 줄기: 월지에서 격(格)을 고르고, 격 무리와 가장 센 상대 무리의 관계(생·극)를 정한다. 풀이 문구는 luck.ts·meetings.ts가 붙인다.
// 격 고르는 법은 자평진전식을 단순화한 것이고, 학파마다 다르다(투출한 글자가 여럿일 때, 월지 지장간의 본기·중기·여기 구분, 일간 자신의 투출 인정 여부 등).
// 상대 기운을 고르는 법(격 무리를 뺀 무리 가운데 점수가 가장 높고 단계가 중·강)은 제가 정한 단순 기준이다.
import { getHiddenStems, getJeonggi, getRelation } from '@orrery/core'
import type { Pillar } from './chart'
import type { Group } from './features'
import type { ChartStrength } from './strength'

const GOD_KO: Record<string, string> = { 比肩: '비견', 劫財: '겁재', 食神: '식신', 傷官: '상관', 偏財: '편재', 正財: '정재', 偏官: '편관', 正官: '정관', 偏印: '편인', 正印: '정인' }

const GROUPS: Group[] = ['비겁', '식상', '재성', '관성', '인성']
const GROUP_OF_GOD: Record<string, Group> = { 比肩: '비겁', 劫財: '비겁', 食神: '식상', 傷官: '식상', 偏財: '재성', 正財: '재성', 偏官: '관성', 正官: '관성', 偏印: '인성', 正印: '인성' }

export type Geok = {
  /** 격으로 읽는 십신(한자). */
  god: string
  /** 월지 본기가 아니라 숨은 글자(중기·여기)가 천간에 드러나 정해졌을 때만 true. */
  byTouchul: boolean
  /** 월지 본기의 십신(한자). */
  mainGod: string
}

/**
 * 격 고르기(자평진전식 단순화).
 * 1. 월지 지장간을 본기·중기·여기로 본다.
 * 2. 본기 글자가 연간·월간·시간 중 하나에 드러나(투출) 있으면 본기.
 * 3. 아니면 중기, 그다음 여기 순으로 천간에 드러난 글자가 있으면 그것. 일간 자신은 투출로 치지 않는다.
 * 4. 아무것도 드러나지 않으면 본기.
 */
export function pickGeok(pillars: Pillar[], dayStem: string): Geok {
  const month = pillars.find(p => p.label === '월주')!
  const stems = pillars.filter(p => p.label !== '일주').map(p => p.stem)
  const main = getJeonggi(month.branch)
  // 지장간 문자열은 여기→중기→본기 순이다. 본기, 중기, 여기 순으로 뒤집는다.
  const order = [...getHiddenStems(month.branch).replace(/\s/g, '')].reverse()
  const godOf = (ch: string): string => getRelation(dayStem, ch)?.hanja ?? ''
  const mainGod = godOf(main)
  const shown = order.find(ch => stems.includes(ch))
  if (shown === undefined || shown === main) return { god: mainGod, byTouchul: false, mainGod }
  return { god: godOf(shown), byTouchul: true, mainGod }
}

const YANG = '甲丙戊庚壬'
/** 격 이름. 比肩은 건록격, 劫財는 일간이 양간이면 양인격 음간이면 월겁격, 나머지는 십신 이름 + 격. */
export function geokName(god: string, dayStem: string): { ko: string; hanja: string } {
  if (god === '比肩') return { ko: '건록격', hanja: '建祿格' }
  if (god === '劫財') return YANG.includes(dayStem) ? { ko: '양인격', hanja: '羊刃格' } : { ko: '월겁격', hanja: '月劫格' }
  return { ko: `${GOD_KO[god]}격`, hanja: `${god}格` }
}

export const GROUP_HANJA: Record<Group, string> = { 비겁: '比劫', 식상: '食傷', 재성: '財星', 관성: '官星', 인성: '印星' }
export const groupOfGod = (god: string): Group => GROUP_OF_GOD[god]!

/** 생(生)의 순환: 비겁→식상→재성→관성→인성→비겁. 극(剋)은 순환에서 두 칸 앞: 비겁→재성, 식상→관성, 재성→인성, 관성→비겁, 인성→식상. */
export type Relation = { from: Group; to: Group; kind: '생' | '극' }
export function relationOf(a: Group, b: Group): Relation {
  const i = GROUPS.indexOf(a), j = GROUPS.indexOf(b)
  const d = (j - i + 5) % 5
  if (d === 1) return { from: a, to: b, kind: '생' }
  if (d === 4) return { from: b, to: a, kind: '생' }
  if (d === 2) return { from: a, to: b, kind: '극' }
  return { from: b, to: a, kind: '극' }
}

export type CoreReading = {
  geok: Geok
  name: { ko: string; hanja: string }
  group: Group
  /** 격 무리를 뺀 무리 가운데 점수가 가장 높고 단계가 중·강인 무리. 없으면 null. */
  rival: { group: Group; stronger: boolean } | null
  relation: Relation | null
}

export function readCore(pillars: Pillar[], dayStem: string, strength: ChartStrength): CoreReading {
  const geok = pickGeok(pillars, dayStem)
  const group = groupOfGod(geok.god)
  let best: Group | null = null
  for (const g of GROUPS) {
    if (g === group) continue
    const s = strength.groups[g]
    if (s.level !== '중' && s.level !== '강') continue
    if (best === null || s.score > strength.groups[best].score) best = g
  }
  return {
    geok, name: geokName(geok.god, dayStem), group,
    rival: best ? { group: best, stronger: strength.groups[best].score > strength.groups[group].score } : null,
    relation: best ? relationOf(group, best) : null,
  }
}
