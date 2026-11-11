// 승인된 견본(report-deep-sample.html)에 적힌 짝 문구를 시험용으로 옮긴 것. 견본 학생: 발상 미래 경쟁 공감 성취.
// 견본은 경쟁+공감을 핵심 자산과 구조적 위험에 모두 올렸지만, 짝 하나는 syn 또는 ten 중 하나라서 위험 쪽만 남겼다.
import { pairKey, type PairCopy } from '../../src/content/deep'

const syn = (line: string, body: string, asset?: PairCopy['asset']): PairCopy => ({ type: 'syn', line, body, ...(asset ? { asset } : {}) })
const ten = (line: string, body: string, risk?: PairCopy['risk']): PairCopy => ({ type: 'ten', line, body, ...(risk ? { risk } : {}) })

export const SAMPLE_TOP = ['ideas', 'future', 'rivalry', 'sympathy', 'achievement']
export const SAMPLE_FAR = ['order', 'concord', 'caution']
export const SAMPLE_SUPPORT = ['strategy', 'learning']

export const SAMPLE_PAIRS: Record<string, PairCopy> = {
  [pairKey('ideas', 'future')]: syn('떠올린 것에 곧바로 몇 년 뒤가 붙습니다.',
    '새 생각이 나오면 곧바로 "이게 5년 뒤에 뭐가 될까"로 넘어갑니다. 농담처럼 꺼낸 아이디어가 저녁엔 5개년 계획이 되어 있습니다. 둘 다 아직 없는 것을 다루는 단어라서, 오늘 손에 쥔 결과는 늘 모자라 보입니다.',
    { title: '없는 것을 말로 꺼내는 힘', body: '아직 없는 것을 떠올리고, 그게 왜 앞으로 중요한지까지 설명합니다. 둘이 같이 있어야 듣는 쪽이 고개를 끄덕일 이유가 생깁니다.' }),
  [pairKey('future', 'rivalry')]: ten('먼 그림과 눈앞의 순위가 내 시간을 놓고 다툽니다.',
    '먼 목표가 생기면 거기까지 가는 길의 경쟁자도 같이 보입니다. 오래 달리는 힘이 되지만, 눈앞의 순위가 먼 그림을 슬쩍 밀어낼 때가 있습니다.'),
  [pairKey('ideas', 'rivalry')]: syn('남들이 안 해 본 방식으로 이기고 싶어집니다.',
    '같은 방식으로 1등 하는 것보다 아무도 안 해 본 방식으로 이기는 쪽에 끌립니다. 공모전에서 힘이 나는 짝입니다.'),
  [pairKey('ideas', 'sympathy')]: syn('', '아이디어를 사람 얼굴에서 얻습니다. 친구가 불편해하는 걸 보고 "이런 게 있으면 좋겠다"가 나옵니다.'),
  [pairKey('ideas', 'achievement')]: ten('', '벌이는 쪽과 줄 긋는 쪽이 한 몸에 있습니다. 덕분에 아이디어가 실제로 나오기도 하고, 목록이 안 줄어들기도 합니다.',
    { title: '벌인 일이 끝낸 일보다 늘 많습니다', body: '새로 벌이는 재미와 줄 긋는 재미가 같이 있으니 목록은 길어지고 끝난 일의 만족은 짧습니다. 시작만 한 일들이 쌓이면 잘하고 있는데도 늘 밀린 사람처럼 느낍니다.', remedy: '동시에 진행하는 일의 개수를 정해 두세요. 새로 하나 넣으려면 하나를 끝내거나 공개적으로 접어야 합니다. 접는 것도 줄 하나로 칩니다.' }),
  [pairKey('future', 'sympathy')]: syn('', '앞날 얘기를 하면서 듣는 사람 표정을 같이 봅니다. 사람이 따라올 수 있는 속도로 먼 얘기를 풀어 주는 짝입니다.'),
  [pairKey('future', 'achievement')]: syn('', '먼 그림이 오늘의 목록으로 내려오면 제일 잘 돕니다.',
    { title: '먼 그림을 오늘 일로 쪼개는 힘', body: '큰 얘기를 하고 끝나지 않고 오늘 칸에 적어서 지웁니다. 말로 끝나지 않는다는 게 이 짝의 값입니다.' }),
  [pairKey('rivalry', 'sympathy')]: ten('', '상대가 애쓰는 게 보이는데 이기고 싶습니다. 이겨 놓고 미안해하고, 져 주면 억울합니다.',
    { title: '이겨도 져도 마음이 편치 않습니다', body: '상대 표정이 읽히는데 이기고 싶으니 한쪽 마음을 눌러야 합니다. 축하와 계산이 같이 돌아서 친한 사람의 좋은 소식이 제일 피곤한 소식이 되기도 합니다.', remedy: '겨룰 판과 겨루지 않을 사람을 미리 나눠 두세요. 가장 가까운 한두 명은 순위표에서 빼도 승부욕은 줄지 않습니다.' }),
  [pairKey('rivalry', 'achievement')]: syn('', '남이 있으면 더 달리고, 없어도 혼자 달립니다. 서로를 계속 밀어 주는 짝이라 쉬는 날이 잘 안 생깁니다.'),
  [pairKey('sympathy', 'achievement')]: syn('', '남의 일까지 내 줄로 삼습니다. 친구 부탁을 들어 주고 "한 일"에 넣습니다.'),
}
export const SAMPLE_PAIR_TOP = { 'ideas>future': '없는 걸 떠올리는 게 먼저고, 그게 몇 년 뒤에 뭐가 될지가 바로 따라붙는 사람입니다. 그래서 머릿속이 아직 없는 것들로 꽉 차 있습니다.' }
