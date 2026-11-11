// 심층 보고서의 문구 칸. 문구는 9b~9d에서 데이터로 채운다(운세는 luckBlocks 하나).
// 칸이 비어 있으면 화면은 그 제목·카드·자리표시까지 통째로 그리지 않는다.
// 문구를 더하려면 src/content/deep-data/ 에 파일을 만들고 그 폴더의 index.ts 목록에 넣는다.

/** 짝 하나의 문구. 짝 키는 pairKey(a, b)로 만든다(두 단어 id를 사전순으로 정렬해 "a+b"). */
export type PairAsset = { title: string; body: string }
export type PairRisk = { title: string; body: string; remedy: string }
export type PairCopy = {
  /** syn: 시너지, ten: 긴장. 삼각형 변의 색과 핵심 자산·구조적 위험 중 어느 쪽에 쓰일지를 정한다. */
  type: 'syn' | 'ten'
  /** 삼각형 변 옆에 한 줄로 쓰인다. */
  line: string
  /** 이 두 단어가 1위·2위인 학생의 "한 줄로 말하면". 두 문장. 없으면 line을 쓴다. deep-data/pair-summaries-N.ts에서도 채운다. */
  summary?: string
  /** "열 가지 짝"의 한 문단. */
  body: string
  /** type이 syn일 때: 핵심 자산 셋에 들어갈 후보. 제목은 마침표 없이 쓴다. */
  asset?: PairAsset
  /** type이 ten일 때: 구조적 위험 셋에 들어갈 후보. 제목은 소제목, remedy는 처방 한두 문장. */
  risk?: PairRisk
}

export type WordDeep = {
  /** 한 줄 뜻. */
  meaning?: string
  /** 본질 한 문단. 없으면 기존 explain을 쓴다. */
  essence?: string
  /** 일상 장면. */
  scenes?: string[]
  goodEnv?: string
  badEnv?: string
  trap?: string
  howTo?: string
  /** 같이 일할 때 맡는 몫 한 줄. */
  role?: string
  /** 쉬자고 할 때 이 단어의 반응 한 줄. */
  rest?: string
  /** 쉼을 편드는 단어라면 그 설명 한 줄. */
  restAllow?: string
  /** 짝 문구가 없을 때 핵심 자산 셋을 채우는 단어 단위 문구. 제목은 마침표 없이 쓴다. */
  asset?: PairAsset
  /** 짝 문구가 없을 때 구조적 위험 셋을 채우는 단어 단위 문구. 단어 카드의 함정·쓰는 법과 겹치지 않게 따로 쓴다. */
  fillRisk?: { text: string; remedy: string }
  /** 다섯 안에는 없지만 가까운 단어("받침")일 때의 설명. */
  support?: string
  signals?: { early: string; middle: string; late: string }
  /** 손이 먼저 갈 만한 활동. */
  activity?: string
  /** 오래 있으면 닳기 쉬운 곳. */
  avoid?: string
}

export type FrameKey =
  | 'strengthIntro' | 'wordsIntro' | 'togetherIntro' | 'areaIntro' | 'riskIntro' | 'careerIntro' | 'farIntro' | 'supportIntro'
  | 'luckIntro' | 'luckIntroNoZiwei' | 'luckFlowIntro' | 'sajuIntro' | 'sajuTerms' | 'relationIntro' | 'daewoonIntro' | 'ziweiIntro' | 'palaceIntro' | 'crossIntro' | 'manualIntro'

export type DeepContent = {
  frames: Partial<Record<FrameKey, string>>
  /** 단어 id → 단어별 문구. */
  words: Record<string, WordDeep>
  /** "1위>2위" 단어 id 쌍 → 한 줄로 말하면. */
  pairTop: Record<string, string>
  /** pairKey(a, b) → 짝 문구. 비어 있는 짝은 건너뛰고, 단어 단위 문구로 채운다. */
  pairs: Record<string, PairCopy>
  /** 영역 개수 서명(areaSignature) → 영역 해석. */
  areas: Record<string, string>
  /** 비어 있는 영역 id를 strategy, execute, influence, relation 순서로 +로 이은 것(execute+influence 등) → 해석. */
  areaEmpty: Record<string, string>
  /** 먼 단어가 2개 이상 모인 영역 id → 해석. */
  areaFar: Record<string, string>
  /**
   * 쉼 구조적 위험: 다섯 단어가 모두 쉼에 반대할 때의 도입 문단과 처방.
   * signals는 쉼에 관한 신호이고, signalsFromWord의 단어가 다섯 안에 있으면 그 단어의 신호를 대신 쓴다(쉼 이야기를 이미 하는 신호).
   */
  restRisk?: { intro: string; remedy?: string; signals?: { early: string; middle: string; late: string }; signalsFromWord?: string[] }
  /** pairKey → 그 짝의 위험 아래 신호로 쓰면 위험과 어긋나는 단어. */
  signalConflicts: Record<string, string[]>
  /**
   * 운세 블록. 키 `가족[인자]`(필드는 `#필드`) → 문구. 조립기(src/report/luck.ts)가 사주·자미두수 특징으로 고른다.
   * 가능한 키 전부와 글자 수는 src/content/luck-catalogue.ts. 없는 키는 조용히 건너뛴다. 문구에서 굵게 할 용어는 **용어**로 감싼다.
   */
  luckBlocks: Record<string, string>
}

export type DeepContentPart = Partial<{
  frames: DeepContent['frames']
  words: DeepContent['words']
  pairTop: DeepContent['pairTop']
  pairs: DeepContent['pairs']
  /** pairKey → PairCopy.summary. 짝 문구와 따로 쓰는 파일이라 다 읽은 뒤에 짝에 합친다. */
  pairSummaries: Record<string, string>
  areas: DeepContent['areas']
  areaEmpty: DeepContent['areaEmpty']
  areaFar: DeepContent['areaFar']
  restRisk: DeepContent['restRisk']
  signalConflicts: DeepContent['signalConflicts']
  luckBlocks: DeepContent['luckBlocks']
}>

export const emptyDeep = (): DeepContent => ({
  frames: {}, words: {}, pairTop: {}, pairs: {}, areas: {}, areaEmpty: {}, areaFar: {}, signalConflicts: {},
  luckBlocks: {},
})

/** 여러 파일의 문구를 하나로 합친다. 같은 키가 겹치면 뒤의 것이 이긴다. */
export function loadDeep(parts: DeepContentPart[]): DeepContent {
  const out = emptyDeep()
  for (const p of parts) {
    Object.assign(out.frames, p.frames)
    for (const [id, w] of Object.entries(p.words ?? {})) out.words[id] = { ...out.words[id], ...w }
    Object.assign(out.pairTop, p.pairTop)
    Object.assign(out.pairs, p.pairs)
    Object.assign(out.areas, p.areas)
    Object.assign(out.areaEmpty, p.areaEmpty)
    Object.assign(out.areaFar, p.areaFar)
    if (p.restRisk) out.restRisk = p.restRisk
    Object.assign(out.signalConflicts, p.signalConflicts)
    Object.assign(out.luckBlocks, p.luckBlocks)
  }
  for (const p of parts) {
    for (const [key, summary] of Object.entries(p.pairSummaries ?? {})) {
      const pair = out.pairs[key]
      if (pair) pair.summary = summary
    }
  }
  return out
}

/**
 * 짝 이름("앞+뒤")의 앞뒤 순서. 짝 문구는 이 순서로 쓰여 있다. 처음엔 단어 id의 알파벳 순서였는데,
 * 공개 전에 단어 id 아홉 개의 이름을 바꾸면서(2026-11-11) 순서가 달라지지 않게 그때의 순서를 그대로 적어 둔다.
 */
export const PAIR_ORDER: readonly string[] = [
  'achievement', 'analysis', 'caution', 'coaching', 'collecting', 'expression', 'rivalry', 'confidence',
  'background', 'conviction', 'coordination', 'sympathy', 'fairness', 'flexibility', 'concentration',
  'future', 'concord', 'ideas', 'inclusion', 'initiative', 'interconnection', 'leadership', 'learning',
  'excellence', 'optimism', 'order', 'recognition', 'reflection', 'closeness', 'repair', 'accountability',
  'sociability', 'strategy', 'tailoring',
]
const PAIR_RANK = new Map(PAIR_ORDER.map((id, i) => [id, i]))
export const pairKey = (a: string, b: string): string => {
  const ra = PAIR_RANK.get(a), rb = PAIR_RANK.get(b)
  const aFirst = ra !== undefined && rb !== undefined ? ra <= rb : a <= b
  return aFirst ? `${a}+${b}` : `${b}+${a}`
}
