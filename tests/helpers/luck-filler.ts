import { WRITE_KEYS } from '../../src/content/luck-catalogue'

/** 모든 블록에 목표 글자 수만큼의 가짜 문구를 채운다. 첫 문장은 마침표로 끝나는 짧은 문장이다. */
export function fillerBlocks(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const w of WRITE_KEYS) {
    const head = `${w.key.replace(/[[\]]/g, ' ')}.`
    let t = head
    while (t.length < w.chars) t += ' 가나다라마바사 아자차카타파하 가나다라.'
    const cut = t.slice(0, Math.max(w.chars, head.length))
    out[w.key] = cut === head ? head : cut.replace(/ [^ ]*$/, '.').replace(/\.\.$/, '.')
  }
  return out
}
