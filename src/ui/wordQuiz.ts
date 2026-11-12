import { WORDS } from '../content/words'
import { FAR_COUNT, MAX_PICK, MIN_PICK, finalCandidates, finalRequired, nextStep, resultOf, scoresOf, validAnswers, validFinal, type FunnelResult, type FunnelStep } from '../quiz/funnel/engine'
import { shuffledWords } from '../quiz/wordPick'
import type { Word } from '../quiz/types'
import type { Run } from '../storage'
import { el } from './dom'

/** 렌더 직후 이 시간 안의 탭은 앞 화면의 더블탭으로 보고 무시한다. */
export const TAP_GUARD_MS = 200

const WORD = new Map(WORDS.map(w => [w.id, w]))
const known = (ids: string[]) => ids.filter(id => WORD.has(id))

type Pick = { stepText: string; title: string; sub: string; words: Word[]; min: number; max: number; initial: string[]; ordered?: boolean; guard?: boolean; note?: string; tag?: (id: string) => string | null }

/**
 * 판정 화면. 1단계(단어 8~15개 고르기, 먼 단어 3개)는 출발점일 뿐이고, 2단계에서 30개의 "둘 중 어느 쪽이 더 나 같나요?"에 답해 점수를 정한 뒤 마지막 확인으로 끝난다.
 * 시간 제한은 없고, 단계가 바뀌거나 답할 때마다 onSave로 진행 상태를 넘겨 새로고침해도 이어서 할 수 있다.
 */
export function renderWordQuiz(root: HTMLElement, resume: Run | null, onFinish: (result: FunnelResult) => void, onSave: (run: Run) => void): void {
  const run: Run = resume
    ? { stage: resume.stage, order: known(resume.order), picked: known(resume.picked), far: known(resume.far), answers: resume.answers, ...(resume.final ? { final: known(resume.final) } : {}) }
    : { stage: 'pick', order: shuffledWords().map(w => w.id), picked: [], far: [], answers: [] }
  if (run.order.length !== WORDS.length) run.order = shuffledWords().map(w => w.id)
  const ordered = () => run.order.map(id => WORD.get(id)!)
  // 아직 아무것도 고르지 않은 처음 화면은 저장하지 않는다(들어만 와도 "이어서 하기"가 뜨지 않게).
  const save = () => { if (run.stage === 'pick' && run.picked.length === 0 && !resume) return; onSave({ ...run, order: [...run.order], picked: [...run.picked], far: [...run.far], answers: [...run.answers], ...(run.final ? { final: [...run.final] } : {}) }) }
  const mountMain = (...kids: (Node | null)[]) => {
    root.replaceChildren(el('main', { class: run.stage === 'funnel' ? 'screen wrap pick funnel' : 'screen wrap pick' }, ...kids))
    window.scrollTo(0, 0)
  }

  /** 단어 목록에서 min~max개를 고르는 화면. 선택은 누를 때마다 저장된다. */
  const pickScreen = (cfg: Pick, onNext: (picked: string[]) => void, onBack?: (picked: string[]) => void) => {
    const allowed = new Set(cfg.words.map(w => w.id))
    const picked = cfg.initial.filter(id => allowed.has(id))
    const shownAt = performance.now()
    const guarded = () => cfg.guard === true && performance.now() - shownAt < TAP_GUARD_MS
    const count = el('span', { class: 'pickcount', role: 'status' })
    const nudge = el('p', { class: 'nudge', role: 'status' })
    const next = el('button', { type: 'button', class: 'btn primary', text: '다음', disabled: '' })
    const back = onBack ? el('button', { type: 'button', class: 'btn ghost back', text: '이전' }) : null
    const rows = cfg.words.map(w => {
      const badge = el('span', { class: 'badge', 'aria-hidden': 'true' })
      const row = el('button', { type: 'button', class: 'word-row', 'data-id': w.id, 'aria-pressed': 'false' },
        badge,
        el('span', { class: 'word-main' },
          el('span', { class: 'word-head' }, el('span', { class: 'ko', text: w.ko }), cfg.tag?.(w.id) ? el('span', { class: 'word-tag', text: cfg.tag(w.id)! }) : null),
          el('span', { class: 'word-meaning', text: w.gloss }),
          el('span', { class: 'word-detail', text: w.detail })))
      row.addEventListener('click', () => {
        if (guarded()) return // 앞 질문의 더블탭이 이 화면의 단어를 누르지 않게 한다
        const at = picked.indexOf(w.id)
        if (at >= 0) picked.splice(at, 1)
        else if (picked.length < cfg.max) picked.push(w.id)
        else { count.classList.add('full'); setTimeout(() => count.classList.remove('full'), 600); return }
        refresh(true)
      })
      return { w, row, badge }
    })
    const refresh = (changed: boolean) => {
      for (const { w, row, badge } of rows) {
        const on = picked.includes(w.id)
        row.setAttribute('aria-pressed', String(on))
        row.classList.toggle('on', on)
        badge.textContent = on ? (cfg.ordered ? String(picked.indexOf(w.id) + 1) : '✓') : ''
      }
      count.textContent = cfg.min === cfg.max ? `${picked.length} / ${cfg.max}` : `${picked.length}개 (${cfg.min}~${cfg.max}개)`
      nudge.textContent = picked.length < cfg.min ? `${cfg.min - picked.length}개만 더 골라 주세요.` : picked.length >= cfg.max && cfg.min !== cfg.max ? `최대 ${cfg.max}개까지 고를 수 있어요.` : ''
      next.toggleAttribute('disabled', picked.length < cfg.min || picked.length > cfg.max)
      if (changed) { stash(); save() }
    }
    const stash = () => { if (run.stage === 'pick') run.picked = [...picked]; else if (run.stage === 'far') run.far = [...picked]; else run.final = [...picked] }
    next.addEventListener('click', () => { if (guarded()) return; if (picked.length >= cfg.min && picked.length <= cfg.max) onNext([...picked]) })
    back?.addEventListener('click', () => onBack!([...picked]))
    mountMain(
      el('p', { class: 'step-text', text: cfg.stepText }),
      el('h1', { class: 'question', text: cfg.title }),
      el('p', { class: 'sub', text: cfg.sub }),
      cfg.note ? el('p', { class: 'narrowing', role: 'status', text: cfg.note }) : null,
      el('div', { class: 'word-list' }, ...rows.map(r => r.row)),
      el('div', { class: 'pickbar' }, el('div', { class: 'pickinfo' }, count, nudge), el('div', { class: 'acts' }, back, next)))
    refresh(false)
  }

  const pick = () => {
    run.stage = 'pick'; save()
    pickScreen({
      stepText: '1단계 / 2단계 · 단어 고르기',
      title: `나와 닮은 단어를 ${MIN_PICK}~${MAX_PICK}개 고르세요`,
      sub: '되고 싶은 나 말고 실제 나를 고르세요. 안 해도 저절로 나오는 것, 에너지가 향하는 쪽이에요. 정답은 없어요.',
      words: ordered(), min: MIN_PICK, max: MAX_PICK, initial: run.picked,
    }, picked => {
      run.picked = picked
      run.far = run.far.filter(id => !picked.includes(id))
      run.answers = []
      delete run.final // 1단계를 다시 하면 예전 마지막 확인 선택은 버린다
      far()
    })
  }
  const far = () => {
    run.stage = 'far'; save()
    pickScreen({
      stepText: '1단계 / 2단계 · 가장 먼 단어',
      title: `나와 가장 먼 단어 ${FAR_COUNT}개를 고르세요`,
      sub: '약점을 고르는 게 아니에요. 내가 에너지를 잘 쓰지 않는 곳을 고르면 됩니다.',
      words: ordered().filter(w => !run.picked.includes(w.id)), min: FAR_COUNT, max: FAR_COUNT, initial: run.far,
    }, picked => { run.far = picked; run.answers = []; delete run.final; funnel() },
    picked => { run.far = picked; pick() })
  }

  const funnel = () => {
    run.stage = 'funnel'
    const state = { picked: run.picked, far: run.far, answers: run.answers }
    run.answers = validAnswers(state)
    save()
    const step = nextStep({ ...state, answers: run.answers })
    if (!step) return finalScreen()
    renderStep(step)
  }

  /**
   * 마지막 확인: 고른 단어와 질문 답을 합친 점수로 정한 다섯 단어를 순서대로 미리 눌러 둔 채 보여 준다(2026-11-09 PI 결정).
   * 맞으면 다음만 누르고, 아닌 단어는 눌러 빼고 남은 후보 중에서 다시 눌러 바꾼다. 후보는 점수 상위 8개다.
   */
  const finalScreen = () => {
    run.stage = 'final'
    const state = { picked: run.picked, far: run.far, answers: run.answers }
    const scored = resultOf(state).top
    const shuffled = finalCandidates(state)
    const candidates = [...scored, ...shuffled.filter(id => !scored.includes(id))] // 정해 둔 다섯이 순서대로 위에 온다
    const required = finalRequired(candidates.length)
    // 학생이 한 번이라도 바꿨으면 그 선택을, 아니면 점수로 정한 다섯을 눌러 둔다.
    run.final = run.final ? run.final.filter(id => candidates.includes(id)).slice(0, required) : [...scored]
    save()
    // 처음엔 고르지 않았는데 답에서 후보에 들어온 단어에는 표시를 붙인다.
    const entered = candidates.filter(id => !run.picked.includes(id))
    const names = (ids: string[]) => ids.map(id => WORD.get(id)!.ko).join(', ')
    // 안내: 1단계 선택과 답이 어긋난 곳만 알려 준다. 점수 0은 보통 단어의 기준점이다.
    const theta = scoresOf(state)
    const surprised = scored.filter(id => !run.picked.includes(id)) // 안 골랐지만 다섯 단어에 든 것
    const weak = run.picked.filter(id => (theta.get(id) ?? 0) < 0) // 골랐지만 답에서는 기준점 아래
    const lines = [
      surprised.length > 0 ? `처음엔 안 골랐지만 답에서 나온 단어: ${names(surprised)}.` : null,
      weak.length > 0 ? `처음엔 골랐지만 답에서는 약하게 나온 단어: ${names(weak)}.` : null,
    ].filter((t): t is string => t !== null)
    const note = lines.length > 0 ? lines.join('\n') : '1단계에서 고른 단어와 답이 잘 맞았어요.'
    pickScreen({
      stepText: '마지막 확인',
      title: '답을 보고 다섯 단어를 정했어요',
      sub: '1단계에서 고른 단어와 30개 답을 합쳐 점수 순서로 골라 두었어요. 맞으면 다음을 누르세요. 아닌 단어가 있으면 눌러서 빼고, 아래 단어 중에서 다시 누르면 바뀝니다. 번호가 순위예요.',
      note,
      tag: id => (entered.includes(id) ? '처음엔 고르지 않았어요' : null),
      words: candidates.map(id => WORD.get(id)!), min: required, max: required, initial: run.final, ordered: true, guard: true,
    }, picked => {
      run.final = picked
      save()
      onFinish(resultOf({ ...state, final: validFinal(candidates, picked) ?? undefined }))
    }, picked => { run.final = picked; goBack() })
  }

  // 질문이 나타난 직후의 탭(앞 질문의 더블탭)은 무시해 한 번에 두 질문에 답하지 않게 한다. 
  let shownAt = 0
  const answer = (key: string) => {
    if (performance.now() - shownAt < TAP_GUARD_MS) return
    run.answers.push(key); delete run.final; save(); funnel() // 답이 바뀌면 후보도 바뀔 수 있어 예전 마지막 확인 선택은 버린다
  }
  const goBack = () => { if (run.answers.length > 0) { run.answers.pop(); run.stage = 'funnel'; funnel() } else far() }

  const backButton = () => {
    const b = el('button', { type: 'button', class: 'btn ghost back-link', text: '이전' })
    b.addEventListener('click', goBack)
    return b
  }

  /**
   * 행동 문장 카드. 단어 이름은 보이지 않는다(이름이 보이면 되고 싶은 나를 고르게 된다).
   * 카드 안에 "훨씬 더 / 조금 더 나 같아요" 두 버튼이 있어 어느 문장을 고르는지 헷갈리지 않는다(PI 결정 2026-11-10).
   */
  const statementCard = (text: string, key: 'a' | 'b', pos: 'top' | 'bottom') => {
    const grade = (strength: 'strong' | 'slight', label: string, choice: string) => {
      const b = el('button', { type: 'button', class: `grade ${strength}`, 'data-choice': choice, 'data-pos': pos, 'data-strength': strength, text: label })
      b.addEventListener('click', () => answer(choice))
      return b
    }
    return el('div', { class: 'pair-card', 'data-key': key },
      el('span', { class: 'stmt', text }),
      el('div', { class: 'grades' }, grade('strong', '훨씬 더 나 같아요', `${key}2`), grade('slight', '조금 더 나 같아요', key)))
  }

  const renderStep = (step: FunnelStep) => {
    shownAt = performance.now()
    // 위아래 순서는 번갈아 바꿔 한쪽이 늘 위에 오지 않게 한다. 선택 기호는 단어에 묶여 있다.
    const aTop = step.index % 2 === 1
    const cardA = statementCard(step.textA, 'a', aTop ? 'top' : 'bottom'), cardB = statementCard(step.textB, 'b', aTop ? 'bottom' : 'top')
    const cards = aTop ? [cardA, cardB] : [cardB, cardA]
    const both = el('button', { type: 'button', class: 'funnel-choice small', 'data-choice': 'both', text: '둘 다 맞아요' })
    const none = el('button', { type: 'button', class: 'funnel-choice small', 'data-choice': 'none', text: '둘 다 아니에요' })
    both.addEventListener('click', () => answer('both'))
    none.addEventListener('click', () => answer('none'))
    mountMain(
      el('p', { class: 'step-text', text: `2단계 / 2단계 · 둘 중 고르기 ${step.index} / ${step.total}` }),
      el('div', { class: 'progress-track', 'aria-hidden': 'true' }, el('i', { style: `width:${Math.round(((step.index - 1) / step.total) * 100)}%` })),
      el('h1', { class: 'question', text: '둘 중 어느 쪽이 더 나 같나요?' }),
      el('p', { class: 'sub', text: '둘 다 맞아도 더 맞는 쪽을 고르세요. 되고 싶은 나 말고 평소 실제로 하는 쪽으로요.' }),
      el('div', { class: 'pair-cards' }, ...cards),
      el('div', { class: 'pair-extra' }, both, none),
      backButton())
  }

  const ready = run.picked.length >= MIN_PICK && run.far.length === FAR_COUNT
  if ((run.stage === 'funnel' || run.stage === 'final') && ready) funnel()
  else if (run.stage !== 'pick' && run.picked.length >= MIN_PICK) far()
  else pick()
}
