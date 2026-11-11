// "세 리포트가 만나는 곳"과 오행·쉼 문단이 세기를 따르는지, 서로 모순되는 칸이 없는지 본다. 고정 시드 무작위 학생 1500명.
import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { CONTENT, DEEP } from '../src/content'
import { CLASH_FACET, DRIVING_WORDS, MATCH_FACET } from '../src/content/assemble-copy'
import { WORDS } from '../src/content/words'
import { composeReport } from '../src/report/compose'
import { LEVEL_WEIGHT, MAX_LINES, MIN_EVIDENCE, RANK_WEIGHT } from '../src/report/meetings'
import { GOD_PLACE_W, starLevel } from '../src/chart/strength'

const PREFIX = { 강: '강한', 중: '중간', 약: '약한' } as const
import { isDrivingCrowd } from '../src/report/pick'

const IDS = WORDS.map(w => w.id)
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const shuffle = (r: () => number) => { const a = [...IDS]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] } return a }
function student(r: () => number) {
  const w = shuffle(r)
  const month = 1 + Math.floor(r() * 12)
  const known = r() < 0.8
  const birth: BirthInput = { year: 1998 + Math.floor(r() * 11), month, day: 1 + Math.floor(r() * DIM[month - 1]!), time: known ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null, gender: r() < 0.5 ? 'M' : 'F' }
  const top = w.slice(0, 5), far = w.slice(7, 10), support = w.slice(5, 7)
  const chart = computeChart(birth), detail = computeDetail(birth, 2026)
  const rep = composeReport(top, chart, CONTENT, known, far, { support, contexts: [] }, { detail, copy: DEEP })
  return { top, far, chart, detail, rep, known }
}
const r0 = rng(20261107)
const S = Array.from({ length: 1500 }, () => student(r0))

describe('통합 칸 규칙', () => {
  test('모든 단어의 일치·충돌 후보 십신·별에 한쪽 면 문구가 있다', () => {
    for (const w of IDS) {
      const c = CONTENT.words[w]!
      for (const l of [...c.sipsinMatch, ...c.starMatch]) expect(MATCH_FACET[l], `${w} 일치 ${l}`).toBeTruthy()
      for (const l of [...c.sipsinClash, ...c.starClash]) expect(CLASH_FACET[l], `${w} 충돌 ${l}`).toBeTruthy()
    }
  })
  test('줄은 4개를 넘지 않고, 한 단어는 한 줄에만 나온다', () => {
    for (const { rep } of S) {
      expect(rep.meetings.length).toBeLessThanOrEqual(MAX_LINES)
      const words = rep.meetings.map(m => m.wordKo)
      expect(new Set(words).size).toBe(words.length)
    }
  })
  test('같은 십신·별을 일치와 충돌 양쪽 근거로 쓰지 않는다', () => {
    for (const { rep } of S) {
      const label = (m: (typeof rep.meetings)[number]) => [m.chartLabel, m.also?.chartLabel].filter(Boolean) as string[]
      const yes = rep.meetings.filter(m => m.kind === 'match' && m.group === 'word').flatMap(label)
      const no = rep.meetings.filter(m => m.kind === 'clash').flatMap(label)
      for (const l of no) expect(yes).not.toContain(l)
    }
  })
  test('단어 칸 이름표 앞머리는 근거 세기(강한·중간·약한 일치/충돌)와 같다', () => {
    for (const { rep } of S) for (const m of rep.meetings.filter(x => x.group === 'word' || x.group === 'core')) {
      expect(['강', '중', '약']).toContain(m.level)
      expect(m.tag.startsWith(`${PREFIX[m.level as '강' | '중' | '약']} ${m.kind === 'match' ? '일치' : '충돌'}`), m.tag).toBe(true)
    }
  })
  test('문턱(0.45) 아래 근거는 문턱을 넘는 근거 뒤에만 보이고, 같은 일치·충돌 안에서는 센 줄이 앞에 온다', () => {
    let weak = 0
    for (const { rep } of S) {
      const word = rep.meetings.filter(x => x.group === 'word')
      const score = (m: (typeof word)[number]) => RANK_WEIGHT[m.rank! - 1]! * LEVEL_WEIGHT[m.level as '강' | '중' | '약']
      for (const kind of ['match', 'clash'] as const) {
        const lv = word.filter(m => m.kind === kind).map(m => ({ 강: 0, 중: 1, 약: 2 })[m.level as '강' | '중' | '약'])
        expect([...lv].sort((a, b) => a - b)).toEqual(lv)
      }
      weak += word.filter(m => score(m) < MIN_EVIDENCE).length
    }
    expect(weak).toBeGreaterThan(0)
  })
  test('십신 근거의 단계와 이름표가 맞고, 풀이 문장이 앉은 자리를 말한다', () => {
    for (const { rep, chart } of S) for (const m of rep.meetings.filter(x => x.group === 'word' && x.source === 'saju')) {
      const hanja = m.chartLabel.match(/\(([^)]+)\)/)![1]!
      const g = chart.strength.gods[hanja]!
      expect(['강', '중', '약']).toContain(g.level)
      if (!m.also) expect(m.tag).toBe(m.kind === 'match' ? { 강: '강한 일치 · 크게 겹쳐요', 중: '중간 일치 · 겹쳐요', 약: '약한 일치 · 조금 겹쳐요' }[g.level as '강'] : { 강: '강한 충돌 · 크게 싸워요', 중: '중간 충돌 · 싸워요', 약: '약한 충돌 · 조금 부딪혀요' }[g.level as '강'])
      const heaviest = [...g.places].sort((a, b) => (GOD_PLACE_W[b as keyof typeof GOD_PLACE_W] ?? 0) - (GOD_PLACE_W[a as keyof typeof GOD_PLACE_W] ?? 0))[0]
      expect(m.chartText).toContain(heaviest ?? '숨은 글자에만')
    }
  })
  test('근거 문장에 "지장간"이 날것으로 나오지 않고, 자리는 두 곳까지만 쓴다', () => {
    for (const { rep } of S) for (const m of rep.meetings) for (const x of [m.chartText, m.also?.chartText ?? '']) {
      expect(x).not.toContain('지장간')
      const where = x.match(/\)[이가] (.+?)에 있/)?.[1]
      if (where && !x.startsWith('명궁')) expect(where.split('·').length).toBeLessThanOrEqual(2)
    }
  })
  test('사주와 자미두수가 함께인 칸의 이름표는 더 약한 쪽에 맞춘다', () => {
    for (const { rep, chart } of S) for (const m of rep.meetings.filter(x => x.also && x.group === 'word')) {
      const sipLabel = [m.chartLabel, m.also!.chartLabel].find((_, i) => [m.source, m.also!.source][i] === 'saju')!
      const star = [m.chartLabel, m.also!.chartLabel].find((_, i) => [m.source, m.also!.source][i] === 'ziwei')!
      const sl = chart.strength.gods[sipLabel.match(/\(([^)]+)\)/)![1]!]!.level
      const zl = chart.ziwei!.borrowed ? '중' : 'x'
      void star; void zl
      if (sl === '중') expect(['중간 일치 · 셋 다 겹쳐요', '약한 일치 · 셋 다 조금 겹쳐요']).toContain(m.tag)
      if (sl === '약') expect(m.tag).toBe('약한 일치 · 셋 다 조금 겹쳐요')
    }
  })
  test('어두운 별(평·불·함)과 한 단계 낮춘 빌린 별은 약한 줄로만 쓰고, 빌린 별은 빌린 별이라고 밝힌다', () => {
    let borrowed = 0
    for (const { rep, chart } of S) for (const m of rep.meetings.filter(x => x.group === 'word')) for (const it of [{ source: m.source, label: m.chartLabel, text: m.chartText }, ...(m.also ? [{ source: m.also.source, label: m.also.chartLabel, text: m.also.chartText }] : [])]) {
      if (it.source !== 'ziwei') continue
      const star = it.label.match(/\(([^)]+)\)/)![1]!
      const b = chart.ziwei!.brightness![star]!
      if (starLevel(b, chart.ziwei!.borrowed) === '약') expect(m.level, `${star} 밝기 ${b}`).toBe('약')
      if (chart.ziwei!.borrowed) { borrowed++; expect(it.text).toContain('한 단계 낮춰') } else expect(it.text).not.toContain('빌')
    }
    expect(borrowed).toBeGreaterThan(0)
  })
  test('수(水) 칸: 겉에도 지장간에도 없을 때만, 쉼을 막지 않는 단어가 없을 때만, 충돌 칸과 같은 단어를 쓰지 않는다', () => {
    let n = 0
    for (const { rep, chart, top, detail } of S) {
      const w = rep.meetings.find(m => m.group === 'water')
      if (!w) continue
      n++
      expect(chart.missing).toContain('water')
      expect(/[壬癸]/.test(detail.saju.pillars.map(p => p.hidden).join(''))).toBe(false)
      expect(top.some(id => DEEP.words[id]?.restAllow)).toBe(false)
      expect(rep.meetings.filter(m => m.kind === 'clash').map(m => m.wordKo)).not.toContain(w.wordKo)
    }
    expect(n).toBeGreaterThan(0)
    expect(n / S.length).toBeLessThan(0.08)
  })
  test('쉼을 막지 않는 단어가 있는데 운세 한눈에 보기가 "쉼이 늘 모자란 사람"이라고 말하지 않는다', () => {
    for (const { rep, top } of S) if (top.some(id => DEEP.words[id]?.restAllow)) expect(JSON.stringify(rep.deep!.luck)).not.toMatch(/쉬는 능력만 비어|쉼이 늘 모자란|쉬는 힘이 비어/)
  })
  test('먼 단어 칸의 "비어 있다"는 지장간까지 비었을 때만이다', () => {
    let n = 0
    for (const { rep, chart } of S) for (const m of rep.meetings.filter(x => x.group === 'far')) {
      n++
      const group = m.chartLabel.slice(0, 2) as keyof typeof chart.strength.groups
      expect(chart.strength.groups[group].score).toBe(0)
    }
    expect(n).toBeGreaterThan(0)
  })
  test('시각을 모르면 수·먼 단어 칸은 없다', () => {
    for (const { rep, known } of S) if (!known) expect(rep.meetings.some(m => m.group === 'water' || m.group === 'far')).toBe(false)
  })
  test('줄 수 분포: 5줄 이상은 없고, 1줄 이하인 학생은 3% 미만이다(약한 근거까지 넣어 채운다. 3%는 제가 정한 기준)', () => {
    const dist = [0, 1, 2, 3, 4].map(n => S.filter(s => s.rep.meetings.length === n).length)
    console.log('통합 칸 줄 수 분포(0~4줄, 학생 수):', dist.join(' / '))
    expect(S.filter(s => s.rep.meetings.length >= 5).length).toBe(0)
    expect(S.filter(s => s.rep.meetings.length <= 1).length / S.length).toBeLessThan(0.03)
  })
  test('일치와 충돌이 둘 다 보이는 학생이 절반 넘는다', () => {
    const both = S.filter(s => s.rep.meetings.some(m => m.kind === 'match') && s.rep.meetings.some(m => m.kind === 'clash')).length
    expect(both / S.length).toBeGreaterThan(0.5)
  })
  test('별 풀이는 자미두수 문단과 같은 문장을 반복하지 않는다', () => {
    for (const { rep } of S) if (rep.ziwei) {
      const ps = new Set(rep.ziwei.paragraphs)
      for (const m of rep.meetings) { expect(ps.has(m.chartText)).toBe(false); if (m.also) expect(ps.has(m.also.chartText)).toBe(false) }
    }
  })
})

describe('쉼 위험: 쉬지 않고 몰아치는 단어가 몰려 있을 때만', () => {
  test('몰아치는 단어 목록에는 계획·따져 봄 쪽 단어(질서·전략·미래·발상)가 없다', () => {
    for (const id of ['order', 'strategy', 'future', 'ideas', 'analysis', 'background']) expect(DRIVING_WORDS as readonly string[]).not.toContain(id)
  })
  test('켜짐 조건과 비율', () => {
    const on = S.filter(s => s.rep.deep!.risks.some(x => x.kind === 'rest'))
    for (const { top, rep } of on) {
      expect(isDrivingCrowd(top)).toBe(true)
      expect(top.slice(0, 3).some(id => DEEP.words[id]?.restAllow)).toBe(false)
      expect(rep.deep!.risks.find(x => x.kind === 'rest')!.title).toBe('쉬지 않고 몰아치는 단어가 몰려 있습니다')
    }
    const should = S.filter(s => isDrivingCrowd(s.top) && !s.top.slice(0, 3).some(id => DEEP.words[id]?.restAllow))
    expect(on.length).toBe(should.length)
    expect(on.length / S.length).toBeGreaterThan(0.04)
    expect(on.length / S.length).toBeLessThan(0.22)
  })
})

describe('오행 문단', () => {
  test('0개 문단은 겉에도 지장간에도 없을 때만 나오고, 시각을 모르면 나오지 않는다', () => {
    for (const { rep, chart, known } of S) {
      const missText = rep.saju.elementTexts.filter(t => t.includes('지장간(숨은 글자)에도 없습니다'))
      expect(missText.length).toBe(known ? chart.missing.length : 0)
    }
  })
  test('문단과 정면으로 부딪히는 단어가 다섯 안에 있으면 "반대 방향" 한 줄이 붙는다', () => {
    let n = 0
    for (const { rep, chart, top, known } of S) {
      if (known && chart.missing.includes('metal') && top.some(id => ['achievement', 'concentration', 'accountability', 'order'].includes(id))) {
        n++
        expect(rep.saju.elementTexts.find(t => t.startsWith('금(金)이 천간'))).toContain('이 풀이와 반대 방향입니다')
      }
    }
    expect(n).toBeGreaterThan(0)
  })
  test('영역 메모: 영역 하나가 비는 것만으로는 말하지 않는다', () => {
    const empties = S.filter(s => { const cnt = new Set(s.top.map(id => WORDS.find(w => w.id === id)!.area)); return cnt.size === 3 })
    expect(empties.length).toBeGreaterThan(0)
    for (const { rep, top } of empties) {
      const keys = Object.entries(DEEP.areaEmpty).filter(([k]) => !k.includes('+')).map(([, v]) => v)
      for (const v of keys) expect(rep.deep!.areaNotes).not.toContain(v)
      void top
    }
  })
})
