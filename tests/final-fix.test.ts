// 최종 검토 지적 반영: 글 끝 반복, 구조 이름과 일간 강약, 먼 자리 신살, 돈 칸, 숨은 글자 막대, 단어별 일치율.
import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { extractFeatures } from '../src/chart/features'
import { CONTENT, DEEP } from '../src/content'
import { READINGS } from '../src/content/readings'
import { WORDS } from '../src/content/words'
import { composeDeep } from '../src/report/deep'
import { composeReport } from '../src/report/compose'
import { composeLuck, patternKeyFor } from '../src/report/luck'
import { splitLead } from '../src/ui/dom'

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function pop(n: number, seed: number, known = true): BirthInput[] {
  const r = rng(seed)
  return Array.from({ length: n }, () => { const month = 1 + Math.floor(r() * 12); return { year: 1998 + Math.floor(r() * 11), month, day: 1 + Math.floor(r() * DIM[month - 1]!), time: known || r() < 0.8 ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null, gender: r() < 0.5 ? 'M' : 'F' } as BirthInput })
}
const strip = (s: string) => s.replace(/\*\*/g, '')
const luckOf = (b: BirthInput) => composeLuck(extractFeatures(computeChart(b), computeDetail(b, 2026)), DEEP.luckBlocks, READINGS, { restOpposed: false })

describe('필수1: 첫 문장 굵게 나누기가 글자를 보태지 않는다', () => {
  test('굵은 표시가 첫 문장 안에 있어도 원문 위치로 나뉜다', () => {
    const t = '월지와 **축미충(丑未沖)**을 이뤄 일정이 바뀌는 일이 생기기 쉬운 해로 봅니다. 다음 문장입니다.'
    const sp = splitLead(t)!
    expect(strip(sp.lead)).toBe('월지와 축미충(丑未沖)을 이뤄 일정이 바뀌는 일이 생기기 쉬운 해로 봅니다.')
    expect(sp.lead + sp.rest).toBe(t)
    expect(splitLead('이 해의 천간이 일간과 정면으로 부딪히는 **충(沖)**을 이룹니다.')!.rest).toBe('')
    expect(splitLead('마침표가 없는 글')).toBeNull()
  })
  test('실제 조립 결과의 좋은 쪽·조심할 쪽·소식 등 모든 칸에서 나눈 글이 원문과 같고 같은 끝맺음이 이어지지 않는다', () => {
    let cells = 0, withBold = 0
    for (const b of pop(1200, 7)) {
      const l = luckOf(b)
      for (const y of l.years) for (const text of [y.good, y.bad, y.money, y.goodNews, y.howTo, y.summary]) {
        if (!text) continue
        cells++
        const sp = splitLead(text)
        if (sp) { if (sp.lead.includes('**')) withBold++; expect(strip(sp.lead + sp.rest), text).toBe(strip(text)) }
        expect(strip(text), text).not.toMatch(/(\S{2,}[.!?])\s*\1/)
      }
    }
    expect(cells).toBeGreaterThan(3000)
    expect(withBold).toBeGreaterThan(300)
  })
})

describe('필수2: 구조 이름과 일간 강약', () => {
  const LEVELS = ['신강', '중화', '신약']
  const PATTERNS = ['식신생재', '상관생재', '재생관', '관인상생', '살인상생']
  test('모든 구조 × 강약 조합에서 문구가 강약과 어긋나지 않는다', () => {
    for (const p of PATTERNS) for (const lv of LEVELS) {
      const key = patternKeyFor(DEEP.luckBlocks, p, lv)
      const txt = DEEP.luckBlocks[key]!
      const weakFlow = lv === '신약' && ['식신생재', '상관생재', '재생관'].includes(p)
      const strongInsung = lv === '신강' && ['관인상생', '살인상생'].includes(p)
      if (weakFlow || strongInsung) {
        expect(key, `${p}:${lv}`).toContain('patternLevel[')
        expect(txt, `${p}:${lv}`).not.toMatch(/반기는|짐이 덜|받쳐 줍니다\. 전통/)
        expect(txt, `${p}:${lv}`).toContain(lv === '신약' ? '일간 기운이 약한 편' : '일간 기운이 센 편')
      } else expect(key, `${p}:${lv}`).toBe(`pattern[${p}]`)
    }
    // 비겁탈재(신약 제외)·재생살(신강 제외)은 구조 판정에서 이미 걸러진다
  })
  test('해마다의 문구에도 "전통이 반기는" 구조 이름이 남아 있지 않다', () => {
    for (const [k, v] of Object.entries(DEEP.luckBlocks)) if (k.startsWith('yearSipsin[')) expect(v, k).not.toMatch(/반기는 (식신생재|관인상생)|(식신생재|관인상생)[^.]*반기는/)
  })
  test('무작위 학생: 신약에게 식·재·관 구조를, 신강에게 관인·살인 구조를 "반기는 흐름"으로 읽어 주지 않는다', () => {
    let weak = 0, strong = 0
    for (const b of pop(2500, 99)) {
      const f = extractFeatures(computeChart(b), computeDetail(b, 2026))
      const l = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })
      const t = strip((l.total?.paragraphs ?? []).map(p => p.text).join(' ') + (l.total?.summary ?? ''))
      if (f.dayLevel === '신약') { for (const p of ['식신생재', '상관생재', '재생관']) if (f.patterns.includes(p) && l.used.some(k => k.startsWith(`patternLevel[${p}`) || k === `pattern[${p}]`)) { weak++; expect(l.used, `${JSON.stringify(b)} ${p}`).not.toContain(`pattern[${p}]`) } }
      if (f.dayLevel === '신강') { for (const p of ['관인상생', '살인상생']) if (f.patterns.includes(p) && l.used.some(k => k.startsWith(`patternLevel[${p}`) || k === `pattern[${p}]`)) { strong++; expect(l.used, `${JSON.stringify(b)} ${p}`).not.toContain(`pattern[${p}]`) } }
      if (f.dayLevel === '신약') expect(t).not.toMatch(/(식신생재|상관생재|재생관)[^.]*구조입니다\. [^.]*반기는 흐름/)
    }
    expect(weak).toBeGreaterThan(30)
    expect(strong).toBeGreaterThan(30)
  })
})

describe('권장3: 먼 자리 신살은 짧게', () => {
  test('먼 자리 신살 문구는 한 문장이고 복·단정 표현이 없다', () => {
    let n = 0
    for (const [k, v] of Object.entries(DEEP.luckBlocks)) if (k.startsWith('sinsalFar[')) { n++; expect(v, k).not.toMatch(/복으로|식으로 읽습니다|전통에서/); expect((v.match(/[.!?](\s|$)/g) ?? []).length, k).toBe(1) }
    expect(n).toBe(9)
    for (const b of pop(800, 41)) {
      const l = luckOf(b)
      const t = strip((l.total?.paragraphs ?? []).map(p => p.text).join(' '))
      for (const k of l.used.filter(x => x.startsWith('sinsalFar['))) expect(t).toContain(DEEP.luckBlocks[k]!)
    }
  })
})

describe('권장5: 재성이 약한 돈 칸', () => {
  test('약함은 어디에 하나 있을 뿐인지 사실을 말하고 일반론을 늘어놓지 않는다', () => {
    let n = 0
    for (const b of pop(800, 5)) {
      const l = luckOf(b)
      if (!l.used.includes('moneyShape[약함]')) continue
      n++
      const t = strip((l.total?.paragraphs ?? []).map(p => p.text).join(' '))
      expect(t).toMatch(/재성\(財星\)은 (.+에 하나 있을 뿐입니다|.+에 약하게만 있습니다|지지 속 숨은 글자로만 있습니다)\./)
      expect(t).not.toContain('그때그때 하는 일에 따라')
    }
    expect(n).toBeGreaterThan(100)
  })
})

describe('권장2: 명식 표의 오행 막대와 숨은 글자', () => {
  test('막대가 0인데 숨은 글자가 있는 오행은 숨은 개수가 따로 적힌다', () => {
    let hiddenOnly = 0
    for (const b of pop(600, 3)) {
      const chart = computeChart(b)
      const rep = composeReport(['ideas', 'future', 'rivalry', 'sympathy', 'achievement'], chart, CONTENT, true, ['coaching', 'collecting', 'sociability'], { support: ['concord', 'order'], contexts: [] }, { detail: computeDetail(b, 2026), copy: DEEP })
      for (const e of Object.keys(chart.elements) as (keyof typeof chart.elements)[]) {
        if (chart.elements[e] === 0 && chart.strength.weights[e] > 0) { hiddenOnly++; expect(rep.saju.hiddenElements[e], JSON.stringify(b)).toBeGreaterThan(0) }
        if (chart.strength.weights[e] === 0) expect(rep.saju.hiddenElements[e]).toBe(0)
      }
    }
    expect(hiddenOnly).toBeGreaterThan(50)
  })
})

describe('권장4: 단어별 일치 칸 편차', () => {
  test('인정을 뺀 어떤 단어도 일치 칸이 너무 드물지 않다(인정은 뜻이 바로 이어지는 사주 짝이 없어 별(태양·자미)로만 약 9%)', () => {
    const r = rng(20261107); const IDS = WORDS.map(w => w.id)
    const m: Record<string, number> = {}, own: Record<string, number> = {}
    for (let i = 0; i < 2000; i++) {
      const w = [...IDS]; for (let k = w.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [w[k], w[j]] = [w[j]!, w[k]!] }
      const month = 1 + Math.floor(r() * 12); const known = r() < 0.8
      const b: BirthInput = { year: 1998 + Math.floor(r() * 11), month, day: 1 + Math.floor(r() * DIM[month - 1]!), time: known ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null, gender: r() < 0.5 ? 'M' : 'F' }
      const top = w.slice(0, 5)
      const rep = composeReport(top, computeChart(b), CONTENT, known, w.slice(7, 10), { support: w.slice(5, 7), contexts: [] }, { detail: computeDetail(b, 2026), copy: DEEP })
      for (const id of top) own[id] = (own[id] ?? 0) + 1
      for (const t of rep.meetings) if ((t.group === 'word' || t.group === 'core') && t.kind === 'match') { const id = WORDS.find(x => x.ko === t.wordKo)!.id; m[id] = (m[id] ?? 0) + 1 }
    }
    const rate = (id: string) => 100 * (m[id] ?? 0) / (own[id] ?? 1)
    const others = IDS.filter(id => id !== 'recognition').map(rate)
    expect(Math.min(...others)).toBeGreaterThan(14)
    expect(Math.max(...others) / Math.min(...others)).toBeLessThan(3.2)
    expect(rate('recognition')).toBeGreaterThan(6)
  })
})

describe('사소: 열두 궁 자세히 보기의 어두운 자리 설명', () => {
  test('긴 밝기 설명은 한 번만, 이어지는 카드는 짧게', () => {
    let multi = 0
    for (const b of pop(300, 13)) {
      const chart = computeChart(b), detail = computeDetail(b, 2026)
      const d = composeDeep({ top: ['ideas', 'future', 'rivalry', 'sympathy', 'achievement'], far: null, support: null, chart, detail, copy: DEEP, readings: READINGS, content: CONTENT })
      const notes = Object.values(d.chartNotes.palace)
      const longN = notes.filter(t => t.includes('별의 좋은 면은 약하게 나오고 조심할 면이 먼저 보입니다')).length
      expect(longN).toBeLessThanOrEqual(1)
      if (notes.filter(t => /^밝기는 \*\*(함|불)/.test(t) || /^밝기는 (함|불)/.test(strip(t))).length >= 1 && longN === 1) multi++
    }
    expect(multi).toBeGreaterThan(5)
  })
})
