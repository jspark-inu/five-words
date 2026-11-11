// 명식 세기 계산: 있다/없다를 얼마나 센가로 바꾼 값이 손으로 센 결과와 같은지, 무작위 학생에서 켜짐 비율이 목표 안인지 본다.
import { describe, expect, test } from 'vitest'
import { computeChart, type BirthInput, type Pillar } from '../src/chart/chart'
import { dayStemStrength, elementWeights, godLevelOf, godScores, measureChart, starLevel } from '../src/chart/strength'

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const randBirth = (r: () => number, known = true): BirthInput => {
  const month = 1 + Math.floor(r() * 12)
  return { year: 1998 + Math.floor(r() * 11), month, day: 1 + Math.floor(r() * DIM[month - 1]!), time: known ? { hour: Math.floor(r() * 24), minute: 0 } : null, gender: 'F' }
}
const P = (label: Pillar['label'], stem: string, branch: string): Pillar => ({ label, stem, branch })

describe('오행 세기: 천간 1, 지지 본기 1, 지장간 중기·여기 0.5', () => {
  test('샘플 학생(丁未 丁酉 己卯 乙酉)은 수가 겉에도 지장간에도 없다', () => {
    const pillars = [P('시주', '丁', '未'), P('일주', '丁', '酉'), P('월주', '己', '卯'), P('연주', '乙', '酉')]
    const { weights, surface } = elementWeights(pillars)
    // 목: 乙(연간) 1 + 卯 본기 乙 1 + 未 지장간 乙 0.5 + 卯 여기 甲 0.5 = 3. 화: 丁 둘 1+1 + 未 지장간 丁 0.5 = 2.5
    expect(weights).toEqual({ wood: 3, fire: 2.5, earth: 2, metal: 3, water: 0 })
    expect(surface).toEqual({ wood: 2, fire: 2, earth: 2, metal: 2, water: 0 })
    const c = measureChart({ pillars, dayStem: '丁' })
    expect(c.absent).toEqual(['water'])
    expect(c.hiddenOnly).toEqual([])
  })
  test('겉에는 없고 지장간에만 있는 오행은 없다고 하지 않는다', () => {
    // 申의 지장간 戊壬庚에 水(壬)가 있다.
    const pillars = [P('일주', '甲', '申'), P('월주', '丙', '寅'), P('연주', '丙', '午')]
    const c = measureChart({ pillars, dayStem: '甲' })
    expect(c.weights.water).toBe(0.5)
    expect(c.absent).not.toContain('water')
    expect(c.hiddenOnly).toContain('water')
  })
})

describe('십신 점수: 월지 본기 3, 일지 2, 연지·시지 1, 월간·시간 1, 연간 0.7, 지장간 0.5, 뿌리 +1', () => {
  // 일간 甲. 월주 丙午: 월간 丙=식신, 월지 午 본기 丁=상관, 午 지장간 丙(식신)·己(정재).
  // 일주 甲子: 일지 子 본기 癸=정인, 子 지장간 壬=편인.
  const pillars = [P('일주', '甲', '子'), P('월주', '丙', '午')]
  const g = godScores(pillars, '甲')
  test('월지 본기는 3점으로 강이다', () => {
    expect(g['傷官']).toMatchObject({ score: 3, level: '강', places: ['월지'], hidden: false, rooted: false })
  })
  test('천간에 드러나고 지지(午 지장간 丙)에 뿌리가 있으면 1점 더한다', () => {
    // 월간 1 + 뿌리 1. 뿌리가 된 지장간(午의 丙 0.5)을 따로 또 세지 않는다.
    expect(g['食神']).toMatchObject({ score: 2, level: '중', places: ['월간'], hidden: true, rooted: true })
  })
  test('일지 본기는 2점으로 중이다', () => {
    expect(g['正印']).toMatchObject({ score: 2, level: '중', places: ['일지'] })
  })
  test('지장간에만 있는 십신은 0.5점 약이고, 아무 데도 없으면 없음이다', () => {
    expect(g['偏印']).toMatchObject({ score: 0.5, level: '약', places: [], hidden: true })
    expect(g['比肩']).toMatchObject({ score: 0, level: '없음' })
  })
  test('연간 단독은 0.7점, 시간·월간은 1점이다', () => {
    const only = godScores([P('일주', '甲', '子'), P('연주', '庚', '子')], '甲')
    expect(only['偏官']!.score).toBe(0.7)
    expect(godLevelOf(measureChart({ pillars, dayStem: '甲' }), '식신')).toBe('중')
  })
})

describe('일간 강약: 득령(월지 본기가 나를 돕는가) + 득지 + 득세', () => {
  test('월지·일지가 비겁·인성이고 곁에도 많으면 신강이다', () => {
    // 일간 甲, 월주 乙卯(월지 乙=겁재), 일주 甲寅(일지 甲=비견), 연주 癸亥(연간 癸 정인)
    const d = dayStemStrength([P('일주', '甲', '寅'), P('월주', '乙', '卯'), P('연주', '癸', '亥')], '甲')
    expect(d).toMatchObject({ deukryeong: true, deukji: true, level: '신강' })
  })
  test('나를 돕는 글자가 거의 없으면 신약이다', () => {
    // 일간 甲, 월주 庚申(월지 庚=편관), 일주 甲申(일지 庚=편관), 연주 庚申
    const d = dayStemStrength([P('일주', '甲', '申'), P('월주', '庚', '申'), P('연주', '庚', '申')], '甲')
    expect(d).toMatchObject({ deukryeong: false, deukji: false, level: '신약' })
  })
})

describe('별 단계: 묘·왕 강, 득·리 중, 그 아래 약, 빌린 별은 한 단계 낮춘다', () => {
  test('밝기와 빌린 별', () => {
    expect([starLevel('廟', false), starLevel('旺', false), starLevel('得', false), starLevel('利', false), starLevel('平', false), starLevel('不', false), starLevel('陷', false)]).toEqual(['강', '강', '중', '중', '약', '약', '약'])
    expect([starLevel('廟', true), starLevel('得', true), starLevel('陷', true)]).toEqual(['중', '약', '약'])
    expect(starLevel(undefined, false)).toBe('중')
  })
})

describe('무작위 학생(고정 시드)에서 켜짐 비율', () => {
  const r = rng(20261107)
  const known = Array.from({ length: 1500 }, () => computeChart(randBirth(r, true)))
  const unknown = Array.from({ length: 600 }, () => computeChart(randBirth(r, false)))
  const rate = (xs: ReturnType<typeof computeChart>[], pred: (x: ReturnType<typeof computeChart>) => boolean) => xs.filter(pred).length / xs.length
  test('겉에도 지장간에도 없는 오행이 있는 학생은 10~30%다(겉 8자만 보면 약 67%였다)', () => {
    const v = rate(known, c => c.missing.length > 0)
    expect(v).toBeGreaterThan(0.1); expect(v).toBeLessThan(0.3)
    for (const e of ['wood', 'fire', 'metal', 'water'] as const) expect(rate(known, c => c.missing.includes(e)), e).toBeLessThan(0.1)
  })
  test('넘치는 오행이 있는 학생은 15~35%다(3개 이상으로 세면 약 85%였다)', () => {
    const v = rate(known, c => c.excess.length > 0)
    expect(v).toBeGreaterThan(0.15); expect(v).toBeLessThan(0.35)
    expect(rate(unknown, c => c.excess.length > 0)).toBeLessThan(0.4)
  })
  test('일간 강약은 세 단계가 고르게 갈린다', () => {
    for (const lv of ['신강', '중화', '신약']) { const v = rate(known, c => c.strength.day.level === lv); expect(v, lv).toBeGreaterThan(0.2); expect(v, lv).toBeLessThan(0.5) }
  })
  test('십신 강·중은 학생마다 대략 2~4개이고, 월지 본기의 십신은 늘 강이다(3점)', () => {
    const strong = known.map(c => Object.values(c.strength.gods).filter(g => g.level === '강' || g.level === '중').length)
    const mean = strong.reduce((a, b) => a + b, 0) / strong.length
    expect(mean).toBeGreaterThan(2); expect(mean).toBeLessThan(4.5)
    expect(rate(known, c => Object.values(c.strength.gods).some(g => g.level === '강'))).toBe(1)
  })
  test('강은 월지·일지 본기가 있거나 겉 자리가 2곳 이상일 때만 준다(연·시 한 자리와 숨은 글자만으로는 중까지)', () => {
    for (const c of known) for (const g of Object.values(c.strength.gods)) if (g.level === '강') expect(g.places.includes('월지') || g.places.includes('일지') || g.places.length >= 2).toBe(true)
    // 시간 1 + 지장간 2개 1 + 뿌리 → 예전에는 3점 강. 지금은 점수가 3 이상이어도 중이다.
    const g = godScores([P('일주', '甲', '子'), P('시주', '丙', '寅')], '甲')
    expect(g['食神']!.places).toEqual(['시간'])
    expect(g['食神']!.level).not.toBe('강')
  })
  test('같은 입력은 같은 값이다', () => {
    const b = randBirth(rng(1))
    expect(computeChart(b).strength).toEqual(computeChart(b).strength)
  })
})
