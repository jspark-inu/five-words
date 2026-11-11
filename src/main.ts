import './ui/styles.css'
import type { BirthInput } from './chart/chart'
import { clearResult, clearRun, loadBirth, loadResult, loadRun, saveResult, saveRun, type Run, type SavedResult } from './storage'
import { renderBirth } from './ui/birth'
import { el, mount } from './ui/dom'
import { renderIntro } from './ui/intro'
import { renderReport } from './ui/report'
import { renderWordQuiz } from './ui/wordQuiz'

const root = document.getElementById('app')!

type Picks = Omit<SavedResult, 'birth'>

/** 시작 화면: 결과가 있으면 보고서, 하던 검사가 있으면 이어서 할지 처음부터 할지 먼저 묻는다. */
function show() {
  const saved = loadResult()
  const run = loadRun()
  if (saved && !run) showReport(saved)
  else {
    const resume = run ? { onResume: () => startWord(run), onRestart: () => start(), ...(saved ? { onViewResult: () => showReport(saved) } : {}) } : undefined
    mount(root, renderIntro(() => start(), resume))
  }
}

function start() {
  clearRun()
  startWord(null)
}

function startWord(resume: Run | null) {
  renderWordQuiz(root, resume, result => {
    finish({ top: result.top, far: result.far, support: result.support, ...(result.thin ? { lowSignal: true } : {}), ...(result.contexts.length > 0 ? { contexts: result.contexts } : {}) })
  }, saveRun)
}

/** 결과를 저장하는 순간 진행 상태도 지운다. 생년월일 입력 중에 새로고침해도 답이 남아 있게 그때까지 둔다. */
function persist(result: SavedResult, finished = true) {
  saveResult(result)
  if (finished) clearRun()
}

/** 검사를 마친 뒤. 생년월일시가 이미 있고 저장된 결과가 없으면 다시 묻지 않는다. */
function finish(picks: Picks) {
  const birth = loadBirth()
  if (birth && !loadResult()) {
    const result = { ...picks, birth }
    persist(result)
    showReport(result)
  } else {
    showBirth(picks, birth ?? undefined)
  }
}

function showBirth(picks: Picks, current?: BirthInput, canCancel = false) {
  mount(root, renderBirth(birth => {
    const result = { ...picks, birth }
    persist(result, !canCancel)
    showReport(result)
  }, { ...(current ? { initial: current } : {}), ...(canCancel ? { onCancel: () => showReport({ ...picks, birth: current! }) } : {}) }))
}

function showReport(result: SavedResult) {
  try {
    mount(root, renderReport(
      { top: result.top, birth: result.birth, lowSignal: result.lowSignal === true, ...(result.far ? { far: result.far } : {}), ...(result.support ? { extra: { support: result.support, contexts: result.contexts ?? [] } } : {}) },
      {
        onClear: () => {
          clearResult()
          show()
        },
        onRetake: () => start(),
        onRebirth: () => showBirth({ top: result.top, ...(result.lowSignal === undefined ? {} : { lowSignal: result.lowSignal }), ...(result.far ? { far: result.far } : {}), ...(result.support ? { support: result.support } : {}), ...(result.contexts ? { contexts: result.contexts } : {}) }, result.birth, true),
      }))
  } catch (e) {
    console.error(e)
    const retake = el('button', { type: 'button', class: 'btn primary', text: '처음부터 다시 하기' })
    retake.addEventListener('click', () => { clearResult(); show() })
    mount(root, el('main', { class: 'screen wrap' },
      el('h1', { class: 'screen-title', text: '보고서를 만들지 못했어요' }),
      el('p', { class: 'lead', text: '입력한 값으로 계산하는 중에 문제가 생겼어요. 처음부터 다시 해 주세요.' }),
      retake))
  }
}

// 처음 열 때: 저장된 결과가 있으면 보고서, 없으면 시작 화면.
show()
