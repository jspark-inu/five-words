import { expect, test } from 'vitest'
import { isValidBirth, parseTime } from '../src/ui/birth'

const now = new Date(2026, 10, 5)
const ok = (year: number, month: number, day: number) => isValidBirth({ year, month, day }, now)

test('정상 날짜', () => {
  expect(ok(2005, 3, 14)).toBe('ok')
  expect(ok(1900, 1, 1)).toBe('ok')
  expect(ok(2026, 11, 5)).toBe('ok')
})

test('윤년 규칙', () => {
  expect(ok(2024, 2, 29)).toBe('ok')
  expect(ok(2023, 2, 29)).toBe('bad-date')
  expect(ok(1900, 2, 29)).toBe('bad-date')
  expect(ok(2000, 2, 29)).toBe('ok')
})

test('없는 날짜', () => {
  expect(ok(2005, 2, 31)).toBe('bad-date')
  expect(ok(2005, 4, 31)).toBe('bad-date')
  expect(ok(2005, 13, 1)).toBe('bad-date')
  expect(ok(2005, 0, 1)).toBe('bad-date')
  expect(ok(2005, 1, 0)).toBe('bad-date')
})

test('1900년 이전은 없는 날짜로 본다', () => {
  expect(ok(1899, 12, 31)).toBe('bad-date')
})

test('오늘 이후는 future', () => {
  expect(ok(2026, 11, 6)).toBe('future')
  expect(ok(2027, 1, 1)).toBe('future')
})

test('시를 적고 분을 비워 두면 0분으로 본다', () => {
  expect(parseTime('14', '')).toEqual({ hour: 14, minute: 0 })
  expect(parseTime('0', '  ')).toEqual({ hour: 0, minute: 0 })
  expect(parseTime('14', '30')).toEqual({ hour: 14, minute: 30 })
})
test('시를 비우거나 범위를 넘으면 시각이 아니다', () => {
  expect(parseTime('', '')).toBeNull()
  expect(parseTime('', '30')).toBeNull()
  expect(parseTime('24', '0')).toBeNull()
  expect(parseTime('12', '60')).toBeNull()
  expect(parseTime('ab', '10')).toBeNull()
})
