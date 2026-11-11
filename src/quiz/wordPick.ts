// 단어 목록 섞기. 위쪽 단어가 더 자주 뽑히는 쏠림을 줄이려고 검사마다 34개를 섞어 보여 준다.
import { WORDS } from '../content/words'
import type { Word } from './types'

export function shuffledWords(random: () => number = Math.random): Word[] {
  const out = [...WORDS]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
