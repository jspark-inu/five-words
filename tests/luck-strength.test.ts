// Task 10 묶음 3: 운세 문단이 "있다/없다"가 아니라 세기와 자리를 보고 고르는지 확인한다.
import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, ipchun, sajuYearAt, type BirthInput } from '../src/chart/chart'
import { extractFeatures, findPatterns, GROUP_OF, GROUPS, groupState } from '../src/chart/features'
import { composeLuck, type LuckResult } from '../src/report/luck'
import { brightnessTier } from '../src/report/luck'
import { composeDeep } from '../src/report/deep'
import { loadDeep } from '../src/content/deep'
import { CONTENT, DEEP } from '../src/content'
import { READINGS } from '../src/content/readings'
import { CORE_LEVEL } from '../src/content/core-copy'

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const dim = (y: number, m: number) => new Date(y, m, 0).getDate()
function population(n: number, seed = 20261107, knownOnly = false): BirthInput[] {
  const r = rng(seed)
  return Array.from({ length: n }, () => {
    const y = 2000 + Math.floor(r() * 9), m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * dim(y, m))
    const timeKnown = knownOnly || r() >= 0.15, genderKnown = knownOnly || r() >= 0.05
    return { year: y, month: m, day: d, time: timeKnown ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null, gender: genderKnown ? (r() < 0.5 ? 'M' : 'F') : null } as BirthInput
  })
}
const feats = (b: BirthInput, y = 2026) => extractFeatures(computeChart(b), computeDetail(b, y))
const luck = (b: BirthInput, y = 2026) => composeLuck(feats(b, y), DEEP.luckBlocks, READINGS, { restOpposed: false })
const strip = (s: string) => s.replace(/\*\*/g, '')
const allText = (l: LuckResult) => strip(JSON.stringify({ total: l.total, years: l.years, study: l.study }))
const sample: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }

describe('올해의 경계는 입춘이다', () => {
  const kst = (iso: string) => new Date(`${iso}+09:00`)
  test('1월 15일은 아직 전년도, 2월 3일도 전년도, 2월 5일부터 새해', () => {
    expect(sajuYearAt(kst('2026-01-15T12:00:00')).year).toBe(2025)
    expect(sajuYearAt(kst('2026-02-03T23:30:00')).year).toBe(2025)
    expect(sajuYearAt(kst('2026-02-05T09:00:00')).year).toBe(2026)
    expect(sajuYearAt(kst('2027-01-15T12:00:00')).year).toBe(2026)
    expect(sajuYearAt(kst('2027-02-05T09:00:00')).year).toBe(2027)
    expect(sajuYearAt(kst('2026-11-07T09:00:00')).year).toBe(2026)
    expect(sajuYearAt(kst('2026-12-31T23:59:00')).year).toBe(2026)
  })
  test('입춘 날짜는 엔진의 절기 계산에서 얻고, 그 분 전후로 해가 바뀐다', () => {
    for (const y of [2025, 2026, 2027, 2028, 2030]) {
      const ip = ipchun(y)
      expect([ip.month, ip.day]).toEqual(expect.arrayContaining([2]))
      expect(ip.day).toBeGreaterThanOrEqual(3)
      expect(ip.day).toBeLessThanOrEqual(5)
      const at = Date.UTC(y, ip.month - 1, ip.day, ip.hour - 9, ip.minute)
      expect(sajuYearAt(new Date(at - 60_000)).year, `${y} 입춘 직전`).toBe(y - 1)
      expect(sajuYearAt(new Date(at + 60_000)).year, `${y} 입춘 직후`).toBe(y)
    }
  })
  test('입춘 전이면 안내에 쓸 값이 있다', () => {
    const v = sajuYearAt(kst('2026-01-15T12:00:00'))
    expect(v.beforeIpchun).toBe(true)
    expect([v.ipchun.month, v.ipchun.day]).toEqual([2, 4])
    expect(sajuYearAt(kst('2026-06-01T12:00:00')).beforeIpchun).toBe(false)
  })
})

describe('유년 명궁이 타고난 명궁에 겹칠 때(luck.ts 분기 오류)', () => {
  test('겹치는 학생은 "타고난 명궁 자리에 겹칩니다"를 읽고 명궁(命宮)으로 옵니다는 읽지 않는다', () => {
    const hits = population(600, 7, true).filter(b => feats(b).years[0]!.ziwei?.mingPalace === '命宮')
    expect(hits.length).toBeGreaterThan(10)
    for (const b of hits) {
      const t = strip(luck(b).years[0]!.liunian?.text ?? '')
      expect(t, JSON.stringify(b)).toContain('타고난 명궁 자리에 겹칩니다')
      expect(t, JSON.stringify(b)).not.toContain('명궁(命宮)으로 옵니다')
    }
  })
})

describe('결핍·많음은 세기로 말한다', () => {
  const pop = population(900)
  test('"없음"이라고 말한 십신 무리는 겉에도 지장간에도 없고, "많음"은 월지·일지가 받치는 센 무리다', () => {
    let none = 0, many = 0
    for (const b of pop) {
      const f = feats(b); const c = computeChart(b)
      const l = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })
      for (const k of l.used) {
        const m = /^(?:group|studyGroup)\[(.{2}):(없음|많음)\]$/.exec(k) ?? /^gistTheme\[(.{2})(없음)\]$/.exec(k)
        if (!m) continue
        const g = m[1] as (typeof GROUPS)[number]
        const st = c.strength.groups[g]
        if (m[2] === '없음') { none++; expect(st.score, `${JSON.stringify(b)} ${k}`).toBe(0) }
        else { many++; expect(st.level, `${JSON.stringify(b)} ${k}`).toBe('강') }
      }
    }
    expect(none).toBeGreaterThan(5)
    expect(many).toBeGreaterThan(5)
  })
  test('groupState는 세기 단계를 따른다', () => {
    const f = feats(sample)
    for (const g of GROUPS) {
      const lv = f.groupLevel[g]
      expect(groupState(f, g)).toBe(lv === '없음' ? '없음' : lv === '강' ? '많음' : '있음')
    }
  })
  test('대운의 "사주에 없던"은 지장간까지 없는 십신 무리에만 붙는다', () => {
    for (const b of population(500, 3, true)) {
      const f = feats(b)
      const l = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })
      const t = strip((l.total?.paragraphs ?? []).map(p => p.text).join(' '))
      const m = [...t.matchAll(/사주에 없던 (비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)\(/g)]
      for (const x of m) expect(f.groupLevel[GROUP_OF[x[1]!]!], JSON.stringify(b)).toBe('없음')
    }
  })
  test('이름 있는 구조는 두 글자가 모두 센 자리에 있을 때만 붙는다', () => {
    let any = 0
    for (const b of pop.slice(0, 300)) {
      const f = feats(b)
      for (const p of f.patterns) {
        any++
        const rule: Record<string, [string[], string[]]> = {
          식신생재: [['식신'], ['편재', '정재']], 상관생재: [['상관'], ['편재', '정재']], 관인상생: [['정관'], ['편인', '정인']], 살인상생: [['편관'], ['편인', '정인']],
          재생관: [['편재', '정재'], ['정관']], 재생살: [['편재', '정재'], ['편관']], 편인도식: [['편인'], ['식신']], 비겁탈재: [['겁재'], ['편재', '정재']], 상관견관: [['상관'], ['정관']],
        }
        const [from, to] = rule[p]!
        expect(from.some(g => f.godLevel[g] !== '없음' && f.godLevel[g] !== '약'), `${p} 낳는 쪽`).toBe(true)
        expect(to.some(g => f.godLevel[g] !== '없음' && f.godLevel[g] !== '약'), `${p} 받는 쪽`).toBe(true)
      }
    }
    expect(any).toBeGreaterThan(20)
  })
  test('구조 판정: 센 글자 둘이 붙어 있고 월령·일지가 낀 쌍일 때만', () => {
    const lv = (o: Record<string, '약' | '중' | '강'>) => o as never
    expect(findPatterns([{ god: '식신', place: '월간' }, { god: '정재', place: '월지' }], lv({ 식신: '중', 정재: '중' }))).toContain('식신생재')
    expect(findPatterns([{ god: '식신', place: '월지' }, { god: '정재', place: '일지' }], lv({ 식신: '강', 정재: '중' }))).toContain('식신생재')
    // 세기가 약하면 이름을 붙이지 않는다
    expect(findPatterns([{ god: '식신', place: '월간' }, { god: '정재', place: '월지' }], lv({ 식신: '중', 정재: '약' }))).not.toContain('식신생재')
    // 연주 안에서만 붙은 쌍은 힘이 작다
    expect(findPatterns([{ god: '식신', place: '연간' }, { god: '정재', place: '연지' }], lv({ 식신: '중', 정재: '중' }))).not.toContain('식신생재')
    // 천간에 있어도 떨어져 있으면(월간-시지) 쓰지 않는다
    expect(findPatterns([{ god: '식신', place: '월간' }, { god: '정재', place: '시지' }], lv({ 식신: '중', 정재: '중' }))).not.toContain('식신생재')
  })
  test('돈 모양: 연·시 한 글자짜리 약한 재성으로 "편재만/정재만"을 말하지 않는다', () => {
    let weak = 0
    for (const b of population(900, 11, true)) {
      const f = feats(b)
      const l = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })
      const shape = l.used.find(k => /^moneyShape\[(편재만|정재만|둘다|없음|약함)\]$/.test(k))
      if (!shape) continue
      const lv = (g: string) => f.godLevel[g]!
      const strong = (g: string) => lv(g) === '중' || lv(g) === '강'
      if (shape === 'moneyShape[편재만]') expect(strong('편재') && !strong('정재')).toBe(true)
      if (shape === 'moneyShape[정재만]') expect(strong('정재') && !strong('편재')).toBe(true)
      if (shape === 'moneyShape[둘다]') expect(strong('편재') && strong('정재')).toBe(true)
      if (shape === 'moneyShape[없음]') expect(f.groupLevel.재성).toBe('없음')
      if (shape === 'moneyShape[약함]') { weak++; expect(f.groupLevel.재성).not.toBe('없음') }
    }
    expect(weak).toBeGreaterThan(5)
  })
})

describe('일간 강약이 올해·내년 글을 가른다', () => {
  test('같은 일간·같은 해라도 신강과 신약은 요약과 조언이 다르다', () => {
    const byStem = new Map<string, Map<string, LuckResult['years'][number]>>()
    for (const b of population(1200, 5, true)) {
      const f = feats(b)
      const y = luck(b).years[0]!
      const m = byStem.get(f.dayStem) ?? new Map(); if (!m.has(f.dayLevel)) m.set(f.dayLevel, y); byStem.set(f.dayStem, m)
    }
    let compared = 0
    for (const [stem, m] of byStem) {
      const a = m.get('신강'), b = m.get('신약')
      if (!a || !b) continue
      compared++
      expect(a.summary, stem).not.toBe(b.summary)
      expect(a.howTo, stem).not.toBe(b.howTo)
    }
    expect(compared).toBeGreaterThanOrEqual(8)
  })
  test('같은 글을 받는 학생: 일간이 같아도 올해 전체 글이 일간 10종으로 갈리지 않는다', () => {
    const per = new Map<string, Set<string>>()
    for (const b of population(1500, 9, true)) {
      const f = feats(b); const y = luck(b).years[0]!
      const s = per.get(f.dayStem) ?? new Set(); s.add([y.summary, y.howTo].join('|')); per.set(f.dayStem, s)
    }
    for (const [stem, s] of per) expect(s.size, stem).toBeGreaterThanOrEqual(3)
  })
  test('신약인 학생의 비겁·인성 해는 도움, 신강인 학생은 넘침으로 읽는다', () => {
    let weakHelp = 0, strongBurden = 0
    for (const b of population(1200, 5, true)) {
      const f = feats(b); const y = f.years[0]!
      const l = luck(b).years[0]!
      const grp = GROUP_OF[y.stemGod]!
      if (f.dayLevel === '신약' && (grp === '비겁' || grp === '인성')) { weakHelp++; expect(l.summary).toContain('약한 편'); expect(l.bad ?? '').not.toContain('고집입니다') }
      if (f.dayLevel === '신강' && (grp === '비겁' || grp === '인성')) { strongBurden++; expect(l.summary).toContain('센 편') }
    }
    expect(weakHelp).toBeGreaterThan(10)
    expect(strongBurden).toBeGreaterThan(10)
  })
  test('일간이 센 편이면 건록·제왕 해는 넘침을 조심하는 쪽에 놓인다', () => {
    let n = 0
    for (const b of population(1500, 5, true)) {
      const f = feats(b); const y = f.years[0]!
      if (f.dayLevel !== '신강' || !['건록', '제왕'].includes(y.unseong)) continue
      n++
      const l = luck(b).years[0]!
      // 경고 점수가 2점에 못 미치는 해는 조심할 쪽을 열지 않아 12운성 문장은 근거 줄에만 남는다.
      // 경고가 열린 해에는 넘침 조심 문장이 조심할 쪽에, 열리지 않은 해에는 원래 12운성 문장이 잘 풀리는 쪽에 있어 12운성이 통째로 빠지지 않는다.
      if (l.bad) { expect(l.bad, JSON.stringify(b)).toContain(`${y.unseong}(${y.unseongHanja})`); expect(l.good ?? '').not.toContain(`${y.unseong}(${y.unseongHanja})`) }
      else expect(l.good ?? '', JSON.stringify(b)).toContain(`${y.unseong}(${y.unseongHanja})`)
    }
    expect(n).toBeGreaterThan(5)
  })
  test('총운 둘째 문단(줄기)에 격 무리 × 일간 강약 문장이 있다', () => {
    const f = feats(sample)
    const paras = (luck(sample).total?.paragraphs ?? []).map(p => strip(p.text))
    expect(paras[0]).not.toMatch(/일간의 (기운|힘)/)
    expect(paras[1]).toContain(CORE_LEVEL[f.core.group][f.dayLevel])
  })
})

describe('경고는 센 것만 켜진다', () => {
  const pop = population(1500, 21)
  test('조심할 점이 모든 학생에게 붙지 않고, 경고성 칸마다 비율이 10~35% 안쪽이다', () => {
    const n = pop.length * 2
    let bad = 0, rel = 0, noBad = 0
    for (const b of pop) {
      const l = luck(b)
      for (const y of l.years) {
        if (y.bad) bad++; else noBad++
      }
      for (const k of l.used) if (/^yearRelation\[(충|형|자형|파|해|원진|귀문)@/.test(k)) rel++
    }
    expect(noBad / n).toBeGreaterThan(0.25)
    expect(bad / n).toBeGreaterThan(0.2)
    expect(rel / n).toBeGreaterThan(0.05)
    expect(rel / n).toBeLessThan(0.35)
  })
  test('조심할 쪽으로 말한 글자 관계는 모두 일지·월지의 충·형·자형·파·해이고, 연지·시지·원진·귀문은 글로 쓰지 않는다', () => {
    for (const b of pop.slice(0, 600)) {
      const l = luck(b)
      for (const k of l.used) {
        const m = /^yearRelation\[(.+)@(.+)\]$/.exec(k)
        if (!m) continue
        expect(['일지', '월지'], k).toContain(m[2])
        expect(['충', '형', '자형', '파', '해', '합', '반합'], k).toContain(m[1])
      }
    }
  })
  test('연지·시지의 관계는 왜 이렇게 풀이하나요에 사실로 남는다', () => {
    let seen = 0
    for (const b of pop.slice(0, 400)) {
      const f = feats(b); const l = luck(b)
      for (const [i, y] of f.years.entries()) {
        const outer = y.relations.find(r => r.place === '연지' || r.place === '시지')
        if (!outer) continue
        seen++
        expect(l.years[i]!.why, JSON.stringify(b)).toContain(`${outer.place}의`)
      }
    }
    expect(seen).toBeGreaterThan(20)
  })
})

describe('세운 천간과 일간의 합·충', () => {
  const HAP: Record<string, string> = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' }
  const CH: Record<string, string> = { 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' }
  test('합이면 잘 풀리는 쪽 맨 앞에, 충이면 조심할 쪽 맨 앞에 한 문장이 붙는다', () => {
    let hap = 0, chung = 0
    for (const b of population(1500, 31, true)) {
      const f = feats(b); const l = luck(b)
      for (const [i, y] of f.years.entries()) {
        const sec = l.years[i]!
        if (HAP[f.dayStem] === y.stem) { hap++; expect(strip(sec.good ?? ''), JSON.stringify(b)).toMatch(/^이 해의 천간이 일간과 서로 끌려 묶이는 합\(合\)을 이룹니다/) }
        else if (CH[f.dayStem] === y.stem) { chung++; expect(strip(sec.bad ?? ''), JSON.stringify(b)).toMatch(/^이 해의 천간이 일간과 정면으로 부딪히는 충\(沖\)을 이룹니다/) }
        else { expect(strip(sec.good ?? '')).not.toContain('끌려 묶이는'); expect(strip(sec.bad ?? '')).not.toContain('정면으로 부딪히는') }
      }
    }
    expect(hap).toBeGreaterThan(20)
    expect(chung).toBeGreaterThan(20)
  })
})

describe('주성 밝기 7단계', () => {
  test('7단계 모두 다른 처리이고, 함·불만 어두운 자리 문구를 쓴다', () => {
    const tiers = ['廟', '旺', '得', '利', '平', '不', '陷'].map(b => brightnessTier(b))
    expect(tiers.map(t => t.name)).toEqual(['묘', '왕', '득', '리', '평', '불', '함'])
    expect(tiers.map(t => t.dim)).toEqual([false, false, false, false, false, true, true])
    expect(new Set(tiers.map(t => t.lead)).size).toBe(7)
    for (const t of tiers) expect(t.lead).toMatch(/밝기는 /)
  })
  test('명궁 주성이 함·불인 학생은 어두운 자리 문구를 읽고 "환하다"류 풀이를 읽지 않는다', () => {
    let n = 0
    const BRIGHT = /환하|환히|빛나|밝은|당당|눈에 잘 띕/
    for (const b of population(900, 13, true)) {
      const f = feats(b)
      const ming = f.palaces!['命宮']!
      if (!ming.mains[0] || ming.borrowed || !['陷', '不'].includes(ming.mains[0].brightness)) continue
      n++
      const l = luck(b)
      const t = (l.total?.paragraphs ?? []).map(p => strip(p.text)).find(x => x.includes('나를 뜻하는') && x.includes('명궁(命宮)')) ?? ''
      expect(t, JSON.stringify(b)).toMatch(/밝기는 (함|불)/)
      expect(l.used).toContain(`starDim[${ming.mains[0].ko}]`)
      expect(l.used).not.toContain(`starPalace[${ming.mains[0].ko}:명궁]`)
      const para = t.slice(t.indexOf('나를 뜻하는'))
      expect(para.split('밝기는')[1] ?? '').not.toMatch(BRIGHT)
    }
    expect(n).toBeGreaterThan(20)
  })
  test('묘·왕인 명궁 주성은 별 풀이를 그대로 쓰고 밝기 한 줄을 앞에 붙인다', () => {
    let n = 0
    for (const b of population(500, 13, true)) {
      const f = feats(b); const ming = f.palaces!['命宮']!
      if (!ming.mains[0] || ming.borrowed || !['廟', '旺'].includes(ming.mains[0].brightness)) continue
      n++
      const l = luck(b)
      expect(l.used).toContain(`starPalace[${ming.mains[0].ko}:명궁]`)
      expect(strip(JSON.stringify(l.total))).toMatch(/밝기는 (묘|왕)/)
    }
    expect(n).toBeGreaterThan(20)
  })
})

describe('신살·12신살·글자 관계는 자리 무게로 고른다', () => {
  const pop = population(1200, 41, true)
  test('연지·시지에만 있는 신살은 가까운 자리 신살이 둘 미만일 때만, 먼 자리라는 말을 붙여 쓴다', () => {
    let outerStated = 0
    for (const b of pop) {
      const f = feats(b); const l = luck(b)
      const stated = l.used.filter(k => /^sinsal(Far)?\[/.test(k) && !k.includes('#')).map(k => k.replace(/^sinsal(Far)?\[/, '').slice(0, -1)).filter(n => n !== '문창귀인')
      const inner = (n: string) => f.sals.find(s => s.name === n)!.places.some(p => ['일지', '월지', '일간', '일주', '월간', '월주'].includes(p))
      const innerAll = f.sals.filter(s => s.places.some(p => ['일지', '월지', '일간', '일주', '월간', '월주'].includes(p)) && s.name !== '문창귀인')
      for (const n of stated) {
        if (inner(n)) continue
        outerStated++
        expect(innerAll.length, `${JSON.stringify(b)} ${n}`).toBeLessThan(2)
      }
      // 가까운 신살이 있는데 먼 신살만 먼저 나오지 않는다
      if (stated.length > 0 && innerAll.length > 0) expect(stated.some(inner), JSON.stringify(b)).toBe(true)
    }
    expect(outerStated).toBeGreaterThan(0)
  })
  test('12신살은 일지·월지에 있는 것만 쓰고, 장성·반안도 나온다', () => {
    const names = new Set<string>()
    for (const b of pop) {
      const f = feats(b); const l = luck(b)
      for (const k of l.used) {
        const m = /^sinsal12\[(.+)\]$/.exec(k); if (!m) continue
        names.add(m[1]!)
        expect(f.sinsal12.find(x => x.name === m[1])!.places.some(p => p === '일지' || p === '월지'), `${JSON.stringify(b)} ${k}`).toBe(true)
      }
    }
    expect(names.has('장성')).toBe(true)
    expect(names.has('반안')).toBe(true)
    expect(names.has('지살')).toBe(true)
  })
  test('글자 관계: 천간끼리는 붙어 있는 것만, 지지끼리 떨어진 것은 먼 자리라는 말과 함께', () => {
    const ADJ = new Set(['연월', '월일', '일시'])
    const adj = (a: string, b: string) => ADJ.has(`${a[0]}${b[0]}`) || ADJ.has(`${b[0]}${a[0]}`)
    let nonAdjBranch = 0
    for (const b of pop) {
      const f = feats(b); const l = luck(b)
      const para = strip((l.total?.paragraphs ?? []).filter(p => p.heading === '일하고 공부할 때는' || p.text).map(p => p.text).join(' '))
      for (const k of l.used.filter(x => x.startsWith('relation[') && !x.includes('#')).map(x => x.slice(9, -1))) {
        if (!l.total) continue
        const rs = f.relations.filter(r => `${r.chars}${r.type}` === k)
        const isAdj = rs.some(r => adj(r.places[0]!, r.places[1]!))
        if (rs.some(r => r.kind === 'stem')) expect(isAdj, `${JSON.stringify(b)} ${k}`).toBe(true)
        else if (!isAdj) { nonAdjBranch++; expect(para).toContain('떨어진 자리') }
      }
    }
    expect(nonAdjBranch).toBeGreaterThanOrEqual(0)
  })
})

describe('시각을 모를 때 대운 연도는 앞뒤 1년 어긋날 수 있다고 알린다', () => {
  test('시각 모름 + 성별 있음이면 대운 문단 머리에 안내, 시각을 알면 없다', () => {
    const t = (b: BirthInput) => strip((luck(b).total?.paragraphs ?? []).map(p => p.text).join(' '))
    expect(t({ ...sample, time: null })).toContain('앞뒤 1년쯤 어긋날 수 있습니다')
    expect(t(sample)).not.toContain('앞뒤 1년쯤')
  })
})

describe('수 0 우회를 걷고 조립기가 직접 처리한다', () => {
  test('restAllowed이면 쉼이 모자라다는 주제를 쓰지 않는다', () => {
    let found = 0
    for (const b of population(1500, 51, true)) {
      const f = feats(b)
      if (!f.zero.includes('water')) continue
      found++
      const open = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })
      const allowed = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false, restAllowed: true })
      expect(open.used.some(k => k === 'gistTheme[수0]' || k === 'theme[수]')).toBe(true)
      expect(allowed.used.some(k => k === 'gistTheme[수0]' || k === 'theme[수]' || k === 'glanceTheme[수0]')).toBe(false)
    }
    expect(found).toBeGreaterThan(0)
  })
  test('deep.ts는 특징을 고치지 않고 옵션으로 넘긴다(결과가 같다)', () => {
    const top = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
    const copy = loadDeep([{ luckBlocks: DEEP.luckBlocks, words: { achievement: { restAllow: '쉼도 일입니다.' } } as never }])
    const d = composeDeep({ top, far: null, support: null, chart: computeChart(sample), detail: computeDetail(sample, 2026), copy, readings: READINGS, content: CONTENT })
    expect(d.luck.used.some(k => k === 'gistTheme[수0]')).toBe(false)
  })
})

describe('접힌 명식의 궁 카드도 밝기를 따른다', () => {
  test('불·함인 주성의 카드 풀이는 어두운 자리 문구이고, 밝은 자리는 별 풀이 그대로다', () => {
    const top = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
    let dimN = 0, brightN = 0
    for (const b of population(120, 61, true)) {
      const f = feats(b)
      const d = composeDeep({ top, far: null, support: null, chart: computeChart(b), detail: computeDetail(b, 2026), copy: DEEP, readings: READINGS, content: CONTENT })
      for (const p of Object.values(f.palaces!)) for (const s of p.mains) {
        const note = d.chartNotes.palace[`${p.name}:${s.star}`]
        expect(note, `${p.name}:${s.star}`).toBeTruthy()
        if (['陷', '不'].includes(s.brightness)) { dimN++; expect(note).toContain('밝기는'); expect(note).toContain(DEEP.luckBlocks[`starDim[${s.ko}]`]!) }
        else { brightN++; expect(note).toBe(DEEP.luckBlocks[`starPalace[${s.ko}:${p.ko}]`]) }
      }
    }
    expect(dimN).toBeGreaterThan(20)
    expect(brightN).toBeGreaterThan(20)
  })
})

describe('돈 칸과 해 방향 보조', () => {
  test('내년에는 돈 이야기가 조심할 쪽이 아니어도 늘 한 줄 있다', () => {
    for (const b of population(400, 71)) {
      const n = luck(b).years[1]
      if (!n) continue
      expect(`${n.good} ${n.bad} ${n.money} ${n.goodNews}`, JSON.stringify(b)).toMatch(/돈|재백|통장|잔액|지출|입금|수입/)
    }
  })
  test('올해와 내년의 겉 기운이 같은 무리면 내년 요약은 같은 문구를 되풀이하지 않는다', () => {
    let n = 0
    for (const b of population(400, 72, true)) {
      const f = feats(b)
      if (f.years[0]!.stemGroup !== f.years[1]!.stemGroup || f.dayLevel === '중화') continue
      n++
      const l = luck(b)
      expect(l.years[1]!.summary).toContain('올해와 같은 방향의 기운이 한 해 더 이어집니다')
      const lean = DEEP.luckBlocks[`yearLean[${f.years[0]!.stemGroup}:${f.dayLevel}]`]!
      expect(l.years[1]!.summary).not.toContain(lean)
    }
    expect(n).toBeGreaterThan(10)
  })
})

// ---- 묶음 3 검토 반영 (실패하는 시험을 먼저 쓴다) ----
describe('검토 반영 1: 조심할 쪽 비율은 일간 강약 세 집단 모두 상한 안이다', () => {
  test('고정 시드 3,000명: 올해·내년 각각, 신강·중화·신약 각각 12~35%', () => {
    const cnt: Record<string, [number, number]> = {}
    const all: [number, number] = [0, 0]
    for (const b of population(3000, 424242)) {
      const f = feats(b); const l = luck(b)
      for (const [i, y] of l.years.entries()) {
        const key = `${i}:${f.dayLevel}`; const e = (cnt[key] ??= [0, 0]); e[1]++; all[1]++
        if (y.bad) { e[0]++; all[0]++ }
      }
    }
    expect(all[0] / all[1]).toBeLessThan(0.3)
    for (const [k, [a, n]] of Object.entries(cnt)) { expect(a / n, k).toBeGreaterThan(0.12); expect(a / n, k).toBeLessThan(0.35) }
  })
})

describe('검토 반영 2: 구조 문구가 일간 강약과 모순되지 않는다', () => {
  test('신약에는 비겁탈재(내 힘이 세서)를, 신강에는 재생살을 붙이지 않는다', () => {
    let weak = 0, strong = 0
    for (const b of population(2500, 99, true)) {
      const f = feats(b)
      if (f.dayLevel === '신약') { weak++; expect(f.patterns, JSON.stringify(b)).not.toContain('비겁탈재'); expect(strip(JSON.stringify(luck(b).total))).not.toContain('내 힘이 세서') }
      if (f.dayLevel === '신강') { strong++; expect(f.patterns, JSON.stringify(b)).not.toContain('재생살') }
    }
    expect(weak).toBeGreaterThan(300)
    expect(strong).toBeGreaterThan(300)
  })
})

describe('검토 반영 3: 먼 자리 꼬리는 항목마다 남는다', () => {
  const INNER = ['일지', '월지', '일간', '일주', '월간', '월주']
  test('연·시에만 있는 신살을 말한 항목마다 "○○은 가까운 자리가 아니라" 꼬리가 있다', () => {
    let n = 0
    for (const b of population(1500, 41, true)) {
      const f = feats(b); const l = luck(b)
      const t = strip((l.total?.paragraphs ?? []).map(p => p.text).join(' '))
      for (const k of l.used.filter(x => /^sinsal(Far)?\[/.test(x) && !x.includes('#')).map(x => x.replace(/^sinsal(Far)?\[/, '').slice(0, -1))) {
        const s = f.sals.find(x => x.name === k); if (!s || k === '문창귀인' || s.places.some(p => INNER.includes(p))) continue
        n++
        expect(t, `${JSON.stringify(b)} ${k}`).toMatch(new RegExp(`${k}(은|는) 가까운 자리가 아니라 영향은 작게 읽습니다`))
      }
    }
    expect(n).toBeGreaterThan(50)
  })
  test('떨어진 지지 관계를 말한 항목마다 이름이 들어간 꼬리가 있고, 먼 자리 천을귀인 뒤에 두 전통 문장을 쓰지 않는다', () => {
    const ADJ = new Set(['연월', '월일', '일시'])
    const adj = (a: string, b: string) => ADJ.has(`${a[0]}${b[0]}`) || ADJ.has(`${b[0]}${a[0]}`)
    let n = 0
    for (const b of population(1500, 41, true)) {
      const f = feats(b); const l = luck(b)
      const t = strip((l.total?.paragraphs ?? []).map(p => p.text).join(' '))
      for (const k of l.used.filter(x => x.startsWith('relation[') && !x.includes('#')).map(x => x.slice(9, -1))) {
        const rs = f.relations.filter(r => `${r.chars}${r.type}` === k)
        if (!rs.length || rs[0]!.detail === '自刑' || rs[0]!.kind === 'stem' || rs.some(r => adj(r.places[0]!, r.places[1]!))) continue
        n++
        const tk = ({ 合: '합', 半合: '반합', 沖: '충', 刑: '형', 破: '파', 害: '해', 怨嗔: '원진', 鬼門: '귀문' } as Record<string, string>)[rs[0]!.type]!
        const name = `${READINGS[k[0]!] ?? k[0]}${READINGS[k[1]!] ?? k[1]}${tk}`
        expect(t, `${JSON.stringify(b)} ${k}`).toContain(`${name}`)
        expect(t, `${JSON.stringify(b)} ${k}`).toMatch(new RegExp(`${name}(은|는) 붙어 있지 않고 떨어진 자리라`))
      }
      const cheonul = f.sals.find(x => x.name === '천을귀인')
      if (cheonul && !cheonul.places.some(p => INNER.includes(p)) && l.used.includes('sinsal[천을귀인]')) expect(l.used).not.toContain('cross[귀인]')
    }
    expect(n).toBeGreaterThan(50)
  })
})

describe('검토 반영 4: 권장·사소', () => {
  test('중화는 해 방향 문장을 따로 붙이지 않는다', () => {
    for (const b of population(600, 5, true)) { const f = feats(b); if (f.dayLevel !== '중화') continue; for (const y of luck(b).years) expect(y.summary ?? '').not.toContain('한쪽으로 기울지 않아서') }
  })
  test('시각 모름이면 근거 줄에 시주가 더해지면 강약이 달라질 수 있다고 밝힌다', () => {
    const l = luck({ ...sample, time: null })
    expect(l.total!.why).toContain('시주가 더해질 때')
    expect(luck(sample).total!.why).not.toContain('시주가 더해질 때')
  })
  test('신강·신약에서 해의 겉 기운이 부담이면 잘 풀리는 쪽 끝에 감당 한 문장이 붙는다', () => {
    let n = 0
    for (const b of population(1000, 5, true)) {
      const f = feats(b); const l = luck(b)
      for (const [i, y] of f.years.entries()) {
        const burden = f.dayLevel === '신강' ? ['비겁', '인성'].includes(y.stemGroup) : f.dayLevel === '신약' ? !['비겁', '인성'].includes(y.stemGroup) : false
        if (!burden || !l.years[i]!.good) continue
        n++; expect(l.years[i]!.good, JSON.stringify(b)).toMatch(/다만 일간 기운이 (센|약한) 편이라 (올해는|내년은) /)
      }
    }
    expect(n).toBeGreaterThan(50)
  })
  test('어두운 자리 주성이 여럿이어도 긴 밝기 설명은 한 번만, 영역 문장은 쓰지 않는다', () => {
    let multi = 0
    for (const b of population(500, 13, true)) {
      const t = strip((luck(b).total?.paragraphs ?? []).map(p => p.text).join(' '))
      const longN = t.split('별의 좋은 면은 약하게 나오고 조심할 면이 먼저 보입니다').length - 1
      expect(longN, JSON.stringify(b)).toBeLessThanOrEqual(1)
      expect(t).not.toContain('이렇게 읽습니다')
      if ((t.match(/밝기는 (함|불)/g) ?? []).length >= 2) multi++
    }
    expect(multi).toBeGreaterThan(5)
  })
  test('평의 밝기 문장은 명령형이 아니다', () => { expect(brightnessTier('平').lead).not.toContain('읽으세요') })
  test('신장 속 문구는 "속에서도"가 아니다', () => { expect(DEEP.luckBlocks['yearLeanInner[비겁:신강]']).toMatch(/^속에서는/) })
})
