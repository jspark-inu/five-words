import type { DeepContentPart } from '../deep'
import { WORDS_EXECUTE } from './words-execute'
import { WORDS_INFLUENCE } from './words-influence'
import { WORDS_RELATION } from './words-relation'
import { WORDS_STRATEGY } from './words-strategy'
import { WORD_ASSETS } from './words-assets'
import { ASSEMBLY } from './assembly'
import { FRAMES } from './frames'
import { WORD_FILL_RISKS } from './words-fill-risk'
import { SIGNAL_CONFLICTS } from './signal-conflicts'
import { PAIRS_1 } from './pairs-1'
import { PAIRS_2 } from './pairs-2'
import { PAIRS_3 } from './pairs-3'
import { PAIRS_4 } from './pairs-4'
import { PAIRS_5 } from './pairs-5'
import { PAIRS_6 } from './pairs-6'
import { LUCK_1 } from './luck-1'
import { LUCK_2 } from './luck-2'
import { LUCK_3 } from './luck-3'
import { LUCK_4 } from './luck-4'
import { LUCK_5 } from './luck-5'
import { LUCK_6 } from './luck-6'
import { LUCK_7 } from './luck-7'
import { PAIR_SUMMARIES_1 } from './pair-summaries-1'
import { PAIR_SUMMARIES_2 } from './pair-summaries-2'
import { PAIR_SUMMARIES_3 } from './pair-summaries-3'
import { PAIR_SUMMARIES_4 } from './pair-summaries-4'
import { PAIR_SUMMARIES_5 } from './pair-summaries-5'
import { PAIR_SUMMARIES_6 } from './pair-summaries-6'

// 9b(강점 문구), 9c(조립 규칙의 문구), 9d(운세 문구)가 각자 파일을 만들어 여기에 더한다.
export const DEEP_PARTS: DeepContentPart[] = [
  WORDS_EXECUTE, WORDS_INFLUENCE, WORDS_RELATION, WORDS_STRATEGY, WORD_ASSETS, WORD_FILL_RISKS, ASSEMBLY, FRAMES, SIGNAL_CONFLICTS,
  // 짝 문구 561개는 여섯 파일로 나눠 쓴다. 배치 나눔과 출력 형식은 pair-batches.json에 있다.
  PAIRS_1, PAIRS_2, PAIRS_3, PAIRS_4, PAIRS_5, PAIRS_6,
  // 운세 블록은 여섯 파일로 나눠 쓴다. 배치 나눔과 출력 형식은 luck-batches.json에 있다. luck-sample.ts는 시험 전용이라 여기 넣지 않는다.
  LUCK_1, LUCK_2, LUCK_3, LUCK_4, LUCK_5, LUCK_6, LUCK_7,
  // 짝의 "한 줄로 말하면"도 짝 문구와 같은 여섯 묶음으로 쓴다. 배치 나눔과 규칙은 pair-summary-batches.json에 있다.
  { pairSummaries: PAIR_SUMMARIES_1 }, { pairSummaries: PAIR_SUMMARIES_2 }, { pairSummaries: PAIR_SUMMARIES_3 },
  { pairSummaries: PAIR_SUMMARIES_4 }, { pairSummaries: PAIR_SUMMARIES_5 }, { pairSummaries: PAIR_SUMMARIES_6 },
  // 발상>미래 순서의 승인 문장은 pairs-6.ts의 future+ideas 요약이다("먼저"가 발상을 가리킨다). 미래>발상 순서는 따로 쓴 이 줄을 쓴다.
  { pairTop: { 'future>ideas': '몇 년 뒤의 모습이 먼저 그려지고, 거기 채울 아직 없는 것들이 뒤따라 떠오르는 사람입니다. 큰 그림의 빈칸이 하루에도 몇 번씩 메워집니다.' } },
]
