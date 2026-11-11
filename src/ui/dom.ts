// 화면의 모든 글은 textContent로만 넣는다. 데이터가 HTML로 해석되는 길을 만들지 않는다.
type Props = { class?: string; text?: string } & Record<string, string | undefined>
type Kid = Node | string | null | undefined | false

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else node.setAttribute(k, v)
  }
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false) continue
    node.append(kid)
  }
  return node
}

/** "제목. 내용"에서 첫 문장을 굵게. 마침표가 없으면 통째로 일반 글. */
export function boldLead(text: string): Node[] {
  const m = /^(.+?[.!?])(\s+[\s\S]*)?$/.exec(text)
  if (!m) return [document.createTextNode(text)]
  return [el('b', { text: m[1] }), document.createTextNode(m[2] ?? '')]
}

/** **굵게** 표시를 굵은 글씨로. 그 밖의 글은 그대로 글자로만 넣는다. */
export function boldInline(text: string): Node[] {
  const out: Node[] = []
  text.split('**').forEach((part, i) => {
    if (part === '') return
    out.push(i % 2 === 1 ? el('b', { text: part }) : document.createTextNode(part))
  })
  return out
}

/**
 * 운세 문구의 첫 문장과 나머지. 굵은 표시(**)는 문장 경계를 찾을 때 건너뛰고, 경계는 원문 위치로 돌려준다.
 * (전에는 표시를 지운 글에서 찾은 첫 문장을 원문에서 다시 찾다가 못 찾아 끝 글자가 두 번 찍혔다.) 첫 문장이 없으면 null.
 */
export function splitLead(text: string): { lead: string; rest: string } | null {
  let plainLen = 0
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('**', i)) { i++; continue }
    plainLen++
    const ch = text[i] as string
    if (plainLen > 1 && '.!?'.includes(ch)) {
      const next = text[i + 1]
      if (next === undefined || /\s/.test(next)) return { lead: text.slice(0, i + 1), rest: text.slice(i + 1) }
    }
  }
  return null
}

/** 첫 문장을 굵게 하고 나머지는 **굵게** 표시를 따른다. 운세 문구용. */
export function boldLeadInline(text: string): Node[] {
  const sp = splitLead(text)
  if (!sp || text.startsWith('**')) return boldInline(text)
  return [el('b', { text: sp.lead.replace(/\*\*/g, '') }), ...boldInline(sp.rest)]
}

export function mount(root: HTMLElement, ...kids: Node[]): void {
  root.replaceChildren(...kids)
  window.scrollTo(0, 0)
}
