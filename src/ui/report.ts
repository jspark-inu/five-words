import { computeChart, computeDetail, sajuYearAt, type BirthInput, type Element } from '../chart/chart'
import { palaceKo, starKo, SIHUA_KO, BRIGHTNESS_KO } from '../chart/names'
import { CONTENT, DEEP } from '../content'
import { COUNSEL_LINE, CLOSING_QUESTION } from '../content/assemble-copy'
import { AI_CHOICE, AI_INTRO, AI_NOTE, COPY_FAIL, COPY_OK } from '../content/ai-copy'
import { composeReport, type FunnelExtra, type Meeting, type Report } from '../report/compose'
import type { LuckView, YearView } from '../report/deep'
import type { TriangleView } from '../report/pick'
import { hasFinalConsonant } from '../report/josa'
import { mergeRelations } from '../chart/features'
import { drawCard, shareCard } from './card'
import { boldInline, boldLead, boldLeadInline, el } from './dom'

const EL_ORDER: { key: Element; label: string; color: string }[] = [
  { key: 'wood', label: '목 木', color: 'var(--wood)' },
  { key: 'fire', label: '화 火', color: 'var(--fire)' },
  { key: 'earth', label: '토 土', color: 'var(--earth)' },
  { key: 'metal', label: '금 金', color: 'var(--metal)' },
  { key: 'water', label: '수 水', color: 'var(--water)' },
]
const EL_SCALE = 4 // 막대가 가득 차는 개수

function section(title: string, sub: string | null, ...body: (Node | null | false | undefined)[]): HTMLElement {
  return el('section', {}, el('h2', { text: title }), sub ? el('p', { class: 'sub', text: sub }) : null, ...body)
}

type Kid = Node | null | false | undefined

/** 큰 구획 머리띠. 소개 문구(intro)는 문구 칸에서 오므로 없으면 안 그린다. */
function partBand(id: string, eyebrow: string, title: string, intro: string | null | undefined): HTMLElement {
  return el('div', { class: 'part', id }, el('div', { class: 'wrap' }, el('span', { class: 'eyebrow', text: eyebrow }), el('h2', { text: title }), intro ? el('p', { text: intro }) : null))
}
const wrap = (...kids: Kid[]) => el('div', { class: 'wrap' }, ...kids.filter((k): k is Node => !!k))
const para = (text: string, cls?: string) => el('p', cls ? { class: cls } : {}, ...boldLead(text))
const term = (text: string) => el('p', { class: 'term' }, ...boldLead(text))

function birthPhrase(b: BirthInput): string {
  const date = `${b.year}년 ${b.month}월 ${b.day}일`
  if (!b.time) return `${date}생`
  const { hour, minute } = b.time
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${date} ${hour < 12 ? '오전' : '오후'} ${h12}시${minute ? ` ${minute}분` : ''}생`
}

function pillarBox(lines: string[], label: string, me = false, reading: string | null = null): HTMLElement {
  const b = el('b', {})
  lines.forEach((t, i) => { if (i > 0) b.append(el('br')); b.append(t) })
  return el('div', { class: me ? 'pillar me' : 'pillar' }, b, reading ? el('small', { class: 'reading', text: reading }) : null, el('span', { text: label }))
}

function sajuSection(r: Report, birth: BirthInput): HTMLElement {
  const known = birth.time !== null
  const pillars = r.saju.pillars.map(p => pillarBox([p.stem, p.branch], p.label === '일주' ? '나 (일주)' : p.label, p.label === '일주', p.reading))
  const bars = EL_ORDER.map(({ key, label, color }) => {
    const n = r.saju.elements[key]
    const hid = r.saju.hiddenElements[key]
    return el('div', { class: 'el' },
      el('span', { text: label }),
      el('div', { class: 'track' }, el('i', { style: `width:${Math.min(100, (n / EL_SCALE) * 100)}%;background:${color}` })),
      el('span', { text: hid > 0 ? `${n} +숨은 ${hid}` : String(n) }))
  })
  const alerts = r.saju.elementTexts.map(t => el('div', { class: 'alert' }, ...boldLead(t)))
  const monthNote = r.saju.monthNote ? el('div', { class: 'alert month-note' }, r.saju.monthNote) : null
  return section('사주로 본 나', `${birthPhrase(birth)}의 ${known ? '네' : '세'} 기둥입니다.`,
    el('div', { class: 'pillars' }, ...pillars),
    el('p', {}, ...boldLead(r.saju.dayStemText)),
    el('div', { class: 'elements' }, ...bars),
    el('p', { class: 'sub small', text: '막대는 겉 글자(천간과 지지) 기준이고, "+숨은"은 지지 속에 숨은 글자(지장간) 개수입니다. 막대가 비어 있어도 숨은 글자가 있으면 없다고 하지 않습니다.' }),
    ...alerts,
    monthNote)
}

function ziweiSection(r: Report): HTMLElement {
  if (!r.ziwei) return section('자미두수는 건너뛰었어요', null, el('div', { class: 'alert ziwei-note' }, r.ziweiNote ?? ''))
  const z = r.ziwei
  const stars = z.stars.length > 0 ? z.stars : ['없음']
  const cells = [
    pillarBox([z.mingZhi], '명궁'),
    pillarBox([z.wuXingJu], '오행국'),
    pillarBox(stars, z.borrowed ? '빌려 온 주성' : '주성'),
  ]
  return section('자미두수로 본 나', '태어난 시각까지 알아야 풀 수 있는, 사주와는 다른 전통 해석입니다.',
    el('div', { class: 'pillars three' }, ...cells),
    ...z.paragraphs.map((t, i) => el('p', {}, ...(i === 0 ? [t] : boldLead(t)))))
}

const SOURCE_LABEL = { saju: '사주 풀이', ziwei: '자미두수 풀이' } as const

function meetingRow(m: Meeting): HTMLElement {
  const match = m.kind === 'match'
  const subject = m.group === 'far' ? el('div', {}, el('span', { class: 'who', text: '먼 단어' }), el('b', { text: m.wordKo }))
    : el('div', {}, el('span', { class: 'who', text: '다섯 단어' }), m.rank ? `${m.rank}위 ` : '', el('b', { text: m.wordKo }))
  const chartDiv = (it: { source: 'saju' | 'ziwei'; chartLabel: string; chartText: string }) =>
    el('div', {}, el('span', { class: 'who', text: `${SOURCE_LABEL[it.source]} · ${it.chartLabel}` }), it.chartText)
  return el('div', { class: 'vsrow', 'data-block': m.id },
    el('span', { class: `vstag ${match ? 'tag-match' : 'tag-clash'}`, text: m.tag }),
    el('div', { class: m.also ? 'vsbody stacked' : 'vsbody' }, subject, chartDiv(m), m.also ? chartDiv(m.also) : null),
    el('div', { class: 'ask', text: match ? m.closing : `생각해 볼 질문: ${m.closing}` }))
}

function link(text: string, href: string): HTMLElement {
  return el('a', { href, rel: 'noopener', target: '_blank', text })
}

function friendCard(words: string[]): HTMLElement {
  const btn = el('button', { type: 'button', class: 'btn primary', text: '이미지로 보내기' })
  const note = el('div', { class: 'card-note', role: 'status' })
  let previewUrl: string | null = null
  const clearPreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; note.replaceChildren() }
  btn.addEventListener('click', async () => {
    btn.disabled = true
    clearPreview()
    try {
      const blob = await drawCard(words)
      const result = await shareCard(blob)
      if (result === 'saved') {
        previewUrl = URL.createObjectURL(blob)
        note.append(
          el('p', { text: '저장이 안 되면 아래 이미지를 길게 눌러 저장하세요.' }),
          el('img', { class: 'card-preview', src: previewUrl, alt: '나를 설명하는 다섯 단어 카드' }))
      }
    } catch (e) {
      console.error(e)
      note.append(el('p', { text: '이미지를 만들지 못했어요. 화면을 캡처해서 보내 주세요.' }))
    } finally {
      btn.disabled = false
    }
  })
  return el('section', { class: 'card-section' },
    el('div', { class: 'share' },
      el('div', { class: 'eyebrow', text: '친구에게 보내기' }),
      el('div', { class: 'big' }, ...words.flatMap((w, i) => (i === 0 ? [w] : [i === 3 ? el('br') : ' · ', w]))),
      el('p', { text: '이게 나를 설명하는 다섯 단어래. 넌 뭐 나왔어?' })),
    el('div', { class: 'row' }, btn),
    note)
}

/** 올해는 기기 시계의 날짜로 정하되, 달력의 해가 아니라 입춘 기준 사주의 해다(1월에 열면 아직 전년도). 시험에서는 nowYear로 고정한다. */
export function buildReport(top: string[], birth: BirthInput, far?: string[], extra?: FunnelExtra, nowYear: number = sajuYearAt(new Date()).year): Report {
  return composeReport(top, computeChart(birth), CONTENT, birth.time !== null, far, extra, { detail: computeDetail(birth, nowYear), copy: DEEP })
}

export type ReportInput = {
  top: string[]
  birth: BirthInput
  lowSignal: boolean
  far?: string[]
  /** 다음 두 단어와 영역별 메모. */
  extra?: FunnelExtra
  /** 지금 시각. 시험에서 고정한다. 없으면 기기 시계. */
  now?: Date
}

function contextSection(lines: string[]): HTMLElement {
  return section('상황에 따라 앞서는 단어가 달라요', '한 단어가 늘 같은 모습으로만 나오지는 않습니다.',
    el('div', { class: 'cards' }, ...lines.map(l => el('div', { class: 'card ctx' }, el('p', { text: l })))))
}

function farSection(far: NonNullable<Report['deep']>['far'] & object, intro: string | undefined): HTMLElement {
  const s = section('나와 가장 먼 단어', intro ?? null,
    el('div', { class: 'cards' }, ...far.map(f => el('div', { class: 'card far' },
      el('h3', { class: 'bigword' }, f.ko),
      el('p', { text: f.line }),
      f.people ? el('p', { class: 'people' }, el('small', { text: `${f.people.label} · 내 ${f.people.fromKo} 쪽에서 본 사람` }), f.people.text) : null))))
  s.classList.add('far-section')
  return s
}

// ---- 강점 리포트 ----

function summarySection(r: Report): HTMLElement | null {
  const d = r.deep!
  if (!d.summary && r.heard.length === 0) return null
  return section(d.summary ? '한 줄로 말하면' : '이런 말, 많이 듣지 않나요?', d.summary ? null : '하나라도 들어봤다면 이 보고서가 꽤 맞을 겁니다.',
    d.summary ? el('div', { class: 'summary', text: d.summary }) : null,
    el('div', { class: 'quotes' }, ...r.heard.map(h => el('div', { class: 'quote', text: h }))))
}

function wordsSection(r: Report): HTMLElement {
  const d = r.deep!
  const cards = r.words.map((w, i) => {
    const c = d.wordCards[i]!
    const detail = c.hasDetail
      ? el('details', {},
          el('summary', { text: '일상 장면과 쓰는 법 펼치기' }),
          c.scenes.length > 0 ? el('h4', { text: '일상에서 나타나는 모습' }) : null,
          c.scenes.length > 0 ? el('ul', { class: 'scenes' }, ...c.scenes.map(t => el('li', { text: t }))) : null,
          c.goodEnv || c.badEnv
            ? el('div', { class: 'twocol' },
                c.goodEnv ? el('div', { class: 'good' }, el('h4', { text: '잘 맞는 환경' }), c.goodEnv) : null,
                c.badEnv ? el('div', { class: 'bad' }, el('h4', { text: '망가지는 환경' }), c.badEnv) : null)
            : null,
          c.trap ? el('h4', { text: '함정' }) : null, c.trap ? el('p', { text: c.trap }) : null,
          c.howTo ? el('h4', { text: '쓰는 법' }) : null, c.howTo ? el('p', { text: c.howTo }) : null)
      : null
    return el('div', { class: 'card' },
      el('h3', { class: 'bigword' }, el('span', { text: String(i + 1) }), w.ko),
      c.meaning ? el('p', { class: 'meaning', text: c.meaning }) : null,
      el('p', { class: c.meaning ? 'wlead' : '', text: c.essence ?? w.explain }),
      el('span', { class: 'side', text: `과하면: ${w.overdo}` }),
      w.work ? el('p', { class: 'work' }, el('b', { text: '일에서 이렇게 쓰여요' }), w.work) : null,
      detail)
  })
  return section('다섯 단어 하나씩', d.frames.wordsIntro ?? null,
    el('div', { class: 'cards' }, ...cards),
    el('p', { class: 'worknote', text: '"일에서 이렇게 쓰여요"는 직업을 정해 주는 말이 아닙니다. 어떤 일을 하든 이 힘을 쓸 자리를 찾는 실마리로 보세요.' }),
    d.support.length > 0 ? el('h3', { class: 'subhead', text: '곁에서 받쳐 주는 단어' }) : null,
    d.support.length > 0 ? el('div', { class: 'stack' }, ...d.support.map(x => el('p', { class: 'term' }, el('b', { text: x.ko }), ` ${x.text}`))) : null)
}

function triangleSvg(t: TriangleView): SVGElement {
  const NS = 'http://www.w3.org/2000/svg'
  const mk = (tag: string, attrs: Record<string, string>, text?: string): SVGElement => {
    const n = document.createElementNS(NS, tag)
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    if (text !== undefined) n.textContent = text
    return n
  }
  const color = (type: 'syn' | 'ten') => (type === 'syn' ? '#2f7a4b' : '#c6401c')
  const [l1, l2, l3] = t.edges as [TriangleView['edges'][number], TriangleView['edges'][number], TriangleView['edges'][number]]
  const svg = mk('svg', { class: 'tri', viewBox: '0 0 320 236', role: 'img', 'aria-label': `${t.words.join(', ')}을 잇는 삼각형. ${t.edges.map(e => `${e.label} 변은 ${e.type === 'syn' ? '시너지' : '긴장'}`).join(', ')}` })
  const line = (x1: number, y1: number, x2: number, y2: number, e: typeof l1) =>
    mk('line', { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), stroke: color(e.type), 'stroke-width': '4', ...(e.type === 'ten' ? { 'stroke-dasharray': '9 7' } : {}) })
  svg.append(line(160, 44, 52, 194, l1), line(160, 44, 268, 194, l3), line(52, 194, 268, 194, l2))
  const node = (cx: number, cy: number, name: string, first: boolean) => {
    svg.append(mk('circle', { cx: String(cx), cy: String(cy), r: '36', fill: '#17162b' }),
      mk('text', { x: String(cx), y: String(cy + 8), 'text-anchor': 'middle', 'font-size': '22', 'font-weight': '900', fill: first ? '#ff9d2e' : '#fff' }, name))
  }
  node(160, 44, t.words[0], true); node(52, 194, t.words[1], false); node(268, 194, t.words[2], false)
  const badge = (cx: number, cy: number, e: typeof l1) => {
    svg.append(mk('circle', { cx: String(cx), cy: String(cy), r: '13', fill: color(e.type) }), mk('text', { x: String(cx), y: String(cy + 5), 'text-anchor': 'middle', 'font-size': '14', 'font-weight': '900', fill: '#fff' }, e.label))
  }
  badge(106, 119, l1); badge(160, 194, l2); badge(214, 119, l3)
  return svg
}

function togetherSection(r: Report): HTMLElement | null {
  const d = r.deep!
  if (d.roles.length === 0 && d.pairs.length === 0 && !d.triangle) return null
  return section('단어들은 같이 일합니다', d.frames.togetherIntro ?? null,
    d.roles.length > 0 ? el('div', { class: 'roles' }, ...d.roles.map(x => el('div', {}, el('b', { text: x.ko }), el('span', { text: x.text })))) : null,
    d.triangle ? el('h3', { class: 'subhead', text: '위의 세 단어' }) : null,
    d.triangle ? triangleSvg(d.triangle) : null,
    d.triangle ? el('div', { class: 'edges' }, ...d.triangle.edges.map(e => el('div', { class: 'edge', 'data-block': e.id }, el('i', { class: e.type, text: e.label }), el('div', {}, el('small', { text: `${e.aKo}${hasFinalConsonant(e.aKo) ? '과' : '와'} ${e.bKo} · ${e.type === 'syn' ? '시너지' : '긴장'}` }), e.text)))) : null,
    d.pairs.length > 0 ? el('h3', { class: 'subhead', text: '열 가지 짝' }) : null,
    d.pairs.length > 0 ? el('div', { class: 'pairs' }, ...d.pairs.map(x => el('div', { class: 'pairbox' }, el('b', { text: `${x.a} × ${x.b}` }), x.body))) : null)
}

function areaSection(r: Report): HTMLElement {
  const d = r.deep!
  const colors: Record<string, string> = { strategy: 'var(--water)', execute: 'var(--wood)', influence: 'var(--fire)', relation: 'var(--earth)' }
  return section('영역으로 보면', d.frames.areaIntro ?? null,
    el('div', { class: 'areabars' }, ...d.areaBars.map(b => el('div', { class: 'el' },
      el('span', { text: b.label }),
      el('div', { class: 'track' }, el('i', { style: `width:${Math.min(100, (b.count / 5) * 100)}%;background:${colors[b.id]}` })),
      el('span', { text: String(b.count) })))),
    ...d.areaNotes.map(t => para(t, 'note')))
}

function assetsSection(r: Report): HTMLElement | null {
  const d = r.deep!
  if (d.assets.length === 0) return null
  return section('핵심 자산 셋', null, el('div', { class: 'stack' }, ...d.assets.map((a, i) => el('div', { class: 'term', 'data-block': a.id }, el('b', { text: `${i + 1}. ${a.title}.` }), ` ${a.text}`))))
}

function signalsBlock(sg: { id: string; early: string; middle: string; late: string }): HTMLElement {
  return el('div', { class: 'status risk-signals', 'data-block': sg.id },
    el('div', {}, el('b', { text: '초기 신호' }), el('span', { text: sg.early })),
    el('div', {}, el('b', { text: '중기 신호' }), el('span', { text: sg.middle })),
    el('div', {}, el('b', { text: '후기 신호' }), el('span', { text: sg.late })))
}

function risksSection(r: Report): HTMLElement | null {
  const d = r.deep!
  if (d.risks.length === 0) return null
  const blocks: Kid[] = []
  d.risks.forEach((x, i) => {
    blocks.push(el('h3', { class: i === 0 ? 'subhead' : 'subhead', text: `${i + 1}. ${x.title}` }), el('p', { 'data-block': x.id, text: x.text }))
    if (x.rest) {
      if (x.rest.lines.length > 0) blocks.push(el('table', { class: 'rest' }, ...x.rest.lines.map(l => el('tr', {}, el('td', { text: l.ko }), el('td', { text: l.text })))))
      for (const a of x.rest.allow) blocks.push(el('p', { class: 'note' }, el('b', { text: a.ko }), ` ${a.text}`))
      if (x.rest.farNote) blocks.push(el('p', { class: 'note', text: x.rest.farNote }))
    }
    blocks.push(x.signals ? signalsBlock(x.signals) : null, el('p', { class: 'note' }, el('b', { text: '처방' }), ` ${x.remedy}`))
  })
  blocks.push(el('p', { class: 'care', text: COUNSEL_LINE }))
  return section('구조적 위험 셋', d.frames.riskIntro ?? null, ...blocks)
}

function careerSection(r: Report): HTMLElement | null {
  const d = r.deep!
  if (d.activities.length === 0 && d.avoid.length === 0) return null
  return section('손이 먼저 갈 만한 쪽', d.frames.careerIntro ?? null,
    d.activities.length > 0 ? el('div', { class: 'stack' }, ...d.activities.map(x => el('p', { class: 'term' }, el('b', { text: x.ko }), ` ${x.text}`))) : null,
    d.avoid.length > 0 ? el('h3', { class: 'subhead', text: '오래 있으면 닳기 쉬운 곳' }) : null,
    d.avoid.length > 0 ? el('ul', { class: 'scenes' }, ...d.avoid.map(x => el('li', {}, el('b', { text: x.ko }), ` ${x.text}`))) : null)
}

function breakdownSection(r: Report): HTMLElement {
  return section('이럴 때 고장 납니다', `1위 단어 "${r.breakdown.wordKo}" 쪽이 지나칠 때의 신호입니다. 미리 알아 두면 수리비가 적게 듭니다.`,
    el('div', { class: 'status' },
      el('div', {}, el('b', { text: '초기 증상' }), el('span', { text: r.breakdown.early })),
      el('div', {}, el('b', { text: '중기 증상' }), el('span', { text: r.breakdown.middle })),
      el('div', {}, el('b', { text: '말기 증상' }), el('span', { text: r.breakdown.late })),
      el('div', {}, el('b', { text: '처방' }), el('span', { text: r.breakdown.remedy }))))
}

function partnersSection(r: Report): HTMLElement {
  return section('어떤 단어와 합이 좋을까', '나쁜 단어는 없습니다. 조심해서 쓰면 최고의 짝이 되는 단어만 있습니다.',
    el('div', { class: 'pair' },
      el('div', { class: 'card good' }, el('h3', { text: '잘 맞는 짝' }), el('p', { text: r.partners.good })),
      el('div', { class: 'card bad' }, el('h3', { text: '조심할 짝' }), el('p', { text: r.partners.careful }))))
}

// ---- 운세 리포트 ----

/** 운세 문구: **용어**는 굵게. */
const rich = (text: string, cls?: string) => el('p', cls ? { class: cls } : {}, ...boldInline(text))
const luckPara = (p: LuckView['paragraphs'][number]): Kid[] => [p.heading ? el('h4', { text: p.heading }) : null, rich(p.text, p.term ? 'term' : p.note ? 'note' : '')]
const whyBox = (why: string) => el('details', {}, el('summary', { text: '왜 이렇게 풀이하나요' }), el('p', { class: 'term' }, ...boldInline(why)))

function luckBody(v: LuckView): Kid[] {
  return [
    v.summary ? el('div', { class: 'summary' }, ...boldInline(v.summary)) : null,
    ...v.paragraphs.flatMap(luckPara),
    v.howTo ? el('h4', { text: '이렇게 써 보세요' }) : null, v.howTo ? rich(v.howTo) : null,
    v.why ? whyBox(v.why) : null,
  ]
}

function luckSection(id: string, name: string, small: string | null, v: LuckView): HTMLElement {
  return el('section', { class: 'luck', id }, el('h3', { class: 'luckname' }, name, small ? el('small', { text: small }) : null), ...luckBody(v).filter((k): k is Node => !!k))
}

function yearSection(name: string, y: YearView): HTMLElement {
  const compareHead = '올해와 다른 점'
  const kids: Kid[] = [
    el('div', { class: 'chips' }, ...y.facts.map(f => el('span', { class: 'chip', text: f }))),
    y.summary ? el('div', { class: 'summary' }, ...boldInline(y.summary)) : null,
    y.good || y.bad
      ? el('div', { class: 'twocol' },
          y.good ? el('div', { class: 'good' }, el('h4', { text: '잘 풀리는 쪽' }), ...boldLeadInline(y.good)) : null,
          y.bad ? el('div', { class: 'bad' }, el('h4', { text: '조심할 쪽' }), ...boldLeadInline(y.bad)) : null)
      : null,
    y.money ? el('h4', { text: `${y.id === 'now' ? '올해' : '내년'}의 돈` }) : null, y.money ? rich(y.money) : null,
    y.liunian ? el('h4', { text: y.liunianHeading ?? '' }) : null, y.liunian ? rich(y.liunian) : null,
    y.goodNews ? el('h4', { text: `${y.id === 'now' ? '올해' : '내년'}의 반가운 소식` }) : null, y.goodNews ? rich(y.goodNews) : null,
    y.compare ? el('h4', { text: compareHead }) : null, y.compare ? rich(y.compare) : null,
    y.howTo ? el('h4', { text: '이렇게 써 보세요' }) : null, y.howTo ? rich(y.howTo) : null,
    y.why ? whyBox(y.why) : null,
  ]
  return el('section', { class: 'luck', id: y.id === 'now' ? 'l-now' : 'l-next' },
    el('h3', { class: 'luckname' }, name, el('small', { text: y.label })), ...kids.filter((k): k is Node => !!k))
}

/** 운세 리포트 전체. 문구가 하나도 없으면 null이라 머리띠도 그리지 않는다. */
function luckPart(r: Report, ipchunNote: string | null): HTMLElement[] | null {
  const l = r.deep!.luck
  if (!l.total && !l.study && l.years.length === 0 && l.glance.length === 0) return null
  const anchor: Record<string, string> = { total: 'l-total', now: 'l-now', next: 'l-next', study: 'l-study' }
  const secs: Kid[] = [
    l.glance.length > 0
      ? section('한눈에 보기', null, el('div', { class: 'glance' }, ...l.glance.map(g => el('a', { href: `#${anchor[g.id]}` }, el('b', { text: g.label }), g.text))))
      : null,
    l.total ? luckSection('l-total', '총운', null, l.total) : null,
    ...l.years.map(y => yearSection(y.id === 'now' ? '올해운' : '내년운', y)),
    l.study ? luckSection('l-study', '학업운', null, l.study) : null,
  ]
  const intro = r.ziwei ? r.deep!.frames.luckIntro : r.deep!.frames.luckIntroNoZiwei
  return [partBand('luck', '둘째 리포트', '운세 리포트', intro), wrap(l.note ? el('p', { class: 'note small', text: l.note }) : null, ipchunNote ? el('p', { class: 'note small', text: ipchunNote }) : null, ...secs)]
}

// ---- 명식 (펼침) ----

function factsGrid(r: Report): HTMLElement | null {
  const ps = r.detail?.saju.pillars
  if (!ps || ps.length === 0) return null
  const row = (label: string, f: (i: number) => string) => el('tr', {}, el('th', { text: label }), ...ps.map((_, i) => el('td', { text: f(i) })))
  return el('table', { class: 'grid' },
    el('tr', {}, el('th', { text: '' }), ...ps.map(p => el('th', { text: `${p.label} ${p.stem}${p.branch}` }))),
    row('천간 십신', i => ps[i]!.stemSipsin?.hangul ?? '일간'),
    row('지지 십신', i => ps[i]!.branchSipsin.hangul),
    row('12운성', i => ps[i]!.unseong.hangul),
    row('12신살', i => ps[i]!.sinsal.hangul),
    row('지장간', i => ps[i]!.hidden))
}

function relationSection(r: Report): HTMLElement | null {
  const s = r.detail?.saju
  if (!s) return null
  const notes = r.deep!.chartNotes
  const rows: HTMLElement[] = []
  // 같은 글자 쌍이 여러 기둥에 걸리면 한 줄에 자리를 모은다.
  for (const x of mergeRelations(s.relations)) {
    const note = notes.relation[`${x.chars}${x.type}`]
    rows.push(el('div', { class: 'term' }, el('b', { text: `${x.chars} ${x.name}` }), ...x.places.map(pl => el('span', { class: 'chip', text: pl })), note ? el('p', { class: 'tnote' }, ...boldInline(note)) : null))
  }
  for (const x of s.sals) {
    const note = notes.sinsal[x.key]
    rows.push(el('div', { class: 'term' }, el('b', { text: `${x.name}(${x.hanja})` }), ...x.places.map(pl => el('span', { class: 'chip', text: pl })), note ? el('p', { class: 'tnote' }, ...boldInline(note)) : null))
  }
  if (rows.length === 0) return null
  return section('합과 충, 신살', r.deep!.frames.relationIntro ?? null, el('div', { class: 'stack' }, ...rows))
}

function daewoonSection(r: Report): HTMLElement | null {
  const d = r.detail?.saju.daewoon
  if (!d || d.length === 0) return null
  return section('대운', r.deep!.frames.daewoonIntro ?? null, el('div', { class: 'dw' }, ...d.map(x => el('div', { class: 'dwrow' },
    el('span', { class: 't' }, `${x.age}세부터 `, el('b', { text: x.ganzi })),
    el('span', { class: 'l', text: `${x.stemSipsin.hangul} · ${x.branchSipsin.hangul} · ${x.unseong.hangul}` })))))
}

function palacesSection(r: Report): HTMLElement | null {
  const z = r.detail?.ziwei
  if (!z) return null
  const palaceNotes = r.deep!.chartNotes.palace
  return section('열두 궁', r.deep!.frames.palaceIntro ?? null, ...z.palaces.map(p => {
    const mains = p.stars.filter(s => s.main).map(s => starKo(s.name))
    const chip = (s: (typeof p.stars)[number]) => {
      const tags = [BRIGHTNESS_KO[s.brightness] ?? s.brightness, SIHUA_KO[s.siHua] ?? s.siHua].filter(Boolean)
      return el('span', { class: s.siHua ? 'chip hua' : 'chip', text: tags.length > 0 ? `${starKo(s.name)} ${tags.join('·')}` : starKo(s.name) })
    }
    return el('details', { class: 'palace' },
      el('summary', {}, el('span', { class: 'pn', text: `${palaceKo(p.name)}${p.name === '命宮' ? '' : '궁'}(${p.name}${p.name === '命宮' ? '' : '宮'})` }), el('span', { class: 'ps', text: `${p.ganZhi} · ${mains.length > 0 ? mains.join(' ') : '주성 없음'}${p.isShen ? ' · 신궁' : ''}` })),
      el('div', { class: 'pbody' }, p.stars.length > 0 ? el('div', {}, ...p.stars.map(chip)) : el('p', { class: 'pdesc', text: '별이 없는 궁입니다.' }),
        ...p.stars.filter(s => s.main && palaceNotes[`${p.name}:${s.name}`]).map(s => el('p', { class: 'tnote' }, ...boldInline(palaceNotes[`${p.name}:${s.name}`] as string)))))
  }))
}

// ---- 결과 복사 ----

function aiSection(r: Report): HTMLElement {
  const text = r.prompt ?? ''
  const pre = el('pre', { class: 'prompt', tabindex: '0', text })
  const note = el('p', { class: 'copy-note', role: 'status', 'aria-live': 'polite' })
  const btn = el('button', { type: 'button', class: 'copybtn', text: '결과 복사' })
  const selectAll = () => {
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    range.selectNodeContents(pre)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text)
      note.textContent = COPY_OK
    } catch {
      selectAll()
      note.textContent = COPY_FAIL
    }
  })
  return section('AI에게 더 물어보기', AI_INTRO, btn, note, pre, el('p', { class: 'ai-choice', text: AI_CHOICE }), el('p', { class: 'note small', text: AI_NOTE }))
}

// 결과는 세 탭으로 나눠 보인다(PI 요청 2026-11-11: 스크롤이 너무 길다).
// 보던 탭은 "태어난 정보만 다시 입력" 뒤에도 유지하고, 새로고침·다시 검사·결과 지우기 때는 전체 요약부터 연다.
type TabId = 'summary' | 'words' | 'saju'
let lastTab: TabId = 'summary'

export function renderReport(input: ReportInput, actions: { onClear: () => void; onRetake: () => void; onRebirth: () => void }): HTMLElement {
  const { top, birth, lowSignal } = input
  const sy = sajuYearAt(input.now ?? new Date())
  const r = buildReport(top, birth, input.far, input.extra, sy.year)
  const d = r.deep!
  const hasZiwei = r.ziwei !== null
  // 입춘 전에 열면 올해가 전년도다. 달력과 달라 보일 수 있어서 한 줄로 알린다.
  const luck = luckPart(r, sy.beforeIpchun ? `아직 입춘(${sy.ipchun.month}월 ${sy.ipchun.day}일) 전이라 ${sy.year}년을 올해로 봅니다. 사주의 한 해는 입춘에서 시작합니다.` : null)

  const hasMeetingPart = r.meetings.length > 0 || r.closing.length > 0

  const hero = el('header', { class: 'hero' }, el('div', { class: 'wrap' },
    el('h1', { class: 'eyebrow', text: '나를 설명하는 다섯 단어' }),
    lowSignal ? el('p', { class: 'low-signal', text: '이번에는 "나다운 쪽"으로 분명하게 확인된 단어가 많지 않았어요. 이 다섯 단어는 가벼운 참고로만 봐 주세요.' }) : null,
    el('ol', { class: 'words' }, ...r.words.map((w, i) => el('li', {}, el('span', { class: 'n', text: String(i + 1) }), el('span', { class: 'w', text: w.ko })))),
    r.support ? el('p', { class: 'support' }, '다음으로 가까운 두 단어 ', ...r.support.flatMap((s, i) => [i > 0 ? ' · ' : '', el('b', { text: s.ko })])) : null))

  const meetingsTitle = hasZiwei ? '세 리포트가 만나는 곳' : '두 리포트가 만나는 곳'

  const clear = el('button', { type: 'button', class: 'btn ghost', text: '결과 지우기' })
  const retake = el('button', { type: 'button', class: 'btn primary', text: '다시 검사하기' })
  const rebirth = el('button', { type: 'button', class: 'btn ghost', text: '태어난 정보만 다시 입력' })
  rebirth.addEventListener('click', actions.onRebirth)
  clear.addEventListener('click', () => { lastTab = 'summary'; actions.onClear() })
  retake.addEventListener('click', () => { lastTab = 'summary'; actions.onRetake() })

  const strengths = wrap(
    wordsSection(r),
    togetherSection(r),
    r.contexts.length > 0 ? contextSection(r.contexts) : null,
    areaSection(r),
    assetsSection(r),
    risksSection(r),
    d.risks.length === 0 ? breakdownSection(r) : null,
    d.far ? null : partnersSection(r),
    careerSection(r),
    d.far ? farSection(d.far, d.frames.farIntro) : null)

  const rawSummary = hasZiwei ? '근거가 궁금하면: 사주·자미두수 명식 전체 펼치기' : '근거가 궁금하면: 사주 명식 펼치기'
  const rawbox = el('details', { class: 'rawbox', id: 'raw' },
    el('summary', { text: rawSummary }),
    partBand('p2', '명식 자세히', '사주 명식', d.frames.sajuIntro),
    wrap(sajuSection(r, birth), factsGrid(r), d.frames.sajuTerms ? el('p', { class: 'sub', text: d.frames.sajuTerms }) : null, relationSection(r), daewoonSection(r)),
    hasZiwei ? partBand('p3', '명식 자세히', '자미두수 명식', d.frames.ziweiIntro) : null,
    wrap(ziweiSection(r), palacesSection(r)))

  // 근거가 센 칸이 하나도 없는 학생(1% 미만)도 닫기 전 질문은 받는다.
  const meetings = hasMeetingPart
    ? [partBand('p4', '겹쳐 보기', meetingsTitle, d.frames.crossIntro),
       wrap(el('section', {},
         r.meetings.length > 0 ? el('div', { class: 'vs' }, ...r.meetings.map(meetingRow)) : null,
         el('h3', { class: 'subhead', text: '닫기 전에 세 가지만' }),
         el('ol', { class: 'qs' }, ...r.closing.map(c => el('li', { 'data-block': c.id, text: c.text })), el('li', { text: CLOSING_QUESTION }))))]
    : []

  const summaryPanel: Kid[] = [
    wrap(summarySection(r)),
    ...meetings,
    partBand('p5', '마지막', '나 사용 설명서', d.frames.manualIntro),
    wrap(
      el('section', {},
        el('p', { class: 'sub', text: '마음에 드는 부분은 화면을 캡처해서 친구나 팀원에게 보내도 좋습니다.' }),
        el('div', { class: 'manual' }, el('h3', { text: '이 제품을 잘 쓰는 법' }), el('ul', {}, ...r.manual.map(t => el('li', {}, ...boldLead(t)))))),
      section('이번 달에 해볼 세 가지', '작은 실험입니다. 맞으면 계속하고, 안 맞으면 버리세요.',
        el('ul', { class: 'try' }, ...r.experiments.map(t => el('li', {}, ...boldLead(t))))),
      el('div', { id: 'friend-card-mount', class: 'friend-card-mount' }, friendCard(r.words.map(w => w.ko))),
      aiSection(r)),
  ]
  const tabDefs: [TabId, string, Kid[]][] = [
    ['summary', '전체 요약', summaryPanel],
    ['words', '5가지 강점 단어', [partBand('p1', '첫째 리포트', '강점 리포트', d.frames.strengthIntro), strengths]],
    ['saju', hasZiwei ? '사주·자미두수' : '사주', [...(luck ?? []), rawbox]],
  ]
  const panels = tabDefs.map(([id, , kids]) => el('div', { class: 'tabpanel', id: `tab-${id}`, role: 'tabpanel', 'aria-labelledby': `tabbtn-${id}` }, ...kids))
  const btns = tabDefs.map(([id, label]) => el('button', { type: 'button', role: 'tab', id: `tabbtn-${id}`, 'aria-controls': `tab-${id}`, text: label }))
  const bar = el('nav', { class: 'tabs' }, el('div', { class: 'wrap', role: 'tablist', 'aria-label': '결과 나눠 보기' }, ...btns))
  const show = (i: number, jump: boolean) => {
    lastTab = tabDefs[i]![0]
    btns.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1 })
    panels.forEach((p, j) => { p.hidden = i !== j })
    // 아래로 내려와 있었으면 새 탭의 처음(탭 줄 바로 아래)으로 올린다.
    const top = hero.getBoundingClientRect().bottom + window.scrollY
    if (jump && window.scrollY > top) window.scrollTo({ top, behavior: 'instant' })
  }
  btns.forEach((b, i) => {
    b.addEventListener('click', () => show(i, true))
    b.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (!step) return
      const n = (i + step + btns.length) % btns.length
      show(n, true)
      btns[n]!.focus()
    })
  })
  show(Math.max(0, tabDefs.findIndex(t => t[0] === lastTab)), false)

  const main = el('main', {},
    ...panels,
    wrap(
      el('section', { class: 'actions' },
        el('p', { class: 'sub', text: '이 결과는 이 휴대폰 브라우저에만 저장돼 있어요. 서버로 보내지 않습니다.' }),
        el('div', { class: 'row' }, rebirth, retake, clear)),
      el('footer', {},
        el('p', { text: r.footer }),
        el('p', { class: 'license' }, '이 서비스는 AGPL-3.0 라이선스로 공개됩니다 · ', link('소스 코드', 'https://github.com/jspark-inu/five-words')),
        el('p', { class: 'license' }, '사주·자미두수 계산: ', link('orrery', 'https://github.com/rath/orrery'), ' (AGPL-3.0) · 천문 계산 일부는 Swiss Ephemeris(Astrodienst AG)를 옮긴 코드입니다.'),
        el('p', { class: 'license' }, link('사용한 구성요소와 저작권 안내', 'https://github.com/jspark-inu/five-words/blob/main/NOTICE.md')),
        el('p', { class: 'license' }, '© 2026 five-words contributors'))))

  return el('div', { class: 'report' }, hero, bar, main)
}
