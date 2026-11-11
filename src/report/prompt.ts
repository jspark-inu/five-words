import type { ChartDetail, ChartFacts, Term, YearFacts, ZiweiDetail } from '../chart/chart'
import { BRIGHTNESS_KO, SIHUA_KO, palaceKo, starKo } from '../chart/names'
import { WORDS } from '../content/words'

export type PromptInput = {
  top: string[]
  /** 단어 방식에서만 있다. */
  support?: string[]
  far?: string[]
  chart: ChartFacts
  detail: ChartDetail
}

const HEADER = `아래는 제 강점 단어 검사 결과와 사주·자미두수 명식입니다. 이 자료만 근거로 저를 설명해 주세요.

지켜 주세요.
- 총운, 올해운, 내년운, 학업운으로 나눠 전통 해석을 쉬운 말로 풀어 주세요. 돈 이야기는 총운과 내년운 안에 넣어 주세요.
- 합격, 금액, 건강, 수명은 단정하지 마세요. 의학·심리 진단 표현도 쓰지 마세요.
- 세 자료가 일치하는 곳과 어긋나는 곳을 짚고, 어긋나는 곳은 제가 돌아볼 질문으로 끝내 주세요.
- 자료에 없는 값은 지어내지 말고 모르면 모른다고 하세요.`

const EL_KO = [['wood', '목'], ['fire', '화'], ['earth', '토'], ['metal', '금'], ['water', '수']] as const
const JU_KO: Record<string, string> = { 水二局: '수이국', 木三局: '목삼국', 金四局: '금사국', 土五局: '토오국', 火六局: '화육국' }
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'

const ko = (id: string) => WORDS.find(w => w.id === id)?.ko ?? id
const byBranch = (a: string, b: string) => (BRANCHES.indexOf(a) <= BRANCHES.indexOf(b) ? a + b : b + a)

function yearLine(label: string, y: YearFacts): string {
  const t = (x: Term) => x.hangul
  return `${label} ${y.year} ${y.ganzi}: ${t(y.stemSipsin)}/${t(y.branchSipsin)}/${t(y.unseong)}`
}

function sajuBlock(p: PromptInput, timeKnown: boolean, genderKnown: boolean): string {
  const s = p.detail.saju
  const out = ['[사주] 순서: 천간십신/지지십신/12운성/12신살/지장간']
  for (const x of s.pillars) out.push(`${x.label} ${x.stem}${x.branch}: ${x.stemSipsin?.hangul ?? '일간'}/${x.branchSipsin.hangul}/${x.unseong.hangul}/${x.sinsal.hangul}/${x.hidden}`)
  if (!timeKnown) out.push('(태어난 시간을 입력하지 않아 시주와 자미두수는 없습니다.)')
  out.push(`오행: ${EL_KO.map(([k, n]) => `${n}${p.chart.elements[k]}`).join(' ')}`)
  if (s.relations.length > 0) out.push(`관계: ${s.relations.map(r => `${r.chars} ${r.name}(${r.places.join('·')})`).join(', ')}`)
  const sals = s.sals
  if (sals.length > 0) out.push(`신살: ${sals.map(x => `${x.name}(${x.places.join('·')})`).join(', ')}`)
  const where = s.gongmang.places.length > 0 ? `${s.gongmang.places.join('·')}에 있음` : `${timeKnown ? '네' : '세'} 기둥에는 없음`
  out.push(`공망: ${s.gongmang.branches.join('·')} (${where})`)
  if (genderKnown) out.push(`대운(시작 나이): ${s.daewoon.map(d => `${d.age} ${d.ganzi}`).join(', ')}`)
  else out.push('(성별을 입력하지 않아 대운과 자미두수는 없습니다.)')
  const [now, next] = p.detail.years
  if (now && next) {
    out.push(`${yearLine('올해', now)}, ${yearLine('내년', next)}`)
    for (const [label, y] of [['올해', now], ['내년', next]] as const) {
      if (y.relations.length > 0) out.push(`${label} 관계: ${y.relations.map(r => `${byBranch(y.branch, r.natal)} ${r.name}(${r.place})`).join(', ')}`)
    }
  }
  return out.join('\n')
}

function ziweiBlock(p: PromptInput, z: ZiweiDetail): string {
  const out = [`[자미두수] ${JU_KO[z.wuXingJu] ?? ''}(${z.wuXingJu}), 명궁 ${z.mingZhi}, 신궁 ${z.shenZhi}`]
  for (const pa of z.palaces) {
    const fmt = (s: (typeof pa.stars)[number]) => {
      const tags = [BRIGHTNESS_KO[s.brightness] ?? s.brightness, SIHUA_KO[s.siHua] ?? s.siHua].filter(Boolean)
      return `${starKo(s.name)}${s.main && tags.length > 0 ? `(${tags.join(', ')})` : ''}`
    }
    const mains = pa.stars.filter(s => s.main)
    const aux = pa.stars.filter(s => !s.main)
    const list = [mains.length > 0 ? mains.map(fmt).join(', ') : '주성 없음', ...aux.map(fmt)]
    out.push(`${palaceKo(pa.name)} ${pa.ganZhi}: ${list.join(', ')}${pa.isShen ? ' (신궁)' : ''}`)
  }
  out.push(`대한(세는 나이): ${z.daxian.map(d => `${d.ageStart} ${palaceKo(d.palaceName)}`).join(', ')}`)
  for (const y of p.detail.years) {
    if (!y.ziwei) continue
    const hua = y.ziwei.siHua.map(h => `${starKo(h.star)} ${SIHUA_KO[h.hua] ?? h.hua}(${palaceKo(h.natalPalace)})`)
    out.push(`유년 ${y.year}: 명궁 ${palaceKo(y.ziwei.mingNatalPalace)}, ${hua.join(', ')}`)
  }
  return out.join('\n')
}

/** 학생의 자료를 AI에게 붙여 넣을 글로 만든다. 이름은 어디에도 없다. */
export function buildPrompt(p: PromptInput): string {
  const timeKnown = p.detail.saju.pillars.some(x => x.label === '시주')
  const genderKnown = p.detail.saju.daewoon.length > 0
  const words = [`다섯 단어(순서대로): ${p.top.map(ko).join(', ')}`]
  if (p.support && p.support.length > 0) words.push(`받침 단어: ${p.support.map(ko).join(', ')}`)
  if (p.far && p.far.length > 0) words.push(`먼 단어: ${p.far.map(ko).join(', ')}`)
  const blocks = [HEADER, ['[강점 단어]', ...words].join('\n'), sajuBlock(p, timeKnown, genderKnown)]
  if (p.detail.ziwei) blocks.push(ziweiBlock(p, p.detail.ziwei))
  return blocks.join('\n\n')
}
