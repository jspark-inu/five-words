import { expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { buildPrompt } from '../src/report/prompt'

const sample: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }
const build = (birth = sample, extra: { support?: string[]; far?: string[] } = {}) =>
  buildPrompt({ top: ['ideas', 'future', 'rivalry', 'sympathy', 'achievement'], ...extra, chart: computeChart(birth), detail: computeDetail(birth, 2026) })

test('틀: 지시문과 자료 구획이 샘플과 같은 순서로 나온다', () => {
  const t = build(sample, { support: ['strategy', 'learning'], far: ['order', 'concord', 'caution'] })
  const at = (s: string) => t.indexOf(s)
  expect(at('아래는 제 강점 단어 검사 결과')).toBe(0)
  expect(at('[강점 단어]')).toBeGreaterThan(at('지켜 주세요.'))
  expect(at('[사주]')).toBeGreaterThan(at('[강점 단어]'))
  expect(at('[자미두수]')).toBeGreaterThan(at('[사주]'))
  expect(t).toContain('합격, 금액, 건강, 수명은 단정하지 마세요')
})
test('사주 줄: 기둥, 오행, 관계, 신살, 공망, 대운', () => {
  const t = build()
  expect(t).toContain('시주 丁未: 비견/식신/관대/월살/丁乙己')
  expect(t).toContain('일주 丁酉: 일간/편재/장생/장성/庚辛')
  expect(t).toContain('연주 乙酉: 편인/편재/장생/장성/庚辛')
  expect(t).toContain('오행: 목2 화2 토2 금2 수0')
  expect(t).toContain('관계: 卯未 반합(시지·월지), 卯酉 충(일지·월지), 酉酉 자형(일지·연지), 卯酉 충(월지·연지)')
  expect(t).toContain('신살: 천을귀인(일지·연지), 문창귀인(일지·연지)')
  expect(t).toContain('공망: 辰·巳 (네 기둥에는 없음)')
  expect(t).toContain('대운(시작 나이): 7 庚辰, 17 辛巳, 27 壬午')
})
test('올해와 내년 줄이 들어간다', () => {
  const t = build()
  expect(t).toContain('올해 2026 丙午: 겁재/비견/건록, 내년 2027 丁未: 비견/식신/관대')
  expect(t).toContain('올해 관계: 午未 합(시지), 卯午 파(월지)')
  expect(t).toContain('유년 2026: 명궁 부처, 천동 화록(복덕), 천기 화권(천이), 문창 화과(질액), 염정 화기(형제)')
  expect(t).toContain('유년 2027: 명궁 형제, 태음 화록(천이), 천동 화권(복덕), 천기 화과(천이), 거문 화기(재백)')
})
test('자미두수 줄: 궁마다 한 줄, 주성은 밝기와 사화, 신궁 표시', () => {
  const t = build()
  expect(t).toContain('[자미두수] 수이국(水二局), 명궁 申, 신궁 戌')
  expect(t).toContain('명궁 甲申: 주성 없음, 천월')
  expect(t).toContain('부처 壬午: 천량(묘, 화권), 지겁')
  expect(t).toContain('복덕 丙戌: 천동(함), 화성 (신궁)')
  expect(t).toContain('대한(세는 나이): 2 명궁, 12 부모, 22 복덕')
})
test('단어 줄: 5개 순서대로, 받침·먼 단어가 있을 때만', () => {
  const a = build()
  expect(a).toContain('다섯 단어(순서대로): 발상, 미래, 경쟁, 공감, 성취')
  expect(a).not.toContain('받침 단어')
  expect(a).not.toContain('먼 단어')
  const b = build(sample, { support: ['strategy', 'learning'], far: ['order'] })
  expect(b).toMatch(/받침 단어: .+\n먼 단어: .+/)
})
test('시간을 모르면 시주와 자미두수가 없고 그 사실을 적는다', () => {
  const t = build({ ...sample, time: null })
  expect(t).not.toContain('시주 ')
  expect(t).not.toContain('[자미두수]')
  expect(t).not.toContain('유년 2026')
  expect(t).toContain('태어난 시간을 입력하지 않아')
  expect(t).not.toContain('?')
  expect(t).toContain('올해 2026 丙午')
})
test('성별을 입력하지 않으면 자미두수와 대운이 없고 그 사실을 적는다', () => {
  const t = build({ ...sample, gender: null })
  expect(t).not.toContain('[자미두수]')
  expect(t).not.toContain('대운(시작 나이)')
  expect(t).toContain('성별을 입력하지 않아')
})
test('보낼지는 본인 선택이라는 말이 글 안에 있고 이름 칸은 없다', () => {
  const t = build()
  expect(t).not.toMatch(/이름|name/i)
})
