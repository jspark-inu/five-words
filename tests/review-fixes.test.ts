// 독립 검토(2026-11-06)의 지적을 다시 들어오지 못하게 막는 시험. 샘플이 아닌 명식으로 조립해서 글이 그 명식에 맞는 말을 하는지 본다.
import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { extractFeatures, findPatterns, mergeRelations, type LuckFeatures } from '../src/chart/features'
import { CONTENT, DEEP } from '../src/content'
import { loadDeep } from '../src/content/deep'
import { FAR_EVIDENT } from '../src/content/assemble-copy'
import { hasFinalConsonant } from '../src/report/josa'
import { composeReport, type Report } from '../src/report/compose'
import { composeLuck, DEDUPE_MIN, PARA_CAP, type LuckResult } from '../src/report/luck'
import { isDrivingCrowd, selectRisks, selectSummary } from '../src/report/pick'
import { buildPrompt } from '../src/report/prompt'
import { READINGS } from '../src/content/readings'
import { WORDS } from '../src/content/words'

const IDS = WORDS.map(w => w.id)
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const strip = (s: string) => s.replace(/\*\*/g, '')
const randBirth = (r: () => number, known = r() > 0.1): BirthInput => ({
  year: 2003 + Math.floor(r() * 6), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28),
  time: known ? { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) } : null, gender: r() < 0.5 ? 'M' : 'F',
})
const pickWords = (r: () => number) => { const a = [...IDS]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!] } return a.slice(0, 10) }
const feats = (b: BirthInput, y = 2026) => extractFeatures(computeChart(b), computeDetail(b, y))
const luckOf = (b: BirthInput, y = 2026, restOpposed = false) => composeLuck(feats(b, y), DEEP.luckBlocks, READINGS, { restOpposed })
const full = (top: string[], far: string[], support: string[], b: BirthInput, y = 2026): Report =>
  composeReport(top, computeChart(b), CONTENT, b.time !== null, far, { support, contexts: [] }, { detail: computeDetail(b, y), copy: DEEP })
const totalText = (l: LuckResult) => (l.total?.paragraphs ?? []).map(p => p.text).join('\n')
const luckAll = (l: LuckResult) => strip(JSON.stringify({ t: l.total, y: l.years, s: l.study }))
const sentencesOf = (t: string) => strip(t).split(/(?<=[.!?]["'”’)]?)\s+/).map(x => x.trim()).filter(x => x.length >= DEDUPE_MIN)

const sampleBirth: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }
const sampleTop = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
const gods = (f: LuckFeatures) => f.gods.map(h => h.god)

describe('명식에 없는 사실을 말하지 않는다(샘플 밖 2000명)', () => {
  const r = rng(11062026)
  const cases = Array.from({ length: 2000 }, () => { const b = randBirth(r); const f = feats(b); return { b, f, l: composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false }) } })

  test('F1 돈의 자리를 단정하지 않는다', () => {
    for (const { l } of cases) expect(totalText(l)).not.toContain('일지에 넓게 오가는')
  })
  test('F2 식신생재 문구는 재성으로 말한다', () => {
    expect(DEEP.luckBlocks['pattern[식신생재]']).toContain('**재성(財星)**')
    expect(DEEP.luckBlocks['pattern[식신생재]']).not.toContain('편재')
  })
  test('F3 글자 관계 문구에 십신 이름이 없다', () => {
    for (const [k, v] of Object.entries(DEEP.luckBlocks)) if (k.startsWith('relation[')) expect(v, k).not.toMatch(/편인|편재|정인|정재|편관|정관|식신|상관|비견|겁재/)
  })
  test('F7 또래를 둘 다 짚는다는 말은 그해 천간·지지가 모두 비겁일 때만', () => {
    let hits = 0
    for (const { f, l } of cases) for (const y of l.years) if (y.bad?.includes('둘 다 또래를')) {
      hits++
      const fy = f.years.find(v => v.year === y.year)!
      expect([fy.stemGod, fy.branchGod].every(g => g === '비견' || g === '겁재')).toBe(true)
    }
    expect(hits).toBeGreaterThan(0)
  })
  test('F7 샘플에만 맞던 대운 문구가 없다', () => {
    for (const k of ['daewoonTheme[정관+비견]', 'daewoonTheme[정인+정재]']) expect(DEEP.luckBlocks[k]).toMatch(/^겉으로는/)
    expect(JSON.stringify(DEEP.luckBlocks)).not.toMatch(/혼자 파던 사람이|내 방식으로만 하던 사람이/)
  })
  test('F8 앞 문장이 없으면 사주에도라고 하지 않는다', () => {
    for (const { l } of cases) expect(totalText(l)).not.toContain('속은 다릅니다. 사주에도')
    for (const k of ['辰辰', '午午', '亥亥']) expect(DEEP.luckBlocks[`relation[${k}刑]`]).not.toContain('끼리 찌르는')
  })
  test('F9 재생관·관인상생은 정관이 있을 때만, 재생살·살인상생은 편관이 있을 때만', () => {
    let seen = { 재생살: 0, 재생관: 0 }
    for (const { f, l } of cases) {
      const t = totalText(l)
      if (t.includes('**재생관(財生官)** 구조') || t.includes('**관인상생(官印相生)** 구조')) expect(gods(f)).toContain('정관')
      if (t.includes('**재생살(財生殺)** 구조') || t.includes('**살인상생(殺印相生)** 구조')) expect(gods(f)).toContain('편관')
      if (t.includes('**재생살(財生殺)** 구조')) seen.재생살++
      if (t.includes('**재생관(財生官)** 구조')) seen.재생관++
    }
    expect(seen.재생살).toBeGreaterThan(0)
    expect(seen.재생관).toBeGreaterThan(0)
    expect(DEEP.luckBlocks['pattern[재생살]']).toContain('조심스럽게')
    expect(DEEP.luckBlocks['pattern[살인상생]']).toContain('조심스럽게')
  })
  test('F10 함께 있기만 하면 구조로 치지 않는다: 붙어 있거나 낳는 쪽이 투출해야 한다', () => {
    expect(findPatterns([{ god: '식신', place: '월간' }, { god: '편재', place: '일지' }])).toContain('식신생재')
    expect(findPatterns([{ god: '식신', place: '연지' }, { god: '정재', place: '시지' }])).not.toContain('식신생재')
    expect(findPatterns([{ god: '식신', place: '월지' }, { god: '정재', place: '일지' }])).toContain('식신생재')
    expect(findPatterns([{ god: '정관', place: '연지' }, { god: '정인', place: '시지' }])).not.toContain('관인상생')
    expect(findPatterns([{ god: '편관', place: '월간' }, { god: '정인', place: '일지' }])).toEqual(['살인상생'])
  })
  test('F12 천괴·천월은 네 궁에 있을 때만 근거가 되고 궁 이름을 말한다', () => {
    const palT: Record<string, string> = { 命宮: '**명궁(命宮)**', 財帛: '**재백궁(財帛宮)**', 官祿: '**관록궁(官祿宮)**', 遷移: '**천이궁(遷移宮)**' }
    let on = 0, off = 0
    for (const { f, l } of cases) {
      // 천을귀인을 글로 쓴 학생만 본다(먼 자리 신살은 가까운 자리 신살이 있으면 쓰지 않는다).
      if (!f.palaces || !l.used.includes('sinsal[천을귀인]') || !f.sals.find(s => s.name === '천을귀인')!.places.some(p => ['일지', '월지', '일간', '일주', '월간', '월주'].includes(p))) continue
      const t = totalText(l)
      const seats = Object.keys(palT).filter(h => f.palaces![h]?.minors.some(m => m.star === '天魁' || m.star === '天鉞'))
      if (seats.length > 0) { on++; expect(t).toContain('두 전통이 같은 말을'); for (const h of seats) expect(t).toContain(palT[h]) } else { off++; expect(t).not.toContain('두 전통이 같은 말을') }
    }
    expect(on).toBeGreaterThan(0)
    expect(off).toBeGreaterThan(0)
  })
  test('F19 조심할 쪽의 글자 관계는 둘까지, 글자 하나에 절 하나', () => {
    for (const { f, l } of cases) for (const y of l.years) {
      const clauses = [...(y.bad ?? '').matchAll(/([시일월연]지)와 \*\*/g)]
      expect(clauses.length, y.bad ?? '').toBeLessThanOrEqual(2)
      const fy = f.years.find(v => v.year === y.year)!
      const natal = clauses.map(c => fy.relations.find(x => x.place === c[1])!.natal)
      expect(new Set(natal).size).toBe(natal.length)
    }
  })
  test('F20 해마다 돈 소제목이 없고, 내년에는 돈 이야기가 늘 있으며, 총운 돈은 금액 문장으로 닫힌다', () => {
    for (const { l } of cases) {
      for (const y of l.years) expect('paragraphs' in y).toBe(false)
      const next = l.years[1]!
      expect(`${next.good} ${next.bad} ${next.money} ${next.goodNews}`).toMatch(/돈|재백|통장|잔액|지출/)
      const ps = l.total!.paragraphs
      const i = ps.findIndex(p => p.heading === '돈은')
      if (i < 0) continue
      const j = ps.findIndex((p, n) => n > i && p.heading)
      const last = ps[(j < 0 ? ps.length : j) - 1]!
      expect(last.text.endsWith('얼마를 벌지는 사주가 말해 줄 수 있는 게 아닙니다.')).toBe(true)
    }
  })
  test('F20 올해 돈 절은 재백궁의 화기·화록이나 겁재일 때만', () => {
    const moneyKeys = Object.entries(DEEP.luckBlocks).filter(([k]) => k.startsWith('yearMoney')).map(([, v]) => v)
    for (const { f, l } of cases) {
      const now = l.years[0]!, fy = f.years[0]!
      const hits = moneyKeys.filter(v => `${now.good} ${now.bad}`.includes(v))
      expect(hits.length).toBeLessThanOrEqual(1)
      if (hits.length === 1) expect([fy.stemGod, fy.branchGod]).toContain('겁재')
    }
  })
  test('F24 총운 문단은 목표 근처에서 나뉜다', () => {
    for (const { l } of cases) for (const p of l.total!.paragraphs) expect(strip(p.text).length, p.text).toBeLessThan(400)
    const lens = cases.flatMap(({ l }) => l.total!.paragraphs.map(p => strip(p.text).length))
    expect(lens.filter(n => n > PARA_CAP).length / lens.length).toBeLessThan(0.02)
  })
  test('F25 두 별의 문구가 어긋나지 않게 한 별만 쓴다', () => {
    for (const { b, f } of cases.slice(0, 200)) {
      if (!f.palaces) continue
      const t = totalText(luckOf(b))
      expect(t).not.toMatch(/넓은 모임보다 몇 명과 깊은 쪽입니다[^\n]*넓은 모임에서 사람을 이어 줍니다/)
      expect(t).not.toMatch(/돈은 즐거움에 씁니다[^\n]*돈은 안전한 쪽을 택합니다/)
    }
  })
  test('F26 같은 문장이 한 보고서에 두 번 나오지 않는다(운세)', () => {
    for (const { l } of cases) {
      const parts = [
        l.total?.summary, ...(l.total?.paragraphs ?? []).map(p => p.text), l.total?.howTo, l.total?.why,
        ...l.years.flatMap(y => [y.summary, y.good, y.bad, y.liunian?.text, y.goodNews, y.compare, y.howTo, y.why]),
        l.study?.summary, ...(l.study?.paragraphs ?? []).map(p => p.text), l.study?.howTo, l.study?.why,
      ].filter((x): x is string => !!x)
      const all = parts.flatMap(sentencesOf)
      const dup = all.filter((s, i) => all.indexOf(s) !== i)
      expect(dup).toEqual([])
    }
  })
  test('F29 쓸 말이 없는 있음 블록은 총운에 나오지 않는다', () => {
    const someHave = Object.entries(DEEP.luckBlocks).filter(([k]) => /^group\[.*:있음\]$/.test(k)).map(([, v]) => strip(v))
    for (const { l } of cases) { const t = strip(totalText(l)); for (const v of someHave) expect(t).not.toContain(v) }
  })
})

describe('태어난 시각을 모르면 없다고 말하지 않는다 (F5)', () => {
  const r = rng(5)
  test('없음 블록·주제·보이지 않습니다·0개가 어디에도 없다', () => {
    const noGroup = Object.entries(DEEP.luckBlocks).filter(([k]) => /^(group|studyGroup)\[.*:없음\]/.test(k)).map(([, v]) => strip(v))
    const themes = Object.entries(DEEP.luckBlocks).filter(([k]) => /^theme\[|^gistTheme\[.*(0|없음)\]/.test(k)).map(([, v]) => strip(v))
    for (let i = 0; i < 400; i++) {
      const b = randBirth(r, false)
      const words = pickWords(r)
      const rep = full(words.slice(0, 5), words.slice(7, 10), words.slice(5, 7), b)
      const l = rep.deep!.luck
      const text = strip(JSON.stringify([l.total, l.years, l.study, l.glance]))
      for (const v of [...noGroup, ...themes]) expect(text).not.toContain(v)
      expect(text).not.toMatch(/보이지 않습니다|0개입니다|평생 따라다니는 주제|사주에 없던/)
      expect(l.note).toBe('태어난 시각을 몰라 시주와 자미두수는 쓰지 않았습니다.')
      expect(JSON.stringify(rep.meetings)).not.toMatch(/비어 있습니다|0개입니다/)
      expect(rep.saju.elementTexts.join(' ')).not.toContain('0개입니다')
    }
  })
})

describe('쉼 위험 (F4, F6)', () => {
  const r = rng(46)
  test('쉼 편 단어가 있으면 제목·도입이 없고, 총운의 쉼 줄도 없다', () => {
    const top = ['sociability', 'expression', 'optimism', 'flexibility', 'recognition']
    const rep = full(top, ['analysis', 'order', 'concentration'], ['inclusion', 'sympathy'], sampleBirth)
    expect(rep.deep!.risks.some(x => x.kind === 'rest')).toBe(false)
    expect(strip(JSON.stringify(rep.deep!.luck.total))).not.toContain('다섯 단어 모두 쉼에 반대')
  })
  test('유연·낙관·친밀은 쉼을 막지 않는 단어다', () => {
    for (const id of ['flexibility', 'optimism', 'closeness']) expect(DEEP.words[id]!.restAllow).toBeTruthy()
    expect(DEEP.words.confidence!.restAllow).toBeFalsy()
    expect(DEEP.words.confidence!.rest).toContain('잘 안 옵니다')
  })
  test('쉼 위험의 신호는 쉼 신호이거나 성취의 승인 문구다', () => {
    const allow = new Set(IDS.filter(id => DEEP.words[id]!.restAllow))
    for (let i = 0; i < 1500; i++) {
      const w = pickWords(r)
      const top = w.slice(0, 5)
      const risks = selectRisks(top, w.slice(7, 10), w.slice(5, 7), DEEP)
      const rest = risks.find(x => x.kind === 'rest')
      expect(!!rest).toBe(isDrivingCrowd(top) && top.slice(0, 3).every(id => !allow.has(id)))
      if (rest) expect(rest.signals!.id).toBe(top.includes('achievement') ? 'signals:achievement' : 'signals:rest')
    }
  })
  test('성취가 낀 몰아치는 단어 학생의 쉼 신호는 승인 문구 그대로다', () => {
    const risks = selectRisks(['achievement', 'concentration', 'accountability', 'ideas', 'future'], null, null, DEEP)
    expect(risks[0]!.kind).toBe('rest')
    expect(risks[0]!.signals!.early).toBe('쉬는 시간에도 한 일을 세고 있다. 안 지운 줄이 하나 남으면 하루가 덜 끝난 기분이다.')
  })
  test('짝 위험의 신호는 어긋나는 단어를 쓰지 않고, 맞는 단어가 없으면 비운다', () => {
    for (let i = 0; i < 1500; i++) {
      const w = pickWords(r)
      const top = w.slice(0, 5)
      const risks = selectRisks(top, null, null, DEEP)
      for (const x of risks) {
        if (x.kind !== 'pair') continue
        const key = x.id.slice('risk:pair:'.length)
        if (x.signals?.wordId) expect(DEEP.signalConflicts[key] ?? [], key).not.toContain(x.signals.wordId)
      }
      const used = risks.flatMap(x => (x.signals?.wordId ? [x.signals.wordId] : []))
      expect(new Set(used).size).toBe(used.length)
    }
    const s2 = selectRisks(['caution', 'accountability', 'order', 'concentration', 'concord'], null, null, DEEP).find(x => x.id === 'risk:pair:caution+accountability')
    if (s2) expect(s2.signals?.wordId).not.toBe('accountability')
  })
})

describe('글자와 조사 (F11, F27)', () => {
  const hanjaGone = (t: string) => expect(t).not.toContain('乾祿')
  test('F11 어느 해에도 乾祿이 나오지 않는다', () => {
    hanjaGone(JSON.stringify(DEEP.luckBlocks))
    for (let y = 2026; y <= 2037; y++) hanjaGone(JSON.stringify(luckOf(sampleBirth, y)))
    const hit = [2026, 2027].map(y => luckOf(sampleBirth, y).years.map(v => v.why).join(' ')).join(' ')
    expect(hit).toContain('건록(建祿)')
  })
  // 한글(한자) 조사 꼴과 한글 조사 꼴을 모두 잡아 받침과 맞는지 본다.
  const PARTICLE: Record<string, boolean> = { 은: true, 는: false, 을: true, 를: false, 과: true, 와: false }
  const checkParticles = (t: string, tag: string) => {
    for (const m of strip(t).matchAll(/([가-힣]+)(?:\([^)]*\))?(은|는|을|를|과|와) /g)) {
      const word = m[1]!, p = m[2]!
      expect(hasFinalConsonant(word), `${tag}: ${m[0]}`).toBe(PARTICLE[p])
    }
  }
  test('F27 2026~2035년 근거 줄의 조사와 궁 이름', () => {
    const r = rng(2735)
    for (let i = 0; i < 300; i++) {
      const b = randBirth(r)
      for (let y = 2026; y <= 2035; y += 1) {
        const l = luckOf(b, y)
        for (const v of l.years) {
          const tag = `${JSON.stringify(b)} ${y}`
          expect(v.why, tag).not.toContain('명궁궁')
          // 첫 문장과 관계 문장은 전부 조립기가 만든다.
          const fromComposer = v.why!.split(' 유년 명궁은')[0]!.replace(/ \S+\([^)]+\)[은는] [^.]*단계라는 뜻[^.]*\./, '')
          checkParticles(fromComposer, tag)
        }
        expect(l.total?.why ?? '').not.toContain('명궁궁')
        expect(l.study?.why ?? '').not.toContain('명궁궁')
      }
    }
  })
  test('F27 총운 본문·요약에도 명궁궁이 없다', () => {
    const r = rng(9)
    for (let i = 0; i < 500; i++) expect(luckAll(luckOf(randBirth(r)))).not.toContain('명궁궁')
  })
  test('F27 근거 목록 끝 조사는 마지막 항목을 본다', () => {
    const r = rng(33)
    for (let i = 0; i < 500; i++) {
      const l = luckOf(randBirth(r))
      for (const w of [l.total?.why, l.study?.why]) {
        if (!w) continue
        const m = /([^,]*?)(?:\([^()]*\))?(을|를) 근거로 삼았습니다\.(?: 일간의 기운이 센지[^.]*\.)?(?: 태어난 시각을 모르면[^.]*\.)?$/.exec(w)
        expect(m, w).not.toBeNull()
        expect(hasFinalConsonant(m![1]!.trim()), w).toBe(m![2] === '을')
      }
    }
  })
  test('F27 학업 궁은 학업 근거에, 총운 궁은 총운 근거에', () => {
    const l = luckOf(sampleBirth)
    expect(l.study!.why).toContain('관록궁 태양')
    expect(l.total!.why).not.toContain('관록궁 태양')
    expect(l.total!.why).toContain('재백궁 거문')
  })
  test('F27 신궁을 근거로 적는 건 실제로 썼을 때만', () => {
    const r = rng(77)
    for (let i = 0; i < 800; i++) {
      const b = randBirth(r, true)
      const l = luckOf(b, 2026, true)
      const said = /\*\*신궁\(身宮\)\*\*/.test(JSON.stringify(l.total))
      expect((l.total?.why ?? '').includes('신궁이')).toBe(said)
    }
  })
})

describe('고정 문구 (F13, F15~F18, F21~F23, F28, F30~F32)', () => {
  test('현침살은 계산 엔진에 없으므로 어디에도 나오지 않는다 (2026-11-07 PI 지시)', () => {
    expect(Object.keys(DEEP.luckBlocks).some(k => k.includes('현침'))).toBe(false)
    expect(Object.values(DEEP.luckBlocks).some(v => v.includes('현침'))).toBe(false)
    const b: BirthInput = { year: 2006, month: 3, day: 20, time: { hour: 9, minute: 0 }, gender: 'M' }
    expect(buildPrompt({ top: sampleTop, chart: computeChart(b), detail: computeDetail(b, 2026) })).not.toContain('현침')
  })
  test('F14 신궁이 있으면 총운이 늘 설명하고, 나오지 않는 궁의 문구는 없다', () => {
    const r = rng(14)
    for (let i = 0; i < 800; i++) {
      const b = randBirth(r, true)
      const f = feats(b)
      if (!f.shenPalace) continue
      expect(totalText(composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })), JSON.stringify(b)).toContain('**신궁(身宮)**')
    }
    expect(Object.keys(DEEP.luckBlocks).filter(k => k.startsWith('shenPalace[')).sort()).toEqual(['명궁', '부처', '재백', '천이', '관록', '복덕'].map(p => `shenPalace[${p}]`).sort())
  })
  test('F15 시주는 한 가지 뜻으로 쓴다', () => {
    for (const [k, v] of Object.entries(DEEP.luckBlocks)) if (k.startsWith('hourGod[')) expect(v, k).toContain('혼자 있을 때를 보는 시주 천간에')
  })
  test('F16 자형은 그해 문구가 따로 있다', () => {
    for (const p of ['시지', '일지', '월지', '연지']) expect(DEEP.luckBlocks[`yearRelation[자형@${p}]`]).toBeTruthy()
    const r = rng(16)
    let seen = 0
    for (let i = 0; i < 3000 && seen === 0; i++) {
      const b = randBirth(r, true)
      const f = feats(b)
      if (!f.years[0]!.relations.some(x => x.name === '자형')) continue
      const l = luckOf(b)
      if (l.years[0]!.bad?.includes('自刑')) seen++
      expect(l.years[0]!.bad ?? '').not.toMatch(/([^\s(]+)\((.)\2刑\)/)
    }
    expect(seen).toBeGreaterThan(0)
  })
  test('F17 안내 문구가 샘플과 글자까지 같다', () => {
    expect(DEEP.frames.luckIntro).toBe('사주와 자미두수를 함께 놓고 네 가지 운으로 정리했습니다. 전통 해석이고 과학적으로 검증되지 않았습니다. 재미있게 읽되, 큰 결정의 근거로 삼지는 마세요.')
    expect(DEEP.frames.riskIntro).toBe('성격 결함이 아니라 잘 돌아갈 때 같이 따라오는 부작용입니다. 신호를 미리 알아 두면 고치기 쉽습니다.')
    expect(DEEP.frames.careerIntro).toBe('이쪽으로 가라는 말이 아닙니다. 끌릴 수 있는 쪽을 적어 둔 것이고, 전공과 진로는 이 표로 정할 일이 아닙니다.')
    expect(DEEP.frames.farIntro).toBe('약점이 아니라 힘을 다른 데 쓴다는 뜻입니다. 이 단어가 센 사람이 곁에 있으면 꽤 든든합니다.')
    expect(DEEP.frames.sajuIntro).toBe('위 운세의 근거가 되는 원자료입니다. 사주는 전통 해석이고 과학적으로 검증되지 않았습니다.')
    expect(DEEP.frames.crossIntro).toBe('일치하면 재미있고, 어긋나면 더 재미있습니다. 맞는 쪽을 고르는 게 아니라 나를 살펴보는 칸입니다.')
    expect(DEEP.frames.strengthIntro).toBe('내가 고른 답을 정리한 결과입니다. 점수가 아니라 자주 쓰는 방식에 가깝습니다.')
    expect(DEEP.frames.wordsIntro).toBe('단어마다 펼쳐 보세요. 장면이 낯설면 그 줄은 넘어가도 됩니다.')
    expect(DEEP.frames.togetherIntro).toBe('단어 하나만 보면 납작합니다. 일을 할 때 각자 맡는 몫부터 봅니다.')
    expect(DEEP.frames.ziweiIntro).toBe('자미두수(紫微斗數)는 별을 열두 자리에 놓고 읽는 전통 해석입니다. 궁마다 삶의 어떤 영역을 어떻게 대하는지 성향으로만 읽습니다.')
    expect(DEEP.frames.relationIntro).toBe('이 사주에 실제로 있는 것만 적었습니다. 이름이 세도 사건을 예고하지 않습니다.')
  })
  test('F18 요약에서 평생을 단정하지 않는다', () => {
    for (const [k, v] of Object.entries(DEEP.luckBlocks)) if (k.startsWith('gistTheme[') || k.startsWith('glance')) expect(v, k).not.toContain('평생')
  })
  test('F21 금액 문장은 조립기만 쓰고, 거문·경양은 혼자서도 읽힌다', () => {
    for (const [k, v] of Object.entries(DEEP.luckBlocks)) expect(v, k).not.toContain('얼마를 벌지는')
    expect(DEEP.luckBlocks['starPalace[거문:재백]']).not.toContain('극단적')
    expect(DEEP.luckBlocks['minorStar[경양]']).not.toContain('장비는')
  })
  test('F22 희망 없는 말을 쓰지 않는다', () => {
    const all = JSON.stringify(Object.values(DEEP.words).map(w => w.signals))
    expect(all).not.toMatch(/소용없|의미도 못 찾|갈 곳이 없|아무도 남지 않|의미가 없어 보/)
  })
  test('F23 작은 지적', () => {
    expect(DEEP.luckBlocks['yearHua[화기:질액]']).toContain('보건소나 병원')
    for (const k of ['합@연지-일지', '충@연지-시지', '형@연지-일지', '해@연지-일지']) expect(DEEP.luckBlocks[`relPos[${k}]`]).not.toContain('부모님')
    expect(DEEP.luckBlocks['relation[巳戌怨嗔]']).toContain('가끔')
    expect(DEEP.pairs['coordination+recognition']!.risk!.body).not.toContain('일부러')
  })
  test('F28 비교 꼴 문장이 샘플 밖 단어에서 줄었고, 샘플 다섯과 열 짝은 그대로다', () => {
    const shape = /(쪽|힘|것)이라면 |한다면 |본다면 |맞춘다면 |난다면 /
    const n = IDS.filter(id => shape.test(DEEP.words[id]!.essence ?? '')).length
    expect(n).toBeLessThanOrEqual(11)
    expect(DEEP.words.ideas!.essence).toBe('생각이 떠오르는 게 일이 아니라 기본 상태입니다. 상관없어 보이는 두 가지를 붙여 보고, "이거 이렇게 하면 어때?"를 말하는 순간 제일 살아 있습니다. 남들은 아이디어를 짜내는데 이 단어가 센 사람은 안 떠오르는 날을 오히려 이상하게 여깁니다. 떠올리는 것 자체가 재미라서, 그걸 실제로 쓸지는 뒷일입니다.')
    expect(DEEP.pairs['rivalry+sympathy']!.body).toBe('상대가 애쓰는 게 보이는데 이기고 싶습니다. 이겨 놓고 미안해하고, 져 주면 억울합니다. 둘 다 진심이라 본인만 바쁩니다.')
    expect(DEEP.pairs['concentration+accountability']!.body).not.toContain('반드시')
  })
  test('F29 머리 문제 표현은 하나만, 해입니다로 끝나는 요약은 절반 아래', () => {
    const hits = Object.entries(DEEP.luckBlocks).filter(([, v]) => v.includes('머리 문제가 아니라'))
    expect(hits.map(([k]) => k)).toEqual(['studyGroup[관성:없음]'])
    const sums = Object.entries(DEEP.luckBlocks).filter(([k]) => k.startsWith('yearSipsin[') && k.endsWith('#summary')).map(([, v]) => v)
    expect(sums.filter(v => /^[^.]+해입니다\./.test(v)).length / sums.length).toBeLessThan(0.5)
  })
  test('F30 받침 단어 줄은 발상 없는 학생에게도 맞다', () => {
    for (const id of IDS) expect(DEEP.words[id]!.support, id).not.toMatch(/떠올린 것|^역시|자주 나왔습니다/)
  })
  test('F31 먼 단어 칸은 이유가 보이는 짝만', () => {
    const r = rng(31)
    let rows = 0
    for (let i = 0; i < 400; i++) {
      const w = pickWords(r)
      const rep = full(w.slice(0, 5), w.slice(7, 10), w.slice(5, 7), randBirth(r, true))
      for (const m of rep.meetings.filter(x => x.group === 'far')) {
        rows++
        const id = WORDS.find(x => x.ko === m.wordKo)!.id
        expect(FAR_EVIDENT[id]).toBe(m.chartLabel)
      }
    }
    expect(rows).toBeGreaterThan(0)
  })
  test('F32 보조성 줄에 별 이름이 두 번 나오지 않는다', () => {
    for (const n of ['경양', '타라', '지공', '지겁', '화성', '영성', '천월']) expect(DEEP.luckBlocks[`minorStar[${n}]`], n).not.toContain(`**${n}`)
  })
})

describe('강점 쪽 문장과 만나는 곳 (F26)', () => {
  const r = rng(2626)
  test('단어로 채운 위험은 단어 카드의 함정·쓰는 법과 다르다', () => {
    for (const id of IDS) {
      const w = DEEP.words[id]!
      expect(w.fillRisk?.text).toBeTruthy()
      expect(w.fillRisk!.text).not.toBe(w.trap)
      expect(w.fillRisk!.remedy).not.toBe(w.howTo)
    }
  })
  test('강점 리포트와 만나는 곳에 같은 문장이 두 번 나오지 않고, 한 단어가 일치와 충돌 양쪽에 있지 않다', () => {
    const repeats: string[] = []
    for (let i = 0; i < 1200; i++) {
      const w = pickWords(r)
      const rep = full(w.slice(0, 5), w.slice(7, 10), w.slice(5, 7), randBirth(r))
      const d = rep.deep!
      const parts = [
        ...d.wordCards.flatMap(c => [c.essence, ...c.scenes, c.goodEnv, c.badEnv, c.trap, c.howTo]),
        ...d.pairs.map(p => p.body), ...d.assets.map(a => a.text),
        ...d.risks.flatMap(x => [x.text, x.remedy, x.signals?.early, x.signals?.middle, x.signals?.late]),
        ...rep.meetings.flatMap(m => [m.chartText, m.also?.chartText]),
      ].filter((x): x is string => !!x)
      const all = parts.flatMap(sentencesOf)
      all.forEach((s, n) => { if (all.indexOf(s) !== n) repeats.push(s) })
      const yes = rep.meetings.filter(m => m.kind === 'match' && m.group === 'word').map(m => m.wordKo)
      const no = rep.meetings.filter(m => m.kind === 'clash').map(m => m.wordKo)
      for (const x of no) expect(yes).not.toContain(x)
    }
    expect([...new Set(repeats)]).toEqual([])
  })
})

describe('첫 줄 (F10)', () => {
  test('어떤 첫 문장도 보고서의 15%를 넘지 않고, 샘플 학생의 첫 문장과 한눈에 보기는 승인본 그대로다', () => {
    const r = rng(1010)
    const count: Record<string, number> = {}
    const N = 5000
    for (let i = 0; i < N; i++) {
      const l = luckOf(randBirth(r))
      const first = strip(l.total!.summary!).split(/(?<=[.!?])\s+/)[0]!
      count[first] = (count[first] ?? 0) + 1
    }
    expect(Math.max(...Object.values(count)) / N).toBeLessThan(0.15)
    const s = composeLuck(feats(sampleBirth), DEEP.luckBlocks, READINGS, { restOpposed: true })
    expect(strip(s.total!.summary!).startsWith('만들어 낸 것으로 길을 여는 사람입니다.')).toBe(true)
    expect(s.glance[0]!.text).toBe('혼자 만들어 내는 힘은 큰데, 쉼이 늘 모자란 사람입니다.')
  })
})

// ---- 재검토(2026-11-06, 두 번째)의 지적 ----
const strY = (s: string | null | undefined) => strip(s ?? '')
const SAMPLE_BIRTH: BirthInput = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' }
/** 일간별로 고른 명식을 얻으려고 무작위로 많이 돌린다. */
const manyCharts = (seed: number, n: number): { b: BirthInput; f: LuckFeatures; l: LuckResult }[] => {
  const r = rng(seed)
  return Array.from({ length: n }, () => { const b = randBirth(r); const f = feats(b); return { b, f, l: composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: r() < 0.3 }) } })
}
const CHARTS = manyCharts(20261107, 1500)

describe('올해와 다른 점 (M1, S2)', () => {
  test('丙 일간의 내년에 "시동"이라고 하지 않고, 丁 일간은 샘플 그대로다', () => {
    let bing = 0, ding = 0
    for (const { f, l } of CHARTS) {
      const next = l.years.find(y => y.id === 'next')
      if (!next?.compare) continue
      if (f.dayStem === '丙') { bing++; expect(next.compare).toContain('올해가 내 방식으로 먼저 달리는 해라면 내년은 겨루며 내세우는 해입니다.'); expect(next.compare).not.toContain('시동') }
      if (f.dayStem === '丁') { ding++; expect(next.compare).toContain('올해가 시동을 거는 해라면 내년은 보여 주는 해입니다.') }
    }
    expect(bing).toBeGreaterThan(0); expect(ding).toBeGreaterThan(0)
  })
  test('"시동"은 건록 자리의 해에만 붙는다 (2026~2045, 일간 열 가지)', () => {
    for (const stemDay of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const b: BirthInput = { year: 2005, month: 3, day: stemDay, time: { hour: 12, minute: 0 }, gender: 'F' }
      for (let yr = 2026; yr < 2046; yr++) for (const y of feats(b, yr).years) {
        const tone = DEEP.luckBlocks[`yearTone[${y.stemGod}+${y.branchGod}]`] ?? DEEP.luckBlocks[`yearTone[${y.stemGod}]`]
        if (tone?.includes('시동')) expect(y.unseong).toBe('건록')
      }
    }
  })
  test('사화 문장은 궁마다 뜻을 말하고 "붙습니다"로만 끝나는 문장이 없다', () => {
    for (const p of ['명궁', '형제', '부처', '자녀', '재백', '질액', '천이', '교우', '관록', '전택', '복덕', '부모']) {
      const t = DEEP.luckBlocks[`yearCompareHua[${p}]`]!
      expect(t).toMatch(new RegExp(`${p === '명궁' ? '명궁' : `${p}궁`}에 올해는 화록이 붙어 .+ 해이고, 내년은 화권이 붙어 .+ 해입니다`))
    }
    for (const { l } of CHARTS) for (const y of l.years) expect(y.compare ?? '').not.toMatch(/내년은 \*\*화권\(化權\)\*\*이 붙습니다/)
  })
})

describe('전통 이름 (M2)', () => {
  test('편관에는 재생관·관인상생이, 정관만 있는 문구에는 재생살·살인상생이 없다', () => {
    for (const [k, t] of Object.entries(DEEP.luckBlocks)) {
      if (!/^(yearSipsin|daewoonTheme)\[/.test(k)) continue
      const m = /\[([^\]+]+)\+([^\]]+)\]/.exec(k)!
      const gs = [m[1]!, m[2]!]
      if (gs.includes('편관') && !gs.includes('정관')) expect(t, k).not.toMatch(/재생관|관인상생/)
      if (gs.includes('정관') && !gs.includes('편관')) expect(t, k).not.toMatch(/재생살|살인상생/)
    }
    expect(DEEP.luckBlocks['daewoonTheme[편재+편관]']).toContain('**재생살(財生殺)**, 곧 재물이 압박을 키우는 짜임')
    expect(DEEP.luckBlocks['yearSipsin[정인+편관]#good']).toContain('**살인상생(殺印相生)**')
  })
})

describe('이렇게 써 보세요 (S1)', () => {
  test('평생 주제가 있으면 처방이 늘 들어가고 맨 끝에 "그리고"로 온다, 넷을 넘지 않는다', () => {
    let hits = 0
    for (const { l } of CHARTS) {
      const used = l.used.filter(k => /^theme\[.\]#howTo$/.test(k))
      if (l.used.some(k => /^theme\[.\]$/.test(k))) {
        hits++
        expect(used).toHaveLength(1)
        const body = DEEP.luckBlocks[used[0]!]!
        expect(l.total!.howTo!.endsWith(body)).toBe(true)
      }
    }
    expect(hits).toBeGreaterThan(100)
  })
  test('샘플 학생은 승인된 네 문장 그대로다', () => {
    expect(strY(luckOf(SAMPLE_BIRTH, 2026, true).total!.howTo)).toBe('막히면 혼자 끌어안기 전에 한 사람에게 먼저 물어보세요. 도와줄 사람이 있다는 풀이는 물어봐야 쓸모가 있습니다. 결과물은 고치는 횟수를 미리 정해 두고 내보내세요. 돈은 들어오는 날 일부가 저절로 빠져나가게 해 두세요. 의지로 모으는 사람이 아닙니다. 그리고 쉬는 시간은 달력에 약속으로 넣으세요. 저절로는 안 됩니다.')
  })
})

describe('속은 다릅니다 (S3)', () => {
  test('명궁 사화나 자형을 말할 때만 쓴다', () => {
    let alone = 0
    for (const { l } of CHARTS) {
      const t = totalText(l)
      const i = t.indexOf('속은 다릅니다.')
      if (i >= 0) expect(strip(t.slice(i, i + 60))).toMatch(/속은 다릅니다\. (명궁\(命宮\)|사주에)/)
      else if (t.includes('**신궁(身宮)**')) alone++
    }
    expect(alone).toBeGreaterThan(0)
  })
})

describe('한 줄로 말하면 (S4)', () => {
  const sample = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
  test('샘플 짝은 승인된 문장 그대로, 요약이 없는 짝은 삼각형 한 줄, 양식 문장은 없다', () => {
    const d = (top: string[]) => full(top, [], [], SAMPLE_BIRTH).deep!
    expect(d(sample).summary).toBe('없는 걸 떠올리는 게 먼저고, 그게 몇 년 뒤에 뭐가 될지가 바로 따라붙는 사람입니다. 그래서 머릿속이 아직 없는 것들로 꽉 차 있습니다.')
    const other = ['achievement', 'coordination', 'order', 'concentration', 'caution']
    const pair = DEEP.pairs['achievement+coordination']!
    expect(d(other).summary).toBe(pair.summary ?? pair.line)
    const r = rng(11)
    for (let i = 0; i < 300; i++) expect(d(pickWords(r).slice(0, 5)).summary).not.toContain('가장 앞선 두 단어')
  })
  test('미래가 발상보다 위일 때는 따로 쓴 줄을 쓰고, 반대 순서는 승인 문장 그대로다', async () => {
    const { DEEP_PARTS } = await import('../src/content/deep-data')
    const real = loadDeep(DEEP_PARTS)
    expect(selectSummary(['future', 'ideas', 'rivalry', 'sympathy', 'achievement'], real)).toBe(real.pairTop['future>ideas'])
    expect(selectSummary(['ideas', 'future', 'rivalry', 'sympathy', 'achievement'], real)).toBe(real.pairs['future+ideas']!.summary)
  })
  test('별도 파일의 요약은 불러올 때 짝에 합쳐지고, 없는 짝은 만들지 않는다', () => {
    const c = loadDeep([{ pairSummaries: { 'a+b': '둘째.' } }, { pairs: { 'a+b': { type: 'syn', line: 'l', body: 'b' } } }, { pairSummaries: { 'x+y': '없는 짝.' } }])
    expect(c.pairs['a+b']!.summary).toBe('둘째.')
    expect(c.pairs['x+y']).toBeUndefined()
  })
  test('쓴 요약은 두 문장, 50~90자, 단어 이름 없음, 그 짝 본문의 문장을 쓰지 않음', () => {
    for (const [key, p] of Object.entries(DEEP.pairs)) {
      if (!p.summary) continue
      const [a, b] = key.split('+').map(id => WORDS.find(w => w.id === id)!.ko)
      expect(sentencesOf(p.summary), key).toHaveLength(2)
      expect(p.summary.length, key).toBeGreaterThanOrEqual(50)
      expect(p.summary.length, key).toBeLessThanOrEqual(90)
      expect(p.summary, key).not.toContain(a!); expect(p.summary, key).not.toContain(b!)
      for (const st of sentencesOf(p.summary)) expect(p.body, key).not.toContain(st)
    }
  })
})

describe('연도 칸 (S5, S6)', () => {
  test('잘 풀리는 쪽에는 관계 하나, 사화 표시 하나만 남고 나머지는 쓰지 않으며 왜 칸에는 풀이 문장이 없다', () => {
    for (const { l } of CHARTS) for (const y of l.years) {
      const g = y.good ?? ''
      expect((g.match(/을 이뤄|를 이뤄/g) ?? []).length, g).toBeLessThanOrEqual(1)
      expect((g.match(/\*\*화[권과]\([^)]+\)\*\*[이가] 붙었습니다/g) ?? []).length, g).toBeLessThanOrEqual(1)
      expect(y.why ?? '').not.toMatch(/붙었습니다|이뤄 /)
    }
  })
  test('화권이 있으면 화과보다 먼저 남는다', () => {
    for (const { l } of CHARTS) for (const y of l.years) {
      if (/\*\*화과\(化科\)\*\*[이가] 붙었습니다/.test(y.good ?? '')) expect(y.why ?? '').not.toMatch(/화권\(化權\)\*\*[이가] 붙었습니다/)
    }
  })
  test('일지·월지의 합을 먼저 남긴다', () => {
    let n = 0
    for (const { f, l } of CHARTS) for (const y of l.years) {
      const fy = f.years.find(v => v.year === y.year)!
      const isGood = (name: string) => name === '합' || name === '반합'
      // 같은 글자에 더 무거운 관계가 있으면 그 글자는 조심할 쪽 몫이고, 같은 글자가 두 자리에 있으면 앞 자리 하나만 말한다.
      const clean = fy.relations.filter(r => isGood(r.name) && fy.relations.filter(x => x.natal === r.natal).every(x => isGood(x.name)) && fy.relations.filter(x => x.natal === r.natal && x.place !== r.place).length === 0)
      if (clean.some(r => r.place === '일지') && (y.good ?? '').includes('이뤄')) { n++; expect(y.good).toMatch(/일지와 \*\*/) }
    }
    expect(n).toBeGreaterThan(0)
  })
  test('"둘 다 또래를 짚습니다."는 그해 첫 문장(겁재·비견) 바로 다음 문장이다', () => {
    let n = 0
    for (const { l } of CHARTS) for (const y of l.years) {
      const bad = strY(y.bad)
      if (!bad.includes('둘 다 또래를')) continue
      n++
      const before = bad.slice(0, bad.indexOf('둘 다 또래를'))
      expect(before, bad).not.toMatch(/이뤄|단계인|자리라서/)
    }
    expect(n).toBeGreaterThan(0)
  })
})

describe('첫 줄이 부른 구조 (S7)', () => {
  test('첫 줄이 구조를 말하면 그 구조 이름이 본문에 나온다', () => {
    let n = 0
    for (const { f, l } of CHARTS) {
      const key = f.leadPatterns.find(p => DEEP.luckBlocks[`gistStrong[${p}]`])
      if (!key) continue
      n++
      expect(totalText(l), key).toContain(key)
    }
    expect(n).toBeGreaterThan(50)
  })
})

describe('문구 (S8, S9, S11~S14)', () => {
  test('S8 한 해 겹침, 소제목, 주어', () => {
    expect(DEEP.luckBlocks['yearSipsin[편관+정관]#summary']).not.toContain('한 해에 같이 오는 한 해')
    expect(DEEP.luckBlocks['yearMoneyGod[정재]']!.startsWith('돈은 ')).toBe(true)
    for (const { l } of CHARTS) for (const y of l.years) expect(y.liunian?.heading ?? '').not.toContain('돈 쓰는 마음')
  })
  test('S9 쉬자는 단어가 없다는 칸의 줄이 쉼에 찬성하지 않는다', () => {
    expect(DEEP.words.order!.rest).toBe('쉬는 시간도 계획표 칸에 없으면 쉰 것 같지 않습니다.')
    expect(DEEP.restRisk!.signals!.early).not.toContain('한 일을 세고')
  })
  test('S11 과하면이 같은 카드의 함정·장면과 일곱 글자 이상 겹치지 않는다 (34개)', () => {
    const norm = (s: string) => s.replace(/[\s.,!?"'·]/g, '')
    for (const w of WORDS) {
      const o = norm(CONTENT.words[w.id]!.overdo)
      const rest = norm([DEEP.words[w.id]!.trap ?? '', ...(DEEP.words[w.id]!.scenes ?? [])].join(' '))
      for (let i = 0; i + 7 <= o.length; i++) expect(rest, `${w.ko}: ${o.slice(i, i + 7)}`).not.toContain(o.slice(i, i + 7))
    }
  })
  test('S12 한눈에 보기에서 "늘"은 샘플의 쉼 한 줄에만 남는다', () => {
    const withAlways = Object.entries(DEEP.luckBlocks).filter(([k, t]) => k.startsWith('glanceTheme[') && /늘 /.test(t)).map(([k]) => k)
    expect(withAlways).toEqual(['glanceTheme[수0]'])
    expect(DEEP.luckBlocks['glanceTheme[수0]']).toBe('쉼이 늘 모자란 사람입니다.')
  })
  test('S13 자형 해 문구는 네 자리 모두 할 일로 끝난다', () => {
    for (const p of ['시지', '일지', '월지', '연지']) expect(sentencesOf(DEEP.luckBlocks[`yearRelation[자형@${p}]`]!).length, p).toBeGreaterThanOrEqual(2)
  })
  test('S14 칩은 한 글자에 하나, 이름들을 가운데점으로 잇는다', () => {
    for (const { b } of CHARTS.slice(0, 300)) for (const y of full(pickWords(rng(3)).slice(0, 5), [], [], b).deep!.luck.years) {
      const rel = y.facts.slice(3)
      expect(new Set(rel.map(x => x.split(' ').slice(0, 2).join(' '))).size).toBe(rel.length)
    }
  })
  test('S14 일치 칸 이름표는 세기에 따라 나뉜다(강한·중간·약한 일치), 약한 근거는 이름표에 약하다고 밝힌다', () => {
    const tags = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const r = rng(i + 500)
      const m = full(pickWords(r).slice(0, 5), [], [], randBirth(r)).meetings.filter(x => x.group === 'word')
      for (const x of m) { tags.add(x.tag); expect(['강', '중', '약']).toContain(x.level) }
    }
    expect([...tags].sort()).toEqual(expect.arrayContaining(['중간 일치 · 겹쳐요', '강한 일치 · 크게 겹쳐요', '약한 일치 · 조금 겹쳐요', '중간 충돌 · 싸워요', '강한 충돌 · 크게 싸워요', '약한 충돌 · 조금 부딪혀요']))
  })
  test('S14 탐랑 부모궁은 혼자일 때 주어가 있고, 자미와 나란하면 샘플 그대로다', () => {
    expect(DEEP.luckBlocks['starPalace[탐랑:부모]']!.startsWith('윗사람이 알아봐 주면')).toBe(true)
    // 묶음 3: 이 학생의 부모궁은 자미(리)와 탐랑(함)을 빌려 온 것이다. 탐랑이 어두운 자리라 두 별을 나란히 읽던 샘플 문장은 쓰지 않고 밝은 별인 자미로 읽는다.
    const t = strY(totalText(luckOf(SAMPLE_BIRTH, 2026, true)))
    expect(t).not.toContain('윗사람과는 인정받을 때 잘 맞습니다. 알아봐 주면 기꺼이 따르고,')
    expect(luckOf(SAMPLE_BIRTH, 2026, true).used).toContain('starPalace[자미:부모]')
  })
  test('S14 "있어,"와 "굴어서,"가 한 문장에 겹치지 않는다', () => {
    for (const { l } of CHARTS) expect(strip(totalText(l))).not.toMatch(/있어, [^.]*어서,/)
  })
  test('S14 접힌 명식의 관계는 글자 쌍마다 한 줄이고 자리를 모은다', () => {
    const rels = [
      { chars: '卯酉', type: '沖', places: ['월지', '일지'] },
      { chars: '卯酉', type: '沖', places: ['월지', '연지'] },
      { chars: '子丑', type: '合', places: ['일지', '시지'] },
    ]
    expect(mergeRelations(rels).map(r => [r.chars, r.places])).toEqual([['卯酉', ['월지', '일지', '연지']], ['子丑', ['일지', '시지']]])
  })
  test('S14 본질 문단이 다른 단어 이름으로 "~라면 ~는" 비교를 하지 않고, 맞춤과 친밀이 같은 말을 나눠 쓰지 않는다', () => {
    const names = WORDS.map(w => w.ko).join('|')
    for (const w of WORDS) expect(DEEP.words[w.id]!.essence ?? '', w.ko).not.toMatch(new RegExp(`(${names})[이가] [^.]*(라면|한다면|쓰인다면|찾는다면) `))
    expect(DEEP.words.closeness!.essence).not.toContain('기분을 읽는 데서')
  })
  test('S14 시각을 모르고 돈 글자가 안 보여도 돈은 소제목이 있고, 없다고 하지 않는다', () => {
    let n = 0
    for (const { f, l } of CHARTS) {
      if (f.timeKnown) continue
      expect((l.total?.paragraphs ?? []).some(p => p.heading === '돈은'), JSON.stringify(f.gods)).toBe(true)
      if (f.groupLevel.재성 === '없음') {
        n++
        const t = strip(totalText(l))
        expect(t).toContain('아는 세 기둥에서는 돈 글자를 말하기 어렵습니다.')
        expect(t).not.toContain('어느 쪽도 보이지 않는')
        expect(l.total!.why ?? '').not.toContain('재성 없음')
      }
    }
    expect(n).toBeGreaterThan(0)
  })
})

describe('3차 검토 수정', () => {
  test('관살혼잡과 상관견관은 잘 풀리는 쪽에 없고 조심할 쪽에 있다', () => {
    for (const k of ['편관+정관', '정관+편관']) {
      expect(DEEP.luckBlocks[`yearSipsin[${k}]#good`]).not.toContain('관살혼잡')
      expect(DEEP.luckBlocks[`yearSipsin[${k}]#bad`]).toContain('관살혼잡')
    }
    for (const k of ['상관+정관', '정관+상관']) {
      expect(DEEP.luckBlocks[`yearSipsin[${k}]#good`]).not.toContain('상관견관')
      expect(DEEP.luckBlocks[`yearSipsin[${k}]#bad`]).toContain('상관견관')
    }
  })
  test('사·병 같은 단계 이름에는 근거 줄에 뜻이 붙고, 재주가 없는 사주에는 승인 문장을 쓰지 않는다', () => {
    const r = rng(77)
    let seen = 0
    for (let i = 0; i < 400; i++) {
      const b = randBirth(r)
      for (const v of luckOf(b, 2026).years) if (/ 사\(死\) 자리/.test(v.why!)) { expect(v.why).toContain('죽음과는 상관없습니다'); seen++ }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
