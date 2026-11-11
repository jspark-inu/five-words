import { describe, expect, test } from 'vitest'
import { CONTENT } from '../src/content'
import { WORDS } from '../src/content/words'
import { computeChart } from '../src/chart/chart'
import { composeReport } from '../src/report/compose'
import { named } from '../src/content/readings'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const SIPSIN = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '正印']
const STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍']
const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'] as const

function allStrings(): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(CONTENT)
  return out
}

describe('보고서 문구', () => {
  test('34개 단어 전부 모든 칸이 비어 있지 않다', () => {
    expect(Object.keys(CONTENT.words).sort()).toEqual(WORDS.map(w => w.id).sort())
    for (const w of WORDS) {
      const c = CONTENT.words[w.id]!
      for (const k of ['heard', 'explain', 'overdo', 'manual', 'goodWith', 'carefulWith', 'experiment', 'matchLine', 'clashQuestion'] as const) {
        expect(c[k].trim().length, `${w.ko}.${k}`).toBeGreaterThan(5)
      }
      for (const k of ['early', 'middle', 'late'] as const) expect(c.breakdown[k].trim().length, `${w.ko}.breakdown.${k}`).toBeGreaterThan(5)
      // 단어 뜻과 바로 이어지지 않는 십신은 후보에서 뺐으므로, 사주와 자미두수 후보를 합쳐 일치·충돌이 각각 하나 이상 있으면 된다.
      expect(c.sipsinMatch.length + c.starMatch.length, `${w.ko} 일치 후보`).toBeGreaterThanOrEqual(1)
      expect(c.sipsinClash.length + c.starClash.length, `${w.ko} 충돌 후보`).toBeGreaterThanOrEqual(1)
      expect(c.clashQuestion.endsWith('?'), `${w.ko} 질문`).toBe(true)
      expect(c.heard.startsWith('"') && c.heard.endsWith('"'), `${w.ko} heard 따옴표`).toBe(true)
    }
  })

  test('일간 10, 오행 부족 5, 과다 5, 십신 10, 주성 14, 공궁 문구가 있다', () => {
    expect(Object.keys(CONTENT.dayStems).sort()).toEqual([...STEMS].sort())
    expect(Object.keys(CONTENT.sipsin).sort()).toEqual([...SIPSIN].sort())
    expect(Object.keys(CONTENT.stars).sort()).toEqual([...STARS].sort())
    for (const e of ELEMENTS) {
      expect(CONTENT.elementMissing[e].length).toBeGreaterThan(10)
      expect(CONTENT.elementExcess[e].length).toBeGreaterThan(10)
    }
    for (const s of [CONTENT.emptyPalace, CONTENT.noBirthTime, CONTENT.noGender, CONTENT.remedy, CONTENT.footer]) expect(s.length).toBeGreaterThan(10)
    for (const v of [...Object.values(CONTENT.dayStems), ...Object.values(CONTENT.sipsin), ...Object.values(CONTENT.stars)]) expect(v.length).toBeGreaterThan(20)
  })

  test('sipsinMatch 등의 연결 값이 실제 십신·주성 이름이다', () => {
    for (const w of WORDS) {
      const c = CONTENT.words[w.id]!
      for (const s of [...c.sipsinMatch, ...c.sipsinClash]) expect(SIPSIN, `${w.ko}: ${s}`).toContain(s)
      for (const s of [...c.starMatch, ...c.starClash]) expect(STARS, `${w.ko}: ${s}`).toContain(s)
      expect(c.sipsinMatch.filter(s => c.sipsinClash.includes(s)), `${w.ko} 십신 일치·충돌 겹침`).toEqual([])
      expect(c.starMatch.filter(s => c.starClash.includes(s)), `${w.ko} 주성 일치·충돌 겹침`).toEqual([])
    }
  })

  test('한자 용어마다 한글 읽기가 있다: 천간 10, 지지 12, 오행국 5, 주성 14, 십신 10', () => {
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const JU = ['水二局', '木三局', '金四局', '土五局', '火六局']
    for (const h of [...STEMS, ...BRANCHES, ...JU, ...STARS, ...SIPSIN]) expect(/^[가-힣]+$/.test(CONTENT.readings[h] ?? ''), h).toBe(true)
    expect(Object.keys(CONTENT.readings)).toHaveLength(STEMS.length + BRANCHES.length + JU.length + STARS.length + SIPSIN.length)
    expect(named(CONTENT.readings, '申')).toBe('신(申)')
    expect(named(CONTENT.readings, '水二局')).toBe('수이국(水二局)')
    expect(named(CONTENT.readings, '天機')).toBe('천기(天機)')
    expect(named(CONTENT.readings, '食神')).toBe('식신(食神)')
    expect(CONTENT.mingExplain).toContain('나를 나타내는 자리')
  })

  test('짝 문구가 가리키는 단어는 실제 단어이고, 자기 자신을 가리키는 것은 주도의 조심할 짝뿐이다', () => {
    const kos = new Set(WORDS.map(w => w.ko))
    const selfRefs: string[] = []
    for (const w of WORDS) {
      const c = CONTENT.words[w.id]!
      for (const [field, text] of [['goodWith', c.goodWith], ['carefulWith', c.carefulWith]] as const) {
        const quoted = [...text.matchAll(/"([^"]+)" 단어/g)].map(m => m[1]!)
        expect(quoted.length, `${w.ko}.${field}`).toBeGreaterThanOrEqual(1)
        for (const k of quoted) {
          expect(kos.has(k), `${w.ko}.${field}: ${k}`).toBe(true)
          if (k === w.ko) selfRefs.push(`${w.ko}.${field}`)
        }
      }
    }
    expect(selfRefs).toEqual(['주도.carefulWith'])
  })

  test('일치 문구는 풀이를 가리키지 않고 단정적인 예언 말투가 없다', () => {
    for (const w of WORDS) {
      const line = CONTENT.words[w.id]!.matchLine
      expect(line.startsWith('결론: '), w.ko).toBe(true)
      expect(line, w.ko).not.toMatch(/풀이|그래서 늘|반드시/)
    }
  })

  test('약한 일치 연결은 빠져 있고, 일치 문구는 서로 다른 말투다', () => {
    const w = (id: string) => CONTENT.words[id]!
    expect(w('closeness').sipsinMatch).not.toContain('比肩')
    expect(w('strategy').sipsinMatch).not.toContain('正官')
    // 인정은 정관(명예·평판)과 상관(드러내 보이고 반응을 받으려는 마음)에 맞닿는다(Task 11d에서 짝으로 더함). 약한 연결인 편관은 넣지 않는다.
    expect(w('recognition').sipsinMatch).toEqual(['正官', '傷官'])
    expect(w('conviction').sipsinMatch).not.toContain('正官')
    expect(w('strategy').sipsinMatch).not.toContain('正官')
    const lines = WORDS.map(x => w(x.id).matchLine)
    expect(new Set(lines).size).toBe(34)
    expect(lines.filter(l => l.startsWith('결론: 둘 다')).length).toBe(0)
    expect(w('coaching').starMatch).not.toEqual(w('inclusion').starMatch)
    expect(w('coaching').sipsinMatch).not.toEqual(w('inclusion').sipsinMatch)
  })

  test('명궁 설명에 사주 용어 "명식"을 쓰지 않고, 빈 궁 문구는 단정하지 않는다', () => {
    expect(CONTENT.mingExplain).not.toContain('명식')
    expect(CONTENT.emptyBoth).not.toContain('전부')
  })

  test('먼 단어 줄: 34개 모두 있고 약점·진단 말투가 없고 서로 다르다', () => {
    expect(Object.keys(CONTENT.farLines).sort()).toEqual(WORDS.map(w => w.id).sort())
    const lines = Object.values(CONTENT.farLines)
    expect(new Set(lines).size).toBe(34)
    for (const l of lines) {
      expect(l.length).toBeGreaterThan(20)
      expect(l, l).not.toMatch(/약점|부족|결핍|못합니다|서툽|모자라|문제|우울|불안/)
    }
  })

  test('먼 단어 줄은 한 틀로 몰려 있지 않고 평판·결과 주장이 없다', () => {
    const lines = Object.values(CONTENT.farLines)
    expect(lines.filter(l => /힘을 (씁니다|아낍니다)/.test(l)).length).toBeLessThanOrEqual(4)
    expect(lines.filter(l => l.startsWith('새 ') || /쪽은 아닙니다/.test(l)).length).toBeLessThanOrEqual(3)
    for (const l of lines) expect(l, l).not.toMatch(/소리를 듣|평판|건지는|말이 통하/)
  })

  test('진단 신호: 병명과 예언성 낱말이 없다', () => {
    const banned = ['우울증', '공황', 'ADHD', '불안장애', '번아웃 증후군', '재물운', '연애운', '반드시 성공', '출세합니다']
    for (const s of allStrings()) for (const b of banned) expect(s, b).not.toContain(b)
  })

  test('사주·자미두수 풀이는 해석임을 드러낸다', () => {
    for (const v of [...Object.values(CONTENT.dayStems), ...Object.values(CONTENT.sipsin), ...Object.values(CONTENT.stars)]) {
      expect(/풀이|해석/.test(v), v).toBe(true)
    }
  })

  test('무작위 명식 500개와 무작위 다섯 단어 조합에서 보고서가 오류 없이 나온다', () => {
    let seed = 20261105
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
    const ids = WORDS.map(w => w.id)
    for (let i = 0; i < 500; i++) {
      const pool = [...ids]
      const top: string[] = []
      while (top.length < 5) top.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]!)
      const timeKnown = rnd() > 0.2
      const genderKnown = rnd() > 0.1
      const chart = computeChart({
        year: 1998 + Math.floor(rnd() * 12), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28),
        time: timeKnown ? { hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60) } : null,
        gender: genderKnown ? (rnd() > 0.5 ? 'M' : 'F') : null,
      })
      const r = composeReport(top, chart, CONTENT, timeKnown)
      expect(r.words).toHaveLength(5)
      expect(r.experiments).toHaveLength(3)
      expect(r.ziwei === null || r.ziwei.paragraphs.length >= 2).toBe(true)
    }
  })

  test('견본 명식과 다섯 단어(발상 미래 경쟁 공감 성취)는 만남 칸이 2개 이상 나온다', () => {
    const chart = computeChart({ year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' })
    const r = composeReport(['ideas', 'future', 'rivalry', 'sympathy', 'achievement'], chart, CONTENT, true)
    expect(r.meetings.length).toBeGreaterThanOrEqual(2)
  })

  test('만남 칸은 보통 명식에서 비지 않는다 (진단)', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
    const ids = WORDS.map(w => w.id)
    let empty = 0
    for (let i = 0; i < 200; i++) {
      const pool = [...ids]
      const top: string[] = []
      while (top.length < 5) top.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]!)
      const chart = computeChart({ year: 2000 + Math.floor(rnd() * 8), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), time: { hour: Math.floor(rnd() * 24), minute: 0 }, gender: rnd() > 0.5 ? 'M' : 'F' })
      if (composeReport(top, chart, CONTENT, true).meetings.length === 0) empty++
    }
    expect(empty).toBeLessThanOrEqual(2)
  })
})
