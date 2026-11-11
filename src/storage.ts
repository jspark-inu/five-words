import type { BirthInput } from './chart/chart'
import { WORDS } from './content/words'

export type ContextNoteData = { a: string; b: string; usual: string | null; people: string | null }
/**
 * 단어 검사 결과와 생년월일시.
 * lowSignal: 분명하게 확인된 후보가 5개가 안 될 때(근거가 얇을 때) 켠다.
 */
export type SavedResult = { top: string[]; birth: BirthInput; lowSignal?: boolean; far?: string[]; support?: string[]; contexts?: ContextNoteData[] }

export const KEYS = { word: 'five-words:word:v2', birth: 'five-words:birth:v2' } as const
/**
 * 문장 방식이 있던 때 만든 저장값(문장 결과, 마지막에 연 탭, 탭이 생기기 전 결과, 예전 진행 상태, 답 형식이 달랐던 v3). 지금은 쓰지 않는다.
 * 읽지도 않고 오류도 내지 않으며, 저장소를 열 때 조용히 지운다.
 */
export const OLD_KEYS = ['five-words:sentence:v2', 'five-words:tab:v1', 'five-words:result:v1', 'five-words:wordrun:v1', 'five-words:wordrun:v3'] as const

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
// 지금 단어 목록에 없는 id(예: 2026-11-11 이름을 바꾸기 전의 id)가 든 저장값은 없는 것으로 본다. 화면이 깨지지 않게 하려는 것이다.
const KNOWN = new Set(WORDS.map(w => w.id))
const isKnown = (t: unknown) => typeof t === 'string' && KNOWN.has(t)
const isIds = (v: unknown, n: number): v is string[] => Array.isArray(v) && v.length === n && v.every(isKnown)

function isBirth(birth: unknown): birth is BirthInput {
  if (typeof birth !== 'object' || birth === null) return false
  const b = birth as Record<string, unknown>
  if (!isInt(b.year) || !isInt(b.month) || !isInt(b.day)) return false
  if (b.gender !== null && b.gender !== 'M' && b.gender !== 'F') return false
  const t = b.time as { hour?: unknown; minute?: unknown } | null | undefined
  if (t === null) return true
  return typeof t === 'object' && isInt(t.hour) && isInt(t.minute)
}

const isIdOrNull = (v: unknown) => v === null || typeof v === 'string'
function isContext(v: unknown): v is ContextNoteData {
  if (typeof v !== 'object' || v === null) return false
  const c = v as Record<string, unknown>
  return typeof c.a === 'string' && typeof c.b === 'string' && isIdOrNull(c.usual) && isIdOrNull(c.people)
}

type Picks = Omit<SavedResult, 'birth'>

function isPicks(v: unknown): v is Picks {
  if (typeof v !== 'object' || v === null) return false
  const { top, lowSignal, far, support, contexts } = v as { top?: unknown; lowSignal?: unknown; far?: unknown; support?: unknown; contexts?: unknown }
  if (!isIds(top, 5)) return false
  if (lowSignal !== undefined && typeof lowSignal !== 'boolean') return false
  if (!(isIds(far, 3) || isIds(far, 5))) return false // 3개는 4단계 판정, 5개는 4단계 판정 이전의 저장값
  if (support !== undefined && !(Array.isArray(support) && support.length <= 2 && support.every(isKnown))) return false
  if (contexts !== undefined && !(Array.isArray(contexts) && contexts.every(isContext))) return false
  return true
}

const read = (key: string): unknown => {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : null
}

/** 예전 방식의 저장값을 조용히 지운다. 지울 수 없으면 그냥 둔다. */
function dropOldKeys(): void {
  try { for (const k of OLD_KEYS) localStorage.removeItem(k) } catch { /* 지울 것 없음 */ }
}

/** 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 저장하지 않는다. */
export function saveResult(data: SavedResult): void {
  try {
    const { birth, ...picks } = data
    localStorage.setItem(KEYS.word, JSON.stringify(picks))
    localStorage.setItem(KEYS.birth, JSON.stringify(birth))
  } catch { /* 저장 안 함 */ }
}

export function loadBirth(): BirthInput | null {
  try {
    dropOldKeys()
    const b = read(KEYS.birth)
    return isBirth(b) ? b : null
  } catch { return null }
}

export function loadResult(): SavedResult | null {
  try {
    dropOldKeys()
    const picks = read(KEYS.word)
    const birth = read(KEYS.birth)
    return isPicks(picks) && isBirth(birth) ? { ...picks, birth } : null
  } catch { return null }
}

/** 결과를 지우면 생년월일시도 함께 지운다. */
export function clearResult(): void {
  try {
    localStorage.removeItem(KEYS.word)
    localStorage.removeItem(KEYS.birth)
  } catch { /* 지울 것 없음 */ }
}

/** 진행 중 검사 상태. 단어 id와 답변 기호만 담고, 끝내면 지운다. */
export type Run = { stage: 'pick' | 'far' | 'funnel' | 'final'; order: string[]; picked: string[]; far: string[]; answers: string[]; final?: string[] }
export const RUN_KEY = 'five-words:wordrun:v4'

const isStrings = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= max && v.every(t => typeof t === 'string' && t.length <= 20)
const isWordIds = (v: unknown, max: number): v is string[] => isStrings(v, max) && v.every(isKnown)

export function loadRun(): Run | null {
  try {
    dropOldKeys()
    const raw = localStorage.getItem(RUN_KEY)
    if (!raw) return null
    const r = JSON.parse(raw) as Record<string, unknown>
    if (r.stage !== 'pick' && r.stage !== 'far' && r.stage !== 'funnel' && r.stage !== 'final') return null
    if (r.final !== undefined && !isWordIds(r.final, 10)) return null
    if (!isWordIds(r.order, 40) || !isWordIds(r.picked, 40) || !isWordIds(r.far, 40) || !isStrings(r.answers, 60)) return null
    return { stage: r.stage, order: r.order, picked: r.picked, far: r.far, answers: r.answers, ...(r.final ? { final: r.final } : {}) }
  } catch { return null }
}

export function saveRun(run: Run): void {
  try { localStorage.setItem(RUN_KEY, JSON.stringify(run)) } catch { /* 이어하기 안 됨 */ }
}

export function clearRun(): void {
  try { localStorage.removeItem(RUN_KEY) } catch { /* 지울 것 없음 */ }
}
