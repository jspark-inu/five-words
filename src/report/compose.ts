import type { ChartFacts, Element, Pillar } from '../chart/chart'
import type { Content, WordCopy } from '../content/types'
import { named as readingOf } from '../content/readings'
import { WORDS } from '../content/words'
import type { ChartDetail } from '../chart/chart'
import type { DeepContent } from '../content/deep'
import { composeDeep, type DeepReport } from './deep'
import { buildPrompt } from './prompt'
import { ELEMENT_CLASH_WORDS, ELEMENT_EXPERIMENT, ELEMENT_ORDER, elementClashNote } from '../content/assemble-copy'
import { hasFinalConsonant } from './josa'
import { pickMeetings, type Meeting, type MeetingItem, type MEntry } from './meetings'

export type { Meeting, MeetingItem }

export type ReportWord = { ko: string; explain: string; overdo: string }
/** 화면에 보일 기둥: 한자(stem·branch)와 그 아래에 둘 한글 읽기. */
export type PillarView = Pillar & { reading: string }
export type Report = {
  words: ReportWord[]
  heard: string[]
  saju: { pillars: PillarView[]; elements: Record<Element, number>; hiddenElements: Record<Element, number>; dayStemText: string; elementTexts: string[]; monthNote: string | null }
  /** paragraphs: 명궁·오행국 설명, (빈 궁이면) 빌려 읽는다는 안내, 주성 하나당 한 문단. */
  ziwei: { mingZhi: string; wuXingJu: string; stars: string[]; borrowed: boolean; paragraphs: string[] } | null
  ziweiNote: string | null
  meetings: Meeting[]
  /** "닫기 전에 세 가지만"의 앞 두 질문(충돌 칸에 쓰이지 않은 단어의 질문). 마지막 고정 질문은 화면이 붙인다. */
  closing: { id: string; wordKo: string; text: string }[]
  manual: string[]
  breakdown: { wordKo: string; early: string; middle: string; late: string; remedy: string }
  partners: { good: string; careful: string }
  experiments: string[]
  /** experiments와 같은 순서의 블록 이름. */
  experimentIds: string[]
  footer: string
  /** 단어 방식에서만: 나와 가장 먼 단어와 그 단어가 먼 사람에 대한 한 줄. 먼 단어가 없으면 null. */
  far: { ko: string; line: string }[] | null
  /** 단어 방식에서만: 다섯 단어 다음으로 가까운 두 단어. */
  support: { ko: string }[] | null
  /** 단어 방식에서만: 영역에 따라 다르게 나오는 단어 한 줄 설명. */
  contexts: string[]
  /** 심층 보고서 조각. 계산 자료(detail)와 문구(copy)를 함께 받았을 때만 있다. */
  deep: DeepReport | null
  /** 엔진이 계산한 원자료(기둥별 십신·12운성, 합충, 신살, 대운, 열두 궁, 올해·내년). deep과 함께 있다. */
  detail: ChartDetail | null
  /** 학생이 자기 AI에 붙여 넣을 글. 이름은 들어 있지 않다. deep과 함께 있다. */
  prompt: string | null
}

export type FunnelExtra = { support: string[]; contexts: { a: string; b: string; usual: string | null; people: string | null }[] }

function need<T>(map: Record<string, T>, key: string, what: string): T {
  const v = map[key]
  if (v === undefined || v === '') throw new Error(`풀이 문구가 없음 (${what}): ${key}`)
  return v
}

type Entry = { ko: string; copy: WordCopy }

/**
 * 오행 문단. 겉에도 지장간에도 없는 오행마다 한 문단씩, 넘치는 오행이 있으면 첫 번째 것을 한 문단 더.
 * 문단이 읽히는 방향과 정면으로 부딪히는 단어가 다섯 안에 있으면(ELEMENT_CLASH_WORDS) 그 문단 뒤에 "단어와 사주가 다르게 말하는 곳"이라는 한 줄을 붙인다.
 */
function elementTexts(chart: ChartFacts, content: Content, timeKnown: boolean, top: string[]): string[] {
  const note = (words: string[] | undefined): string => {
    const id = top.find(x => words?.includes(x))
    const w = id ? WORDS.find(y => y.id === id) : undefined
    return w ? ` ${elementClashNote(w.ko, hasFinalConsonant(w.ko) ? '은' : '는')}` : ''
  }
  // 시각을 모르면 시주가 그 오행을 채울 수 있어서 0개라고 풀지 않는다.
  const out = timeKnown ? chart.missing.map(m => need(content.elementMissing, m, '부족한 오행') + note(ELEMENT_CLASH_WORDS.missing[m])) : []
  const x = chart.excess[0]
  if (x) out.push(need(content.elementExcess, x, '넘치는 오행') + note(ELEMENT_CLASH_WORDS.excess[x]))
  return out
}

/** 문구가 "단어" 단어 꼴로 가리키는 단어들. */
function quotedWords(text: string): string[] {
  return [...text.matchAll(/"([^"]+)" 단어/g)].map(m => m[1] as string)
}

function wordOf(id: string) {
  const w = WORDS.find(x => x.id === id)
  if (!w) throw new Error(`없는 단어: ${id}`)
  return w
}

/** "평소에는 연결, 사람 일 앞에서는 신념"처럼 영역별로 앞서는 단어를 한 줄로. 비슷하다고 답한 쪽은 두 단어를 함께 적는다. */
function contextLine(c: { a: string; b: string; usual: string | null; people: string | null }): string {
  const both = `${wordOf(c.a).ko}·${wordOf(c.b).ko} 둘 다`
  const name = (v: string | null) => (v === null || v === 'same' ? both : wordOf(v).ko)
  const parts: string[] = []
  if (c.usual !== null) parts.push(`평소에는 ${name(c.usual)}`)
  if (c.people !== null) parts.push(`사람 일 앞에서는 ${name(c.people)}`)
  return parts.join(', ')
}

export type DeepInput = { detail: ChartDetail; copy: DeepContent }

export function composeReport(top: string[], chart: ChartFacts, content: Content, timeKnown: boolean, far?: string[], extra?: FunnelExtra, deepIn?: DeepInput): Report {
  if (top.length !== 5) throw new Error(`단어는 5개여야 합니다: ${top.length}개`)
  const entries: MEntry[] = top.map(id => {
    const word = WORDS.find(w => w.id === id)
    const copy = content.words[id]
    if (!word || !copy) throw new Error(`풀이 문구가 없는 단어: ${id}`)
    return { id, ko: word.ko, copy }
  })
  const words: ReportWord[] = top.map((id, i) => {
    const w = WORDS.find(x => x.id === id)!
    const c = (entries[i] as Entry).copy
    return { ko: w.ko, explain: c.explain, overdo: c.overdo }
  })
  const copies = entries.map(e => e.copy)
  const first = copies[0] as WordCopy

  const name = (hanja: string) => readingOf(content.readings, hanja)
  const z = chart.ziwei
  const ziwei = z
    ? {
        mingZhi: name(z.mingZhi), wuXingJu: name(z.wuXingJu), stars: z.mainStars.map(name), borrowed: z.borrowed,
        paragraphs: [
          content.mingExplain,
          ...(z.borrowed ? [`${content.emptyPalace} ${z.mainStars.length > 0 ? content.borrowedLead : content.emptyBoth}`] : []),
          ...z.mainStars.map(st => need(content.stars, st, '주성')),
        ],
      }
    : null

  // 짝 단어: 문구가 가리키는 단어가 내 다섯 단어 안에 있으면 다음 순위 단어의 문구로 넘어간다. 자기 자신을 가리키는 것은 의도된 표현으로 본다.
  const mine = new Set(entries.map(e => e.ko))
  const partnerFrom = (pick: (c: WordCopy) => string): string => {
    const clean = entries.find(e => quotedWords(pick(e.copy)).every(k => k === e.ko || !mine.has(k)))
    return pick((clean ?? entries[0] as Entry).copy)
  }

  const supportIds = extra && extra.support.length > 0 ? extra.support : null
  const deep = deepIn ? composeDeep({ top, far: far ?? null, support: supportIds, chart, detail: deepIn.detail, copy: deepIn.copy, readings: content.readings, content }) : null
  const met = pickMeetings(entries, chart, content, far, timeKnown, deepIn?.copy)

  // 이번 달 실험: 구조적 위험에 신호가 나온 단어를 먼저, 그다음 순위대로. 겉에도 지장간에도 없는 오행(chart.missing)이 있으면 마지막 칸은 그 오행의 실험.
  const zeroEl = timeKnown ? ELEMENT_ORDER.find(e => chart.missing.includes(e)) : undefined
  const expIds = [...(deep ? deep.risks.flatMap(r => (r.signals?.wordId ? [r.signals.wordId] : r.kind === 'pair' ? r.words.slice(0, 1) : [])) : []), ...top].filter((id, i, arr) => arr.indexOf(id) === i)
  const wordExp = expIds.slice(0, deep && zeroEl ? 2 : 3).map(id => ({ id: `exp:word:${id}`, text: content.words[id]!.experiment }))
  const experiments = deep
    ? [...wordExp, ...(zeroEl ? [{ id: `exp:element:${zeroEl}`, text: ELEMENT_EXPERIMENT[zeroEl] }] : [])]
    : copies.slice(0, 3).map((c, i) => ({ id: `exp:word:${top[i]}`, text: c.experiment }))

  return {
    words,
    heard: copies.map(c => c.heard),
    saju: {
      pillars: chart.pillars.map(p => ({ ...p, reading: `${content.readings[p.stem] ?? p.stem} · ${content.readings[p.branch] ?? p.branch}` })),
      elements: chart.elements,
      // 숨은 글자(지장간 중기·여기)의 개수: 세기 합에서 겉 글자 몫을 빼고 0.5로 나눈 값. 막대는 겉 글자 기준이라 표의 지장간 열과 어긋나 보이지 않게 따로 적는다.
      hiddenElements: Object.fromEntries((Object.keys(chart.elements) as Element[]).map(e => [e, Math.max(0, Math.round((chart.strength.weights[e] - chart.elements[e]) / 0.5))])) as Record<Element, number>,
      dayStemText: need(content.dayStems, chart.dayStem, '일간'),
      elementTexts: elementTexts(chart, content, timeKnown, top),
      monthNote: !timeKnown && chart.monthMayDiffer ? [content.monthBoundary, ...(chart.yearMayDiffer ? [content.yearBoundary] : []), content.boundaryRetry].join(' ') : null,
    },
    ziwei,
    ziweiNote: z ? null : timeKnown ? content.noGender : content.noBirthTime,
    meetings: met.meetings,
    closing: met.closing,
    manual: copies.slice(0, 5).map(c => c.manual),
    breakdown: {
      wordKo: (entries[0] as Entry).ko,
      early: first.breakdown.early,
      middle: first.breakdown.middle,
      late: first.breakdown.late,
      remedy: content.remedy,
    },
    partners: { good: partnerFrom(c => c.goodWith), careful: partnerFrom(c => c.carefulWith) },
    experiments: experiments.map(e => e.text),
    experimentIds: experiments.map(e => e.id),
    footer: content.footer,
    far: far
      ? far.map(id => {
          const w = WORDS.find(x => x.id === id)
          if (!w) throw new Error(`없는 단어: ${id}`)
          return { ko: w.ko, line: need(content.farLines, id, '먼 단어') }
        })
      : null,
    support: extra && extra.support.length > 0 ? extra.support.map(id => { const w = wordOf(id); return { ko: w.ko } }) : null,
    contexts: (extra?.contexts ?? []).map(contextLine),
    deep,
    detail: deepIn?.detail ?? null,
    prompt: deepIn ? buildPrompt({ top, ...(extra && extra.support.length > 0 ? { support: extra.support } : {}), ...(far ? { far } : {}), chart, detail: deepIn.detail }) : null,
  }
}
