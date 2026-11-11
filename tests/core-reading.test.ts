// Task 11: 명식의 줄기. 격(格) 고르기, 총운 둘째 문단, 서로 막는 구조를 풀어 주는 기운, 통합 칸 첫 줄(명식 한가운데)을 확인한다.
import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput, type Pillar } from '../src/chart/chart'
import { extractFeatures } from '../src/chart/features'
import { geokName, pickGeok, readCore } from '../src/chart/core'
import { CONTENT, DEEP } from '../src/content'
import { RESCUE } from '../src/content/core-copy'
import { WORDS } from '../src/content/words'
import { READINGS } from '../src/content/readings'
import { composeReport } from '../src/report/compose'
import { composeLuck } from '../src/report/luck'
import { MAX_LINES } from '../src/report/meetings'

const IDS = WORDS.map(w => w.id)
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const shuffle = (r: () => number) => { const a = [...IDS]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
function birthOf(r: () => number): BirthInput {
  const month = 1 + Math.floor(r() * 12)
  const known = r() < 0.8
  return { year: 1998 + Math.floor(r() * 11), month, day: 1 + Math.floor(r() * DIM[month - 1]!), time: known ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null, gender: r() < 0.5 ? 'M' : 'F' }
}
function student(r: () => number, first?: string) {
  let w = shuffle(r)
  if (first) w = [first, ...w.filter(x => x !== first)]
  const birth = birthOf(r)
  const known = birth.time !== null
  const top = w.slice(0, 5), far = w.slice(7, 10), support = w.slice(5, 7)
  const chart = computeChart(birth), detail = computeDetail(birth, 2026)
  const rep = composeReport(top, chart, CONTENT, known, far, { support, contexts: [] }, { detail, copy: DEEP })
  const f = extractFeatures(chart, detail)
  const total = rep.deep!.luck.total!
  return { top, chart, rep, f, total, known }
}
const S = (() => { const r = rng(20261107); return Array.from({ length: 1500 }, () => student(r)) })()
const strip = (s: string) => s.replace(/\*\*/g, '')
const bodyOf = (t: { summary: string | null; paragraphs: { text: string }[]; howTo: string | null }) => strip([t.summary ?? '', ...t.paragraphs.map(p => p.text), t.howTo ?? ''].join('\n'))
const GEOK_RE = /[가-힣]+격\([一-龥]+格\)/g

const pillars = (y: string, m: string, d: string, h: string): Pillar[] => [
  { label: '시주', stem: h[0]!, branch: h[1]! }, { label: '일주', stem: d[0]!, branch: d[1]! }, { label: '월주', stem: m[0]!, branch: m[1]! }, { label: '연주', stem: y[0]!, branch: y[1]! },
]

describe('격 고르기', () => {
  test('乙酉년 己卯월 丁酉일 丁未시: 卯 본기 乙이 연간에 드러나 편인격', () => {
    expect(pickGeok(pillars('乙酉', '己卯', '丁酉', '丁未'), '丁')).toEqual({ god: '偏印', byTouchul: false, mainGod: '偏印' })
    const chart = computeChart({ year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' })
    expect(pickGeok(chart.pillars, chart.dayStem).god).toBe('偏印')
  })
  test('癸未년 壬戌월 己卯일 丁卯시: 본기 戊는 숨고 중기 丁이 시간에 드러나 편인, 겉 글자는 겁재', () => {
    expect(pickGeok(pillars('癸未', '壬戌', '己卯', '丁卯'), '己')).toEqual({ god: '偏印', byTouchul: true, mainGod: '劫財' })
  })
  test('丙戌년 丙申월 壬午일 辛亥시: 중기 壬은 일간뿐이라 투출이 아니고 본기 편인', () => {
    expect(pickGeok(pillars('丙戌', '丙申', '壬午', '辛亥'), '壬')).toEqual({ god: '偏印', byTouchul: false, mainGod: '偏印' })
  })
  test('격 이름: 비견 건록격, 겁재는 양간 양인격·음간 월겁격', () => {
    expect(geokName('比肩', '甲').ko).toBe('건록격')
    expect(geokName('劫財', '甲').ko).toBe('양인격')
    expect(geokName('劫財', '乙').ko).toBe('월겁격')
    expect(geokName('偏官', '乙').ko).toBe('편관격')
  })
})

describe('총운 줄기 문단', () => {
  test('모든 학생의 총운에 격 이름이 정확히 한 번 나오고, 열 가지 격이 모두 나온다', () => {
    const dist: Record<string, number> = {}
    for (const { total, f } of S) {
      const names = bodyOf(total).match(GEOK_RE) ?? []
      expect(names, `${f.core.name.ko}`).toEqual([`${f.core.name.ko}(${f.core.name.hanja})`])
      dist[f.core.geok.god] = (dist[f.core.geok.god] ?? 0) + 1
    }
    console.log('격 분포', JSON.stringify(dist), '투출', S.filter(s => s.f.core.geok.byTouchul).length)
    expect(Object.keys(dist).length).toBe(10)
  })
  test('줄기 문단은 첫 문단 바로 다음이고 note·term이 꺼져 있으며, 첫 문단에는 강약 블록이 없다', () => {
    for (const { total, f } of S) {
      const i = total.paragraphs.findIndex(p => p.text.includes(`**${f.core.name.ko}(`))
      expect(i).toBe(1)
      expect(total.paragraphs[i]!.note).toBe(false)
      expect(total.paragraphs[i]!.term).toBe(false)
      expect(total.paragraphs[0]!.text).not.toMatch(/센 편|약한 편|기울지 않/)
    }
  })
  test('일간이 신약이면 줄기 문단에 "센 편"이, 신강이면 "약한 편"이 없다', () => {
    let weak = 0, strong = 0
    for (const { total, f } of S) {
      const stem = strip(total.paragraphs.slice(1, 3).map(p => p.text).join(' ')).split('구조입니다')[0]!
      if (f.dayLevel === '신약') { weak++; expect(stem).not.toContain('센 편') }
      if (f.dayLevel === '신강') { strong++; expect(stem).not.toContain('약한 편') }
    }
    expect(weak).toBeGreaterThan(50); expect(strong).toBeGreaterThan(50)
  })
  test('상대 기운은 격 무리 밖의 중·강 무리이고, 문장 방향이 점수와 맞다', () => {
    let withRival = 0
    for (const { total, f } of S) {
      const text = strip(total.paragraphs.slice(1, 3).map(p => p.text).join(' '))
      const r = f.core.rival
      if (!r) { expect(text).not.toMatch(/가장 센 기운은|그다음으로 센 기운은/); continue }
      withRival++
      expect(['중', '강']).toContain(f.groupLevel[r.group])
      expect(r.group).not.toBe(f.core.group)
      expect(text).toContain(`${r.stronger ? '가장 센 기운은' : '그다음으로 센 기운은'} ${r.group}(`)
      expect(f.core.relation).not.toBeNull()
    }
    expect(withRival).toBeGreaterThan(900)
  })
  test('편인도식을 한 보고서에서 두 번 구조로 말하지 않고, 식신생재와 함께면 같은 문단에 있다', () => {
    let both = 0
    for (const { total, f } of S) {
      const body = bodyOf(total)
      expect((body.match(/편인도식\(偏印倒食\)/g) ?? []).length).toBeLessThanOrEqual(1)
      const rescued = RESCUE['편인도식']!.some(r => body.includes(r.text))
      expect((body.match(/편인도식/g) ?? []).length).toBeLessThanOrEqual(rescued ? 2 : 1)
      if (f.patterns.includes('식신생재') && f.patterns.includes('편인도식')) {
        both++
        const para = total.paragraphs.find(p => p.text.includes('식신생재(食神生財)'))!
        expect(para.text).toContain('편인도식(偏印倒食)')
      }
    }
    console.log('식신생재+편인도식 동시', both)
  })
  test('구제 문장은 해당 구조와 풀어 주는 무리(중·강)가 있을 때만, 구조마다 하나만 나온다', () => {
    let shown = 0
    for (const { total, f } of S) {
      const body = bodyOf(total)
      for (const [pattern, rules] of Object.entries(RESCUE)) {
        const hits = rules.filter(r => body.includes(r.text))
        expect(hits.length).toBeLessThanOrEqual(1)
        for (const h of hits) { shown++; expect(f.patterns.includes(pattern), pattern).toBe(true); expect(['중', '강']).toContain(f.groupLevel[h.by]) }
      }
    }
    expect(shown).toBeGreaterThan(30)
    console.log('구제 문장 수', shown)
  })
})

describe('통합 칸 첫 줄: 명식 한가운데', () => {
  test('core 줄은 있으면 맨 앞, 강, 그 단어는 다른 줄에 다시 안 나오고, 총 줄 수는 4 이하', () => {
    let n = 0
    for (const { rep, chart } of S) {
      expect(rep.meetings.length).toBeLessThanOrEqual(MAX_LINES)
      const core = rep.meetings.filter(m => m.group === 'core')
      expect(core.length).toBeLessThanOrEqual(1)
      if (core.length === 0) continue
      n++
      const m = core[0]!
      expect(rep.meetings[0]).toBe(m)
      expect(m.level).toBe('강')
      expect(m.tag).toBe(m.kind === 'match' ? '강한 일치 · 명식 한가운데와 겹쳐요' : '강한 충돌 · 명식 한가운데와 부딪혀요')
      expect(rep.meetings.filter(x => x.wordKo === m.wordKo).length).toBe(1)
      expect(m.chartText).toMatch(/이 명식의 중심은 월지(의| 숨은 글자에서 드러난) /)
      expect(m.chartText).toMatch(/\([가-힣]+격\)/)
      const label = m.chartLabel
      expect(rep.meetings.filter(x => x !== m && [x.chartLabel, x.also?.chartLabel].includes(label)).length).toBe(0)
      void chart
    }
    console.log('core 줄 비율', (100 * n / S.length).toFixed(1) + '%', n)
    expect(n).toBeGreaterThan(0)
  })
  test('core 줄의 뒷말은 상대 기운이 중심을 받치거나 누를 때만, 그 단어에 무슨 뜻인지로 말한다', () => {
    let bridged = 0
    for (const { rep, chart } of S) {
      const m = rep.meetings.find(x => x.group === 'core')
      if (!m) continue
      // 단어와 상관없는 관계 문장(…흐름입니다/…짜임입니다)을 그대로 붙이지 않는다.
      expect(m.chartText).not.toMatch(/흐름입니다|짜임입니다/)
      const core = readCore(chart.pillars, chart.dayStem, chart.strength)
      const acts = core.relation !== null && core.relation.to === core.group
      const has = /받쳐 주어|누르고 있/.test(m.chartText)
      expect(has, m.chartText).toBe(acts)
      if (has) { bridged++; expect(m.chartText).toContain(m.wordKo) }
    }
    console.log('core 줄 뒷말 비율', bridged)
  })
  test('견본 학생 A: 재성이 편인을 눌러 인정이 앞에 나온 까닭을 말한다', () => {
    const birth: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }
    const chart = computeChart(birth), detail = computeDetail(birth, 2026)
    const top = ['recognition', 'sympathy', 'achievement'].filter(x => IDS.includes(x))
    while (top.length < 5) top.push(IDS.find(x => !top.includes(x))!)
    const rep = composeReport(top, chart, CONTENT, true, [], { support: [], contexts: [] }, { detail, copy: DEEP })
    const m = rep.meetings.find(x => x.group === 'core')!
    expect(m.chartText).toContain('그런데 이 편인(偏印)을 재성(財星)이 누르고 있습니다.')
    expect(m.chartText).toContain('인정이 이 중심과 부딪히면서도 앞에 나온 것으로 읽을 수 있습니다.')
  })
  test('인정이 1위인 학생이 일치 줄을 받는 비율(core 포함)을 잰다', () => {
    const r = rng(777)
    const rec = Array.from({ length: 1500 }, () => student(r, 'recognition'))
    const got = rec.filter(s => s.rep.meetings.some(m => m.kind === 'match' && m.rank === 1)).length
    const coreHit = rec.filter(s => s.rep.meetings.some(m => m.group === 'core')).length
    console.log('인정 1위 일치 줄 비율', (100 * got / rec.length).toFixed(1) + '%', 'core 줄', (100 * coreHit / rec.length).toFixed(1) + '%')
    expect(got).toBeGreaterThan(0)
  })
})
void composeLuck; void READINGS
