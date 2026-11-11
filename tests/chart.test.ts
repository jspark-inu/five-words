import { expect, test } from 'vitest'
import { computeChart } from '../src/chart/chart'

const sample = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const }
test('샘플 학생의 네 기둥', () => {
  expect(computeChart(sample).pillars.map(p => p.stem + p.branch)).toEqual(['丁未', '丁酉', '己卯', '乙酉'])
})
test('샘플 학생의 오행은 목2 화2 토2 금2 수0', () => {
  const c = computeChart(sample)
  expect(c.elements).toEqual({ wood: 2, fire: 2, earth: 2, metal: 2, water: 0 })
  expect(c.missing).toEqual(['water'])
  expect(c.dayStem).toBe('丁')
})
test('샘플의 십신에 식신, 편인, 편재가 있다', () => {
  expect(computeChart(sample).sipsin).toEqual(expect.arrayContaining(['食神', '偏印', '偏財']))
})
test('시간 모름: 기둥 3개, ?? 없음, 오행 합 6, 자미두수 없음', () => {
  const c = computeChart({ ...sample, time: null })
  expect(c.pillars.map(p => p.stem + p.branch)).toEqual(['丁酉', '己卯', '乙酉'])
  expect(Object.values(c.elements).reduce((a, b) => a + b)).toBe(6)
  expect(JSON.stringify(c)).not.toContain('?')
  expect(c.ziwei).toBeNull()
})
test('성별 입력 안 함: 사주는 나오고 자미두수는 없다', () => {
  const c = computeChart({ ...sample, gender: null })
  expect(c.pillars).toHaveLength(4)
  expect(c.ziwei).toBeNull()
})
test('공궁: 샘플 명궁은 申, 맞은편 천기·태음을 빌린다', () => {
  expect(computeChart(sample).ziwei).toMatchObject({ mingZhi: '申', wuXingJu: '水二局', mainStars: ['天機', '太陰'], borrowed: true })
})
test('절입일 경계에서 월주가 바뀐다', () => {
  const at = (hour: number) => computeChart({ ...sample, day: 5, time: { hour, minute: 0 } }).pillars[2]
  expect(at(12)?.branch).toBe('寅')
  expect(at(22)?.branch).toBe('卯')
})
test('시간 모름 + 절입일이면 월주가 시각에 따라 달라질 수 있다고 표시한다', () => {
  expect(computeChart({ ...sample, day: 5, time: null }).monthMayDiffer).toBe(true)
  expect(computeChart({ ...sample, time: null }).monthMayDiffer).toBe(false)
  expect(computeChart({ ...sample, day: 5 }).monthMayDiffer).toBe(false)
})
test('입춘이 낀 날은 시간을 몰라도 연주가 바뀔 수 있다고 표시한다', () => {
  const c = computeChart({ year: 2007, month: 2, day: 4, time: null, gender: 'M' })
  expect(c.yearMayDiffer).toBe(true)
  expect(c.monthMayDiffer).toBe(true)
  expect(computeChart({ ...sample, day: 5, time: null }).yearMayDiffer).toBe(false)
  expect(computeChart({ year: 2007, month: 2, day: 4, time: { hour: 12, minute: 0 }, gender: 'M' }).yearMayDiffer).toBe(false)
})
