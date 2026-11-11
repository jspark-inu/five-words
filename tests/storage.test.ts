import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { clearResult, clearRun, loadRun, saveRun, RUN_KEY, KEYS, OLD_KEYS, loadBirth, loadResult, saveResult, type SavedResult } from '../src/storage'

const birth = { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' as const }
const top = ['order', 'concentration', 'repair', 'caution', 'fairness']
const word: SavedResult = { top, far: ['ideas', 'future', 'collecting'], birth }
const oldFive: SavedResult = { top, far: ['ideas', 'future', 'collecting', 'learning', 'strategy'], birth }

function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: k => m.get(k) ?? null,
    key: i => [...m.keys()][i] ?? null,
    removeItem: k => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

beforeEach(() => { vi.stubGlobal('localStorage', fakeStorage()) })
afterEach(() => { vi.unstubAllGlobals() })

test('저장한 결과를 그대로 다시 읽는다', () => {
  saveResult(word)
  expect(loadResult()).toEqual(word)
  expect(loadBirth()).toEqual(birth)
})

test('저장한 것이 없으면 null', () => {
  expect(loadResult()).toBeNull()
  expect(loadBirth()).toBeNull()
})

test('다시 저장하면 이전 결과를 덮어쓴다', () => {
  saveResult(word)
  saveResult({ ...word, top: ['learning', 'ideas', 'future', 'background', 'strategy'] })
  expect(loadResult()?.top[0]).toBe('learning')
})

test('결과를 지우면 생년월일시도 함께 지워진다', () => {
  saveResult(word)
  clearResult()
  expect(loadResult()).toBeNull()
  expect(loadBirth()).toBeNull()
  expect(localStorage.length).toBe(0)
})

test('깨진 JSON이나 모양이 다른 값은 null', () => {
  saveResult(word)
  localStorage.setItem(KEYS.word, '{oops')
  expect(loadResult()).toBeNull()
  localStorage.setItem(KEYS.word, JSON.stringify({ top: ['a'], far: word.far }))
  expect(loadResult()).toBeNull()
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: word.far }))
  localStorage.setItem(KEYS.birth, JSON.stringify({ year: 'x' }))
  expect(loadResult()).toBeNull()
})

test('localStorage 접근이 실패해도 오류 없이 넘어간다', () => {
  vi.stubGlobal('localStorage', new Proxy({}, { get() { throw new Error('blocked') } }))
  expect(() => saveResult(word)).not.toThrow()
  expect(loadResult()).toBeNull()
  expect(() => clearResult()).not.toThrow()
})

test('lowSignal은 선택 값이다: 없음, true, false는 읽히고 다른 형은 버린다', () => {
  saveResult(word)
  expect(loadResult()?.lowSignal).toBeUndefined()
  saveResult({ ...word, lowSignal: true })
  expect(loadResult()?.lowSignal).toBe(true)
  saveResult({ ...word, lowSignal: false })
  expect(loadResult()?.lowSignal).toBe(false)
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: word.far, lowSignal: 'x' }))
  expect(loadResult()).toBeNull()
})

test('결과: far 3개, support 2개, 영역 메모를 저장하고 읽는다. 예전 far 5개 값도 읽힌다', () => {
  const r4: SavedResult = { top, birth, far: ['ideas', 'future', 'collecting'], support: ['strategy', 'learning'], contexts: [{ a: 'conviction', b: 'interconnection', usual: 'same', people: null }] }
  saveResult(r4)
  expect(loadResult()).toEqual(r4)
  saveResult(oldFive)
  expect(loadResult()?.far).toHaveLength(5)
  // 마지막 확인에서 후보가 적으면 다음 단어가 0~2개일 수 있다
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: ['ideas', 'future', 'collecting'], support: ['strategy'] }))
  expect(loadResult()?.support).toEqual(['strategy'])
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: ['ideas', 'future', 'collecting'], support: [] }))
  expect(loadResult()?.support).toEqual([])
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: ['ideas', 'future', 'collecting'], support: ['strategy', 'learning', 'analysis'] }))
  expect(loadResult()).toBeNull() // 3개 이상은 없다
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: ['ideas', 'future', 'collecting'], contexts: [{ a: 1 }] }))
  expect(loadResult()).toBeNull()
  localStorage.setItem(KEYS.word, JSON.stringify({ top, far: ['ideas', 'future'] }))
  expect(loadResult()).toBeNull()
})

test('문장 방식 때 저장된 값(문장 결과, 마지막 탭, 예전 결과, 예전 진행 상태)은 오류 없이 무시되고 조용히 지워진다', () => {
  localStorage.setItem('five-words:sentence:v2', JSON.stringify({ top, lowSignal: true }))
  localStorage.setItem('five-words:tab:v1', 'sentence')
  localStorage.setItem('five-words:result:v1', JSON.stringify({ top, birth }))
  localStorage.setItem('five-words:wordrun:v1', JSON.stringify({ stage: 'funnel', order: [], picked: [], far: [], answers: [] }))
  localStorage.setItem(KEYS.birth, JSON.stringify(birth))
  expect(() => loadResult()).not.toThrow()
  expect(loadResult()).toBeNull() // 문장 결과는 단어 결과로 읽히지 않는다 → 시작 화면
  expect(loadRun()).toBeNull()
  for (const k of OLD_KEYS) expect(localStorage.getItem(k), k).toBeNull()
  expect(loadBirth()).toEqual(birth) // 생년월일시는 그대로
})

test('진행 중 상태는 v4 키에 담기고, 답 형식이 달랐던 예전 v3 키는 오류 없이 조용히 지워진다', () => {
  expect(RUN_KEY).toBe('five-words:wordrun:v4')
  const old = { stage: 'funnel', order: [], picked: [], far: [], answers: ['a', 'A'] }
  localStorage.setItem('five-words:wordrun:v3', JSON.stringify(old))
  expect(() => loadRun()).not.toThrow()
  expect(loadRun()).toBeNull() // 예전 진행 상태는 이어지지 않는다
  expect(localStorage.getItem('five-words:wordrun:v3')).toBeNull()
  expect(OLD_KEYS).toContain('five-words:wordrun:v3')
})

test('진행 중 상태(Run)는 단어 id와 답변만 담고, 모양이 틀리면 버린다', () => {
  expect(loadRun()).toBeNull()
  const run = { stage: 'final' as const, order: ['order', 'repair'], picked: ['order'], far: ['repair'], answers: ['a', 'both', 'B'], final: ['order'] }
  saveRun(run)
  expect(loadRun()).toEqual(run)
  expect(Object.keys(JSON.parse(localStorage.getItem(RUN_KEY)!)).sort()).toEqual(['answers', 'far', 'final', 'order', 'picked', 'stage'])
  localStorage.setItem(RUN_KEY, JSON.stringify({ ...run, stage: 'x' }))
  expect(loadRun()).toBeNull()
  localStorage.setItem(RUN_KEY, JSON.stringify({ ...run, answers: [1] }))
  expect(loadRun()).toBeNull()
  localStorage.setItem(RUN_KEY, '{oops')
  expect(loadRun()).toBeNull()
  saveRun(run)
  clearRun()
  expect(loadRun()).toBeNull()
})

test('지금 단어 목록에 없는 id가 든 저장값(결과·진행 상태)은 없는 것으로 본다', () => {
  localStorage.clear()
  saveResult({ ...word, top: ['order', 'nope-old-id', 'repair', 'caution', 'fairness'] })
  expect(loadResult()).toBeNull()
  localStorage.setItem(RUN_KEY, JSON.stringify({ stage: 'pick', order: ['nope-old-id'], picked: [], far: [], answers: [] }))
  expect(loadRun()).toBeNull()
  localStorage.clear()
})
