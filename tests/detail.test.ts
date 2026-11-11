import { expect, test } from 'vitest'
import { computeDetail } from '../src/chart/chart'

const sample = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const }

test('2026년: 丙午, 겁재/비견, 건록, 유년 명궁 부처, 사화 천동 화록(복덕)·염정 화기(형제)', () => {
  const y = computeDetail(sample, 2026).years[0]!
  expect([y.year, y.ganzi]).toEqual([2026, '丙午'])
  expect([y.stemSipsin.hangul, y.branchSipsin.hangul, y.unseong.hanja]).toEqual(['겁재', '비견', '乾祿'])
  expect(y.unseong.hangul).toBe('건록')
  expect(y.ziwei?.mingNatalPalace).toBe('夫妻')
  expect(y.ziwei?.siHua).toEqual(expect.arrayContaining([
    { star: '天同', hua: '化祿', natalPalace: '福德' },
    { star: '廉貞', hua: '化忌', natalPalace: '兄弟' },
  ]))
  expect(y.ziwei?.siHua).toHaveLength(4)
})
test('2027년: 丁未, 비견/식신, 관대, 유년 명궁 형제, 거문 화기(재백)', () => {
  const y = computeDetail(sample, 2026).years[1]!
  expect([y.year, y.ganzi]).toEqual([2027, '丁未'])
  expect([y.stemSipsin.hangul, y.branchSipsin.hangul, y.unseong.hangul]).toEqual(['비견', '식신', '관대'])
  expect(y.ziwei?.mingNatalPalace).toBe('兄弟')
  expect(y.ziwei?.siHua).toContainEqual({ star: '巨門', hua: '化忌', natalPalace: '財帛' })
})
test('올해 연도는 매개변수로 받는다: 2030이면 2030, 2031', () => {
  expect(computeDetail(sample, 2030).years.map(y => y.year)).toEqual([2030, 2031])
})
test('유년 재백·관록은 본래 명반의 어느 궁에 앉는지 함께 나온다', () => {
  const y = computeDetail(sample, 2026).years[0]!.ziwei!
  expect(y.palaces.find(p => p.name === '官祿')?.natalPalace).toBe('福德')
  expect(y.palaces.find(p => p.name === '財帛')?.natalPalace).toBeTruthy()
  expect(y.palaces).toHaveLength(12)
})
test('해 지지와 원국 지지의 합충파: 2026 午는 시지 未와 합, 월지 卯와 파', () => {
  const rel = computeDetail(sample, 2026).years[0]!.relations.map(r => `${r.place}${r.natal}${r.type}`)
  expect(rel).toEqual(['시지未合', '월지卯破'])
  expect(computeDetail(sample, 2026).years[1]!.relations.map(r => `${r.place}${r.natal}${r.type}`)).toEqual(['월지卯半合'])
})
test('시간 모름: 시주 없는 데이터에 ?가 없고, 자미두수·유년 자미두수는 없고 사주 유년은 있다', () => {
  const d = computeDetail({ ...sample, time: null }, 2026)
  expect(JSON.stringify(d)).not.toContain('?')
  expect(d.saju.pillars).toHaveLength(3)
  expect(d.ziwei).toBeNull()
  expect(d.years[0]!.ziwei).toBeNull()
  expect(d.years[0]!.ganzi).toBe('丙午')
})
test('성별 입력 안 함: 사주 유년은 있고 자미두수 쪽은 모두 없다', () => {
  const d = computeDetail({ ...sample, gender: null }, 2026)
  expect(d.ziwei).toBeNull()
  expect(d.years.every(y => y.ziwei === null)).toBe(true)
  expect(d.years[0]!.unseong.hangul).toBe('건록')
})
test('신살 전부를 자리와 함께 낸다: 샘플은 천을귀인·문창귀인이 일지·연지', () => {
  const sals = computeDetail(sample, 2026).saju.sals
  expect(sals.map(s => [s.key, s.name, s.places])).toEqual([
    ['cheonul', '천을귀인', ['일지', '연지']],
    ['munchang', '문창귀인', ['일지', '연지']],
  ])
})
test('신살 열 가지가 모두 데이터로 나올 수 있다 (여러 생일을 훑어 이름이 모두 한 번 이상 나온다)', () => {
  const seen = new Set<string>()
  for (let y = 1960; y < 2010; y += 1) for (const [m, d] of [[2, 3], [5, 17], [8, 29], [11, 8], [12, 25]] as const) {
    for (const s of computeDetail({ year: y, month: m, day: d, time: { hour: 3 + (y % 20), minute: 0 }, gender: 'M' }, 2026).saju.sals) seen.add(s.key)
  }
  expect([...seen].sort()).toEqual(['baekho', 'cheonduk', 'cheonul', 'dohwa', 'geumyeo', 'goegang', 'hongyeom', 'munchang', 'wolduk', 'yangin'].sort())
})
test('원국 관계·공망·대운: 샘플은 卯酉 충 두 곳, 酉酉 자형, 卯未 반합, 공망 辰·巳, 대운 7살 庚辰부터', () => {
  const s = computeDetail(sample, 2026).saju
  expect(s.relations.map(r => `${r.chars} ${r.name}(${r.places.join('·')})`)).toEqual(['卯未 반합(시지·월지)', '卯酉 충(일지·월지)', '酉酉 자형(일지·연지)', '卯酉 충(월지·연지)'])
  expect(s.gongmang.branches).toEqual(['辰', '巳'])
  expect(s.gongmang.places).toEqual([])
  expect(s.daewoon.slice(0, 2).map(d => [d.age, d.ganzi])).toEqual([[7, '庚辰'], [17, '辛巳']])
  expect(s.pillars[0]).toMatchObject({ label: '시주', stem: '丁', branch: '未', hidden: '丁乙己', unseong: { hangul: '관대' }, sinsal: { hangul: '월살' } })
})
test('자미두수 원자료: 열두 궁, 신궁, 대한', () => {
  const z = computeDetail(sample, 2026).ziwei!
  expect([z.mingZhi, z.shenZhi, z.wuXingJu]).toEqual(['申', '戌', '水二局'])
  expect(z.palaces).toHaveLength(12)
  expect(z.palaces.find(p => p.name === '福德')?.isShen).toBe(true)
  expect(z.palaces.find(p => p.name === '夫妻')?.stars[0]).toMatchObject({ name: '天梁', main: true, brightness: '廟', siHua: '化權' })
  expect(z.daxian[0]).toEqual({ ageStart: 2, palaceName: '命宮' })
  expect(z.daxian).toHaveLength(12)
})
test('성별 입력 안 함: 대운은 순행·역행을 알 수 없으니 비어 있다', () => {
  expect(computeDetail({ ...sample, gender: null }, 2026).saju.daewoon).toEqual([])
  expect(computeDetail(sample, 2026).saju.daewoon).toHaveLength(10)
})
