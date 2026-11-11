// 단어 34개와 1단계 목록의 한 줄 설명. 문구를 고칠 때는 이 파일만 고친다.
// gloss는 1단계 목록의 한 줄 설명이고, 2단계 쌍 비교에도 쓰인다. detail은 1단계 목록에서 gloss 아래에 붙는 자세한 설명이다(이 단어가 무슨 뜻인지 한 문장, 실제 모습 한 장면). 이 둘은 모든 단어를 같은 모양(한다체)의 일상 행동 문장으로 쓰고, 기분이 좋다·즐겁다 같은 보상 표현은 어느 단어에도 넣지 않는다.
import type { Word } from '../quiz/types'

export type { Area, Word } from '../quiz/types'

export const WORDS: Word[] = [
  // 실행 9
  { id: 'achievement', ko: '성취', area: 'execute', meaning: '오늘 한 일을 세어 봐야 잠이 온다', gloss: '한 일을 헤아려 봐야 마음이 놓인다', detail: '하루에 끝낸 일의 양을 챙기는 쪽이다. 할 일 목록에 줄을 그어야 하루가 끝난 느낌이 든다.' },
  { id: 'coordination', ko: '조율', area: 'execute', meaning: '사람과 일의 자리를 바꿔 가며 딱 맞춘다', gloss: '누가 뭘 맡을지 자꾸 나눠 보게 된다', detail: '여러 사람과 일을 짜 맞추는 쪽이다. 조별 과제에서 누가 무엇을 언제까지 할지 표로 정리한다.' },
  { id: 'conviction', ko: '신념', area: 'execute', meaning: '내 원칙에 어긋나면 손해를 봐도 안 한다', gloss: '손해가 나도 원칙에 어긋나면 안 한다', detail: '스스로 정한 기준을 지키는 쪽이다. 남들이 다 해도 내 기준에 어긋나는 일이면 빠진다.' },
  { id: 'fairness', ko: '공정', area: 'execute', meaning: '누구에게나 같은 기준이어야 마음이 편하다', gloss: '한 사람만 봐주면 마음에 계속 걸린다', detail: '모두에게 같은 규칙이 적용돼야 하는 쪽이다. 친한 친구라고 예외를 두면 그냥 넘어가지 못한다.' },
  { id: 'caution', ko: '신중', area: 'execute', meaning: '결정 전에 위험부터 하나씩 따져 본다', gloss: '정하기 전에 잘못될 점부터 본다', detail: '움직이기 전에 위험부터 따지는 쪽이다. 새 일을 시작할 때 생길 수 있는 문제를 먼저 적어 본다.' },
  { id: 'order', ko: '질서', area: 'execute', meaning: '계획표와 루틴이 있어야 편하다', gloss: '할 일과 물건을 순서대로 정리해 둔다', detail: '정해 둔 순서와 틀 안에서 움직이는 쪽이다. 일정표와 폴더, 책상이 정해 둔 대로 있어야 일이 손에 잡힌다.' },
  { id: 'concentration', ko: '집중', area: 'execute', meaning: '목표를 정하면 곁눈질하지 않는다', gloss: '하나를 정하면 그것만 계속 파고든다', detail: '목표 하나에 힘을 몰아 쓰는 쪽이다. 하기로 한 일이 있으면 다른 제안이 와도 잘 흔들리지 않는다.' },
  { id: 'accountability', ko: '책임', area: 'execute', meaning: '한번 맡으면 끝까지 내 일이다', gloss: '맡은 일은 끝낼 때까지 내가 쥔다', detail: '맡은 일을 끝까지 내 몫으로 여기는 쪽이다. 약속한 날짜는 사정이 생겨도 어떻게든 지키려 한다.' },
  { id: 'repair', ko: '해결', area: 'execute', meaning: '고장 난 것을 보면 고치고 싶어진다', gloss: '문제가 보이면 원인을 찾고 고친다', detail: '망가지거나 꼬인 것을 바로잡는 쪽이다. 일이 틀어지면 어디서부터 어긋났는지 거슬러 찾아 고친다.' },

  // 영향 8
  { id: 'initiative', ko: '실행', area: 'influence', meaning: '말보다 일단 시작부터 한다', gloss: '일단 해 보고 하면서 바꿔 간다', detail: '생각을 오래 붙잡기보다 바로 손을 대는 쪽이다. 계획이 덜 짜여도 일단 시작하고 하면서 고친다.' },
  { id: 'leadership', ko: '주도', area: 'influence', meaning: '아무도 안 나서면 내가 정리하고 이끈다', gloss: '아무도 안 나서면 내가 방향을 정한다', detail: '여럿 앞에서 방향을 잡는 쪽이다. 회의가 겉돌면 내가 정리해서 "이렇게 하자"고 말한다.' },
  { id: 'expression', ko: '표현', area: 'influence', meaning: '말과 글로 생각을 생생하게 전한다', gloss: '복잡한 내용을 풀어서 전한다', detail: '생각을 말이나 글로 풀어내는 쪽이다. 어려운 내용도 예를 들어 친구가 알아듣게 설명한다.' },
  { id: 'rivalry', ko: '경쟁', area: 'influence', meaning: '순위가 보이면 이기고 싶어진다', gloss: '순위가 보이면 지고 싶지 않아진다', detail: '남과 견주어 내 자리를 재는 쪽이다. 점수나 순위가 나오면 남보다 앞서려고 더 한다.' },
  { id: 'excellence', ko: '탁월', area: 'influence', meaning: '부족한 것보다 잘하는 것을 최고로 키운다', gloss: '잘하는 일을 평균 이상으로 끌어올린다', detail: '부족한 점을 메우기보다 이미 잘하는 것을 더 키우는 쪽이다. 자신 있는 과목이나 기술을 더 깊이 다듬는 데 시간을 쓴다.' },
  { id: 'confidence', ko: '자신감', area: 'influence', meaning: '남들이 뭐라 해도 내 판단을 믿는다', gloss: '남이 달리 봐도 내 판단을 믿는다', detail: '내 판단에 대한 믿음이 단단한 쪽이다. 여러 사람이 반대해도 근거가 서면 내 결정대로 간다.' },
  { id: 'recognition', ko: '인정', area: 'influence', meaning: '남들에게 중요한 사람으로 기억되고 싶다', gloss: '내가 한 일에 반응이 있는지 살핀다', detail: '내가 한 일이 알려지고 기억되길 바라는 쪽이다. 발표나 결과물을 내면 사람들 반응을 챙겨 본다.' },
  { id: 'sociability', ko: '사교', area: 'influence', meaning: '처음 본 사람과도 금방 친해진다', gloss: '모르는 사람에게 말을 거는 편이다', detail: '처음 보는 사람과 쉽게 말을 트는 쪽이다. 처음 간 모임에서도 먼저 인사하고 이름을 묻는다.' },

  // 관계 9
  { id: 'flexibility', ko: '유연', area: 'relation', meaning: '계획이 바뀌어도 그 자리에서 맞춰 간다', gloss: '계획이 바뀌어도 그 자리에서 맞춘다', detail: '정한 계획보다 그때 상황에 맞추는 쪽이다. 약속이 틀어져도 다른 방법을 금방 찾는다.' },
  { id: 'interconnection', ko: '연결', area: 'relation', meaning: '세상 모든 일이 이어져 있다고 느낀다', gloss: '따로 보이던 일이 이어졌다고 느낀다', detail: '모든 일이 어딘가에서 이어져 있다고 보는 쪽이다. 우연처럼 보이는 일에도 다 까닭이 있다고 느낀다.' },
  { id: 'coaching', ko: '코칭', area: 'relation', meaning: '다른 사람이 성장하는 걸 볼 때 기쁘다', gloss: '남이 스스로 해내도록 곁에서 거든다', detail: '남이 자라는 과정을 돕는 쪽이다. 친구가 막히면 답을 주기보다 스스로 풀 수 있게 실마리를 준다.' },
  { id: 'sympathy', ko: '공감', area: 'relation', meaning: '말 안 해도 상대 기분이 느껴진다', gloss: '말하지 않아도 표정에서 기분이 읽힌다', detail: '남의 감정을 내 일처럼 느끼는 쪽이다. 친구가 괜찮다고 해도 표정만 보고 힘든 걸 알아챈다.' },
  { id: 'concord', ko: '조화', area: 'relation', meaning: '싸움보다 서로 맞는 지점을 찾는다', gloss: '의견이 부딪히면 겹치는 지점을 본다', detail: '다툼보다 합의를 찾는 쪽이다. 의견이 갈리면 누가 맞는지보다 다 같이 동의할 수 있는 지점을 찾는다.' },
  { id: 'inclusion', ko: '포용', area: 'relation', meaning: '소외된 사람이 있으면 먼저 챙긴다', gloss: '모임에서 빠진 사람이 없는지 살핀다', detail: '누구도 빠지지 않게 챙기는 쪽이다. 무리에 끼지 못한 친구가 보이면 먼저 불러서 같이 한다.' },
  { id: 'tailoring', ko: '맞춤', area: 'relation', meaning: '사람마다 다른 점을 보고 다르게 대한다', gloss: '사람마다 말과 방식을 달리한다', detail: '사람마다 다른 점을 보고 대하는 쪽이다. 같은 부탁도 상대 성격에 따라 말투와 방법을 바꾼다.' },
  { id: 'optimism', ko: '낙관', area: 'relation', meaning: '어떤 상황에서도 좋은 면을 먼저 본다', gloss: '일이 틀어져도 건질 점부터 본다', detail: '어려운 일에서도 나아질 길을 보는 쪽이다. 시험을 망쳐도 다음에 바꿀 점부터 찾는다.' },
  { id: 'closeness', ko: '친밀', area: 'relation', meaning: '넓은 인맥보다 깊은 소수가 좋다', gloss: '속마음을 나누는 몇 명과 깊이 지낸다', detail: '많은 사람보다 깊은 몇 명과 지내는 쪽이다. 아는 사람은 적어도 서로 속사정까지 아는 친구가 있다.' },

  // 전략적 사고 8
  { id: 'analysis', ko: '분석', area: 'strategy', meaning: '근거와 숫자를 봐야 믿는다', gloss: '주장을 들으면 근거와 숫자를 확인한다', detail: '근거를 따져 보고 믿는 쪽이다. 그럴듯한 말을 들어도 "그 숫자는 어디서 나왔지?"부터 묻는다.' },
  { id: 'background', ko: '맥락', area: 'strategy', meaning: '지금을 이해하려면 과거부터 찾아본다', gloss: '앞뒤 사정을 알아야 판단이 선다', detail: '지금 일을 이해하려고 지난 일부터 살피는 쪽이다. 새 일을 맡으면 전에는 어떻게 해 왔는지부터 찾아본다.' },
  { id: 'future', ko: '미래', area: 'strategy', meaning: '아직 없는 것이 선명하게 보인다', gloss: '아직 없는 모습을 자주 그려 본다', detail: '앞으로 올 모습을 자주 떠올리는 쪽이다. 몇 년 뒤 내 모습이나 달라질 세상을 구체적으로 그려 본다.' },
  { id: 'ideas', ko: '발상', area: 'strategy', meaning: '새로운 생각이 끊임없이 떠오른다', gloss: '한 문제에 아이디어가 줄줄 나온다', detail: '새 아이디어를 잘 떠올리는 쪽이다. 전혀 다른 것끼리 엮어 보다가 엉뚱한 해결책을 내놓는다.' },
  { id: 'collecting', ko: '수집', area: 'strategy', meaning: '언젠가 쓸 것 같아 자료를 모아 둔다', gloss: '언젠가 쓸 자료를 저장해 둔다', detail: '정보와 물건을 모아 두는 쪽이다. 쓸 만한 글이나 사진, 링크를 보면 나중을 위해 따로 저장한다.' },
  { id: 'reflection', ko: '사색', area: 'strategy', meaning: '혼자 오래 생각하는 시간이 좋다', gloss: '혼자 생각하는 시간이 있어야 정리된다', detail: '혼자 깊이 생각하는 쪽이다. 하루가 끝나면 있었던 일과 떠오른 생각을 곱씹어 본다.' },
  { id: 'learning', ko: '배움', area: 'strategy', meaning: '결과보다 배우는 과정 자체가 즐겁다', gloss: '처음 접하는 것을 알아보며 익힌다', detail: '새로 알아 가는 과정 자체에 끌리는 쪽이다. 궁금한 게 생기면 자료를 찾아 끝까지 알아본다.' },
  { id: 'strategy', ko: '전략', area: 'strategy', meaning: '여러 길 중 가장 좋은 길이 금방 보인다', gloss: '막힐 때 쓸 다른 길을 미리 둔다', detail: '여러 길을 놓고 가장 나은 길을 고르는 쪽이다. 계획을 세울 때 막히면 쓸 두 번째, 세 번째 방법까지 생각해 둔다.' },
]
