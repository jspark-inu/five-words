import type { BirthInput } from '../chart/chart'
import { el } from './dom'

export const MIN_YEAR = 1900

/** 양력 생년월일이 실제 있는 날짜인지, 오늘 이후는 아닌지 본다. */
export function isValidBirth(input: { year: number; month: number; day: number }, now: Date = new Date()): 'ok' | 'bad-date' | 'future' {
  const { year, month, day } = input
  if (![year, month, day].every(Number.isInteger)) return 'bad-date'
  if (year < MIN_YEAR || year > now.getFullYear()) return year > now.getFullYear() ? 'future' : 'bad-date'
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return 'bad-date'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return d > today ? 'future' : 'ok'
}

const digits = (s: string) => (/^\d{1,4}$/.test(s.trim()) ? Number(s.trim()) : NaN)

/** 시·분 입력칸을 시각으로 바꾼다. 시만 적고 분을 비워 두면 0분으로 본다. 시를 비우면 오류. */
export function parseTime(hourText: string, minuteText: string): { hour: number; minute: number } | null {
  const h = digits(hourText)
  const mi = minuteText.trim() === '' && !Number.isNaN(h) ? 0 : digits(minuteText)
  if (Number.isNaN(h) || Number.isNaN(mi) || h > 23 || mi > 59) return null
  return { hour: h, minute: mi }
}

function numberField(name: string, label: string, max: number, unit: string, placeholder?: string): { wrap: HTMLElement; input: HTMLInputElement } {
  const input = el('input', { name, type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: String(max), autocomplete: 'off', 'aria-label': label, placeholder })
  return { wrap: el('label', { class: 'num' }, input, el('span', { text: unit })), input }
}

/** initial이 있으면 칸을 미리 채우고, onCancel이 있으면 "취소" 버튼을 둔다(보고서에서 정보만 고치러 온 경우). */
function cancel(onCancel: () => void): HTMLElement {
  const b = el('button', { type: 'button', class: 'btn ghost', text: '취소' })
  b.addEventListener('click', onCancel)
  return b
}

export function renderBirth(onDone: (birth: BirthInput) => void, opts: { initial?: BirthInput; onCancel?: () => void } = {}): HTMLElement {
  const year = numberField('year', '태어난 해', 4, '년', '연도')
  const month = numberField('month', '월', 2, '월')
  const day = numberField('day', '일', 2, '일')
  const hour = numberField('hour', '시', 2, '시')
  const minute = numberField('minute', '분', 2, '분')
  const unknown = el('input', { type: 'checkbox', name: 'time-unknown', id: 'time-unknown' })
  const gender = [['M', '남'], ['F', '여'], ['none', '입력 안 함']].map(([value, text]) => ({
    value: value as string,
    input: el('input', { type: 'radio', name: 'gender', value: value as string }),
    text: text as string,
  }))
  const init = opts.initial
  if (init) {
    year.input.value = String(init.year); month.input.value = String(init.month); day.input.value = String(init.day)
    if (init.time) { hour.input.value = String(init.time.hour); minute.input.value = String(init.time.minute) }
    gender.find(g => g.value === (init.gender ?? 'none'))!.input.checked = true
  }
  const error = el('p', { class: 'form-error', role: 'alert' })
  const fail = (msg: string) => { error.textContent = msg }

  unknown.addEventListener('change', () => {
    for (const f of [hour, minute]) { f.input.disabled = unknown.checked; if (unknown.checked) f.input.value = '' }
    hour.wrap.classList.toggle('off', unknown.checked)
    minute.wrap.classList.toggle('off', unknown.checked)
  })

  if (init && !init.time) {
    unknown.checked = true
    unknown.dispatchEvent(new Event('change'))
  }

  const form = el('form', { class: 'birth-form', novalidate: '' },
    el('fieldset', {}, el('legend', { text: '양력 생년월일' }), el('div', { class: 'row' }, year.wrap, month.wrap, day.wrap)),
    el('fieldset', {}, el('legend', { text: '태어난 시간 (24시간 기준)' }),
      el('div', { class: 'row' }, hour.wrap, minute.wrap),
      el('label', { class: 'check', for: 'time-unknown' }, unknown, el('span', { text: '태어난 시간을 몰라요' }))),
    el('fieldset', {}, el('legend', { text: '성별' }),
      el('div', { class: 'row choices' }, ...gender.map(g => el('label', { class: 'choice' }, g.input, el('span', { text: g.text }))))),
    error,
    el('button', { type: 'submit', class: 'btn primary', text: '보고서 보기' }),
    ...(opts.onCancel ? [cancel(opts.onCancel)] : []),
  )

  form.addEventListener('submit', e => {
    e.preventDefault()
    fail('')
    const y = digits(year.input.value); const m = digits(month.input.value); const d = digits(day.input.value)
    if ([y, m, d].some(Number.isNaN)) return fail('생년월일을 숫자로 모두 적어 주세요.')
    const status = isValidBirth({ year: y, month: m, day: d })
    if (status === 'future') return fail('오늘 이후 날짜는 입력할 수 없어요.')
    if (status === 'bad-date') return fail(`없는 날짜예요. ${MIN_YEAR}년부터 오늘까지의 양력 날짜를 확인해 주세요.`)
    let time: BirthInput['time'] = null
    if (!unknown.checked) {
      time = parseTime(hour.input.value, minute.input.value)
      if (!time) return fail('시간은 0~23시, 0~59분으로 적어 주세요. 모르면 아래 칸을 눌러 주세요.')
    }
    const picked = gender.find(g => g.input.checked)
    if (!picked) return fail('성별을 골라 주세요. 밝히고 싶지 않으면 "입력 안 함"을 고르면 됩니다.')
    onDone({ year: y, month: m, day: d, time, gender: picked.value === 'none' ? null : (picked.value as 'M' | 'F') })
  })

  return el('main', { class: 'screen wrap' },
    el('h1', { class: 'screen-title', text: '태어난 날을 알려 주세요' }),
    el('p', { class: 'privacy', text: '입력한 내용은 이 휴대폰 안에서만 계산하고, 어디로도 보내지 않아요.' }),
    form)
}
