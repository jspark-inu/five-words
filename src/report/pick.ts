// 다섯 단어(와 받침·먼 단어)에서 핵심 자산, 구조적 위험, 삼각형, 먼 단어 줄을 자동으로 고르는 규칙.
// 같은 입력은 늘 같은 결과다. 난수와 시계를 쓰지 않는다.
import { type DeepContent, type PairCopy, pairKey } from '../content/deep'
import { WORDS } from '../content/words'
import { DRIVING_WORDS, PEOPLE_LABEL, REST_FAR_NOTE } from '../content/assemble-copy'
import type { Content } from '../content/types'

export type AssetView = { id: string; title: string; text: string; words: string[] }
/** wordId가 null이면 단어가 아니라 위험 자체의 신호(쉼)다. */
export type SignalsView = { id: string; wordId: string | null; wordKo: string | null; early: string; middle: string; late: string }
export type RestView = { lines: { ko: string; text: string }[]; allow: { ko: string; text: string }[]; farNote: string | null }
export type RiskView = {
  id: string; kind: 'rest' | 'pair' | 'word'
  title: string; text: string; remedy: string
  /** 위험과 어긋나지 않는 신호가 없으면 null이고 신호 칸을 그리지 않는다. */
  signals: SignalsView | null
  /** 쉼 위험일 때만: 단어별 쉼 반응 표와 쉼 편을 드는 단어. */
  rest: RestView | null
  words: string[]
}
export type TriangleView = {
  words: [string, string, string]
  edges: { label: '가' | '나' | '다'; type: 'syn' | 'ten'; text: string; aKo: string; bKo: string; id: string }[]
}
export type FarView = {
  ko: string; line: string
  people: { kind: 'good' | 'careful'; label: string; fromKo: string; text: string; id: string } | null
}

const nz = (s: string | undefined | null): string | null => (s && s.trim() !== '' ? s : null)
const wordOf = (id: string) => {
  const w = WORDS.find(x => x.id === id)
  if (!w) throw new Error(`없는 단어: ${id}`)
  return w
}

type PairRef = { a: string; b: string; i: number; j: number; key: string; cost: number; copy: PairCopy | undefined }

/** 다섯 단어의 열 쌍을 순위가 앞선 쌍부터(i+j가 작은 순, 같으면 i가 작은 순) 늘어놓는다. */
export function rankedPairs(top: string[], copy: DeepContent): PairRef[] {
  const out: PairRef[] = []
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const a = top[i]!, b = top[j]!
      const key = pairKey(a, b)
      out.push({ a, b, i, j, key, cost: (i + j) * 10 + i, copy: copy.pairs[key] })
    }
  }
  return out.sort((x, y) => x.cost - y.cost)
}

/**
 * 짝 후보 중 k개 이하를 고르고, 모자란 만큼은 단어 단위 후보로 채운다.
 * 기준은 차례로 (1) 서로 다른 단어를 가장 많이 덮기, (2) 짝 문구를 더 많이 쓰기, (3) 순위가 앞선 짝.
 */
function pickSet(cands: PairRef[], k: number, fill: string[]): { pairs: PairRef[]; fillWords: string[] } {
  let best: { pairs: PairRef[]; fillWords: string[]; score: [number, number, number] } | null = null
  const consider = (chosen: PairRef[]) => {
    const covered = new Set(chosen.flatMap(p => [p.a, p.b]))
    const need = k - chosen.length
    const fresh = fill.filter(w => !covered.has(w))
    const fillWords = [...fresh, ...fill.filter(w => covered.has(w))].slice(0, need)
    const union = new Set([...covered, ...fillWords])
    const score: [number, number, number] = [union.size, chosen.length, -chosen.reduce((s, p) => s + p.cost, 0)]
    if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && (score[1] > best.score[1] || (score[1] === best.score[1] && score[2] > best.score[2])))) {
      best = { pairs: chosen, fillWords, score }
    }
  }
  const walk = (start: number, chosen: PairRef[]) => {
    consider(chosen)
    if (chosen.length === k) return
    for (let x = start; x < cands.length; x++) walk(x + 1, [...chosen, cands[x]!])
  }
  walk(0, [])
  const b = best as { pairs: PairRef[]; fillWords: string[] } | null
  return b ? { pairs: b.pairs, fillWords: b.fillWords } : { pairs: [], fillWords: [] }
}

export function selectAssets(top: string[], copy: DeepContent): AssetView[] {
  const cands = rankedPairs(top, copy).filter(p => p.copy?.type === 'syn' && nz(p.copy.asset?.title) && nz(p.copy.asset?.body))
  const fill = top.filter(id => nz(copy.words[id]?.asset?.title) && nz(copy.words[id]?.asset?.body))
  const { pairs, fillWords } = pickSet(cands, 3, fill)
  return [
    ...pairs.map(p => ({ id: `asset:pair:${p.key}`, title: p.copy!.asset!.title, text: p.copy!.asset!.body, words: [p.a, p.b] })),
    ...fillWords.map(id => ({ id: `asset:word:${id}`, title: copy.words[id]!.asset!.title, text: copy.words[id]!.asset!.body, words: [id] })),
  ]
}

const sigOf = (copy: DeepContent, id: string): SignalsView | null => {
  const s = copy.words[id]?.signals
  if (!s || !nz(s.early) || !nz(s.middle) || !nz(s.late)) return null
  return { id: `signals:${id}`, wordId: id, wordKo: wordOf(id).ko, early: s.early, middle: s.middle, late: s.late }
}

/** 몰아치는 단어가 몰려 있는가: 다섯 중 셋 이상이거나, 1~3위 안에 둘 이상. */
export function isDrivingCrowd(top: string[]): boolean {
  const d = (id: string | undefined) => !!id && (DRIVING_WORDS as readonly string[]).includes(id)
  return top.filter(d).length >= 3 || top.slice(0, 3).filter(d).length >= 2
}

export function selectRisks(top: string[], far: string[] | null, support: string[] | null, copy: DeepContent): RiskView[] {
  const hasSignals = (id: string) => sigOf(copy, id) !== null
  const rr = copy.restRisk
  // 쉼 위험의 신호: 쉼을 이미 말하는 단어가 다섯 안에 있으면 그 단어의 신호, 아니면 쉼 자체의 신호.
  const restWord = (rr?.signalsFromWord ?? []).find(id => top.includes(id) && hasSignals(id)) ?? null
  const restSignals: SignalsView | null = restWord ? sigOf(copy, restWord) : rr?.signals ? { id: 'signals:rest', wordId: null, wordKo: null, ...rr.signals } : null
  // 쉼 위험: 쉬는 중에도 일 쪽으로 끌려가는 단어(DRIVING_WORDS)가 다섯 중 셋 이상이고, 앞쪽 세 단어에 쉼을 막지 않는 단어(restAllow)가 없을 때.
  // 하나라도 쉼 편 단어가 앞쪽에 있으면 구조가 쉼을 받쳐 주므로 켜지 않는다.
  const restOk = isDrivingCrowd(top) && !top.slice(0, 3).some(id => nz(copy.words[id]?.restAllow)) && !!rr && !!nz(rr.intro) && !!nz(rr.remedy) && restSignals !== null
  const k = restOk ? 2 : 3

  const cands = rankedPairs(top, copy).filter(p => p.copy?.type === 'ten' && nz(p.copy.risk?.title) && nz(p.copy.risk?.body) && nz(p.copy.risk?.remedy))
  const fill = top.filter(id => nz(copy.words[id]?.fillRisk?.text) && nz(copy.words[id]?.fillRisk?.remedy) && hasSignals(id))
  const { pairs, fillWords } = pickSet(cands, k, fill)

  type Slot = { kind: RiskView['kind']; pair?: PairRef; word?: string; options: (string | null)[] }
  const slots: Slot[] = []
  for (const p of pairs) {
    const bad = copy.signalConflicts[p.key] ?? []
    slots.push({ kind: 'pair', pair: p, options: [...[p.a, p.b].filter(w => hasSignals(w) && !bad.includes(w)), null] })
  }
  for (const w of fillWords) slots.push({ kind: 'word', word: w, options: [w, null] })

  // 위험마다 신호 단어를 서로 다르게 배정한다. 앞 칸이 선호하는 단어를 먼저 시도하고, 막히면 뒤로 물러난다. 맞는 신호가 없는 칸은 비운다.
  const used = new Set<string>(restOk && restWord ? [restWord] : [])
  const chosen: (string | null)[] = []
  const assign = (n: number): boolean => {
    if (n === slots.length) return true
    for (const w of slots[n]!.options) {
      if (w !== null && used.has(w)) continue
      if (w !== null) used.add(w)
      chosen[n] = w
      if (assign(n + 1)) return true
      if (w !== null) used.delete(w)
    }
    return false
  }
  assign(0)

  const restLines = top.flatMap(id => (nz(copy.words[id]?.rest) ? [{ ko: wordOf(id).ko, text: copy.words[id]!.rest as string }] : []))
  const sideIds = [...(far ?? []), ...(support ?? [])]
  const allowIds = sideIds.filter((id, i) => sideIds.indexOf(id) === i && nz(copy.words[id]?.restAllow))
  const farNote = allowIds.some(id => (far ?? []).includes(id)) ? REST_FAR_NOTE : null
  const allow = allowIds.map(id => ({ ko: wordOf(id).ko, text: copy.words[id]!.restAllow as string }))

  const out: RiskView[] = []
  if (restOk) out.push({ id: 'risk:rest', kind: 'rest', title: '쉬지 않고 몰아치는 단어가 몰려 있습니다', text: rr!.intro, remedy: rr!.remedy as string, signals: restSignals, rest: { lines: restLines, allow, farNote }, words: top })
  slots.forEach((s, n) => {
    const w = chosen[n]
    const signals = w ? sigOf(copy, w) : null
    if (s.kind === 'pair') {
      const r = s.pair!.copy!.risk!
      out.push({ id: `risk:pair:${s.pair!.key}`, kind: 'pair', title: r.title, text: r.body, remedy: r.remedy, signals, rest: null, words: [s.pair!.a, s.pair!.b] })
    } else {
      const id = s.word!
      const fr = copy.words[id]!.fillRisk!
      out.push({ id: `risk:word:${id}`, kind: 'word', title: `${wordOf(id).ko} 쪽이 지나칠 때`, text: fr.text, remedy: fr.remedy, signals, rest: null, words: [id] })
    }
  })
  return out
}

/** 위의 세 단어를 잇는 삼각형. 세 변 중 하나라도 한 줄이 없으면 통째로 없다. */
export function selectTriangle(top: string[], copy: DeepContent): TriangleView | null {
  if (top.length < 3) return null
  const [a, b, c] = [top[0]!, top[1]!, top[2]!]
  const defs: { label: '가' | '나' | '다'; x: string; y: string }[] = [{ label: '가', x: a, y: b }, { label: '나', x: b, y: c }, { label: '다', x: a, y: c }]
  const edges: TriangleView['edges'] = []
  for (const d of defs) {
    const p = copy.pairs[pairKey(d.x, d.y)]
    if (!p || (p.type !== 'syn' && p.type !== 'ten') || !nz(p.line)) return null
    edges.push({ label: d.label, type: p.type, text: p.line, aKo: wordOf(d.x).ko, bKo: wordOf(d.y).ko, id: `edge:${pairKey(d.x, d.y)}` })
  }
  return { words: [wordOf(a).ko, wordOf(b).ko, wordOf(c).ko], edges }
}

/** 문구가 "단어" 단어 꼴로 가리키는 단어들. */
const quotedWords = (text: string): string[] => [...text.matchAll(/"([^"]+)" 단어/g)].map(m => m[1] as string)

/** 먼 단어마다 "이 단어가 강한 사람" 줄을 내 단어의 잘 맞는/조심할 줄에서 찾는다. 내 다섯 단어를 가리키는 줄은 쓰지 않는다. */
export function selectFar(top: string[], far: string[] | null, content: Content): FarView[] | null {
  if (!far) return null
  const mine = new Set(top.map(id => wordOf(id).ko))
  return far.map(id => {
    const w = wordOf(id)
    let people: FarView['people'] = null
    for (const tid of top) {
      const c = content.words[tid]
      if (!c) continue
      for (const kind of ['good', 'careful'] as const) {
        const line = kind === 'good' ? c.goodWith : c.carefulWith
        const named = quotedWords(line)
        if (named.includes(w.ko) && !named.some(k => mine.has(k))) { people = { kind, label: PEOPLE_LABEL[kind], fromKo: wordOf(tid).ko, text: line, id: `people:${tid}:${kind}` }; break }
      }
      if (people) break
    }
    const line = content.farLines[id]
    if (!line) throw new Error(`풀이 문구가 없음 (먼 단어): ${id}`)
    return { ko: w.ko, line, people }
  })
}

/** 한 줄로 말하면: 첫 두 단어의 짝 요약이 있으면 그것을, 아직 없으면 그 짝의 삼각형 한 줄을. 어느 쪽도 없으면 칸을 그리지 않는다. */
export function selectSummary(top: string[], copy: DeepContent): string | null {
  if (top.length < 2) return null
  const a = top[0]!, b = top[1]!
  const given = nz(copy.pairTop[`${a}>${b}`])
  if (given) return given
  const pair = copy.pairs[pairKey(a, b)]
  return nz(pair?.summary) ?? nz(pair?.line)
}
