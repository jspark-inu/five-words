// 운세 리포트 조립기. 특징(LuckFeatures)에서 블록을 골라 네 구획(총운·올해운·내년운·학업운)을 만든다. 같은 입력은 늘 같은 결과다.
// 규칙: 구획마다 정해진 소제목 순서대로 블록을 고르고, 같은 키는 보고서 안에서 한 번만 쓰고(구획 사이에서도),
// 문구가 없는 블록은 조용히 건너뛰며, 문단이 하나도 안 남은 소제목은 그리지 않는다.
// 태어난 시각을 모르면 없다는 주장을 하지 않는다: 시주가 그 글자를 채울 수 있다. 총운 문단은 PARA_CAP 근처에서 나눈다.
// 묶음 3(Task 10): 문단은 개수·종류 순서표가 아니라 세기(chart.strength), 자리 무게, 일간 강약으로 고른다.
// 기준값은 모두 제가 정한 단순 기준이다. 근거와 바꾸는 법은 design-current.md의 "운세 문단의 세기·자리 판정"에 있다.
import { hasFinalConsonant } from './josa'
import type { Element } from '../chart/chart'
import { GOD_HANJA, GROUP_OF, groupState, ELEMENT_HANJA, ELEMENT_KO, type DaewoonView, type Group, type GroupState, type LuckFeatures, type PalaceView, type StarView, type YearView } from '../chart/features'
import { named } from '../content/readings'
import { palaceShort, REL_TYPE_KO } from '../content/luck-catalogue'
import { starKo } from '../chart/names'
import { GROUP_HANJA } from '../chart/core'
import { CORE_LEVEL, DOSIK_WITH_SIKSIN, RELATION, RESCUE, geokSentence, touchulSentence } from '../content/core-copy'

export type LuckPara = { heading: string | null; text: string; note: boolean; term: boolean }
export type LuckSec = { summary: string | null; paragraphs: LuckPara[]; howTo: string | null; why: string | null }
export type YearSec = {
  id: 'now' | 'next'; year: number
  summary: string | null; good: string | null; bad: string | null
  /** 돈 이야기 한 줄. 경고도 호재도 아닐 때 이 칸에 둔다(내년운에는 늘 하나 있다). */
  money: string | null
  liunian: { heading: string; text: string } | null
  goodNews: string | null; compare: string | null
  howTo: string | null; why: string | null
}
export type LuckResult = {
  total: LuckSec | null; years: YearSec[]; study: LuckSec | null
  glance: { id: 'total' | 'now' | 'next' | 'study'; text: string }[]
  /** 자미두수·시주·대운을 못 쓴 까닭을 알리는 한 줄. 모두 쓸 수 있으면 null. */
  note: string | null
  requested: string[]; used: string[]
}

// ---- 문구 한글 다듬기 ----
const strip = (s: string) => s.replace(/\*\*/g, '')
/** 조사를 고를 때 읽는 글자: 끝에 붙은 (한자)만 뺀다. 앞쪽 괄호는 건드리지 않는다. */
const lastReading = (w: string): string => { const t = strip(w).trim(); const m = /\([^()]*\)$/.exec(t); return m && m.index > 0 ? t.slice(0, m.index) : t }
const jo = (w: string, withC: string, noC: string) => (hasFinalConsonant(lastReading(w)) ? withC : noC)
const iga = (w: string) => `${w}${jo(w, '이', '가')}`
const eul = (w: string) => `${w}${jo(w, '을', '를')}`
const wa = (a: string, b: string) => `${a}${jo(a, '과', '와')} ${b}`
const B = (s: string) => `**${s}**`
const listKo = (ys: string[], xs = ys.map(y => (y === '시간' ? '시주 천간' : y))): string => (xs.length <= 1 ? (xs[0] ?? '') : xs.length === 2 ? wa(xs[0]!, xs[1]!) : `${xs.slice(0, -1).join(', ')}${jo(xs[xs.length - 2]!, '과', '와')} ${xs[xs.length - 1]}`)
const god = (g: string) => B(`${g}(${GOD_HANJA[g]})`)
/** 궁 이름. 명궁은 이미 궁이 붙어 있다. */
const palaceLabel = (h: string) => (h === '命宮' ? '명궁' : `${palaceShort(h)}궁`)
const palT = (h: string) => B(h === '命宮' ? '명궁(命宮)' : `${palaceLabel(h)}(${h}宮)`)
const starT = (hanja: string) => B(`${starKo(hanja)}(${hanja})`)
const HUA_KO: Record<string, string> = { 化祿: '화록', 化權: '화권', 化科: '화과', 化忌: '화기' }
const huaT = (h: string) => B(`${HUA_KO[h]}(${h})`)
const HUA_GLOSS: Record<string, string> = { 化祿: '반가운 표시인', 化權: '힘이 실리는 표시인', 化科: '평판이 붙는 표시인', 化忌: '신경 쓰이는 표시인' }
/**
 * 주성 밝기 7단계(묘·왕·득·리·평·불·함). 제가 정한 기준: 불·함은 별의 좋은 면을 약하게, 조심할 면을 앞에 읽는다(어두운 자리).
 * 묘·왕은 별의 성질이 곧게, 득·리는 무리 없이, 평은 상황에 따라 나온다고 읽는다. 자미두수의 묘왕리평함 설명을 따랐다.
 */
export function brightnessTier(b: string | undefined): { name: string; dim: boolean; lead: string } {
  switch (b) {
    case '廟': return { name: '묘', dim: false, lead: '밝기는 **묘(廟)**, 가장 환한 자리라 별의 성질이 곧게 나옵니다.' }
    case '旺': return { name: '왕', dim: false, lead: '밝기는 **왕(旺)**, 환한 자리라 별의 성질이 잘 드러납니다.' }
    case '得': return { name: '득', dim: false, lead: '밝기는 **득(得)**, 제자리를 얻은 자리라 별의 성질이 무리 없이 나옵니다.' }
    case '利': return { name: '리', dim: false, lead: '밝기는 **리(利)**, 쓸 만한 자리라 별의 성질이 필요할 때 나옵니다.' }
    case '平': return { name: '평', dim: false, lead: '밝기는 **평(平)**, 보통 자리라 아래 풀이는 늘 그렇다기보다 상황에 따라 나오는 면으로 읽습니다.' }
    case '不': return { name: '불', dim: true, lead: '밝기는 **불(不)**, 힘이 덜 실리는 자리라 별의 좋은 면은 약하게 나오고 조심할 면이 먼저 보입니다.' }
    case '陷': return { name: '함', dim: true, lead: '밝기는 **함(陷)**, 가장 어두운 자리라 별의 좋은 면은 약하게 나오고 조심할 면이 먼저 보입니다.' }
    default: return { name: '', dim: false, lead: '' }
  }
}
/** 별 하나를 한 궁에서 읽는 문구. 불·함이면 별×궁 문구 대신 어두운 자리 문구(starDim)를 쓴다. 접힌 명식의 궁 카드에서도 쓴다. */
export function starReading(s: Pick<StarView, 'ko' | 'brightness'>, palace: string, blocks: Record<string, string>, short = false): string | null {
  const tier = brightnessTier(s.brightness)
  if (tier.dim) {
    const body = blocks[`starDim[${s.ko}]`]?.trim()
    // 어두운 자리 설명은 한 화면에서 처음 한 번만 풀어 쓰고, 이어지는 카드는 밝기만 짧게 말한다.
    return body ? `${short ? `밝기는 ${tier.lead.match(/\*\*[^*]+\*\*/)![0]}입니다.` : tier.lead} ${body}` : null
  }
  return blocks[`starPalace[${s.ko}:${palaceShort(palace)}]`]?.trim() || null
}
/** 일간이 센지 약한지는 단순한 규칙으로 가른 것이다. 보고서의 "왜 이렇게 풀이하나요"에 한 번 밝힌다. */
/** 구조 문구 키: 일간 강약에 따라 읽는 법이 갈리는 조합(신약+식신생재·상관생재·재생관, 신강+관인상생·살인상생)은 강약별 문구를 쓴다. */
export function patternKeyFor(blocks: Record<string, string>, pattern: string, level: string): string {
  const vk = `patternLevel[${pattern}:${level}]`
  return blocks[vk]?.trim() ? vk : `pattern[${pattern}]`
}
export const DAYLEVEL_NOTE = '일간의 기운이 센지 약한지는 월지(가장 무겁게)·일지·나머지 글자를 점수로 합친 단순한 규칙으로 가른 것이라 참고로 읽어 주세요.'
const DAYLEVEL_NOTE_NOTIME = ' 태어난 시각을 모르면 시주가 더해질 때 강약이 달라질 수 있습니다.'
const firstSentence = (s: string): string => { const m = /^[\s\S]+?[.!?](?=\s|$)/.exec(s.trim()); return (m ? m[0] : s).trim() }
/** 문장 경계: 마침표·물음표 뒤(닫는 따옴표 포함)에 공백이나 끝이 올 때만. */
const sentences = (s: string): string[] => s.match(/\S[\s\S]*?[.!?]["'”’)]?(?=\s|$)|\S[\s\S]*$/g)?.map(x => x.trim()) ?? []
const plainLen = (s: string) => strip(s).length

/** 총운 문단 하나의 글자 수 목표. */
export const PARA_CAP = 300
/** 조각들을 PARA_CAP 안에서 문단으로 묶는다. 한 조각이 넘치면 문장 단위로 나눈다. */
function packParas(segs: string[], cap = PARA_CAP): string[] {
  const out: string[] = []
  let cur = ''
  const add = (t: string) => {
    if (cur && plainLen(cur) + 1 + plainLen(t) > cap) { out.push(cur); cur = t } else cur = cur ? `${cur} ${t}` : t
  }
  for (const seg of segs) {
    if (plainLen(seg) <= cap) add(seg)
    else for (const st of sentences(seg)) add(st)
  }
  if (cur) out.push(cur)
  return out
}

/** 자미두수 없이도 읽히게 하려고 소제목마다 사주 쪽 대체 블록을 둔다. 아래는 소제목 문구다. */
const LIUNIAN_HEAD: Record<string, string> = {
  命宮: '의 나', 兄弟: ' 또래', 夫妻: ' 가까운 사람', 子女: ' 만드는 것', 財帛: ' 마음 쓰는 곳', 疾厄: ' 챙길 습관', 遷移: ' 밖에서', 交友: ' 친구들', 官祿: ' 일과 공부', 田宅: ' 지내는 곳', 福德: ' 쉼과 마음', 父母: ' 윗사람',
}
const THEME: Record<string, { label: string; meaning: string; palace?: string; palaceDesc?: string }> = {
  수: { label: '쉼', meaning: '쉼을 뜻하는', palace: '福德', palaceDesc: '마음이 쉬는' },
  토: { label: '자리 잡기', meaning: '자리 잡는 힘을 뜻하는' },
  금: { label: '맺기', meaning: '맺는 힘을 뜻하는', palace: '官祿', palaceDesc: '일을 맺는' },
  목: { label: '시작', meaning: '시작하는 힘을 뜻하는' },
  화: { label: '드러내기', meaning: '드러내는 힘을 뜻하는' },
}
const THEME_ORDER = ['수', '토', '금', '목', '화']
const ELEMENT_FROM_KO = Object.fromEntries(Object.entries(ELEMENT_KO).map(([e, ko]) => [ko, e])) as Record<string, keyof typeof ELEMENT_HANJA>
const PATTERN_HANJA: Record<string, string> = {
  식신생재: '食神生財', 상관생재: '傷官生財', 관인상생: '官印相生', 살인상생: '殺印相生', 재생관: '財生官', 재생살: '財生殺', 편인도식: '偏印倒食', 비겁탈재: '比劫奪財', 상관견관: '傷官見官',
}
const UNSEONG_GLOSS: Record<string, string> = {
  사: '사(死)는 기운이 멈추고 한 매듭을 짓는 단계라는 뜻으로, 죽음과는 상관없습니다.',
  병: '병(病)은 기운이 느슨해지는 단계라는 뜻으로, 아프다는 말이 아닙니다.',
  묘: '묘(墓)는 거두어 갈무리하는 단계라는 뜻입니다.',
  절: '절(絶)은 이어지던 흐름이 끊겼다가 새로 시작되는 단계라는 뜻입니다.',
  쇠: '쇠(衰)는 한창때를 지나 차분해지는 단계라는 뜻입니다.',
  목욕: '목욕(沐浴)은 씻고 단장하며 겉모습을 드러내는 단계라는 뜻입니다.',
}
/** 신살을 가까운 자리로 치는 자리: 월지·일지(와 월간·일간·일주). 연주·시주는 먼 자리다. */
const INNER_PLACES = new Set(['일지', '월지', '일간', '월간', '일주', '월주'])
const SAL_PRIORITY = ['천을귀인', '월덕귀인', '천덕귀인', '금여', '양인', '백호', '괴강', '도화', '홍염']
/** 붙어 있는 기둥 쌍(연-월, 월-일, 일-시)의 첫 글자 쌍. */
const ADJACENT_PILLARS = new Set(['연월', '월일', '일시'])
const REL_PRIORITY = ['충', '형', '자형', '파', '해', '합', '반합', '원진', '귀문']
const UNSEONG_GOOD = new Set(['장생', '관대', '건록', '제왕', '태', '양'])
const GOOD_REL = new Set(['합', '반합'])
const STEM_ELEMENT: Record<string, Element> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' }
const STRONG_MINOR = ['경양', '타라', '지공', '지겁', '화성', '영성']
/** 돈은 소제목을 항상 닫는 문장. 금액은 어떤 경우에도 말하지 않는다. */
const AMOUNT_CAVEAT = '얼마를 벌지는 사주가 말해 줄 수 있는 게 아닙니다.'
/** 천괴·천월이 이 궁에 앉을 때만 천을귀인과 "같은 말"로 친다. 두 별은 누구의 명반에나 있어서 있다는 것만으로는 근거가 안 된다. */
const NOBLE_PALACES = ['命宮', '財帛', '官祿', '遷移']
/**
 * 두 별이 있는 궁은 앞 별 문구만 쓴다(같은 사람을 두고 서로 어긋나는 말이 나오지 않게).
 * 예외: 승인 샘플에서 한 문장을 나눠 쓴 두 궁은 나란히(both), 샘플이 뒤 별로 읽은 궁은 뒤 별(second).
 */
const TWO_STAR_BODY: Record<string, 'both' | 'second'> = { '형제:염정+칠살': 'both', '부모:자미+탐랑': 'both', '전택:무곡+파군': 'second' }
/** 첫 문장에 이미 "~어서,"가 있는 별 문구. "X궁에는 Y가 있어,"를 앞에 붙이면 연결이 겹친다. */
const CONNECTIVE = /(어서|아서|해서|여서|라서|으니|니까),/
/** 길게 쓰는 십신 절은 이 자리와 묶일 때 먼저 남긴다. 나머지는 왜 이렇게 풀이하나요로 간다. */
const GOOD_REL_PLACES = ['일지', '월지', '연지', '시지']
/** 시주 없이는 없다고 말할 수 없는 상태의 블록을 고르지 않는다. */
const noThemeWithoutTime = (timeKnown: boolean, key: string) => timeKnown || !(/0$|없음$/.test(key))

export const NOTE_NO_TIME = '태어난 시각을 몰라 시주와 자미두수는 쓰지 않았습니다.'
export const NOTE_NO_GENDER = '성별을 입력하지 않아 대운과 자미두수는 쓰지 않았습니다.'
export const NOTE_NEITHER = '태어난 시각과 성별을 입력하지 않아 시주, 대운, 자미두수는 쓰지 않았습니다.'

class Ctx {
  requested = new Set<string>()
  used = new Set<string>()
  facts = new Set<string>()
  constructor(public blocks: Record<string, string>) {}
  /** 요청만 기록하고 쓴 것으로 치지 않는다. 블록이 있고 아직 안 쓰였으면 true. */
  has(key: string): boolean {
    this.requested.add(key)
    return !!this.blocks[key]?.trim() && !this.used.has(key)
  }
  take(key: string): string | null {
    this.requested.add(key)
    const t = this.blocks[key]
    if (!t || t.trim() === '' || this.used.has(key)) return null
    this.used.add(key)
    return t.trim()
  }
  /** 사실 문장(lead) + 문구. 문구가 없으면 문장도 쓰지 않는다. */
  seg(lead: string, key: string): string | null {
    const body = this.take(key)
    return body ? `${lead} ${body}`.trim() : null
  }
}
const join = (xs: (string | null | undefined)[]): string => xs.filter((x): x is string => !!x && x.trim() !== '').join(' ')

/** 이보다 짧은 문장은 중복으로 치지 않는다("돈입니다." 같은 첫 절). */
export const DEDUPE_MIN = 8
const sentenceKey = (s: string) => strip(s).replace(/\s+/g, ' ').trim()
/** 읽는 순서대로 훑어 이미 나온 문장을 지운다. 문단이 비면 소제목은 다음 문단으로 넘기고, 다음 문단이 없으면 함께 사라진다. */
function dedupeSentences(out: LuckResult): void {
  const seen = new Set<string>()
  const clean = (t: string | null): string | null => {
    if (!t) return t
    const kept = sentences(t).filter(st => {
      const k = sentenceKey(st)
      if (k.length < DEDUPE_MIN) return true
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return kept.length > 0 ? kept.join(' ') : null
  }
  const paras = (ps: LuckPara[]): LuckPara[] => {
    const res: LuckPara[] = []
    let carry: string | null = null
    for (const p of ps) {
      const text = clean(p.text)
      if (!text) { carry = carry ?? p.heading; continue }
      res.push({ ...p, text, heading: p.heading ?? carry })
      carry = null
    }
    return res
  }
  if (out.total) { const v = out.total; v.summary = clean(v.summary); v.paragraphs = paras(v.paragraphs); v.howTo = clean(v.howTo); v.why = clean(v.why) }
  for (const y of out.years) {
    y.summary = clean(y.summary); y.good = clean(y.good); y.bad = clean(y.bad); y.money = clean(y.money)
    if (y.liunian) { const t = clean(y.liunian.text); y.liunian = t ? { ...y.liunian, text: t } : null }
    y.goodNews = clean(y.goodNews); y.compare = clean(y.compare); y.howTo = clean(y.howTo); y.why = clean(y.why)
  }
  if (out.study) { const v = out.study; v.summary = clean(v.summary); v.paragraphs = paras(v.paragraphs); v.howTo = clean(v.howTo); v.why = clean(v.why) }
}

export function composeLuck(f: LuckFeatures, blocks: Record<string, string>, readings: Record<string, string>, opts: { restOpposed: boolean; restAllowed?: boolean }): LuckResult {
  const c = new Ctx(blocks)
  // 겉 글자에도 지장간에도 수(水)가 없어도, 강점 리포트의 다섯 단어에 쉼을 막지 않는 단어가 있으면 "쉼이 늘 모자란 사람"이라고 말하지 않는다.
  const zero = opts.restAllowed ? f.zero.filter(z => z !== 'water') : f.zero
  const whyGroup = (g: Group, st: GroupState) => (st === '없음' ? `${g} 없음(겉과 숨은 글자 모두)` : `${g}이 센 편`)
  const rd = (h: string) => readings[h] ?? h
  const why: Record<'total' | 'study', string[]> = { total: [], study: [] }
  const addWhy = (sec: 'total' | 'study', s: string) => { if (!why[sec].includes(s)) why[sec].push(s) }

  // ---------- 별 문단 도우미 ----------
  const pal = (h: string): PalaceView | null => f.palaces?.[h] ?? null
  const starsOf = (p: PalaceView, max = 2): StarView[] => p.mains.slice(0, max)
  /** 이미 말한 본래 사화. 마주 보는 두 궁이 같은 별을 빌려 오면 같은 문장이 두 번 나온다. */
  const statedHua = new Set<string>()
  let dimSeen = false
  /**
   * 한 궁의 별 문단. 별 문구가 하나도 없으면 null. stamp는 앞머리 문장의 꼴이다:
   * first "X궁에 Y가 있습니다." / next "X궁에는 Y가 있어," / seat "X궁은 Y 자리입니다."
   */
  const palaceSeg = (h: string, sec: 'total' | 'study', opts2: { brightness?: boolean; stamp?: 'first' | 'next' | 'seat' } = {}): string | null => {
    const p = pal(h)
    if (!p || p.mains.length === 0) return null
    const stars = starsOf(p, 2)
    const rule = stars.length === 2 ? TWO_STAR_BODY[`${palaceShort(h)}:${stars[0]!.ko}+${stars[1]!.ko}`] : undefined
    const keys = stars.map(s => `starPalace[${s.ko}:${palaceShort(h)}]`)
    // 'both'의 뒤 별은 앞 별 문장에 기대어 읽히므로, 그 자리만의 문구(starPalaceSecond)가 있으면 그것을 쓴다.
    const secondKey = rule === 'both' ? `starPalaceSecond[${stars[1]!.ko}:${palaceShort(h)}]` : ''
    // 어두운 자리(불·함)의 별은 별×궁 문구가 밝은 자리를 전제로 쓰여 있어서 쓰지 않고, 어두운 자리 문구(starDim)로 읽는다.
    const anyDim = stars.some(s => brightnessTier(s.brightness).dim)
    let body: string | null = null
    let leadStar: StarView = stars[0]!
    let dim = false
    if (rule === 'both' && !anyDim) body = join([c.take(keys[0]!), c.take(c.blocks[secondKey] ? secondKey : keys[1]!)]) || null
    else {
      const order = rule === 'second' ? [1, 0] : stars.map((_, i) => i)
      for (const i of order) {
        const st = stars[i]!
        const isDim = brightnessTier(st.brightness).dim
        body = isDim ? c.take(`starDim[${st.ko}]`) : c.take(keys[i]!)
        if (body) { leadStar = st; dim = isDim; break }
      }
    }
    if (!body) return null
    const names = stars.map(s => starT(s.star))
    const tier = brightnessTier(leadStar.brightness)
    // 밝기 한 줄: 어두운 자리면 모든 궁에서, 그 밖에는 명궁·관록궁처럼 요청한 궁에서만 본문 앞에 붙인다.
    const wantLead = !!tier.lead && (dim || !!opts2.brightness)
    let stamp = opts2.stamp ?? 'first'
    if (stamp === 'next' && (/별/.test(firstSentence(body)) || wantLead)) stamp = 'seat'
    let text: string
    if (p.borrowed) text = `${palT(h)}은 주성이 없어 ${listKo(names)}${jo(names[names.length - 1]!, '을', '를')} 빌려 옵니다. ${body}`
    else if (stamp === 'next' && CONNECTIVE.test(firstSentence(body))) text = `${palT(h)}의 ${listKo(names)} 때문에 ${body}`
    else if (stamp === 'next') text = `${palT(h)}에는 ${iga(listKo(names))} 있어, ${body}`
    else if (stamp === 'seat') text = `${palT(h)}은 ${listKo(names)} 자리입니다. ${body}`
    else text = `${palT(h)}에 ${iga(listKo(names))} 있습니다. ${body}`
    if (wantLead) {
      // 어두운 자리 설명은 처음 한 번만 풀어 쓰고, 두 번째부터는 밝기만 짧게 말한다(같은 문장이 별 이름만 바꿔 되풀이되지 않게).
      const short = dim && dimSeen
      if (dim) dimSeen = true
      const lead = `${starT(leadStar.star)}의 ${short ? `밝기는 ${tier.lead.match(/\*\*[^*]+\*\*/)![0]}입니다.` : tier.lead}`
      text = text.replace(` ${body}`, ` ${lead} ${body}`)
    }
    addWhy(sec, `${palaceLabel(h)} ${stars.map(s => s.ko).join('·')}${p.borrowed ? '(빌려 온 별)' : ''}${wantLead ? ` 밝기 ${tier.name}` : ''}`)
    // 본래 명반의 사화: 이 궁 별에 붙은 것 하나(화기를 먼저). 이미 말한 별이면 건너뛴다.
    const hs = stars.find(x => x.siHua === '化忌') ?? stars.find(x => x.siHua)
    const hua = hs && !statedHua.has(hs.star) ? c.seg(`${starT(hs.star)}에 ${HUA_GLOSS[hs.siHua]} ${huaT(hs.siHua)}${jo(huaT(hs.siHua), '이', '가')} 붙어 있습니다.`, `huaPalace[${HUA_KO[hs.siHua]}:${palaceShort(h)}]`) : null
    if (hs && hua) {
      statedHua.add(hs.star)
      // 같은 궁의 같은 별을 이미 근거에 적었으면 사화를 그 항목에 붙인다(같은 별이 두 번 적히지 않게).
      const at = why[sec].findIndex(w => w.startsWith(`${palaceLabel(h)} `) && w.includes(hs.ko))
      if (at >= 0) why[sec][at] = `${why[sec][at]}(${HUA_KO[hs.siHua]})`
      else addWhy(sec, `${palaceLabel(h)} ${hs.ko}(${HUA_KO[hs.siHua]})`)
    }
    return join([text, hua])
  }
  const minorSeg = (h: string, names: string[]): string | null => {
    const p = pal(h)
    if (!p) return null
    for (const n of names) {
      const m = p.minors.find(x => x.ko === n)
      if (m) {
        const body = c.take(`minorStar[${n}]`)
        if (body) return `같은 궁에는 ${starT(m.star)}${jo(starT(m.star), '이', '가')} 함께 있습니다. ${body}`
      }
    }
    return null
  }
  /** 쓸 말이 있는 십신 무리 상태만. 있음은 정보가 없고, 시각을 모르면 없음을 말할 수 없다. */
  const stateOf = (g: Group): string | null => {
    const st = groupState(f, g)
    if (st === '있음' || (st === '없음' && !f.timeKnown)) return null
    return st
  }

  const out: LuckResult = { total: null, years: [], study: null, glance: [], note: null, requested: [], used: [] }

  // =====================================================================
  // 학업운 (총운보다 먼저 만든다: 문창귀인·관록궁 같은 학업 몫을 먼저 가져간다)
  // =====================================================================
  const studyP: LuckPara[] = []
  const studyHow: string[] = []
  const mg = f.monthBranchGod
  const studySummary = c.take(`studySummary[${mg}]`)
  const sm = c.take(`studyMonth[${mg}]`)
  if (sm) { studyP.push({ heading: null, text: sm, note: false, term: false }); addWhy('study', `월지 ${mg}`) }
  const smHow = sm ? c.take(`studyMonth[${mg}]#howTo`) : null
  if (smHow) studyHow.push(smHow)
  const munchang = f.sals.find(s => s.key === 'munchang')
  if (munchang) {
    const t = c.seg(`${B('문창귀인(文昌貴人)')}${jo('문창귀인', '이', '가')} ${listKo(munchang.places)}에 있습니다.`, 'sinsal[문창귀인]')
    if (t) { studyP.push({ heading: null, text: t, note: true, term: false }); addWhy('study', '문창귀인'); const h = c.take('sinsal[문창귀인]#howTo'); if (h) studyHow.push(h) }
  }
  for (const g of ['관성', '인성', '식상', '재성', '비겁'] as Group[]) {
    const st = stateOf(g)
    if (!st) continue
    const t = c.take(`studyGroup[${g}:${st}]`)
    if (t) {
      studyP.push({ heading: null, text: t, note: true, term: false }); addWhy('study', whyGroup(g, st as GroupState))
      const h = c.take(`studyGroup[${g}:${st}]#howTo`); if (h) studyHow.push(h)
      break
    }
  }
  if (f.hasZiwei) {
    const career = palaceSeg('官祿', 'study', { brightness: true })
    const minor = career ? minorSeg('官祿', ['천괴', '천월']) : null
    const t = join([career, minor])
    if (t) studyP.push({ heading: null, text: t, note: true, term: false })
  }
  const flow = f.years.map(y => {
    const lead = `${B(`${y.year}년`)}은`
    const key = y.ziwei && y.ziwei.careerPalace ? `studyYear[${palaceShort(y.ziwei.careerPalace)}]` : `studyYearGod[${y.stemGod}]`
    const body = c.take(key)
    if (body) addWhy('study', y.ziwei ? `${y.year}년 유년 관록궁(${palaceLabel(y.ziwei.careerPalace)})` : `${y.year}년 천간 ${y.stemGod}`)
    return body ? `${lead} ${body}` : null
  })
  const flowText = join(flow)
  if (flowText) studyP.push({ heading: '해마다의 흐름', text: `${flowText} 합격과 성적은 사주가 정해 주지 않습니다.`, note: false, term: false })
  const study: LuckSec | null = studySummary || studyP.length > 0
    ? { summary: studySummary, paragraphs: studyP, howTo: join(studyHow) || null, why: why.study.length > 0 ? `${eul(why.study.join(', '))} 근거로 삼았습니다.` : null }
    : null
  out.study = study

  // =====================================================================
  // 총운
  // =====================================================================
  dimSeen = false
  const T: LuckPara[] = []
  const seenHead = new Set<string>()
  /** 조각들을 한 문단으로 묶되 PARA_CAP을 넘으면 나눈다. 첫 조각만 소제목을 받는다. */
  const push = (heading: string | null, text: string | (string | null | undefined)[] | null, note = false, term = false) => {
    const segs = (Array.isArray(text) ? text : [text]).filter((x): x is string => !!x && x.trim() !== '')
    for (const para of packParas(segs)) {
      const h = heading && !seenHead.has(heading) ? heading : null
      if (heading) seenHead.add(heading)
      T.push({ heading: h, text: para, note, term })
    }
  }
  /** 이렇게 써 보세요에 쓸 후보 키(차례대로). 앞에서부터 문구가 있는 넷만 쓴다. */
  const how: { theme?: string | null; pattern: string[]; sal: string[]; money?: string | null } = { pattern: [], sal: [] }

  // 요약
  // 첫 문장: 월간에 드러난 구조가 있으면 그 이름으로, 아니면 일간으로. 구조만 맞으면 다 쓰면 친구끼리 첫 줄이 똑같아진다.
  const strongKey = [...f.leadPatterns, f.dayStem].find(k => c.has(`gistStrong[${k}]`)) ?? null
  /** 첫 줄이 부른 구조를 앞으로 당긴다. 첫 줄에 나온 구조가 본문에서 빠지면 안 된다. */
  const leadFirst = (xs: string[]) => (strongKey && xs.includes(strongKey) ? [strongKey, ...xs.filter(x => x !== strongKey)] : xs)
  const openingPatterns = leadFirst(['식신생재', '상관생재', '관인상생', '살인상생', '재생관', '재생살'].filter(p => f.patterns.includes(p)))
  const strong = strongKey ? c.take(`gistStrong[${strongKey}]`) : null
  const themeKeys: string[] = [
    ...THEME_ORDER.filter(e => zero.some(z => ELEMENT_KO[z] === e)).map(e => `${e}0`),
    ...(['관성', '재성', '인성', '식상', '비겁'] as Group[]).filter(g => groupState(f, g) === '없음').map(g => `${g}없음`),
    ...f.excess.map(e => `${ELEMENT_KO[e]}많음`),
  ].filter(k => noThemeWithoutTime(f.timeKnown, k))
  const themeKey = themeKeys.find(k => c.has(`gistTheme[${k}]`)) ?? null
  // 승인 문장의 "재주와 사람 복"은 식상과 귀인이 실제로 있을 때만 쓴다.
  const hasGift = f.groupLevel.식상 !== '없음' && f.sals.some(s => ['cheonul', 'cheonduk', 'wolduk'].includes(s.key))
  const themeSum = themeKey === '수0' && !hasGift ? '쉬는 힘이 비어 있어서, 스스로 멈추는 일이 오래 따라다니는 주제로 봅니다.' : themeKey ? c.take(`gistTheme[${themeKey}]`) : null
  const totalSummary = join([strong, themeSum]) || null
  // 한눈에 보기의 총운 한 줄: 강점 절과 주제 절을 하나로. 둘 중 하나라도 없으면 요약 첫 문장을 쓴다.
  const glanceA = strongKey ? c.take(`glanceStrong[${strongKey}]`) : null
  const glanceB = themeKey ? c.take(`glanceTheme[${themeKey}]`) : null
  const totalGlance = glanceA && glanceB ? `${glanceA} ${glanceB}` : null

  // 첫머리
  const stemBlock = c.take(`dayStem[${f.dayStem}]`)
  if (stemBlock) addWhy('total', `일간 ${named(readings, f.dayStem)}`)
  addWhy('total', `일간의 기운이 ${f.dayLevel === '신강' ? '센 편' : f.dayLevel === '신약' ? '약한 편' : '한쪽으로 기울지 않음'}`)
  push(null, join([stemBlock, c.take(`dayPillar[${f.dayPillar}]`)]))
  // 명식의 줄기: 월지에서 격을 잡고, 일간 강약이 그 중심을 감당하는지, 가장 센 상대 기운과 생·극 중 어느 쪽인지 말한다.
  const core = f.core
  const mainPart = [geokSentence(core.geok.god, core.name, core.geok.byTouchul), core.geok.byTouchul ? touchulSentence(core.geok.mainGod, core.geok.god) : null, CORE_LEVEL[core.group][f.dayLevel]]
  const relPart = core.rival && core.relation
    ? [`${core.rival.stronger ? '가장 센 기운은' : '그다음으로 센 기운은'} ${B(`${core.rival.group}(${GROUP_HANJA[core.rival.group]})`)}입니다.`, RELATION[`${core.relation.from}>${core.relation.to}`]!]
    : []
  addWhy('total', `격 ${core.name.ko}`)
  if (core.relation) addWhy('total', `${core.relation.from}과 ${core.relation.to}의 ${core.relation.kind}`)
  const coreAll = join([...mainPart, ...relPart])
  // 줄기 문단은 규칙이 직접 쓴 문구라 풀이 문구를 하나도 불러오지 않은 보고서(blocks가 비어 있음)에서는 구획 자체를 만들지 않는다.
  if (Object.keys(blocks).length > 0) {
    if (plainLen(coreAll) <= PARA_CAP) push(null, coreAll)
    else { push(null, join(mainPart)); push(null, join(relPart)) }
  }
  /** 서로 막는 구조를 풀어 주는 기운: 위에서부터 먼저 맞는 것 하나. 풀어 주는 무리가 중·강일 때만. */
  const rescue = (pattern: string): string | null => RESCUE[pattern]?.find(r => f.groupLevel[r.by] === '중' || f.groupLevel[r.by] === '강')?.text ?? null
  // 식신생재와 편인도식이 함께 성립하면 식신생재 문단 끝에서 한 번에 말하고, 뒤쪽에서 편인도식을 다시 말하지 않는다.
  const dosikMerged = openingPatterns.slice(0, 2).includes('식신생재') && f.patterns.includes('편인도식')
  for (const p of openingPatterns.slice(0, 2)) {
    const t = c.seg(`${B(`${p}(${PATTERN_HANJA[p]})`)} 구조입니다.`, patternKeyFor(c.blocks, p, f.dayLevel))
    if (!t) continue
    addWhy('total', p); how.pattern.push(`pattern[${p}]#howTo`)
    if (p === '식신생재' && dosikMerged) {
      // 한 문단에 함께 둔다(글자 수 때문에 나뉘지 않게 직접 넣는다).
      T.push({ heading: null, text: join([t, DOSIK_WITH_SIKSIN, rescue('편인도식')]), note: true, term: false })
      addWhy('total', '편인도식'); how.pattern.push('pattern[편인도식]#howTo')
    } else push(null, join([t, p === '재생살' ? rescue('재생살') : null]), true)
  }
  // 신살은 일지·월지처럼 가까운 자리에 있는 것을 먼저 쓴다. 연지·시지에만 있는 것은 가까운 신살이 둘보다 적을 때만 먼 자리라는 말과 함께 쓴다.
  const salRank = (s: LuckFeatures['sals'][number]) => (s.places.some(pl => INNER_PLACES.has(pl)) ? 0 : 1) * 100 + SAL_PRIORITY.indexOf(s.name)
  let salCount = 0
  for (const s of [...f.sals].filter(x => SAL_PRIORITY.includes(x.name)).sort((a, b) => salRank(a) - salRank(b))) {
    if (salCount >= 2) break
    const outerOnly = !s.places.some(pl => INNER_PLACES.has(pl))
    let t = c.seg(`${B(`${s.name}(${s.hanja})`)}${jo(s.name, '이', '가')} ${listKo(s.places)}에 있습니다.${outerOnly ? ` ${s.name}${jo(s.name, '은', '는')} 가까운 자리가 아니라 영향은 작게 읽습니다.` : ''}`, outerOnly && c.blocks[`sinsalFar[${s.name}]`]?.trim() ? `sinsalFar[${s.name}]` : `sinsal[${s.name}]`)
    if (!t) continue
    if (s.name === '천을귀인' && f.palaces && !outerOnly) {
      // 천괴·천월은 누구에게나 있다. 삶의 중심 궁에 앉았을 때만 두 전통이 같은 말을 한다고 쓴다.
      const seats = NOBLE_PALACES.flatMap(h => pal(h)?.minors.filter(m => m.star === '天魁' || m.star === '天鉞').map(m => ({ h, m })) ?? [])
      if (seats.length > 0) {
        const where = seats.map(({ h, m }) => `${starT(m.star)}${jo(starT(m.star), '이', '가')} ${palT(h)}에`).join(', ')
        const crossText = c.seg(`자미두수에도 윗사람과 선배가 챙겨 준다는 ${where} 있습니다.`, 'cross[귀인]')
        if (crossText) { t = join([t, crossText]); addWhy('total', seats.map(({ h, m }) => `${palaceLabel(h)} ${m.ko}`).join('·')) }
      }
    }
    push(null, t, true); addWhy('total', s.name); salCount++
    if (!outerOnly) how.sal.push(`sinsal[${s.name}]#howTo`)
  }
  if (f.hasZiwei) {
    const ming = pal('命宮')!
    if (ming.borrowed) {
      const t = c.seg('자미두수에서 나를 뜻하는 ' + `${B('명궁(命宮)')}에 주성이 없습니다.`, 'mingBorrowed[명궁]')
      if (t) { push(null, t, true); addWhy('total', '명궁 주성 없음') }
    } else {
      const t = palaceSeg('命宮', 'total', { brightness: true })
      if (t) push(null, `자미두수에서 나를 뜻하는 ${t}`, true)
    }
  }

  // 평생 따라다니는 주제
  const themeEl = f.timeKnown ? THEME_ORDER.find(e => zero.some(z => ELEMENT_KO[z] === e) && c.has(`theme[${e}]`)) : undefined
  let shenStated = false
  if (themeEl) {
    const th = THEME[themeEl]!
    const hanja = ELEMENT_HANJA[ELEMENT_FROM_KO[themeEl]!]
    const supports = [`사주에 ${th.meaning} ${B(`${themeEl}(${hanja})`)}${jo(themeEl, '이', '가')} 겉 글자에도 숨은 글자에도 없습니다.`]
    if (th.palace && f.shenPalace === th.palace) shenStated = true
    if (shenStated) supports.push(`자미두수에서는 살면서 무게가 실리는 ${B('신궁(身宮)')}${jo('신궁', '이', '가')} 하필 ${th.palaceDesc} ${palT(th.palace!)}입니다.`)
    if (themeEl === '수' && opts.restOpposed) supports.push('강점 리포트에서도 다섯 단어 모두 쉼에 반대했습니다.')
    const agree = supports.length >= 3 ? '세 곳이 한 얘기를 합니다.' : supports.length === 2 ? '두 곳이 한 얘기를 합니다.' : ''
    const body = c.take(`theme[${themeEl}]`)
    if (body) {
      push(`평생 따라다니는 주제: ${th.label}`, join([...supports, agree, body]))
      addWhy('total', `${themeEl}(${hanja}) 겉과 숨은 글자 모두 없음`)
      if (shenStated) addWhy('total', `신궁이 ${palaceLabel(th.palace!)}`)
      how.theme = `theme[${themeEl}]#howTo`
    }
  }

  // 겉으로 보이는 나와 속의 나
  const hd = () => '겉으로 보이는 나와 속의 나'
  if (f.monthStemGod) {
    const t = c.take(`outer[${f.monthStemGod}]`)
    if (t) { push(hd(), t); addWhy('total', `월간 ${f.monthStemGod}`) }
  }
  {
    const parts: (string | null)[] = []
    // "속은 다릅니다."는 겉과 다른 속을 말하는 문장(명궁 사화, 자형) 앞에만 쓴다. 신궁이나 일지만 있으면 대조가 아니다.
    let contrast = false
    if (f.hasZiwei) {
      const ming = pal('命宮')!
      const hs = ming.mains.find(s => s.siHua === '化忌') ?? ming.mains.find(s => s.siHua)
      if (hs) {
        const lead = `${palT('命宮')}${ming.borrowed ? '이 빌려 온' : '의'} ${starT(hs.star)}에 ${HUA_GLOSS[hs.siHua]} ${huaT(hs.siHua)}${jo(huaT(hs.siHua), '이', '가')} 붙어 있습니다.`
        const t = c.seg(lead, `huaPalace[${HUA_KO[hs.siHua]}:명궁]`)
        if (t) { parts.push(t); contrast = true; statedHua.add(hs.star); addWhy('total', `명궁 ${ming.borrowed ? '빌려 온 ' : ''}${hs.ko}(${HUA_KO[hs.siHua]})`) }
      }
    }
    const selfRels = f.relations.filter(r => r.type === '刑' && r.detail === '自刑')
    const selfRel = selfRels.find(r => ADJACENT_PILLARS.has(`${r.places[0]![0]}${r.places[1]![0]}`) || ADJACENT_PILLARS.has(`${r.places[1]![0]}${r.places[0]![0]}`)) ?? selfRels[0]
    if (selfRel) {
      const key = `${selfRel.chars}${selfRel.type}`
      const selfAdj = ADJACENT_PILLARS.has(`${selfRel.places[0]![0]}${selfRel.places[1]![0]}`) || ADJACENT_PILLARS.has(`${selfRel.places[1]![0]}${selfRel.places[0]![0]}`)
      const t0 = c.seg(`사주에${parts.length > 0 ? '도' : ''} 같은 글자끼리 찌르는 ${B(`${rd(selfRel.chars[0]!)}${rd(selfRel.chars[1]!)}자형(${selfRel.chars}自刑)`)}${jo('자형', '이', '가')} 있습니다.`, `relation[${key}]`)
      const selfName = `${rd(selfRel.chars[0]!)}${rd(selfRel.chars[1]!)}자형`
      const t = t0 && !selfAdj ? `${t0} ${selfName}${jo(selfName, '은', '는')} 붙어 있지 않고 떨어진 자리라 작용은 약한 편으로 읽습니다.` : t0
      if (t) { parts.push(t); contrast = true; addWhy('total', `${rd(selfRel.chars[0]!)}${rd(selfRel.chars[1]!)}자형`) }
    }
    if (f.shenPalace && !shenStated) {
      const t = c.seg(`자미두수에서 살면서 무게가 실리는 ${B('신궁(身宮)')}${jo('신궁', '이', '가')} ${palT(f.shenPalace)}입니다.`, `shenPalace[${palaceShort(f.shenPalace)}]`)
      if (t) { parts.push(t); addWhy('total', `신궁이 ${palaceLabel(f.shenPalace)}`) }
    }
    // 자미두수가 없으면 일지 풀이는 사람들과는 소제목의 몫이다.
    if (parts.length === 0 && f.hasZiwei) {
      const t = c.take(`dayBranchGod[${f.dayBranchGod}]`)
      if (t) parts.push(t)
    }
    if (parts.length > 0) push(hd(), [contrast ? '속은 다릅니다.' : null, ...parts], true)
  }
  if (f.hourStemGod) {
    const t = c.take(`hourGod[${f.hourStemGod}]`)
    if (t) { push(hd(), t, true); addWhy('total', `시간 ${f.hourStemGod}`) }
  }

  // 사람들과는
  const h2 = () => '사람들과는'
  if (f.hasZiwei) {
    push(h2(), [palaceSeg('兄弟', 'total'), palaceSeg('交友', 'total', { stamp: 'next' })])
    push(h2(), [palaceSeg('父母', 'total'), palaceSeg('夫妻', 'total', { stamp: 'next' })], true)
  } else {
    const peerSt = stateOf('비겁')
    const peer = peerSt ? c.take(`group[비겁:${peerSt}]`) : null
    if (peer) { push(h2(), peer); addWhy('total', whyGroup('비겁', peerSt as GroupState)) }
    const elderSt = stateOf('관성')
    const elder = elderSt ? c.take(`group[관성:${elderSt}]`) : null
    const near = c.take(`dayBranchGod[${f.dayBranchGod}]`)
    if (near) addWhy('total', `일지 ${f.dayBranchGod}`)
    push(h2(), [elder, near], true)
  }

  // 일하고 공부할 때는
  // 12신살은 일지, 월지에 있는 것만 차례로 쓴다. 이름 순서표로 고르면 어두운 이름이 앞서고 장성·반안은 거의 나오지 않았다.
  const pickSinsal12 = () => [...f.sinsal12].filter(x => x.places.some(pl => pl === '일지' || pl === '월지')).sort((a, b) => Number(b.places.includes('일지')) - Number(a.places.includes('일지'))).find(x => c.has(`sinsal12[${x.name}]`))
  const h3 = () => '일하고 공부할 때는'
  {
    // 글자 관계는 붙어 있는 두 기둥(연-월, 월-일, 일-시) 사이의 것을 먼저 쓴다. 천간끼리는 붙어 있어야만 작용한다고 보고, 떨어진 천간 관계는 쓰지 않는다.
    // 지지끼리 떨어진 관계(연-일, 월-시, 연-시)는 앞 관계를 다 쓰고도 자리가 남을 때만 먼 자리라는 말과 함께 쓴다.
    const merged = new Map<string, { chars: string; type: string; kind: string; places: string[]; pairs: string[][] }>()
    for (const r of f.relations) {
      if (r.type === '刑' && r.detail === '自刑') continue
      const key = `${r.chars}${r.type}`
      const m = merged.get(key) ?? { chars: r.chars, type: r.type, kind: r.kind, places: [], pairs: [] }
      for (const pl of r.places) if (!m.places.includes(pl)) m.places.push(pl)
      m.pairs.push(r.places)
      merged.set(key, m)
    }
    const isAdj = (m: { pairs: string[][] }) => m.pairs.some(pr => ADJACENT_PILLARS.has(`${pr[0]![0]}${pr[1]![0]}`) || ADJACENT_PILLARS.has(`${pr[1]![0]}${pr[0]![0]}`))
    const rels = [...merged.values()]
      .filter(m => m.kind !== 'stem' || isAdj(m))
      .sort((a, b) => Number(!isAdj(a)) - Number(!isAdj(b)) || REL_PRIORITY.indexOf(REL_TYPE_KO[a.type] ?? '') - REL_PRIORITY.indexOf(REL_TYPE_KO[b.type] ?? ''))
    // 글자 관계 / 자미두수 자리 / 드러나는 습관을 따로 묶는다. 위치 풀이는 고른 관계마다 붙인다.
    const relTexts: string[] = []
    for (const r of rels) {
      if (relTexts.length >= 2) break
      const tk = REL_TYPE_KO[r.type] ?? r.type
      const name = `${rd(r.chars[0]!)}${rd(r.chars[1]!)}${tk}`
      const near = isAdj(r)
      const ordered = [...r.places].sort((a, b) => '연월일시'.indexOf(a[0]!) - '연월일시'.indexOf(b[0]!)).reverse()
      const t = c.seg(`${B(`${name}(${r.chars}${r.type})`)}${jo(tk, '이', '가')} ${listKo(ordered)}에 있습니다.`, `relation[${r.chars}${r.type}]`)
      if (!t) continue
      const pair = (r.pairs.find(pr => ADJACENT_PILLARS.has(`${pr[0]![0]}${pr[1]![0]}`) || ADJACENT_PILLARS.has(`${pr[1]![0]}${pr[0]![0]}`)) ?? r.pairs[0]!).slice().sort((a, b) => '연월일시'.indexOf(a[0]!) - '연월일시'.indexOf(b[0]!)).slice(0, 2)
      const pos = pair.length === 2 ? c.take(`relPos[${tk}@${pair[0]}-${pair[1]}]`) : null
      relTexts.push(join([t, pos, near ? null : `${name}${jo(name, '은', '는')} 붙어 있지 않고 떨어진 자리라 작용은 약한 편으로 읽습니다.`])); addWhy('total', name)
    }
    push(h3(), relTexts)
    push(h3(), f.hasZiwei ? [palaceSeg('遷移', 'total', { stamp: 'seat' }), palaceSeg('田宅', 'total', { stamp: 'next' })] : null)
    const s12 = pickSinsal12()
    const s12t = s12 ? c.seg(`${B(`${s12.name}(${s12.hanja})`)}${jo(s12.name, '이', '가')} ${listKo(s12.places)}에 있습니다.`, `sinsal12[${s12.name}]`) : null
    if (s12 && s12t) addWhy('total', s12.name)
    const groupSeg = (g: Group) => { const st = stateOf(g); const t = st ? c.take(`group[${g}:${st}]`) : null; if (t) addWhy('total', whyGroup(g, st as GroupState)); return t }
    push(h3(), [s12t, groupSeg('식상'), groupSeg('관성')])
    // 막판
    const last: (string | null)[] = []
    for (const p of leadFirst(['편인도식', '상관견관'])) {
      if (!f.patterns.includes(p) || (p === '편인도식' && dosikMerged)) continue
      const t = c.seg(`${B(`${p}(${PATTERN_HANJA[p]})`)}${jo(p, '이', '가')} 있습니다.`, `pattern[${p}]`)
      if (t) { last.push(t, rescue(p)); addWhy('total', p); how.pattern.push(`pattern[${p}]#howTo`); break }
    }
    const s12b = pickSinsal12()
    if (s12b) { const t = c.seg(`${B(`${s12b.name}(${s12b.hanja})`)}${jo(s12b.name, '이', '가')} ${listKo(s12b.places)}에 있습니다.`, `sinsal12[${s12b.name}]`); if (t) { last.push(t); addWhy('total', s12b.name) } }
    push(h3(), last, true)
  }

  // 돈은
  {
    // 재성 글자는 세기가 '중' 이상일 때만 센다. 연지·시지에 한 글자만 있는 약한 재성으로 편재형/정재형을 가르지 않는다(한 글자로 갈리던 학생이 38%였다).
    // 겉에도 숨은 글자에도 재성이 없을 때만 '없음', 있으나 약하면 '약함'이다.
    const strongJae = (g: string) => f.godLevel[g] === '중' || f.godLevel[g] === '강'
    const shape = strongJae('편재') && strongJae('정재') ? '둘다' : strongJae('편재') ? '편재만' : strongJae('정재') ? '정재만' : f.groupLevel.재성 === '없음' ? '없음' : '약함'
    const h4 = () => '돈은'
    // 시각을 모르면 시주가 돈 글자를 채울 수 있다: 없다고 하지 않고, 처방도 쓰지 않는다.
    const unknownEmpty = !f.timeKnown && shape === '없음'
    // 재성이 약하면 어느 글자가 어디에 약하게 있는지만 사실로 말하고 문구는 한 문장으로 줄인다(누구에게나 맞는 말을 늘어놓지 않는다).
    const weakPlaces = [...new Set(['偏財', '正財'].flatMap(h => f.strength.gods[h]?.places ?? []))]
    const weakFact = shape !== '약함' ? '' : weakPlaces.length > 0 ? (weakPlaces.length === 1 ? `${B('재성(財星)')}은 ${listKo(weakPlaces)}에 하나 있을 뿐입니다.` : `${B('재성(財星)')}은 ${listKo(weakPlaces)}에 약하게만 있습니다.`) : `${B('재성(財星)')}은 지지 속 숨은 글자로만 있습니다.`
    const shapeKey = f.timeKnown ? `moneyShape[${shape}]` : `moneyShapeKnown[${shape}]`
    const t = shape === '약함' ? c.seg(weakFact, shapeKey) : c.take(shapeKey)
    if (t && !unknownEmpty) { addWhy('total', shape === '없음' ? '재성 없음(겉과 숨은 글자 모두)' : shape === '약함' ? '재성이 약함' : shape === '둘다' ? '편재·정재' : shape.replace('만', '')); how.money = `moneyShape[${shape}]#howTo` }
    const mp = leadFirst(['식신생재', '상관생재', '비겁탈재'].filter(p => f.patterns.includes(p)))
    let pt: string | null = null
    for (const p of mp) { const t0 = c.take(`moneyPattern[${p}]`); if (t0) { pt = join([t0, p === '비겁탈재' ? rescue(p) : null]); break } }
    const stars = f.hasZiwei ? palaceSeg('財帛', 'total') : null
    const mi = f.hasZiwei && stars ? minorSeg('財帛', STRONG_MINOR) : null
    const tail = [pt, stars, mi].filter((x): x is string => !!x)
    if (t || tail.length > 0) {
      // 금액 문장은 소제목의 맨 끝에 늘 붙는다.
      if (tail.length > 0) { push(h4(), t); push(h4(), [...tail, AMOUNT_CAVEAT], true) }
      else push(h4(), [t, AMOUNT_CAVEAT])
    }
  }

  // 인생의 큰 흐름
  if (f.daewoon.length > 0) {
    const curIdx = f.daewoon.findIndex(d => d.current)
    const startIdx = curIdx >= 0 ? curIdx : f.daewoon.findIndex(d => d.startYear > f.nowYear)
    const list = startIdx >= 0 ? f.daewoon.slice(startIdx, startIdx + (curIdx >= 0 ? 4 : 3)) : []
    const items: LuckPara[] = []
    list.forEach((d: DaewoonView, i) => {
      const lastOne = i === list.length - 1 && list.length > 1
      const stem = d.ganzi[0]!, branch = d.ganzi[1]!
      const lead = d.stemGod === d.branchGod ? `${god(d.stemGod)}${jo(d.stemGod, '이', '가')} 겹치는 시기입니다.` : `${god(d.stemGod)}${jo(d.stemGod, '과', '와')} ${god(d.branchGod)}의 시기입니다.`
      const body = c.seg(lead, `daewoonTheme[${d.stemGod}+${d.branchGod}]`)
      if (!body) return
      const label = c.take(`daewoonLabel[${d.stemGod}]`)
      const span = lastOne ? `${d.startYear}년부터` : `${d.startYear}~${d.endYear}년`
      const head = B(`${span} ${rd(stem)}${rd(branch)}(${d.ganzi}) 대운${label ? ` · ${label}` : ''}`)
      const parts: (string | null)[] = [head, body]
      if (f.timeKnown && f.groupLevel[GROUP_OF[d.stemGod]!] === '없음') parts.push(`사주에 없던 ${god(d.stemGod)}${jo(d.stemGod, '이', '가')} 겉으로 들어옵니다.`)
      for (const el of [d.stemElement, d.branchElement]) {
        if (f.timeKnown && zero.includes(el)) { const e = ELEMENT_KO[el]; const t = c.seg(`없던 ${B(`${e}(${ELEMENT_HANJA[el]})`)}도 함께 들어옵니다.`, `daewoonFill[${e}]`); if (t) { parts.push(t); break } }
      }
      if (d.current && f.daxian) {
        const t = c.seg(`자미두수로도 ${f.daxian.ageStart}세부터 ${f.daxian.ageEnd}세까지는 ${palT(f.daxian.palace)} 대한입니다.`, `daxianPalace[${palaceShort(f.daxian.palace)}]`)
        if (t) parts.push(t)
      }
      if (d.current) parts.push('지금이 여기입니다.')
      for (const para of packParas(parts.filter((x): x is string => !!x))) items.push({ heading: null, text: para, note: false, term: true })
      addWhy('total', `대운 ${rd(stem)}${rd(branch)}(${d.ganzi})`)
    })
    if (items.length > 0) {
      T.push({ heading: '인생의 큰 흐름', text: `일어날 일이 아니라, 전통 해석이 시기마다 꺼내는 주제입니다.${f.timeKnown ? '' : ' 태어난 시각을 몰라 대운이 바뀌는 해는 앞뒤 1년쯤 어긋날 수 있습니다.'}`, note: false, term: false }, ...items)
    }
  }

  // 이렇게 써 보세요 / 왜
  // 넷 안에서 평생 주제와 돈은 자리를 먼저 맡는다. 남은 칸은 신살, 그다음 뒤에 나온 구조(조심할 구조)부터. 평생 주제는 "그리고"로 맨 끝에 둔다.
  const howMoney = how.money ? c.take(how.money) : null
  const howTheme = how.theme ? c.take(how.theme) : null
  const howList: string[] = []
  for (const key of [...how.sal, ...[...how.pattern].reverse()]) {
    if (howList.length + (howMoney ? 1 : 0) + (howTheme ? 1 : 0) >= 4) break
    const t = c.take(key)
    if (t) howList.push(t)
  }
  if (howMoney) howList.push(howMoney)
  if (howTheme) howList.push(howList.length > 0 ? `그리고 ${howTheme}` : howTheme)
  const totalSec: LuckSec | null = totalSummary || T.length > 0
    ? { summary: totalSummary, paragraphs: T, howTo: join(howList) || null, why: why.total.length > 0 ? `${eul(why.total.join(', '))} 근거로 삼았습니다. ${DAYLEVEL_NOTE}${f.timeKnown ? '' : DAYLEVEL_NOTE_NOTIME}` : null }
    : null
  out.total = totalSec

  // =====================================================================
  // 올해운·내년운
  // =====================================================================
  const yearSecs: YearSec[] = []
  /**
   * 제가 정한 기준(억부론의 일반 원칙): 일간이 센 편이면 같은 결의 기운(비겁·인성)이 들어오는 해는 넘치는 쪽이라 부담이고,
   * 기운을 덜어 쓰는 식상·재성·관성 해는 도움이다. 일간이 약한 편이면 반대다. 한쪽으로 기울지 않았으면 해의 십신이 그대로 드러난다고 읽는다.
   * 강약 판정 자체가 단순화한 규칙이라 문구는 "센 편이라", "약한 편이라"로 단정하지 않는다.
   */
  const helpsDay = (g: Group) => g === '비겁' || g === '인성'
  const burden = (g: Group): boolean => (f.dayLevel === '신강' ? helpsDay(g) : f.dayLevel === '신약' ? !helpsDay(g) : false)
  /** 센 관계만 조심할 쪽에 쓴다: 가까운 자리(일지·월지)의 충·형·자형·파·해. 연지·시지와 원진·귀문은 왜 이렇게 풀이하나요에만 사실로 남긴다. */
  const WARN_REL = new Set(['충', '형', '자형', '파', '해'])
  /** 화기는 나·돈·일 같은 큰 궁에 붙을 때만 조심할 쪽에 쓴다(해마다 화기가 어느 궁엔가 붙으니 모든 궁을 쓰면 경고가 기본값이 된다). */
  const HUAKI_PALACES = new Set(['命宮', '財帛', '官祿'])
  f.years.forEach((y, idx) => {
    const id: 'now' | 'next' = idx === 0 ? 'now' : 'next'
    const pre = id === 'now' ? '올해' : '내년'
    const sk = `yearSipsin[${y.stemGod}+${y.branchGod}]`
    // 중화는 해의 십신이 그대로 드러난다고 읽어서 방향 문장을 붙이지 않는다("그대로 드러난다"는 정보가 없고 되풀이만 된다).
    const leaning = f.dayLevel !== '중화'
    const leanKey = `yearLean[${y.stemGroup}:${f.dayLevel}]`
    // 올해와 내년의 겉 기운이 같은 무리면 같은 문구를 두 번 쓰지 않고(한 키는 한 번만), 같은 방향이 이어진다고만 말한다.
    const leanAgain = leaning && id === 'next' && c.used.has(leanKey)
    const summary = join([
      c.take(`${sk}#summary`),
      !leaning ? null : leanAgain ? '올해와 같은 방향의 기운이 한 해 더 이어집니다.' : c.take(leanKey),
      leaning && y.branchGroup !== y.stemGroup ? c.take(`yearLeanInner[${y.branchGroup}:${f.dayLevel}]`) : null,
    ]) || null
    // 합은 정관·정재와, 충은 편관·편재와만 일어나서 세운 천간의 십신이 곧 키다.
    const dayStemText = y.dayStemKind ? c.take(`yearDayStem[${y.dayStemKind}:${y.stemGod}]`) : null
    const goodP: (string | null)[] = [y.dayStemKind === '합' ? dayStemText : null, c.take(`${sk}#good`)]
    // 조심할 쪽은 경고 점수가 3점 이상일 때만 연다(전에는 모든 학생에게 100% 붙었다). 점수는 제가 정한 단순한 값이다:
    // 해의 겉 기운이 일간에게 부담이면 0.5점(속도 부담이면 0.5점 더), 일지·월지와 충이면 3점, 일지·월지와 형·자형·파·해면 0.5점,
    // 세운 천간이 일간과 충이면 3점, 일간이 센 편인데 기운이 오르는 12운성(건록·제왕)이면 1점, 화기가 명궁·재백궁·관록궁에 붙으면 1점.
    // 강한 신호(충) 하나나 약한 신호 여러 개가 겹칠 때만 열고, 열리면 점수를 낸 문구를 모두 쓴다. 신강·중화·신약 모두 20~30%가 되도록 맞췄다.
    const innerRels = y.relations.filter(r => r.place === '일지' || r.place === '월지')
    const warnRels = innerRels.filter(r => WARN_REL.has(r.name))
    const rising = f.dayLevel === '신강' && ['건록', '제왕'].includes(y.unseong)
    const hakiHit = y.ziwei?.hua.find(h => h.hua === '化忌' && HUAKI_PALACES.has(h.palace))
    const warnScore = (burden(y.stemGroup) ? 0.5 : 0) + (burden(y.stemGroup) && burden(y.branchGroup) ? 0.5 : 0)
      + (warnRels.some(r => r.name === '충') ? 3 : 0) + (warnRels.some(r => r.name !== '충') ? 0.5 : 0)
      + (y.dayStemKind === '충' ? 3 : 0) + (rising ? 1 : 0) + (hakiHit ? 1 : 0)
    const showBad = warnScore >= 3
    const badP: (string | null)[] = [y.dayStemKind === '충' ? dayStemText : null, showBad && burden(y.stemGroup) ? c.take(`${sk}#bad`) : null]
    const afterBase = badP.length
    const stemName = named(readings, y.stem), branchName = named(readings, y.branch)
    const dayName = `${rd(f.dayStem)}${ELEMENT_KO[STEM_ELEMENT[f.dayStem]!]}`
    const whyP: string[] = [`${stemName}${jo(rd(y.stem), '은', '는')} 나에게 ${y.stemGod}, ${branchName}${jo(rd(y.branch), '은', '는')} ${y.branchGod}입니다. ${dayName}에게 ${rd(y.branch)}${jo(rd(y.branch), '은', '는')} ${y.unseong}(${y.unseongHanja}) 자리입니다.`]
    if (f.dayLevel !== '중화') whyP.push(`내 일간의 기운은 ${f.dayLevel === '신강' ? '센' : '약한'} 편으로 봅니다. ${DAYLEVEL_NOTE}${f.timeKnown ? '' : DAYLEVEL_NOTE_NOTIME}`)
    // 12운성 문구는 좋은 단계일 때만 잘 풀리는 쪽에 쓴다. 일간 기운이 센 편이면 오르는 단계(장생·관대·건록·제왕)는 넘침을 조심하는 쪽에 쓴다.
    const risingFull = showBad && rising && c.has(`yearUnseongFull[${y.unseong}]`)
    const un = UNSEONG_GOOD.has(y.unseong) && !risingFull ? c.take(`yearUnseong[${y.unseong}]`) : null
    if (risingFull) badP.push(c.take(`yearUnseongFull[${y.unseong}]`))
    // 좋은 단계가 아니면 칸에 쓰지 않지만, 무서운 이름만 남지 않도록 근거 줄에 뜻을 붙인다.
    if (UNSEONG_GLOSS[y.unseong]) whyP[0] = `${whyP[0]} ${UNSEONG_GLOSS[y.unseong]}`
    if (un) goodP.push(un)
    const relRank = (name: string) => REL_PRIORITY.indexOf(name)
    for (const r of y.relations) whyP.push(`${branchName}${jo(rd(y.branch), '은', '는')} ${r.place}의 ${named(readings, r.natal)}${jo(rd(r.natal), '과', '와')} ${r.name}${jo(r.name, '을', '를')} 이룹니다.`)
    // 글자 하나에 절 하나(가장 무거운 관계), 조심할 쪽에는 많아야 하나. 한 쌍에서 경고가 줄줄이 나오면 그 해 전체가 사고처럼 읽힌다.
    // 글로 쓰는 것은 일지·월지의 관계뿐이다. 연지·시지의 관계는 위 근거 줄에 사실로 남는다.
    const byNatal = new Map<string, YearView['relations'][number]>()
    for (const r of [...y.relations].filter(r => r.place === '일지' || r.place === '월지').sort((a, b) => relRank(a.name) - relRank(b.name))) if (!byNatal.has(r.natal)) byNatal.set(r.natal, r)
    let badRel = 0
    // 잘 풀리는 쪽에는 관계 절 하나만: 일지·월지의 합을 먼저.
    let goodRel: string | null = null
    const placeRank = (place: string) => GOOD_REL_PLACES.indexOf(place)
    for (const r of [...byNatal.values()].sort((a, b) => Number(GOOD_REL.has(b.name)) - Number(GOOD_REL.has(a.name)) || (GOOD_REL.has(a.name) ? placeRank(a.place) - placeRank(b.place) : 0))) {
      const tk = r.name
      const isGood = GOOD_REL.has(tk)
      if (!isGood && !WARN_REL.has(tk)) continue
      if (isGood ? !!goodRel : (!showBad || badRel >= 1)) continue
      const reading = `${rd(r.chars[0]!)}${rd(r.chars[1]!)}${tk}`
      const hanjaName = tk === '자형' ? `${r.chars}自刑` : `${r.chars}${r.type}`
      const t = c.seg(`${r.place}와 ${B(`${reading}(${hanjaName})`)}${jo(tk, '을', '를')} 이뤄`, `yearRelation[${tk}@${r.place}]`)
      if (!t) continue
      if (isGood) { goodRel = t; goodP.push(t) } else { badP.push(t); badRel++ }
    }
    const hiddenRel = y.relations.some(r => !(r.place === '일지' || r.place === '월지') || !(GOOD_REL.has(r.name) || WARN_REL.has(r.name)))
    let liunian: YearSec['liunian'] = null
    let goodNews: string | null = null
    let moneyInHua = false
    if (y.ziwei) {
      const z = y.ziwei
      // 유년 명궁이 타고난 명궁 자리에 앉는 경우는 명궁을 직접 비교한다(굵은 표시가 붙은 문자열의 startsWith로는 늘 거짓이었다).
      const lt = c.seg(z.mingPalace === '命宮' ? `${pre}의 명궁인 유년 명궁이 타고난 명궁 자리에 겹칩니다.` : `${pre}의 명궁인 유년 명궁이 ${palT(z.mingPalace)}으로 옵니다.`, `liunianMing[${palaceShort(z.mingPalace)}]`)
      if (lt) liunian = { heading: `${pre}${LIUNIAN_HEAD[z.mingPalace] ?? ''}`, text: lt }
      // 잘 풀리는 쪽에는 사화 절 하나만: 화권을 화과보다 먼저. z.hua는 록·권·과·기 차례다.
      let goodHua = false
      for (const h of z.hua) {
        if (goodHua && (h.hua === '化權' || h.hua === '化科')) continue
        const lead = `${palT(h.palace)}의 ${starT(h.star)}에 ${HUA_GLOSS[h.hua]} ${huaT(h.hua)}${jo(huaT(h.hua), '이', '가')} 붙었습니다.`
        // 또래를 "둘 다" 짚는다는 말은 그해 천간과 지지가 모두 또래 글자일 때만 앞 문장이 있다.
        const plainKey = `yearHua[${HUA_KO[h.hua]}:${palaceShort(h.palace)}]`
        const peerBoth = plainKey === 'yearHua[화기:형제]' && GROUP_OF[y.stemGod] === '비겁' && GROUP_OF[y.branchGod] === '비겁'
        const usePeerBoth = peerBoth && c.has('yearPeerBoth[화기:형제]')
        if (h.hua === '化忌' && (!showBad || (!HUAKI_PALACES.has(h.palace) && !usePeerBoth))) continue
        const t = c.seg(lead, usePeerBoth ? 'yearPeerBoth[화기:형제]' : plainKey)
        if (!t) continue
        if (h.palace === '財帛' && (h.hua === '化忌' || h.hua === '化祿')) moneyInHua = true
        // 내년에는 돈이 늘 칸 안에 있어야 한다: 재백궁의 화록은 반가운 소식이 아니라 잘 풀리는 쪽으로 옮긴다.
        if (h.hua === '化祿') { if (id === 'next' && h.palace === '財帛') goodP.push(t); else goodNews = t }
        // "둘 다 또래를 짚습니다."의 짝은 그해 겁재·비견 문장이다. 그 바로 뒤에 놓는다.
        else if (h.hua === '化忌') { if (usePeerBoth) badP.splice(afterBase, 0, t); else badP.push(t) }
        else { goodHua = true; goodP.push(t) }
      }
      whyP.push(`유년 명궁은 ${palaceLabel(z.mingPalace)}이고, 유년 사화는 ${z.hua.map(h => `${starKo(h.star)} ${HUA_KO[h.hua]}(${palaceLabel(h.palace)})`).join(', ')}입니다.`)
    }
    // 돈: 올해는 따로 말하지 않고, 사화나 겁재가 짚을 때 한 절만. 내년에는 늘 한 절이 있다(경고가 아니면 돈 칸에 둔다).
    const moneyGod = [y.stemGod, y.branchGod].find(g => ['편재', '정재', '겁재'].includes(g))
    let money: string | null = null
    if (!moneyInHua) {
      if (id === 'now') {
        const t = [y.stemGod, y.branchGod].includes('겁재') ? c.take('yearMoneyGod[겁재]') : null
        if (t) { if (showBad) badP.push(t); else money = t }
      } else {
        const t = moneyGod ? c.take(`yearMoneyGod[${moneyGod}]`) : null
        if (t) { if (moneyGod !== '겁재') goodP.push(t); else if (showBad) badP.push(t); else money = t }
        else money = (y.ziwei ? c.take(`yearMoney[${palaceShort(y.ziwei.moneyPalace)}]`) : null) ?? c.take('yearMoneyPlain[기본]')
      }
    }
    let compare: string | null = null
    if (id === 'next') {
      const a = f.years[0]!
      // 천간과 지지를 함께 보는 한마디가 있으면 그것을: 천간만으로는 그해 본문과 어긋나는 일진이 있다.
      const toneKey = (v: YearView) => { const both = `yearTone[${v.stemGod}+${v.branchGod}]`; return c.blocks[both]?.trim() ? both : `yearTone[${v.stemGod}]` }
      const kA = toneKey(a), kB = toneKey(y)
      const parts: string[] = []
      if (c.has(kA) && c.has(kB)) {
        const ta = c.take(kA)!, tb = c.take(kB)!
        parts.push(`올해가 ${ta}${jo(ta, '이라면', '라면')} 내년은 ${tb}입니다.`)
      }
      // 같은 궁에 올해는 화록, 내년은 화권이 붙을 때 그 궁이 뜻하는 바로 풀어 쓴다. 궁마다 문구가 있고, 다른 조합은 말하지 않는다.
      if (a.ziwei && y.ziwei) {
        const ziweiNext = y.ziwei
        const ha = a.ziwei.hua.find(x => x.hua === '化祿' && ziweiNext.hua.some(z => z.palace === x.palace && z.hua === '化權'))
        const t = ha ? c.take(`yearCompareHua[${palaceShort(ha.palace)}]`) : null
        if (t) parts.push(t)
      }
      compare = join(parts) || null
    }
    const howTo = join([c.take(`${sk}#howTo`), !leaning || leanAgain ? null : c.take(`${leanKey}#howTo`)]) || null
    // 해의 겉 기운이 일간에게 부담이면 잘 풀리는 쪽 끝에 감당 한 문장을 붙인다(한 칸에 "맞습니다"와 "줄이세요"가 같이 나오지 않게).
    const goodCaveat = burden(y.stemGroup) && goodP.some(Boolean) ? `다만 일간 기운이 ${f.dayLevel === '신강' ? '센' : '약한'} 편이라 ${pre}${pre === '올해' ? '는' : '은'} ${f.dayLevel === '신강' ? '힘이 넘치지 않게 조절하세요.' : '감당할 만큼만 맡으세요.'}` : null
    const good = join([...goodP, goodCaveat]) || null
    const bad = join(badP) || null
    // 사실만으로 만든 줄(why)은 구획을 살리지 못한다: 문구가 하나라도 있어야 이 해를 그린다.
    const hasAny = summary || good || bad || money || liunian || goodNews || howTo || compare
    if (!hasAny) return
    yearSecs.push({
      id, year: y.year, summary, good, bad, money, liunian, goodNews, compare, howTo,
      why: `${join(whyP)}${hiddenRel ? ' 본문에서 풀이하지 않은 관계는 어긋나거나 가까운 정도를 보는 전통 이름일 뿐 사건을 뜻하지 않아 작게 봅니다.' : ''} 입춘부터 다음 입춘 전까지를 한 해로 봅니다.`,
    })
  })
  out.years = yearSecs
  dedupeSentences(out)

  // 한눈에 보기: 각 구획 요약의 첫 문장. 총운은 강점과 주제를 잇는 한 줄이 있으면 그것을.
  if (out.total?.summary) out.glance.push({ id: 'total', text: totalGlance ?? firstSentence(out.total.summary) })
  for (const ys of yearSecs) if (ys.summary) out.glance.push({ id: ys.id, text: firstSentence(ys.summary) })
  if (out.study?.summary) out.glance.push({ id: 'study', text: firstSentence(out.study.summary) })

  out.note = !f.timeKnown && !f.genderKnown ? NOTE_NEITHER : !f.timeKnown ? NOTE_NO_TIME : !f.genderKnown ? NOTE_NO_GENDER : null
  out.requested = [...c.requested]
  out.used = [...c.used]
  return out
}

