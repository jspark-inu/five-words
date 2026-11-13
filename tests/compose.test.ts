import { expect, test } from 'vitest'
import { composeReport } from '../src/report/compose'
import type { Content, WordCopy } from '../src/content/types'
import type { ChartFacts } from '../src/chart/chart'
import { WORK } from '../src/content/word-work'
import { measureChart, type ChartStrength, type Level } from '../src/chart/strength'

const ids = ['a', 'b', 'c', 'd', 'e']
const real: Record<string, string> = { a: 'achievement', b: 'coordination', c: 'conviction', d: 'fairness', e: 'caution' }
const copy = (id: string, over: Partial<WordCopy> = {}): WordCopy => ({
  heard: `heard-${id}`, explain: `explain-${id}`, overdo: `overdo-${id}`, manual: `manual-${id}`,
  breakdown: { early: `early-${id}`, middle: `middle-${id}`, late: `late-${id}` },
  goodWith: `good-${id}`, carefulWith: `careful-${id}`, experiment: `exp-${id}`,
  sipsinMatch: [], sipsinClash: [], starMatch: [], starClash: [],
  matchLine: `match-${id}`, clashQuestion: `clash-${id}?`, ...over,
})
const content = (over: Record<string, Partial<WordCopy>> = {}): Content => ({
  words: Object.fromEntries(ids.map(i => [real[i]!, copy(i, over[i])])),
  dayStems: { 丁: '정화 풀이' },
  elementMissing: { wood: 'miss-wood', fire: 'miss-fire', earth: 'miss-earth', metal: 'miss-metal', water: 'miss-water' },
  elementExcess: { wood: 'ex-wood', fire: 'ex-fire', earth: 'ex-earth', metal: 'ex-metal', water: 'ex-water' },
  sipsin: { 食神: '식신 풀이', 偏印: '편인 풀이', 偏財: '편재 풀이' },
  stars: { 紫微: '자미 풀이', 天機: '천기 풀이' },
  farLines: { achievement: '성취 먼 줄', coordination: '조율 먼 줄', ideas: '발상 먼 줄' },
  readings: { 食神: '식신', 偏印: '편인', 紫微: '자미', 天機: '천기', 子: '자', 酉: '유', 丁: '정', 水二局: '수이국' },
  mingExplain: '명궁 설명.', emptyPalace: '빈 궁입니다.', borrowedLead: '빌려 온 별은 아래.', emptyBoth: '빌릴 별도 없음.', monthBoundary: '절입일 안내.', yearBoundary: '입춘 안내.', boundaryRetry: '다시 입력.',
  noBirthTime: '시간 모름 안내', noGender: '성별 모름 안내',
  remedy: '상담센터', footer: '전통 해석',
})
/** 시험용 세기: 십신 이름 → [단계, 자리]. 적지 않은 십신은 없음이다. */
const strengthOf = (gods: Record<string, [Level, string[]]> = { 食神: ['강', ['월지']], 偏印: ['중', ['일지']] }): ChartStrength => {
  const base = measureChart({ pillars: [{ label: '일주', stem: '丁', branch: '酉' }], dayStem: '丁' })
  const all = Object.fromEntries(Object.keys(base.gods).map(g => [g, { score: 0, level: '없음' as Level, places: [] as string[], hidden: false, rooted: false }]))
  for (const [g, [level, places]] of Object.entries(gods)) all[g] = { score: level === '강' ? 3 : level === '중' ? 2 : 1, level, places, hidden: false, rooted: false }
  return { ...base, gods: all }
}
const chart = (over: Partial<ChartFacts> = {}): ChartFacts => ({
  pillars: [{ label: '일주', stem: '丁', branch: '酉' }],
  dayStem: '丁', elements: { wood: 2, fire: 2, earth: 2, metal: 2, water: 0 },
  missing: ['water'], excess: [], sipsin: ['食神', '偏印'], strength: strengthOf(), monthMayDiffer: false, yearMayDiffer: false,
  ziwei: { mingZhi: '子', wuXingJu: '水二局', mainStars: ['紫微'], borrowed: false }, ...over,
})
const top = ids.map(i => real[i]!)

test('다섯 단어가 순서대로 맨 위에 온다', () => {
  const r = composeReport(top, chart(), content(), true)
  expect(r.words.map(w => w.explain)).toEqual(ids.map(i => `explain-${i}`))
  expect(r.words.map(w => w.work)).toEqual(top.map(id => WORK[id])) // 일에서 이렇게 쓰여요
  expect(r.heard).toEqual(['heard-a', 'heard-b', 'heard-c', 'heard-d', 'heard-e'])
})
test('같은 입력은 같은 보고서', () => {
  const c = content({ a: { sipsinMatch: ['食神'] } })
  expect(composeReport(top, chart(), c, true)).toEqual(composeReport(top, chart(), c, true))
})
test('일치 칸은 다섯 단어의 sipsinMatch·starMatch가 실제 명식에 있을 때만 고른다', () => {
  const c = content({ a: { sipsinMatch: ['傷官', '食神'] }, b: { starMatch: ['紫微'] }, c: { sipsinMatch: ['偏印'] }, d: { starMatch: ['天機'] } })
  const m = composeReport(top, chart(), c, true).meetings.filter(x => x.kind === 'match' && x.group === 'word')
  expect(m.map(x => [x.wordKo, x.chartLabel, x.closing, x.level])).toEqual([
    ['성취', '식신(食神)', 'match-a', '강'],
    ['조율', '자미(紫微)', 'match-b', '중'],
    ['신념', '편인(偏印)', 'match-c', '중'],
  ])
  // 풀이 문장은 사주 글자가 앉은 자리를 말하고, 그 십신의 한쪽 면만 인용한다.
  expect(m[0]!.chartText).toBe('식신(食神)이 월지에 있어 머릿속 것을 꺼내 표현하고 만드는 기운으로 풉니다.')
  expect(m.map(x => x.source)).toEqual(['saju', 'ziwei', 'saju'])
})
test('충돌 칸은 답이 아니라 물음표로 끝나는 질문을 담는다', () => {
  const c = content({ a: { sipsinMatch: ['食神'] }, b: { sipsinClash: ['偏印'] } })
  const clash = composeReport(top, chart(), c, true).meetings.filter(x => x.kind === 'clash')
  expect(clash).toHaveLength(1)
  expect(clash[0]!.closing.endsWith('?')).toBe(true)
  expect(clash[0]!.closing).toBe('clash-b?')
})
test('일치나 충돌 후보가 없으면 그 칸을 빼고, 일치 2개·충돌 1개 칸을 지어내지 않는다', () => {
  const words = (c: ReturnType<typeof content>) => composeReport(top, chart(), c, true).meetings.filter(x => x.group === 'word')
  expect(words(content())).toEqual([])
  expect(words(content({ a: { sipsinMatch: ['食神'] } }))).toHaveLength(1)
})
test('ziwei가 null이면 자미두수 구획 없이 안내 한 줄만 들어간다', () => {
  const r1 = composeReport(top, chart({ ziwei: null }), content(), false)
  expect(r1.ziwei).toBeNull()
  expect(r1.ziweiNote).toBe('시간 모름 안내')
  expect(composeReport(top, chart({ ziwei: null }), content(), true).ziweiNote).toBe('성별 모름 안내')
  expect(composeReport(top, chart(), content(), true).ziweiNote).toBeNull()
})
test('자미두수 글은 문단 목록이다: 명궁 설명, (빈 궁이면) 빌려 읽는 안내, 주성마다 한 문단', () => {
  const z = { mingZhi: '子', wuXingJu: '水二局', mainStars: ['紫微', '天機'], borrowed: true }
  const r = composeReport(top, chart({ ziwei: z }), content(), true).ziwei!
  expect(r.paragraphs).toEqual(['명궁 설명.', '빈 궁입니다. 빌려 온 별은 아래.', '자미 풀이', '천기 풀이'])
  expect([r.mingZhi, r.wuXingJu, r.stars]).toEqual(['자(子)', '수이국(水二局)', ['자미(紫微)', '천기(天機)']])
  const own = composeReport(top, chart({ ziwei: { ...z, borrowed: false } }), content(), true).ziwei!
  expect(own.paragraphs).toEqual(['명궁 설명.', '자미 풀이', '천기 풀이'])
})
test('빌릴 주성도 없으면 "아래는"으로 가리키지 않고 빌릴 별이 없다고 말한다', () => {
  const z = { mingZhi: '子', wuXingJu: '水二局', mainStars: [], borrowed: true }
  const r = composeReport(top, chart({ ziwei: z }), content(), true).ziwei!
  expect(r.paragraphs).toEqual(['명궁 설명.', '빈 궁입니다. 빌릴 별도 없음.'])
})
test('기둥마다 한글 읽기가 붙는다', () => {
  const r = composeReport(top, chart(), content(), true).saju.pillars
  expect(r[0]).toMatchObject({ stem: '丁', branch: '酉', reading: '정 · 유' })
})
test('오행이 0개인 칸마다 따로 풀이하고, 넘치는 오행이 있으면 첫 번째를 한 문단 더 붙인다', () => {
  const t = (over: Partial<ChartFacts>) => composeReport(top, chart(over), content(), true).saju.elementTexts
  expect(t({ missing: [], excess: [] })).toEqual([])
  expect(t({ missing: ['water'], excess: [] })).toEqual(['miss-water'])
  expect(t({ missing: ['wood', 'water'], excess: [] })).toEqual(['miss-wood', 'miss-water'])
  expect(t({ missing: ['wood', 'fire', 'water'], excess: ['earth', 'metal'] })).toEqual(['miss-wood', 'miss-fire', 'miss-water', 'ex-earth'])
  expect(t({ missing: [], excess: ['wood'] })).toEqual(['ex-wood'])
})
test('일간 풀이는 오행 문단과 별개로 나온다', () => {
  expect(composeReport(top, chart({ missing: [], excess: [] }), content(), true).saju.dayStemText).toBe('정화 풀이')
})
test('시간을 모르는 절입일이면 월주 안내가 붙고, 시간을 알면 붙지 않는다', () => {
  expect(composeReport(top, chart({ monthMayDiffer: true }), content(), false).saju.monthNote).toBe('절입일 안내. 다시 입력.')
  expect(composeReport(top, chart({ monthMayDiffer: true, yearMayDiffer: true }), content(), false).saju.monthNote).toBe('절입일 안내. 입춘 안내. 다시 입력.')
  expect(composeReport(top, chart({ monthMayDiffer: false }), content(), false).saju.monthNote).toBeNull()
  expect(composeReport(top, chart({ monthMayDiffer: true }), content(), true).saju.monthNote).toBeNull()
})
test('사용 설명서와 실험은 서로 다른 단어에서, 고장 단계 셋은 모두 1위 단어에서 고른다', () => {
  const r = composeReport(top, chart(), content(), true)
  expect(r.manual).toEqual(['manual-a', 'manual-b', 'manual-c', 'manual-d', 'manual-e'])
  expect(r.experiments).toEqual(['exp-a', 'exp-b', 'exp-c'])
  expect(new Set(r.experiments).size).toBe(3)
  expect(r.breakdown).toEqual({ wordKo: '성취', early: 'early-a', middle: 'middle-a', late: 'late-a', remedy: '상담센터' })
  expect(r.partners).toEqual({ good: 'good-a', careful: 'careful-a' })
  expect(r.footer).toBe('전통 해석')
})
test('짝 문구가 내 다섯 단어 중 하나를 가리키면 다음 순위 단어의 문구로 넘어간다', () => {
  // top = 성취 조율 신념 공정 신중. a의 goodWith는 "조율"(내 단어), careful은 "탁월"(내 단어 아님)
  const c = content({ a: { goodWith: '"조율" 단어가 강한 사람.', carefulWith: '"탁월" 단어가 강한 사람.' }, b: { goodWith: '"실행" 단어가 강한 사람.' } })
  expect(composeReport(top, chart(), c, true).partners).toEqual({ good: '"실행" 단어가 강한 사람.', careful: '"탁월" 단어가 강한 사람.' })
})
test('자기 자신의 단어를 가리키는 짝 문구는 의도된 표현으로 그대로 쓴다', () => {
  const c = content({ a: { carefulWith: '"성취" 단어가 강한 사람.' } })
  expect(composeReport(top, chart(), c, true).partners.careful).toBe('"성취" 단어가 강한 사람.')
})
test('모든 짝 문구가 내 단어를 가리키면 1위 단어의 문구를 쓴다', () => {
  const all = Object.fromEntries(ids.map(i => [i, { goodWith: '"조율" 단어.' }]))
  expect(composeReport(top, chart(), content(all), true).partners.good).toBe('"조율" 단어.')
})
test('복사본이 없는 단어 id는 오류로 알린다', () => {
  expect(() => composeReport(['zzz', 'coordination', 'conviction', 'fairness', 'caution'], chart(), content(), true)).toThrow('zzz')
})
test('일간 풀이가 없으면 빈칸 대신 오류', () => {
  expect(() => composeReport(top, chart({ dayStem: '甲' }), content(), true)).toThrow('甲')
})
test('주성 풀이가 없으면 빈칸 대신 오류', () => {
  const z = { mingZhi: '子', wuXingJu: '水二局', mainStars: ['太陽'], borrowed: false }
  expect(() => composeReport(top, chart({ ziwei: z }), content(), true)).toThrow('太陽')
})
test('단어가 5개가 아니면 오류', () => {
  expect(() => composeReport(top.slice(0, 4), chart(), content(), true)).toThrow('5')
})

test('far를 주면 단어 방식 보고서에 먼 단어와 한 줄이 순서대로 들어가고, 안 주면 null', () => {
  expect(composeReport(top, chart(), content(), true).far).toBeNull()
  const r = composeReport(top, chart(), content(), true, ['ideas', 'achievement'])
  expect(r.far).toEqual([{ ko: '발상', line: '발상 먼 줄' }, { ko: '성취', line: '성취 먼 줄' }])
})
test('먼 단어의 문구가 없으면 빈칸 대신 오류', () => {
  expect(() => composeReport(top, chart(), content(), true, ['fairness'])).toThrow('fairness')
})

test('단어 방식 추가 정보: 다음 두 단어는 작게, 영역별 메모는 한 줄 문장으로', () => {
  const r = composeReport(top, chart(), content(), true, ['ideas', 'achievement', 'coordination'], {
    support: ['ideas', 'achievement'],
    contexts: [{ a: 'conviction', b: 'interconnection', usual: 'interconnection', people: 'conviction' }],
  })
  expect(r.support).toEqual([{ ko: '발상' }, { ko: '성취' }])
  expect(r.contexts).toEqual(['평소에는 연결, 사람 일 앞에서는 신념'])
  expect(r.far).toHaveLength(3)
  const same = composeReport(top, chart(), content(), true, undefined, { support: [], contexts: [{ a: 'conviction', b: 'interconnection', usual: 'same', people: 'conviction' }] })
  expect(same.contexts).toEqual(['평소에는 신념·연결 둘 다, 사람 일 앞에서는 신념'])
  expect(same.support).toBeNull()
  expect(composeReport(top, chart(), content(), true).contexts).toEqual([])
})

test('심층 입력을 주면 deep과 prompt가 붙고, 안 주면 둘 다 null (기존 호출은 그대로)', async () => {
  const { computeDetail } = await import('../src/chart/chart')
  const { emptyDeep } = await import('../src/content/deep')
  expect(composeReport(top, chart(), content(), true).deep).toBeNull()
  expect(composeReport(top, chart(), content(), true).prompt).toBeNull()
  const birth = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const }
  const r = composeReport(top, chart(), content(), true, undefined, undefined, { detail: computeDetail(birth, 2026), copy: emptyDeep() })
  expect(r.deep?.luck.years).toEqual([])
  expect(r.prompt).toContain('다섯 단어(순서대로): 성취, 조율, 신념, 공정, 신중')
})

test('수(水)가 0개이면 일치 칸이 하나 더 붙고, 물이 있으면 붙지 않는다', () => {
  const water = composeReport(top, chart(), content(), true).meetings.filter(x => x.group === 'water')
  expect(water).toHaveLength(1)
  expect(water[0]!.kind).toBe('match')
  expect(composeReport(top, chart({ elements: { wood: 2, fire: 2, earth: 2, metal: 1, water: 1 }, missing: [] }), content(), true).meetings.filter(x => x.group === 'water')).toEqual([])
})
test('한 단어가 사주와 자미두수에 모두 맞으면 한 칸에 둘을 함께 놓는다', () => {
  const c = content({ a: { sipsinMatch: ['食神'], starMatch: ['紫微'] } })
  const m = composeReport(top, chart(), c, true).meetings.filter(x => x.group === 'word' && x.kind === 'match')
  expect(m).toHaveLength(1)
  expect([m[0]!.source, m[0]!.also?.source]).toEqual(['saju', 'ziwei'])
})
test('충돌 칸에 쓰이지 않은 두 단어의 질문이 닫기 질문이 된다', () => {
  const c = content({ a: { sipsinClash: ['食神'] }, b: { sipsinClash: ['偏印'] } })
  const r = composeReport(top, chart(), c, true)
  const inClash = r.meetings.filter(x => x.kind === 'clash').map(x => x.wordKo)
  expect(r.closing).toHaveLength(2)
  expect(r.closing.every(q => !inClash.includes(q.wordKo))).toBe(true)
})

test('이번 달 실험의 부족 오행은 겉에도 지장간에도 없는 오행(chart.missing)만 따른다', async () => {
  const { computeDetail } = await import('../src/chart/chart')
  const { emptyDeep } = await import('../src/content/deep')
  const birth = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const }
  const deep = { detail: computeDetail(birth, 2026), copy: emptyDeep() }
  const ids = (over: Partial<ChartFacts>, known = true) => composeReport(top, chart(over), content(), known, undefined, undefined, deep).experimentIds
  // 겉 글자 수는 수 0개지만 지장간에 수가 있어 missing이 비어 있는 명식
  expect(ids({ missing: [] }).some(i => i.startsWith('exp:element'))).toBe(false)
  expect(ids({ missing: ['water'] })).toContain('exp:element:water')
  expect(ids({ missing: ['water'] }, false).some(i => i.startsWith('exp:element'))).toBe(false)
})
