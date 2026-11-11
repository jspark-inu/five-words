// 조립 규칙 시험: 임시 짝 문구로 학생 수천 명을 만들어, 셋·중복·빈 칸·단어 덮개·쏠림을 재 본다.
import { expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { CONTENT, DEEP } from '../src/content'
import { loadDeep, pairKey, type DeepContent, type PairCopy } from '../src/content/deep'
import { WORDS } from '../src/content/words'
import { composeReport, type Report } from '../src/report/compose'
import { SAMPLE_FAR, SAMPLE_PAIRS, SAMPLE_PAIR_TOP, SAMPLE_SUPPORT, SAMPLE_TOP } from './fixtures/sample-pairs'

const IDS = WORDS.map(w => w.id)
const N = 3000

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
}
const pickN = (rnd: () => number, from: string[], n: number): string[] => {
  const pool = [...from]
  const out: string[] = []
  while (out.length < n) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]!)
  return out
}

/** 시험용 임시 짝 문구: 561개 전부(또는 일부) 무작위 유형으로. 문구 내용은 키만 담은 표시다. */
function synthetic(rnd: () => number, keep: number): DeepContent {
  const pairs: Record<string, PairCopy> = {}
  for (let i = 0; i < IDS.length; i++) {
    for (let j = i + 1; j < IDS.length; j++) {
      if (rnd() >= keep) continue
      const key = pairKey(IDS[i]!, IDS[j]!)
      const syn = rnd() < 0.5
      pairs[key] = {
        type: syn ? 'syn' : 'ten', line: `줄 ${key}`, body: `본문 ${key}`,
        ...(syn ? { asset: { title: `자산 ${key}`, body: `자산 본문 ${key}` } } : { risk: { title: `위험 ${key}`, body: `위험 본문 ${key}`, remedy: `처방 ${key}` } }),
      }
    }
  }
  return loadDeepWith(pairs)
}
const loadDeepWith = (pairs: Record<string, PairCopy>): DeepContent => {
  const copy = loadDeep([])
  Object.assign(copy.words, DEEP.words)
  Object.assign(copy.areas, DEEP.areas); Object.assign(copy.areaEmpty, DEEP.areaEmpty); Object.assign(copy.areaFar, DEEP.areaFar)
  copy.restRisk = DEEP.restRisk
  Object.assign(copy.pairs, pairs)
  return copy
}

function student(rnd: () => number): { top: string[]; far: string[]; support: string[]; birth: BirthInput } {
  const all = pickN(rnd, IDS, 10)
  const known = rnd() < 0.8
  return {
    top: all.slice(0, 5), support: all.slice(5, 7), far: all.slice(7, 10),
    birth: {
      year: 1996 + Math.floor(rnd() * 12), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28),
      time: known ? { hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60) } : null,
      gender: known ? (rnd() < 0.5 ? 'M' : 'F') : null,
    },
  }
}

const build = (s: ReturnType<typeof student>, copy: DeepContent): Report =>
  composeReport(s.top, computeChart(s.birth), CONTENT, s.birth.time !== null, s.far, { support: s.support, contexts: [] }, { detail: computeDetail(s.birth, 2026), copy })

/** 한 보고서에 그려지는 조립 블록의 이름. 같은 이름이 둘이면 같은 블록이 두 번 나온 것이다. */
function blockIds(r: Report): string[] {
  const d = r.deep!
  return [
    ...d.assets.map(a => a.id),
    ...d.risks.flatMap(x => [x.id, ...(x.signals ? [x.signals.id] : [])]),
    ...(d.triangle ? d.triangle.edges.map(e => e.id) : []),
    ...(d.far ?? []).flatMap(f => (f.people ? [f.people.id] : [])),
    ...r.meetings.map(m => m.id),
    ...r.closing.map(c => c.id),
    ...r.experimentIds,
  ]
}

/** 조립 결과의 모든 글자 칸이 비어 있지 않은지. null은 "그 블록 없음"이라 건너뛴다. */
function emptyStrings(v: unknown, path: string, out: string[]): void {
  if (typeof v === 'string') { if (v.trim() === '') out.push(path) } else if (Array.isArray(v)) v.forEach((x, i) => emptyStrings(x, `${path}[${i}]`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) emptyStrings(x, `${path}.${k}`, out)
}

const histogram = (xs: number[]) => {
  const h: Record<string, number> = {}
  for (const x of xs) h[String(x)] = (h[String(x)] ?? 0) + 1
  return Object.fromEntries(Object.entries(h).sort(([a], [b]) => Number(a) - Number(b)))
}

type Run = { name: string; keep: number }
const RUNS: Run[] = [{ name: '짝 문구 전부(561)', keep: 1 }, { name: '짝 문구 절반', keep: 0.5 }, { name: '짝 문구 없음', keep: 0 }]

for (const run of RUNS) {
  test(`${run.name}: 학생 ${N}명의 조립 결과`, () => {
    const rnd = rng(run.keep === 1 ? 11 : run.keep === 0.5 ? 22 : 33)
    const copy = synthetic(rnd, run.keep)
    const assetUse: Record<string, number> = {}
    const riskUse: Record<string, number> = {}
    const cover: number[] = []
    const riskCover: number[] = []
    const kinds = { assetPair: 0, assetWord: 0, riskRest: 0, riskPair: 0, riskWord: 0 }
    const matchN: number[] = []
    const clashN: number[] = []
    let triangle = 0, water = 0, elementExp = 0, farRows = 0, farPeople = 0, farTotal = 0
    for (let n = 0; n < N; n++) {
      const s = student(rnd)
      const r = build(s, copy)
      const d = r.deep!
      expect(d.assets, `자산 ${n}`).toHaveLength(3)
      expect(d.risks, `위험 ${n}`).toHaveLength(3)
      const ids = blockIds(r)
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
      expect(dup, `중복 블록 ${n}`).toEqual([])
      const empties: string[] = []
      emptyStrings({ a: d.assets, r: d.risks, t: d.triangle, f: d.far, m: r.meetings, c: r.closing, e: r.experiments, s: d.summary }, 'r', empties)
      expect(empties, `빈 칸 ${n}`).toEqual([])
      expect(r.experiments).toHaveLength(3)
      for (const x of d.risks) expect(x.remedy.length > 0 && (x.signals === null || x.signals.early.length > 0)).toBe(true)
      for (const a of d.assets) { assetUse[a.id] = (assetUse[a.id] ?? 0) + 1; kinds[a.words.length === 2 ? 'assetPair' : 'assetWord']++ }
      for (const x of d.risks) { if (x.kind !== 'rest') riskUse[x.id] = (riskUse[x.id] ?? 0) + 1; kinds[x.kind === 'rest' ? 'riskRest' : x.kind === 'pair' ? 'riskPair' : 'riskWord']++ }
      cover.push(new Set(d.assets.flatMap(a => a.words)).size)
      riskCover.push(new Set(d.risks.flatMap(x => (x.kind === 'rest' ? (x.signals?.wordId ? [x.signals.wordId] : []) : x.words))).size)
      matchN.push(r.meetings.filter(m => m.kind === 'match').length)
      clashN.push(r.meetings.filter(m => m.kind === 'clash').length)
      if (d.triangle) triangle++
      if (r.meetings.some(m => m.group === 'water')) water++
      if (r.experimentIds.some(i => i.startsWith('exp:element'))) elementExp++
      farRows += r.meetings.filter(m => m.group === 'far').length
      farTotal += d.far!.length; farPeople += d.far!.filter(f => f.people).length
      // 먼 단어 줄은 내 다섯 단어를 가리키지 않는다.
      const mine = new Set(s.top.map(id => WORDS.find(w => w.id === id)!.ko))
      for (const f of d.far!) if (f.people) for (const m of f.people.text.matchAll(/"([^"]+)" 단어/g)) expect(mine.has(m[1]!)).toBe(false)
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const top = (u: Record<string, number>) => Object.entries(u).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${(v / (N * 3) * 100).toFixed(2)}%`)
    const maxAsset = Math.max(0, ...Object.values(assetUse)) / (N * 3)
    const maxRisk = Math.max(0, ...Object.values(riskUse)) / (N * 3)
    console.log(`\n[${run.name}] 학생 ${N}명
  핵심 자산: 짝 ${kinds.assetPair} / 단어 ${kinds.assetWord}, 덮는 단어 평균 ${mean(cover).toFixed(2)}/5 분포 ${JSON.stringify(histogram(cover))}
  구조적 위험: 쉼 ${kinds.riskRest} / 짝 ${kinds.riskPair} / 단어 ${kinds.riskWord}, 덮는 단어 평균 ${mean(riskCover).toFixed(2)}/5 분포 ${JSON.stringify(histogram(riskCover))}
  가장 자주 나온 자산 블록(전체 자산 칸 대비): ${top(assetUse).join(', ')}
  가장 자주 나온 위험 블록(쉼 제외): ${top(riskUse).join(', ')}
  삼각형 ${(triangle / N * 100).toFixed(1)}%, 수0 칸 ${(water / N * 100).toFixed(1)}%, 오행 실험 ${(elementExp / N * 100).toFixed(1)}%
  일치 칸 분포 ${JSON.stringify(histogram(matchN))}, 충돌 칸 분포 ${JSON.stringify(histogram(clashN))}, 먼 단어 일치 칸 ${(farRows / N).toFixed(2)}개/명, 사람 줄이 붙은 먼 단어 ${(farPeople / farTotal * 100).toFixed(1)}%`)
    expect(maxAsset).toBeLessThan(0.1)
    expect(maxRisk).toBeLessThan(0.1)
    if (run.keep === 1) {
      expect(mean(cover)).toBeGreaterThanOrEqual(4)
      expect(triangle / N).toBeGreaterThan(0.99)
    } else {
      // 짝 문구가 없거나 모자라도 단어 단위 문구로 채워 세 칸은 항상 나오며, 삼각형은 세 변이 다 있을 때만 나온다.
      if (run.keep === 0) expect(triangle).toBe(0)
      expect(mean(cover)).toBeGreaterThanOrEqual(3)
    }
  }, 120_000)
}

test('같은 입력은 같은 조립 결과', () => {
  const rnd = rng(5)
  const copy = synthetic(rnd, 1)
  const s = student(rnd)
  expect(build(s, copy)).toEqual(build(s, copy))
})

test('짝 문구가 없어도 보고서는 그려지고, 한 줄 요약 칸은 비어 있다(양식 문장으로 채우지 않는다)', () => {
  const s = { top: SAMPLE_TOP, far: SAMPLE_FAR, support: SAMPLE_SUPPORT, birth: { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const } }
  const r = build(s, loadDeepWith({}))
  const d = r.deep!
  expect(d.summary).toBeNull()
  expect(d.triangle).toBeNull()
  expect(d.pairs).toEqual([])
  expect(d.assets.map(a => a.id)).toEqual(['asset:word:ideas', 'asset:word:future', 'asset:word:rivalry'])
})

test('삼각형: 세 변의 한 줄이 다 있으면 그리고, 하나라도 비면 도형 전체를 그리지 않는다', () => {
  const s = { top: SAMPLE_TOP, far: SAMPLE_FAR, support: SAMPLE_SUPPORT, birth: { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const } }
  const tri = build(s, loadDeepWith(SAMPLE_PAIRS)).deep!.triangle
  expect(tri?.words).toEqual(['발상', '미래', '경쟁'])
  expect(tri?.edges.map(e => [e.label, e.type])).toEqual([['가', 'syn'], ['나', 'ten'], ['다', 'syn']])
  const k = pairKey('future', 'rivalry')
  expect(build(s, loadDeepWith({ ...SAMPLE_PAIRS, [k]: { ...SAMPLE_PAIRS[k]!, line: '' } })).deep!.triangle).toBeNull()
  const { [k]: _gone, ...rest } = SAMPLE_PAIRS
  expect(build(s, loadDeepWith(rest)).deep!.triangle).toBeNull()
})

test('견본 학생: 견본의 손으로 고른 블록과 규칙이 고른 블록을 맞대어 본다', () => {
  const s = { top: SAMPLE_TOP, far: SAMPLE_FAR, support: SAMPLE_SUPPORT, birth: { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const } }
  const copy = loadDeepWith(SAMPLE_PAIRS)
  Object.assign(copy.pairTop, SAMPLE_PAIR_TOP)
  const r = build(s, copy)
  const d = r.deep!
  const view = {
    한줄로말하면: d.summary,
    핵심자산: d.assets.map(a => ({ block: a.id, title: a.title })),
    구조적위험: d.risks.map(x => ({ block: x.id, title: x.title, signalsOf: x.signals?.wordKo ?? null, remedy: x.remedy.slice(0, 24), 쉼: x.rest ? { 표: x.rest.lines.length, 허용: x.rest.allow.map(a => a.ko), 먼쪽안내: x.rest.farNote !== null } : undefined })),
    삼각형: d.triangle,
    먼단어: d.far!.map(f => ({ ko: f.ko, 사람줄: f.people ? `${f.people.fromKo} ${f.people.kind}` : null })),
    만나는곳: r.meetings.map(m => ({ tag: m.tag, 단어: m.wordKo, 순위: m.rank, 풀이: [m.chartLabel, m.also?.chartLabel].filter(Boolean) })),
    닫기전에: r.closing.map(c => `${c.wordKo}: ${c.text}`),
    이번달실험: r.experimentIds,
  }
  expect(view.한줄로말하면).toBe(SAMPLE_PAIR_TOP['ideas>future'])
  // 견본과 같은 핵심 자산 둘, 견본의 경쟁+공감 자산은 위험 쪽에만 남아 단어 단위 자산(경쟁)이 대신 들어온다.
  expect(view.핵심자산.map(a => a.block)).toEqual(['asset:pair:future+ideas', 'asset:pair:achievement+future', 'asset:word:rivalry'])
  // 견본의 위험 셋 중 쉼은 빠진다: 이 학생의 몰아치는 단어는 경쟁·성취 둘뿐이고 1~3위 안에는 경쟁 하나라서 "몰려 있다"고 하지 않는다(2026-11-07 검토 뒤 기준).
  // 쉼 자리는 단어 단위 위험(미래)이 채운다. 나머지 둘은 견본과 같다.
  expect(view.구조적위험.map(x => [x.block, x.signalsOf])).toEqual([['risk:pair:achievement+ideas', '발상'], ['risk:pair:rivalry+sympathy', '경쟁'], ['risk:word:future', '미래']])
  expect(view.이번달실험.at(-1)).toBe('exp:element:water')
  expect(view.닫기전에).toHaveLength(2)
})

test('새 문구 칸이 모두 채워져 있다: 단어 자산 34, 영역 56·빈 영역 14·먼 영역 4, 쉼 위험', () => {
  expect(IDS.filter(id => !DEEP.words[id]?.asset?.title || !DEEP.words[id]?.asset?.body)).toEqual([])
  const areas = ['strategy', 'execute', 'influence', 'relation']
  const sigs: string[] = []
  for (let a = 0; a <= 5; a++) for (let b = 0; a + b <= 5; b++) for (let c = 0; a + b + c <= 5; c++) sigs.push(`strategy${a}-execute${b}-influence${c}-relation${5 - a - b - c}`)
  expect(sigs).toHaveLength(56)
  expect(sigs.filter(k => !DEEP.areas[k])).toEqual([])
  expect(Object.keys(DEEP.areaEmpty)).toHaveLength(14)
  expect(areas.filter(a => !DEEP.areaFar[a])).toEqual([])
  expect(DEEP.restRisk?.intro && DEEP.restRisk.remedy).toBeTruthy()
})

test('새 문구에 쓰지 않기로 한 말이 없다', () => {
  const all = JSON.stringify([DEEP.areas, DEEP.areaEmpty, DEEP.areaFar, DEEP.restRisk, IDS.map(id => DEEP.words[id]?.asset)])
  for (const bad of ['진단', '우울', '불안', '장애', '수명', '성공할', '합격할']) expect(all.includes(bad), bad).toBe(false)
})
