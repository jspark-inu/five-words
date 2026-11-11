import { calculateSaju } from '@orrery/core/saju'
import { calculateLiunian, createChart, getDaxianList } from '@orrery/core/ziwei'
import { METEORS_12, SPIRITS_12, calcSolarTerms, getBranchRelation, getJeonggi, getRelation, getTwelveMeteor, getYearGanzi } from '@orrery/core'
import { REL_DETAIL_KO, REL_KO, SAL_HANJA, SAL_KO } from './names'
import { measureChart, type ChartStrength } from './strength'

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export type BirthInput = {
  year: number
  month: number
  day: number
  time: { hour: number; minute: number } | null
  gender: 'M' | 'F' | null
}

export type Pillar = { label: '시주' | '일주' | '월주' | '연주'; stem: string; branch: string }

export type ZiweiFacts = {
  mingZhi: string; wuXingJu: string; mainStars: string[]; borrowed: boolean
  /** 주성(한자) → 밝기(廟旺得利平不陷). 빌려 온 별이면 맞은편 궁에서의 밝기. 모르면 비어 있다. */
  brightness?: Record<string, string>
}

export type ChartFacts = {
  pillars: Pillar[]
  dayStem: string
  /** 겉(천간 4 + 지지 본기 4, 시각 모름은 3+3)에서 오행별 글자 수. 화면의 막대가 이 값을 그린다. */
  elements: Record<Element, number>
  /** 겉에도 지장간에도 없는 오행. 지장간에만 있으면 여기에 넣지 않는다. */
  missing: Element[]
  /** 지장간까지 합친 세기가 전체의 40% 이상인 오행(세기 큰 순). 기준은 strength.ts. */
  excess: Element[]
  /** 오행·십신·일간의 세기. 통합 칸과 운세가 "있다/없다" 대신 이 값을 쓴다. */
  strength: ChartStrength
  sipsin: string[]
  ziwei: ZiweiFacts | null
  /** 태어난 시각을 모를 때만 의미가 있다: 그날 0시와 23시 59분의 월주가 다르면 true. */
  monthMayDiffer: boolean
  /** 입춘이 낀 날이면 true: 그날 0시와 23시 59분의 연주가 다르다. */
  yearMayDiffer: boolean
}

const ELEMENT_OF: Record<string, Element> = {
  甲: 'wood', 乙: 'wood', 寅: 'wood', 卯: 'wood',
  丙: 'fire', 丁: 'fire', 巳: 'fire', 午: 'fire',
  戊: 'earth', 己: 'earth', 辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
  庚: 'metal', 辛: 'metal', 申: 'metal', 酉: 'metal',
  壬: 'water', 癸: 'water', 亥: 'water', 子: 'water',
}
const ELEMENTS: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
const LABELS = ['시주', '일주', '월주', '연주'] as const
const MAIN_STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function ziweiFacts(input: BirthInput): ZiweiFacts | null {
  if (!input.time || !input.gender) return null
  const chart = createChart(input.year, input.month, input.day, input.time.hour, input.time.minute, input.gender === 'M')
  const mainOf = (zhi: string) => {
    const palace = Object.values(chart.palaces).find(p => p.zhi === zhi)
    return palace ? palace.stars.map(s => s.name).filter(n => MAIN_STARS.includes(n)) : []
  }
  const ming = chart.mingGongZhi
  const brightnessOf = (zhi: string) => {
    const palace = Object.values(chart.palaces).find(p => p.zhi === zhi)
    return Object.fromEntries((palace?.stars ?? []).filter(s => MAIN_STARS.includes(s.name)).map(s => [s.name, s.brightness]))
  }
  const own = mainOf(ming)
  if (own.length > 0) return { mingZhi: ming, wuXingJu: chart.wuXingJu.name, mainStars: own, borrowed: false, brightness: brightnessOf(ming) }
  const opposite = ZHI[(ZHI.indexOf(ming) + 6) % 12] as string
  return { mingZhi: ming, wuXingJu: chart.wuXingJu.name, mainStars: mainOf(opposite), borrowed: true, brightness: brightnessOf(opposite) }
}

/** 하루의 처음(0시)과 끝(23시 59분)에서 기둥(2=월주, 3=연주)이 다른가. 절입·입춘이 낀 날이다. */
function pillarDiffersWithinDay(input: BirthInput, index: 2 | 3): boolean {
  const at = (hour: number, minute: number) => {
    const p = calculateSaju({ year: input.year, month: input.month, day: input.day, hour, minute, gender: input.gender ?? 'M' }).pillars[index]!.pillar
    return p.stem + p.branch
  }
  return at(0, 0) !== at(23, 59)
}

// ---------------------------------------------------------------------------
// 올해의 경계: 사주의 한 해는 달력이 아니라 입춘에서 시작한다.
// ---------------------------------------------------------------------------

/** 그해 입춘의 순간(한국 시각). 엔진의 절기 계산에서 얻는다. 날짜를 코드에 적어 두지 않는다. */
export function ipchun(year: number): { month: number; day: number; hour: number; minute: number } {
  const t = calcSolarTerms(year, 2, 10, 12, 0)
  return { month: t.ingiMonth, day: t.ingiDay, hour: t.ingiHour, minute: t.ingiMin }
}

/**
 * 지금이 사주의 몇 년인가. 입춘 전이면 전년도다(1월 15일에 열면 아직 전년도 세운).
 * 기기의 시간대와 상관없이 한국 시각으로 읽는다.
 */
export function sajuYearAt(now: Date): { year: number; beforeIpchun: boolean; ipchun: { month: number; day: number } } {
  const k = new Date(now.getTime() + 9 * 3600_000)
  const y = k.getUTCFullYear()
  const ip = ipchun(y)
  const nowKey = [k.getUTCMonth() + 1, k.getUTCDate(), k.getUTCHours(), k.getUTCMinutes()]
  const ipKey = [ip.month, ip.day, ip.hour, ip.minute]
  const before = nowKey.reduce((r, v, i) => (r !== 0 ? r : Math.sign(v - ipKey[i]!)), 0) < 0
  return { year: before ? y - 1 : y, beforeIpchun: before, ipchun: { month: ip.month, day: ip.day } }
}

export function computeChart(input: BirthInput): ChartFacts {
  const known = input.time !== null
  const saju = calculateSaju({
    year: input.year, month: input.month, day: input.day,
    hour: input.time?.hour ?? 12, minute: input.time?.minute ?? 0,
    gender: input.gender ?? 'M',
    ...(known ? {} : { unknownTime: true }),
  })
  const shown = saju.pillars.map((p, i) => ({ p, label: LABELS[i] as Pillar['label'] })).filter(({ p }) => known || p.pillar.stem !== '?')
  const pillars: Pillar[] = shown.map(({ p, label }) => ({ label, stem: p.pillar.stem, branch: p.pillar.branch }))
  const dayPillar = shown.find(x => x.label === '일주')
  const elements: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  const sipsin: string[] = []
  for (const { p } of shown) {
    for (const ch of [p.pillar.stem, p.pillar.branch]) {
      const el = ELEMENT_OF[ch]
      if (el) elements[el]++
    }
    for (const s of [p.stemSipsin, p.branchSipsin]) {
      if (s && s !== '本元' && !s.includes('?') && !sipsin.includes(s)) sipsin.push(s)
    }
  }
  const dayStem = dayPillar?.p.pillar.stem ?? ''
  const strength = measureChart({ pillars, dayStem })
  return {
    pillars,
    dayStem,
    elements,
    missing: strength.absent,
    excess: strength.excess,
    strength,
    sipsin,
    ziwei: ziweiFacts(input),
    monthMayDiffer: !known && pillarDiffersWithinDay(input, 2),
    yearMayDiffer: !known && pillarDiffersWithinDay(input, 3),
  }
}

// ---------------------------------------------------------------------------
// 심층 보고서용 원자료. 풀이 문구는 없고 엔진이 계산한 사실만 담는다.
// ---------------------------------------------------------------------------

/** 한자 이름과 한글 읽기 한 쌍. */
export type Term = { hanja: string; hangul: string }

export type DetailPillar = {
  label: Pillar['label']; stem: string; branch: string
  /** 일주의 천간은 일간 자신이라 null. */
  stemSipsin: Term | null; branchSipsin: Term; unseong: Term; sinsal: Term
  /** 지장간 글자를 붙여 쓴 것. */
  hidden: string
}
export type RelationFact = { kind: 'branch' | 'stem'; chars: string; type: string; name: string; detail: string | null; places: string[] }
export type SalFact = { key: string; name: string; hanja: string; places: string[] }
export type DaewoonFact = { age: number; ganzi: string; stemSipsin: Term; branchSipsin: Term; unseong: Term }
export type SajuDetail = {
  pillars: DetailPillar[]
  relations: RelationFact[]
  sals: SalFact[]
  gongmang: { branches: [string, string]; places: string[] }
  daewoon: DaewoonFact[]
}
export type StarFact = { name: string; main: boolean; brightness: string; siHua: string }
export type PalaceFact = { name: string; ganZhi: string; isShen: boolean; stars: StarFact[] }
export type ZiweiDetail = {
  mingZhi: string; shenZhi: string; wuXingJu: string
  palaces: PalaceFact[]
  daxian: { ageStart: number; palaceName: string }[]
}
export type YearRelation = { place: string; natal: string; type: string; name: string; detail: string | null }
export type YearZiwei = {
  mingZhi: string
  /** 유년 명궁이 본래 명반의 어느 궁에 앉는가. */
  mingNatalPalace: string
  siHua: { star: string; hua: string; natalPalace: string }[]
  /** 유년의 열두 궁(명궁·형제·…)이 각각 본래 명반의 어느 궁 자리인가. */
  palaces: { name: string; zhi: string; natalPalace: string }[]
  daxian: { palaceName: string; ageStart: number; ageEnd: number }
}
export type YearFacts = {
  year: number; ganzi: string; stem: string; branch: string
  stemSipsin: Term; branchSipsin: Term; unseong: Term
  relations: YearRelation[]
  /** 자미두수를 못 만드는 입력(시간 모름·성별 없음)이면 null. */
  ziwei: YearZiwei | null
}
export type ChartDetail = {
  saju: SajuDetail; ziwei: ZiweiDetail | null; years: YearFacts[]
  /** 입력의 사실: 대운 연도 계산에 쓰는 태어난 해, 시각·성별을 입력했는지. 월·일·시는 담지 않는다. */
  meta: { birthYear: number; timeKnown: boolean; genderKnown: boolean }
}

const PILLAR_IDX = { 시주: 0, 일주: 1, 월주: 2, 연주: 3 } as const
const SIPSIN_LABEL = ['시', '일', '월', '연'] as const
const term = (hanja: string, table: { hanja: string; hangul: string }[]): Term => ({ hanja, hangul: table.find(t => t.hanja === hanja)?.hangul ?? hanja })
const sipsinTerm = (dayStem: string, ch: string): Term => {
  const r = getRelation(dayStem, ch)
  return { hanja: r?.hanja ?? '', hangul: r?.hangul ?? '' }
}
const order = (a: string, b: string, scale: string) => (scale.indexOf(a) <= scale.indexOf(b) ? [a, b] : [b, a]).join('')
const STEMS = '甲乙丙丁戊己庚辛壬癸'
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

function sajuDetail(input: BirthInput): { detail: SajuDetail; dayStem: string; shown: { label: Pillar['label']; idx: number; stem: string; branch: string }[] } {
  const known = input.time !== null
  const saju = calculateSaju({
    year: input.year, month: input.month, day: input.day,
    hour: input.time?.hour ?? 12, minute: input.time?.minute ?? 0,
    gender: input.gender ?? 'M',
    ...(known ? {} : { unknownTime: true }),
  })
  const shown = saju.pillars.map((p, idx) => ({ p, idx, label: LABELS[idx] as Pillar['label'] })).filter(({ p }) => known || p.pillar.stem !== '?')
  const dayStem = saju.pillars[1]!.pillar.stem
  const has = (i: number) => known || i !== 0
  const pillars: DetailPillar[] = shown.map(({ p, label }) => ({
    label, stem: p.pillar.stem, branch: p.pillar.branch,
    stemSipsin: p.stemSipsin && p.stemSipsin !== '本元' ? sipsinTerm(dayStem, p.pillar.stem) : null,
    branchSipsin: sipsinTerm(dayStem, getJeonggi(p.pillar.branch)),
    unseong: term(p.unseong, METEORS_12), sinsal: term(p.sinsal, SPIRITS_12),
    hidden: p.jigang.replace(/\s/g, ''),
  }))

  const relations: RelationFact[] = []
  for (const [key, rel] of saju.relations.pairs) {
    const [i, j] = key.split(',').map(Number) as [number, number]
    if (!has(i) || !has(j)) continue
    const a = saju.pillars[i]!.pillar, b = saju.pillars[j]!.pillar
    for (const r of rel.branch) relations.push({ kind: 'branch', chars: order(a.branch, b.branch, BRANCHES), type: r.type, name: relName(r), detail: r.detail, places: [`${SIPSIN_LABEL[i]}지`, `${SIPSIN_LABEL[j]}지`] })
    for (const r of rel.stem) relations.push({ kind: 'stem', chars: order(a.stem, b.stem, STEMS), type: r.type, name: relName(r), detail: r.detail, places: [`${SIPSIN_LABEL[i]}간`, `${SIPSIN_LABEL[j]}간`] })
  }

  const ss = saju.specialSals
  const at = (idx: number[], suffix: string) => idx.filter(has).sort((x, y) => x - y).map(i => `${SIPSIN_LABEL[i]}${suffix}`)
  const dayOnly = (on: boolean) => (on ? ['일주'] : [])
  const salList: [string, string[]][] = [
    ['cheonul', at(ss.cheonul, '지')], ['cheonduk', at(ss.cheonduk, '주')], ['wolduk', at(ss.wolduk, '간')], ['munchang', at(ss.munchang, '지')],
    ['yangin', at(ss.yangin, '지')], ['baekho', dayOnly(ss.baekho)], ['goegang', dayOnly(ss.goegang)], ['dohwa', at(ss.dohwa, '지')],
    ['hongyeom', dayOnly(ss.hongyeom)], ['geumyeo', at(ss.geumyeo, '지')],
  ]
  const sals: SalFact[] = salList.filter(([, places]) => places.length > 0).map(([key, places]) => ({ key, name: SAL_KO[key] as string, hanja: SAL_HANJA[key] as string, places }))

  return {
    dayStem,
    shown: shown.map(({ idx, label, p }) => ({ label, idx, stem: p.pillar.stem, branch: p.pillar.branch })),
    detail: {
      pillars, relations, sals,
      gongmang: { branches: saju.gongmang.branches, places: saju.gongmang.pillarIndices.filter(has).sort((x, y) => x - y).map(i => `${SIPSIN_LABEL[i]}주`) },
      // 성별을 모르면 대운의 순행·역행을 알 수 없으므로 비운다.
      daewoon: !input.gender ? [] : saju.daewoon.map(d => ({ age: d.age, ganzi: d.ganzi, stemSipsin: sipsinTerm(dayStem, d.ganzi[0] as string), branchSipsin: sipsinTerm(dayStem, getJeonggi(d.ganzi[1] as string)), unseong: term(d.unseong, METEORS_12) })),
    },
  }
}

function relName(r: { type: string; detail: string | null }): string {
  const base = REL_KO[r.type] ?? r.type
  if (r.type === '刑' && r.detail === '自刑') return '자형'
  return base
}

function ziweiChart(input: BirthInput) {
  if (!input.time || !input.gender) return null
  return createChart(input.year, input.month, input.day, input.time.hour, input.time.minute, input.gender === 'M')
}

function ziweiDetail(chart: NonNullable<ReturnType<typeof ziweiChart>>): ZiweiDetail {
  return {
    mingZhi: chart.mingGongZhi, shenZhi: chart.shenGongZhi, wuXingJu: chart.wuXingJu.name,
    palaces: Object.values(chart.palaces).map(p => ({
      name: p.name, ganZhi: p.ganZhi, isShen: p.isShenGong,
      stars: p.stars.map(s => ({ name: s.name, main: MAIN_STARS.includes(s.name), brightness: s.brightness, siHua: s.siHua })),
    })),
    daxian: getDaxianList(chart).map(d => ({ ageStart: d.ageStart, palaceName: d.palaceName })),
  }
}

function yearFacts(year: number, dayStem: string, shown: { label: Pillar['label']; branch: string }[], zc: ReturnType<typeof ziweiChart>): YearFacts {
  const ganzi = getYearGanzi(year)
  const stem = ganzi[0] as string, branch = ganzi[1] as string
  const relations: YearRelation[] = []
  for (const s of shown) {
    for (const r of getBranchRelation(branch, s.branch)) relations.push({ place: `${SIPSIN_LABEL[PILLAR_IDX[s.label]]}지`, natal: s.branch, type: r.type, name: relName(r), detail: r.detail })
  }
  let ziwei: YearZiwei | null = null
  if (zc) {
    const ln = calculateLiunian(zc, year)
    const natalAt = (zhi: string) => Object.values(zc.palaces).find(p => p.zhi === zhi)?.name ?? ''
    ziwei = {
      mingZhi: ln.mingGongZhi,
      mingNatalPalace: ln.natalPalaceAtMing,
      siHua: Object.entries(ln.siHua).map(([star, hua]) => ({ star, hua, natalPalace: ln.siHuaPalaces[hua] ?? '' })),
      palaces: Object.entries(ln.palaces).map(([name, zhi]) => ({ name, zhi, natalPalace: natalAt(zhi) })),
      daxian: { palaceName: ln.daxianPalaceName, ageStart: ln.daxianAgeStart, ageEnd: ln.daxianAgeEnd },
    }
  }
  return {
    year, ganzi, stem, branch,
    stemSipsin: sipsinTerm(dayStem, stem), branchSipsin: sipsinTerm(dayStem, getJeonggi(branch)),
    unseong: term(getTwelveMeteor(dayStem, branch), METEORS_12),
    relations, ziwei,
  }
}

/** 심층 보고서의 원자료. `nowYear`는 기기 시계의 해를 호출하는 쪽이 넘긴다(시험에서 고정하려고). 올해와 내년을 낸다. */
export function computeDetail(input: BirthInput, nowYear: number): ChartDetail {
  const { detail, dayStem, shown } = sajuDetail(input)
  const zc = ziweiChart(input)
  return {
    saju: detail,
    ziwei: zc ? ziweiDetail(zc) : null,
    years: [nowYear, nowYear + 1].map(y => yearFacts(y, dayStem, shown, zc)),
    meta: { birthYear: input.year, timeKnown: input.time !== null, genderKnown: input.gender !== null },
  }
}
