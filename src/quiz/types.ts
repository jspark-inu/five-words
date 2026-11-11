export type Area = 'execute' | 'influence' | 'relation' | 'strategy'

export type Word = {
  id: string
  ko: string
  area: Area
  meaning: string
  /** 단어 고르기 목록의 한 줄 뜻풀이. 순하고 담백하게 쓴다. */
  gloss: string
  /** 단어 고르기 목록에서 gloss 아래에 붙는 자세한 설명. 뜻 한 문장과 실제 모습 한 장면. */
  detail: string
}

