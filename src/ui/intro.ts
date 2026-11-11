import { el } from './dom'

const COPY = {
  lead: '전체 단어에서 나와 닮은 단어를 고르고 몇 가지 질문에 답하면, 나를 설명하는 다섯 단어와 사용 설명서가 나옵니다.',
  meta: '나와 닮은 단어를 고르고, 60개의 둘 중 고르기에 답한 뒤, 마지막으로 순서를 정해요. 10분 안팎이 걸리고 시간 제한은 없어요. 중간에 나가도 이어서 할 수 있어요.',
}

/** resume이 있으면 시작 버튼 대신 "이어서 하기"와 "처음부터"를 보여 준다(진행 중인 검사). */
export type Resume = { onResume: () => void; onRestart: () => void; onViewResult?: () => void }

export function renderIntro(onStart: () => void, resume?: Resume): HTMLElement {
  const start = el('button', { type: 'button', class: 'btn primary', text: '시작하기' })
  start.addEventListener('click', onStart)
  const button = (text: string, cls: string, fn: () => void) => { const b = el('button', { type: 'button', class: `btn ${cls}`, text }); b.addEventListener('click', fn); return b }
  const actions = resume
    ? el('div', { class: 'resume-actions' },
        el('p', { class: 'meta', text: '하던 검사가 저장돼 있어요. 이어서 하거나 처음부터 다시 할 수 있어요.' }),
        button('이어서 하기', 'primary', resume.onResume), button('처음부터', '', resume.onRestart),
        resume.onViewResult ? button('이전 결과 보기', 'ghost', resume.onViewResult) : null)
    : start
  return el('main', { class: 'screen intro' },
    el('div', { class: 'wrap' },
      el('h1', { class: 'intro-title', text: '나의 다섯 단어' }),
      el('p', { class: 'lead', text: COPY.lead }),
      el('p', { class: 'meta', text: COPY.meta }),
      actions,
      el('p', { class: 'license' }, 'AGPL-3.0 라이선스로 공개된 소프트웨어입니다 · ',
        el('a', { href: 'https://github.com/jspark-inu/five-words', rel: 'noopener', target: '_blank', text: '소스 코드' }))))
}
