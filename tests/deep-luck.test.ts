import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { extractFeatures } from '../src/chart/features'
import { loadDeep } from '../src/content/deep'
import { ALL_KEYS, FAMILIES, WRITE_KEYS, familyOfKey } from '../src/content/luck-catalogue'
import { LUCK_SAMPLE } from '../src/content/deep-data/luck-sample'
import { READINGS } from '../src/content/readings'
import { CONTENT } from '../src/content'
import { composeDeep } from '../src/report/deep'
import { composeLuck, type LuckResult } from '../src/report/luck'
import { fillerBlocks } from './helpers/luck-filler'

const sample: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }
const top = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
const luckOf = (birth: BirthInput, blocks: Record<string, string>, nowYear = 2026, restOpposed = true): LuckResult =>
  composeLuck(extractFeatures(computeChart(birth), computeDetail(birth, nowYear)), blocks, READINGS, { restOpposed })

const textOf = (l: LuckResult): string => JSON.stringify(l)
const secLen = (s: unknown): number => (s ? JSON.stringify(s).length : 0)

describe('샘플 학생 2026', () => {
  const copy = loadDeep([LUCK_SAMPLE, { restRisk: { intro: '쉼' } }])
  const d = composeDeep({ top, far: null, support: null, chart: computeChart(sample), detail: computeDetail(sample, 2026), copy, readings: READINGS, content: CONTENT })
  const total = d.luck.total!
  const all = (v: { paragraphs: { text: string }[] }) => v.paragraphs.map(p => p.text).join('\n')

  test('샘플 문구의 키는 모두 목록에 있다', () => {
    for (const k of Object.keys(LUCK_SAMPLE.luckBlocks!)) expect(ALL_KEYS.has(k), k).toBe(true)
  })
  test('총운 요약과 소제목 순서', () => {
    expect(total.summary).toBe('만들어 낸 것으로 길을 여는 사람입니다. 재주와 사람 복은 있다고 풀이하는데, 스스로 쉬는 능력만 비어 있습니다.')
    expect(total.paragraphs.map(p => p.heading).filter(Boolean)).toEqual(['평생 따라다니는 주제: 쉼', '겉으로 보이는 나와 속의 나', '사람들과는', '일하고 공부할 때는', '돈은', '인생의 큰 흐름'])
  })
  test('총운 본문은 샘플 문장을 그대로 담는다', () => {
    const t = all(total)
    for (const s of [
      '일간이 **정화(丁火)**, 촛불입니다.', '**식신생재(食神生財)** 구조입니다.', '**천을귀인(天乙貴人)**이 일지와 연지에 있습니다.',
      '자미두수에도 윗사람과 선배가 챙겨 준다는 **천월(天鉞)**이 **명궁(命宮)**에, **천괴(天魁)**가 **관록궁(官祿宮)**에 있습니다.',
      '자미두수에서 나를 뜻하는 **명궁(命宮)**에 주성이 없습니다.',
      '사주에 쉼을 뜻하는 **수(水)**가 겉 글자에도 숨은 글자에도 없습니다. 자미두수에서는 살면서 무게가 실리는 **신궁(身宮)**이 하필 마음이 쉬는 **복덕궁(福德宮)**입니다. 강점 리포트에서도 다섯 단어 모두 쉼에 반대했습니다. 세 곳이 한 얘기를 합니다. 이 사람의 총운은 얼마나 잘 달리느냐보다 언제 멈추느냐에서 갈립니다.',
      '속은 다릅니다. **명궁(命宮)**이 빌려 온 **태음(太陰)**에 신경 쓰이는 표시인 **화기(化忌)**가 붙어 있습니다.',
      '**유유자형(酉酉自刑)**', '**형제궁(兄弟宮)**에 **염정(廉貞)**과 **칠살(七殺)**이 있습니다.', '**교우궁(交友宮)**에는 **천부(天府)**가 있어,',
      '**부모궁(父母宮)**은 주성이 없어 **자미(紫微)**와 **탐랑(貪狼)**을 빌려 옵니다.', '**부처궁(夫妻宮)**의 **천량(天梁)** 때문에 가까운 사람에게는 보호자처럼 굴어서,',
      '**묘유충(卯酉沖)**이 ',
      // 식신생재와 편인도식이 함께 성립하면 식신생재 문단 끝에서 한 번에 말한다(별도 "이 있습니다" 문장은 쓰지 않는다).
      '**편인도식(偏印倒食)**도 함께 있어서, 만들기 전에 생각 단계에서 자주 멈춥니다.', '얼마를 벌지는 사주가 말해 줄 수 있는 게 아닙니다.',
    ]) expect(t, s).toContain(s)
    expect(total.howTo!.startsWith('막히면 혼자 끌어안기 전에 한 사람에게 먼저 물어보세요.')).toBe(true)
    expect(total.howTo).toContain('쉬는 시간은 달력에 약속으로 넣으세요. 저절로는 안 됩니다.')
    expect(total.why).toContain('일간 정(丁)')
  })
  test('대운 넷: 현재와 다음 셋, 마지막은 "년부터"', () => {
    const t = total.paragraphs.filter(p => p.term).map(p => p.text)
    expect(t).toHaveLength(4)
    ;[
      '**2022~2031년 신사(辛巳) 대운 · 넓어지는 때** **편재(偏財)**와 **겁재(劫財)**의 시기입니다.',
      '**2032~2041년 임오(壬午) 대운 · 맡는 때** **정관(正官)',
      '**2042~2051년 계미(癸未) 대운 · 버티며 만드는 때** **편관(偏官)**과 **식신(食神)**의 시기입니다.',
      '**2052년부터 갑신(甲申) 대운 · 다시 배우는 때** **정인(正印)**과 **정재(正財)**의 시기입니다.',
    ].forEach((x, i) => expect(t[i]!.startsWith(x), x).toBe(true))
    expect(total.paragraphs.find(p => p.text.includes('2022~2031'))!.text).toContain('자미두수로도 22세부터 31세까지는 **복덕궁(福德宮)** 대한입니다.')
    expect(total.paragraphs.find(p => p.text.includes('2022~2031'))!.text).toContain('지금이 여기입니다.')
  })
  test('올해운: 丙午, 건록, 오미합, 묘오파, 유년 명궁 부처궁, 화록 복덕', () => {
    const y = d.luck.years[0]!
    expect([y.year, y.label]).toEqual([2026, '2026년 병오(丙午)'])
    expect(y.good!.startsWith('내 이름으로 하는 일. 자기 힘으로 서는 단계인 **건록(建祿)**의 해라서')).toBe(true)
    // 묶음 3: 시지(먼 자리)와의 합은 글로 쓰지 않고 근거 줄에만 남는다. 월지의 파는 센 관계라 조심할 쪽에 그대로 있다.
    expect(y.good).not.toContain('오미합')
    expect(y.why).toContain('시지의')
    expect(y.good).toContain('힘이 실리는 표시인 **화권(化權)**이 붙었습니다. 밖에서 계획을 내놓으면')
    // 검토 반영: 파 하나와 겹친 또래 해로는 경고 점수가 3점에 못 미쳐 조심할 쪽을 열지 않는다. 월지의 파는 근거 줄에 사실로 남는다.
    expect(y.bad).toBeNull()
    expect(y.why).toContain('월지의')
    expect(y.liunianHeading).toBe('올해 가까운 사람')
    expect(y.liunian).toContain('올해의 명궁인 유년 명궁이 **부처궁(夫妻宮)**으로 옵니다.')
    expect(y.goodNews).toContain('**복덕궁(福德宮)**의 **천동(天同)**에 반가운 표시인 **화록(化祿)**이 붙었습니다.')
    expect(y.why).toContain('병(丙)은 나에게 겁재, 오(午)는 비견입니다.')
    expect(y.why).toContain('유년 명궁은 부처궁')
  })
  test('내년운: 丁未, 형제궁, 올해와 다른 점', () => {
    const y = d.luck.years[1]!
    expect([y.year, y.label]).toEqual([2027, '2027년 정미(丁未)'])
    expect(y.liunianHeading).toBe('내년 또래')
    expect(y.compare).toContain('올해가 시동을 거는 해라면 내년은 보여 주는 해입니다.')
    expect(y.compare).toContain('쉼도 달라집니다. 복덕궁에 올해는 화록이 붙어 쉼이 즐거운 해이고, 내년은 화권이 붙어 내가 쉼을 직접 정할 수 있는 해입니다. 일정표를 내 손으로 잡기 좋습니다.')
    expect(y.why).toContain('거문 화기(재백궁)')
    expect(y.why).toContain('유년 명궁은 형제궁')
  })
  test('학업운', () => {
    const s = d.luck.study!
    expect(s.summary!.startsWith('꽂힌 과목은 교수님보다')).toBe(true)
    expect(all(s)).toContain('**문창귀인(文昌貴人)**이 일지와 연지에 있습니다.')
    expect(all(s)).toContain('**2026년**은 공부가 마음 상태를 따라가는 해입니다.')
    expect(all(s)).toContain('합격과 성적은 사주가 정해 주지 않습니다.')
    // 관록궁의 태양은 함(어두운 자리)이다. 어두운 자리 문구(starDim)는 샘플에 없어서 별 풀이를 읽지 않는다(밝은 자리 풀이를 어두운 별에 쓰지 않는다).
    expect(all(s)).not.toContain('환하고')
  })
  test('한눈에 보기는 각 구획 요약의 첫 문장', () => {
    expect(d.luck.glance.map(g => [g.id, g.label])).toEqual([['total', '총운'], ['now', '올해운 · 2026년'], ['next', '내년운 · 2027년'], ['study', '학업운']])
    expect(d.luck.glance[1]!.text).toBe('내 힘이 세게 올라오는 해입니다.')
  })
  test('자미두수가 없어도 같은 샘플이 이어 읽힌다(시간 모름): 시주 문구와 별 문구는 쓰이지 않는다', () => {
    const l = luckOf({ ...sample, time: null }, loadDeep([LUCK_SAMPLE]).luckBlocks)
    const t = textOf(l)
    expect(t).not.toContain('혼자 있을 때를 보는 시주')
    expect(t).not.toContain('형제궁')
    expect(l.note).toBe('태어난 시각을 몰라 시주와 자미두수는 쓰지 않았습니다.')
    expect(l.total!.paragraphs.length).toBeGreaterThan(3)
  })
  test('실제 문구에 카탈로그의 블록이 모두 있고 한 학생에게만 맞는 표현이 없다', async () => {
    const { DEEP_PARTS } = await import('../src/content/deep-data')
    const real = loadDeep(DEEP_PARTS)
    const values = Object.values(real.luckBlocks)
    expect(values.length).toBeGreaterThanOrEqual(1300)
    for (const v of values) {
      expect(v.trim()).not.toBe('')
      expect(v).not.toMatch(/불이 더 많아지는|이 사람에게는 드문|올해 벌인|20\d\d년/)
    }
  })
})

test('목록: 모든 가족에 키가 있고, 글 쓸 칸 수와 글자 수가 합리적이다', () => {
  for (const f of FAMILIES) expect(f.keys.length, f.id).toBeGreaterThan(0)
  expect(new Set(WRITE_KEYS.map(w => w.key)).size).toBe(WRITE_KEYS.length)
  expect(WRITE_KEYS.every(w => ALL_KEYS.has(w.key))).toBe(true)
})

// ---- 대량 모의 시험 ----
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

test('무작위 2400명: 빈 곳 없음, 중복 없음, 총운이 가장 길다, 내년은 올해와 다르다', () => {
  const r = rng(26110906)
  const blocks = fillerBlocks()
  const N = 2400
  const familyKeys: Record<string, Set<string>> = {}
  const cases = { time: 0, gender: 0, neither: 0, full: 0 }
  const lens = { total: [] as number[], now: [] as number[], next: [] as number[], study: [] as number[] }
  for (let i = 0; i < N; i++) {
    const timeKnown = r() < 0.7, genderKnown = r() < 0.7
    const birth: BirthInput = {
      year: 1990 + Math.floor(r() * 21), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
      time: timeKnown ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null,
      gender: genderKnown ? (r() < 0.5 ? 'M' : 'F') : null,
    }
    const nowYear = 2026 + Math.floor(r() * 10)
    const l = luckOf(birth, blocks, nowYear, r() < 0.5)
    const tag = `${JSON.stringify(birth)} ${nowYear}`
    // 구획이 모두 있다
    expect(l.total, tag).not.toBeNull()
    expect(l.study, tag).not.toBeNull()
    expect(l.years.map(y => y.year), tag).toEqual([nowYear, nowYear + 1])
    // 빈 필드 없음
    const strings: string[] = []
    const walk = (v: unknown) => { if (typeof v === 'string') strings.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
    walk({ total: l.total, years: l.years, study: l.study, glance: l.glance })
    expect(strings.every(s => s.trim() !== ''), tag).toBe(true)
    for (const s of [l.total!, l.study!]) {
      expect(s.summary, tag).toBeTruthy()
      expect(s.paragraphs.length, tag).toBeGreaterThan(0)
      // 시각을 모르면 없음·주제 블록을 쓰지 않아서 총운의 이렇게 써 보세요가 없을 수 있다.
      if (timeKnown) expect(s.howTo, tag).toBeTruthy()
      expect(s.why, tag).toBeTruthy()
      expect(s.paragraphs.every(p => p.text.trim() !== '' && (p.heading === null || p.heading.trim() !== '')), tag).toBe(true)
    }
    // 조심할 쪽(bad)은 센 경고가 있을 때만 열려서 비어 있을 수 있다.
    for (const y of l.years) for (const f of [y.summary, y.good, y.howTo, y.why]) expect(f, tag).toBeTruthy()
    expect(l.glance.length, tag).toBe(4)
    // 소제목마다 문단이 있다: 소제목은 문단에 붙어 있으니 문단이 곧 근거. 소제목 문구가 겹치지 않는지 본다.
    const heads = l.total!.paragraphs.map(p => p.heading).filter(Boolean)
    expect(new Set(heads).size, tag).toBe(heads.length)
    // 같은 블록은 한 번만
    const all = textOf(l)
    const noGlance = JSON.stringify({ total: l.total, years: l.years, study: l.study })
    for (const k of l.used) {
      if (k.startsWith('glance')) continue // 한눈에 보기에만 쓰는 절
      const marker = `${k.replace(/[[\]]/g, ' ')}.`
      const count = noGlance.split(marker).length - 1
      expect(count, `${tag} ${k}`).toBe(1)
    }
    expect(new Set(l.used).size).toBe(l.used.length)
    // 요청한 키는 모두 목록에 있다
    for (const k of l.requested) expect(ALL_KEYS.has(k), k).toBe(true)
    // 총운이 가장 길다, 내년은 올해와 다르다
    const lt = secLen(l.total), ln = secLen(l.years[0]), lx = secLen(l.years[1]), ls = secLen(l.study)
    expect(lt, `${tag} ${lt} ${ln} ${lx} ${ls}`).toBeGreaterThan(Math.max(ln, lx, ls))
    expect(JSON.stringify({ ...l.years[1], year: 0, id: 0 }), tag).not.toBe(JSON.stringify({ ...l.years[0], year: 0, id: 0 }))
    expect(l.years[1]!.summary, tag).not.toBe(l.years[0]!.summary)
    // 시각을 모르면 시주 문구가 없고, 자미두수가 없으면 별 문구가 없다
    if (!timeKnown) expect(all, tag).not.toContain('hourGod')
    if (!timeKnown || !genderKnown) { expect(all, tag).not.toContain('starPalace'); expect(all, tag).not.toContain('liunianMing'); expect(all, tag).not.toContain('yearHua') }
    if (!genderKnown) expect(all, tag).not.toContain('daewoonTheme')
    // 안내 한 줄
    expect(l.note === null, tag).toBe(timeKnown && genderKnown)
    // 굵게 표시가 짝이 맞는다
    expect((all.match(/\*\*/g) ?? []).length % 2, tag).toBe(0)
    cases[timeKnown && genderKnown ? 'full' : !timeKnown && !genderKnown ? 'neither' : !timeKnown ? 'time' : 'gender']++
    lens.total.push(lt); lens.now.push(ln); lens.next.push(lx); lens.study.push(ls)
    for (const k of l.used) (familyKeys[familyOfKey(k)] ??= new Set()).add(k)
  }
  const stats = (a: number[]) => `min ${Math.min(...a)} avg ${Math.round(a.reduce((x, y) => x + y, 0) / a.length)} max ${Math.max(...a)}`
  const writable: Record<string, number> = {}
  for (const w of WRITE_KEYS) writable[w.family.id] = (writable[w.family.id] ?? 0) + 1
  const rows = FAMILIES.map(f => `${f.id}: ${[...(familyKeys[f.id] ?? [])].filter(k => (f.id !== 'yearSipsin' || k.includes('#'))).length}/${writable[f.id]}`)
  console.log(`모의 ${N}명 ${JSON.stringify(cases)}\n길이(JSON 글자) 총운 ${stats(lens.total)} | 올해 ${stats(lens.now)} | 내년 ${stats(lens.next)} | 학업 ${stats(lens.study)}\n쓰인 서로 다른 키 / 글 쓸 칸(필드 포함):\n${rows.join('\n')}`)
  expect(cases.full + cases.neither + cases.time + cases.gender).toBe(N)
})

test('같은 입력은 늘 같은 결과', () => {
  const b = fillerBlocks()
  expect(textOf(luckOf(sample, b))).toBe(textOf(luckOf(sample, b)))
})

test('문구가 하나도 없으면 구획이 통째로 없고 안내도 없다', () => {
  const l = luckOf(sample, {})
  expect([l.total, l.study, l.years, l.glance]).toEqual([null, null, [], []])
  const d = composeDeep({ top, far: null, support: null, chart: computeChart(sample), detail: computeDetail(sample, 2026), copy: loadDeep([]), readings: READINGS, content: CONTENT })
  expect(d.luck.note).toBeNull()
  expect(d.luck.total).toBeNull()
})
