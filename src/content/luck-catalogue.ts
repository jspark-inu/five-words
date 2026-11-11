// 운세 블록 목록. 키 하나가 문구 하나이고, 조립기(src/report/luck.ts)는 이 목록에 있는 키만 요청한다.
// 키 꼴: `가족[인자]` 또는 `가족[인자]#필드`. 인자는 한자(일간·간지·글자 관계) 또는 한글(십신·별·궁·신살)이다.
import { GODS, GROUPS, MAIN_STAR_HANJA, MINOR_STAR_HANJA } from '../chart/features'
import { starKo } from '../chart/names'

export const STEMS = [...'甲乙丙丁戊己庚辛壬癸']
export const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥']
export const GANZI60 = Array.from({ length: 60 }, (_, i) => (STEMS[i % 10] as string) + (BRANCHES[i % 12] as string))
export const PALACE_SHORT = ['명궁', '형제', '부처', '자녀', '재백', '질액', '천이', '교우', '관록', '전택', '복덕', '부모'] as const
export const PALACE_HANJA = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'] as const
export const palaceShort = (hanja: string): string => PALACE_SHORT[PALACE_HANJA.indexOf(hanja as (typeof PALACE_HANJA)[number])] ?? hanja
export const HUA = ['화록', '화권', '화과', '화기'] as const
export const HUA_HANJA: Record<string, string> = { 化祿: '화록', 化權: '화권', 化科: '화과', 化忌: '화기' }
export const MAIN_STARS_KO = MAIN_STAR_HANJA.map(starKo)
export const MINOR_STARS_KO = MINOR_STAR_HANJA.map(starKo)
export const ELEMENTS_KO = ['목', '화', '토', '금', '수'] as const
export const PATTERNS = ['식신생재', '상관생재', '관인상생', '살인상생', '재생관', '재생살', '편인도식', '비겁탈재', '상관견관'] as const
export const SINSAL_NAMES = ['천을귀인', '천덕귀인', '월덕귀인', '문창귀인', '양인', '백호', '괴강', '도화', '홍염', '금여'] as const
export const SINSAL12_NAMES = ['겁살', '재살', '천살', '지살', '연살', '월살', '망신', '장성', '반안', '역마', '육해', '화개'] as const
export const UNSEONG_NAMES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const

// 글자 관계. 엔진이 돌려주는 모든 경우를 열거했다(지지 쌍 전체를 훑어 얻은 목록).
const BRANCH_RELATIONS = [
  '子丑合', '寅亥合', '卯戌合', '辰酉合', '巳申合', '午未合',
  '子辰半合', '子申半合', '丑酉半合', '巳酉半合', '寅午半合', '午戌半合', '卯未半合', '卯亥半合',
  '子午沖', '丑未沖', '寅申沖', '卯酉沖', '辰戌沖', '巳亥沖',
  '子卯刑', '丑未刑', '丑戌刑', '未戌刑', '寅巳刑', '寅申刑', '巳申刑', '辰辰刑', '午午刑', '酉酉刑', '亥亥刑',
  '子酉破', '丑辰破', '寅亥破', '卯午破', '巳申破', '未戌破',
  '子未害', '丑午害', '寅巳害', '卯辰害', '申亥害', '酉戌害',
  '子未怨嗔', '丑午怨嗔', '寅酉怨嗔', '卯申怨嗔', '辰亥怨嗔', '巳戌怨嗔',
  '子酉鬼門', '丑午鬼門', '寅未鬼門', '卯申鬼門', '辰亥鬼門', '巳戌鬼門',
]
const STEM_RELATIONS = ['甲己合', '乙庚合', '丙辛合', '丁壬合', '戊癸合', '甲庚沖', '乙辛沖', '丙壬沖', '丁癸沖']
export const RELATION_KEYS = [...BRANCH_RELATIONS, ...STEM_RELATIONS]
export const REL_TYPE_KO: Record<string, string> = { 合: '합', 半合: '반합', 沖: '충', 刑: '형', 破: '파', 害: '해', 怨嗔: '원진', 鬼門: '귀문' }
export const POS_PAIRS = ['연-월', '연-일', '연-시', '월-일', '월-시', '일-시']
const RELPOS_BRANCH_TYPES = ['합', '충', '형', '파', '반합', '해', '원진', '귀문']
const YEAR_REL_TYPES = ['합', '반합', '충', '형', '자형', '파', '해', '원진', '귀문']
export const YEAR_REL_PLACES = ['시지', '일지', '월지', '연지']

export type FieldSpec = { name: string; chars: number; ctx: string }
export type Family = {
  id: string; label: string; area: 'total' | 'year' | 'study'
  /** 쓰이는 자리와 쓰는 법. 글 쓰는 쪽이 읽는다. */
  ctx: string
  /** 조립기가 문구 앞에 먼저 붙이는 문장(있으면 문구에서 되풀이하지 않는다). */
  lead: string
  chars: number
  keys: string[]
  fields?: FieldSpec[]
}

const k = (id: string, ...args: string[]) => `${id}[${args.join(':')}]`
const fam = (f: Family): Family => f
const pairs = (a: readonly string[], b: readonly string[]) => a.flatMap(x => b.map(y => `${x}+${y}`))

export const FAMILIES: Family[] = [
  fam({ id: 'gistStrong', label: '총운 요약 앞 문장', area: 'total', chars: 40, keys: [...PATTERNS.map(p => k('gistStrong', p)), ...STEMS.map(s => k('gistStrong', s))],
    ctx: '총운 맨 위 요약의 첫 문장. 이 사람이 무엇으로 길을 여는지 한 문장. 구조(식신생재 등)가 있으면 구조 쪽을, 없으면 일간 쪽을 쓴다. 평서문 한 문장, 마침표로 끝낸다.', lead: '' }),
  fam({ id: 'gistTheme', label: '총운 요약 뒤 문장', area: 'total', chars: 50,
    keys: [...ELEMENTS_KO.map(e => k('gistTheme', `${e}0`)), ...GROUPS.map(g => k('gistTheme', `${g}없음`)), ...ELEMENTS_KO.map(e => k('gistTheme', `${e}많음`))],
    ctx: '총운 요약의 둘째 문장. 비어 있거나 넘치는 것이 평생 따라다니는 주제로 어떻게 보이는지 한 문장. "수0"은 수(水)가 겉 글자에도 지장간(숨은 글자)에도 없음, "관성없음"은 관성이 겉에도 숨은 글자에도 없음, "금많음"은 금(金)의 세기가 전체의 40% 이상.', lead: '' }),
  fam({ id: 'glanceStrong', label: '한눈에 보기 총운 앞 절', area: 'total', chars: 20, keys: [...PATTERNS.map(p => k('glanceStrong', p)), ...STEMS.map(s => k('glanceStrong', s))],
    ctx: '한눈에 보기의 총운 한 줄 앞 절. 쉼표로 끝나서 주제 절이 이어 붙는다. 예: 혼자 만들어 내는 힘은 큰데,', lead: '' }),
  fam({ id: 'glanceTheme', label: '한눈에 보기 총운 뒤 절', area: 'total', chars: 20, keys: [...ELEMENTS_KO.map(e => k('glanceTheme', `${e}0`)), ...GROUPS.map(g => k('glanceTheme', `${g}없음`)), ...ELEMENTS_KO.map(e => k('glanceTheme', `${e}많음`))],
    ctx: '한눈에 보기의 총운 한 줄 뒤 절. 평생을 단정하지 않는다. 예: 쉼이 늘 모자란 사람입니다.', lead: '' }),
  fam({ id: 'dayStem', label: '일간', area: 'total', chars: 150, keys: STEMS.map(s => k('dayStem', s)),
    ctx: '총운 첫 문단. 일간 이름(예: 정화(丁火))을 굵게, 자연물 비유와 그 비유가 일하는 방식에서 뜻하는 것을 쓴다. 문단이 이 문구로 시작한다.', lead: '' }),
  fam({ id: 'dayPillar', label: '일주', area: 'total', chars: 90, keys: GANZI60.map(g => k('dayPillar', g)),
    ctx: '일간 문단 바로 뒤에 이어 붙는 두 문장. 일간과 일지의 조합이 만드는 결을 말한다. 일간 설명을 되풀이하지 않는다.', lead: '' }),
  fam({ id: 'dayStrength', label: '일간 강약', area: 'total', chars: 90, keys: ['신강', '중화', '신약'].map(s => k('dayStrength', s)),
    ctx: '일간의 기운이 센 편인지(신강), 한쪽으로 기울지 않았는지(중화), 약한 편인지(신약). 월지·일지·나머지 글자를 점수로 합친 단순한 규칙의 결과다. 일간 문단 뒤에 이어 붙는 두 문장 이내. 단정하지 않고 "센 편", "약한 편"으로 말한다. 합격·건강·수명을 말하지 않는다.', lead: '' }),
  fam({ id: 'pattern', label: '이름 있는 구조', area: 'total', chars: 170, keys: PATTERNS.map(p => k('pattern', p)),
    fields: [{ name: 'howTo', chars: 60, ctx: '이렇게 써 보세요에 들어갈 한두 문장. 명령형이 아니라 권하는 말투.' }],
    ctx: '식신생재 등은 총운 첫머리에, 편인도식·상관견관은 일하고 공부할 때는 쪽 막판 문단에, 비겁탈재는 돈은 쪽에 들어간다. 전통에서 이 구조를 어떻게 보는지 먼저, 그 구조를 가진 사람이 일상에서 보이는 모습을 다음에. 그 구조를 이루는 십신의 특정 종류(편재인지 정재인지 등)는 쓰지 않는다.',
    lead: '**식신생재(食神生財)** 구조입니다.' }),
  fam({ id: 'sinsal', label: '신살', area: 'total', chars: 110, keys: SINSAL_NAMES.map(s => k('sinsal', s)),
    fields: [{ name: 'howTo', chars: 60, ctx: '이렇게 써 보세요에 들어갈 한두 문장.' }],
    ctx: '신살 하나의 뜻과 일상 모습. 명식 펼침에서도 이 문구만 따로 보이니 앞 문장 없이도 읽혀야 한다. 문창귀인은 학업운에만 쓰이니 공부와 글 쪽으로 쓴다.',
    lead: '**천을귀인(天乙貴人)**이 일지와 연지에 있습니다.' }),
  fam({ id: 'cross', label: '두 전통이 같은 말', area: 'total', chars: 50, keys: [k('cross', '귀인')],
    ctx: '사주에 천을귀인이 있고 자미두수에 천월·천괴가 있을 때 귀인 문단 끝에 붙는 말. 두 전통이 같은 얘기를 한다는 점을 한두 문장으로.', lead: '자미두수에도 **천월(天鉞)**과 **천괴(天魁)**가 있습니다.' }),
  fam({ id: 'mingBorrowed', label: '명궁에 주성이 없을 때', area: 'total', chars: 110, keys: [k('mingBorrowed', '명궁')],
    ctx: '명궁에 주성이 없어 맞은편 궁의 별을 빌려 오는 사람. 만나는 사람과 환경에 따라 색이 달라지는 편이라는 풀이와 일상 모습. 별 이름은 쓰지 않는다(뒤에 별 문구가 따로 이어진다).', lead: '자미두수에서 나를 뜻하는 **명궁(命宮)**에 주성이 없습니다.' }),
  fam({ id: 'theme', label: '평생 따라다니는 주제', area: 'total', chars: 130, keys: ELEMENTS_KO.map(e => k('theme', e)),
    fields: [{ name: 'howTo', chars: 60, ctx: '이렇게 써 보세요에 들어갈 한두 문장.' }],
    ctx: '해당 오행이 겉 글자에도 지장간에도 없는 사람의 평생 주제(수=쉼, 토=자리 잡기, 금=맺기, 목=시작, 화=표현). 사주 한 곳만 말해도, 자미두수·강점 리포트가 같이 짚는 경우에도 어울리는 결론 문장 두세 개. 조립기가 앞에 근거 문장(겉·숨은 글자 모두 없음, 신궁 위치)을 붙인다.',
    lead: '사주에 쉼을 뜻하는 **수(水)**가 겉 글자에도 숨은 글자에도 없습니다. (신궁이 해당 궁이면 이어서 신궁 문장)' }),
  fam({ id: 'outer', label: '겉으로 보이는 나', area: 'total', chars: 110, keys: GODS.map(g => k('outer', g)),
    ctx: '월간 십신 기준. 바깥 무대를 보는 월주 천간에 이 십신이 있을 때 남들 눈에 보이는 모습. 십신 이름을 굵게 쓰고 한자를 붙인다. 문단이 이 문구로 시작한다.', lead: '' }),
  fam({ id: 'hourGod', label: '혼자 있을 때의 나', area: 'total', chars: 100, keys: GODS.map(g => k('hourGod', g)),
    ctx: '시간(시주 천간) 십신 기준. 혼자 있을 때, 결정을 내릴 때의 모습. 태어난 시각을 모르면 쓰이지 않는다. 십신 이름을 굵게. 문단이 이 문구로 시작한다.', lead: '' }),
  fam({ id: 'shenPalace', label: '신궁 위치', area: 'total', chars: 100, keys: ['명궁', '부처', '재백', '천이', '관록', '복덕'].map(p => k('shenPalace', p)),
    ctx: '살면서 무게가 실리는 신궁이 이 궁에 앉았을 때의 풀이. 궁 이름은 굵게 쓰지 않아도 된다(앞 문장에서 이미 나온다).', lead: '자미두수에서는 살면서 무게가 실리는 **신궁(身宮)**이 **복덕궁(福德宮)**입니다.' }),
  fam({ id: 'huaPalace', label: '타고난 사화', area: 'total', chars: 70, keys: HUA.flatMap(h => PALACE_SHORT.map(p => k('huaPalace', h, p))),
    ctx: '본래 명반에서 이 궁의 별에 사화(화록·화권·화과·화기)가 붙어 있을 때의 모습. 별 이름은 쓰지 않는다. 화기는 "손해"가 아니라 마음이 걸리는 방향으로.', lead: '**명궁(命宮)**의 **태음(太陰)**에 **화기(化忌)**가 붙어 있습니다.' }),
  fam({ id: 'starPalace', label: '별×궁', area: 'total', chars: 80, keys: MAIN_STARS_KO.flatMap(s => PALACE_SHORT.map(p => k('starPalace', s, p))),
    ctx: '주성 14개 × 열두 궁. 그 별이 그 궁에 앉았을 때 그 궁의 생활 영역(명궁=나, 형제=또래, 부처=가까운 사람, 자녀=아랫사람·만드는 것, 재백=돈 쓰는 법, 질액=몸을 쓰는 습관, 천이=밖, 교우=넓은 모임, 관록=일과 공부, 전택=사는 곳과 정리, 복덕=쉼과 마음, 부모=윗사람)에서 보이는 모습. 건강·수명은 쓰지 않는다. 명식 펼침의 궁 카드에서도 이 문구만 따로 보인다. 빌려 온 별도 같은 문구를 쓰니 "이 궁에 별이 있을 때"로 쓴다.',
    lead: '**형제궁(兄弟宮)**에 **염정(廉貞)**이 있습니다. (둘 이상이면 이어서 이름만 나열)' }),
  fam({ id: 'minorStar', label: '보조성', area: 'total', chars: 60, keys: MINOR_STARS_KO.map(s => k('minorStar', s)),
    ctx: '보조성 하나가 궁에 같이 앉았을 때 보태는 결. 어느 궁인지는 앞 문장이 말하니 궁에 묶이지 않게 쓴다. 천괴·천월은 윗사람·선배 쪽.', lead: '' }),
  fam({ id: 'group', label: '십신 무리', area: 'total', chars: 90, keys: GROUPS.flatMap(g => ['없음', '있음', '많음'].map(s => k('group', g, s))),
    ctx: '비겁·식상·재성·관성·인성 무리가 사주에 얼마나 센지(없음=겉에도 지장간에도 없음 / 있음 / 많음=월지·일지 본기가 받치는 센 무리). 비겁=또래·내 방식, 식상=꺼내기·만들기, 재성=현실·돈, 관성=규칙·평가·책임, 인성=배움·보호. 자미두수가 없을 때 사람들과는·일하고 공부할 때는·돈은 문단을 채우는 문구라서 일상 장면으로 쓴다.', lead: '' }),
  fam({ id: 'dayBranchGod', label: '일지 십신', area: 'total', chars: 90, keys: GODS.map(g => k('dayBranchGod', g)),
    ctx: '일지(배우자궁 자리)의 십신. 가까운 사람을 대하는 모습. 단정하지 않는다. 자미두수가 없을 때 사람들과는 문단을 채운다.', lead: '' }),
  fam({ id: 'relation', label: '글자 관계', area: 'total', chars: 100, keys: RELATION_KEYS.map(r => k('relation', r)),
    ctx: '사주 안의 글자끼리의 합·충·형·파·해·반합·원진·귀문. 뜻과 그 관계가 일상에서 보이는 모습. 명식 펼침에서도 이 문구만 따로 보이니 앞 문장 없이도 읽혀야 한다. 자형(辰辰 午午 酉酉 亥亥 刑)은 "같은 글자끼리 찌른다"는 점.',
    lead: '**묘유충(卯酉沖)**이 월지와 일지에 있습니다.' }),
  fam({ id: 'relPos', label: '관계 위치', area: 'total', chars: 70, keys: [
    ...RELPOS_BRANCH_TYPES.flatMap(t => POS_PAIRS.map(p => k('relPos', `${t}@${p.split('-')[0]}지-${p.split('-')[1]}지`))),
    ...['합', '충'].flatMap(t => POS_PAIRS.map(p => k('relPos', `${t}@${p.split('-')[0]}간-${p.split('-')[1]}간`)))],
    ctx: '관계가 어느 두 기둥 사이에 있는지가 말해 주는 생활 영역(연=집안·뿌리, 월=사회·일터, 일=나와 가까운 사람, 시=혼자 있는 때·아랫사람). 관계 문구 뒤에 한 문장으로 붙는다.', lead: '' }),
  fam({ id: 'sinsal12', label: '12신살', area: 'total', chars: 90, keys: SINSAL12_NAMES.map(s => k('sinsal12', s)),
    ctx: '12신살 하나의 뜻과 일상 모습(월살=끝이 보일 때 의욕이 빠지는 쪽 등). 재앙을 예언하지 않는다. 습관 이야기로 쓴다.', lead: '**재살(災殺)**이 일지에 있습니다.' }),
  fam({ id: 'moneyShape', label: '돈이 들어오는 모양', area: 'total', chars: 130, keys: ['편재만', '정재만', '둘다', '없음', '약함'].map(s => k('moneyShape', s)),
    fields: [{ name: 'howTo', chars: 60, ctx: '이렇게 써 보세요에 들어갈 한두 문장. 모으는 장치 쪽.' }],
    ctx: '재성(편재·정재)이 월지·일지에 본기로 있거나 천간에 뿌리를 두어 센 글자만 센다. 편재만 / 정재만 / 둘 다 / 둘 다 없음(겉과 숨은 글자 모두 없을 때만) / 약함(있기는 하나 약해서 한 모양으로 말하기 어려움). 여러 갈래로 들어오는지, 꾸준히 쌓는지, 만든 것을 따라오는지. 금액·부자 여부를 말하지 않는다.', lead: '' }),
  fam({ id: 'moneyShapeKnown', label: '돈이 들어오는 모양(시각 모름)', area: 'total', chars: 130, keys: ['편재만', '정재만', '둘다', '없음', '약함'].map(s => k('moneyShapeKnown', s)),
    ctx: '태어난 시각을 몰라 세 기둥만 볼 때. 시주가 다른 글자를 채울 수 있으니 없다는 말을 하지 않고 "아는 세 기둥에"로 말한다.', lead: '' }),
  fam({ id: 'moneyPattern', label: '돈과 구조', area: 'total', chars: 130, keys: ['식신생재', '상관생재', '비겁탈재'].map(s => k('moneyPattern', s)),
    ctx: '돈이 어떤 구조로 오는지(만든 것을 따라오는지, 나가는 길이 많은지). 단정하지 않는다.', lead: '' }),
  fam({ id: 'daewoonLabel', label: '대운 이름', area: 'total', chars: 8, keys: GODS.map(g => k('daewoonLabel', g)),
    ctx: '대운 천간의 십신이 만드는 시기의 이름 한 구절(예: 편재는 "넓어지는 때", 정관은 "맡는 때"). 4~8자, 마침표 없음, "~는 때" 꼴.', lead: '' }),
  fam({ id: 'daewoonTheme', label: '대운 주제', area: 'total', chars: 110, keys: pairs(GODS, GODS).map(p => k('daewoonTheme', p)),
    ctx: '"천간 십신+지지 십신" 대운의 십 년 주제. 일어날 일이 아니라 전통 해석이 그 시기에 꺼내는 주제로 쓴다. 천간 쪽이 겉(바깥에서 보이는 것), 지지 쪽이 속. 두 십신이 같으면 한 가지가 겹쳐 강한 시기로.',
    lead: '**편재(偏財)**와 **겁재(劫財)**의 시기입니다.' }),
  fam({ id: 'daewoonFill', label: '대운이 채우는 오행', area: 'total', chars: 40, keys: ELEMENTS_KO.map(e => k('daewoonFill', e)),
    ctx: '사주에 0개였던 오행이 대운으로 들어올 때의 한 구절(예: 수는 "쉴 틈이 생기는 시기입니다"). 한 문장.', lead: '없던 **물(水)**도 함께 들어옵니다.' }),
  fam({ id: 'daxianPalace', label: '자미두수 대한', area: 'total', chars: 70, keys: PALACE_SHORT.map(p => k('daxianPalace', p)),
    ctx: '지금 십 년(대한)이 이 궁에 걸려 있을 때의 주제 한 문장. 나이는 앞 문장이 말한다.', lead: '자미두수로도 22세부터 31세까지는 **복덕궁(福德宮)** 대한입니다.' }),
  fam({ id: 'yearSipsin', label: '그해 십신', area: 'year', chars: 290, keys: pairs(GODS, GODS).map(p => k('yearSipsin', p)),
    fields: [
      { name: 'summary', chars: 50, ctx: '그해 요약 두 문장. 첫 문장이 한눈에 보기에도 쓰인다. 해의 분위기와 마음 쓰일 곳.' },
      { name: 'good', chars: 90, ctx: '잘 풀리는 쪽. 첫 문장은 "내 이름으로 하는 일." 처럼 마침표로 끝나는 짧은 명사구(굵게 나온다). 뒤는 일상 장면.' },
      { name: 'bad', chars: 90, ctx: '조심할 쪽. 첫 문장은 "또래입니다." 같은 짧은 문장(굵게 나온다). 결과를 단정하지 않고 습관과 마음 쓰임으로.' },
      { name: 'howTo', chars: 60, ctx: '이렇게 써 보세요 한두 문장. 해 이름이나 연도를 쓰지 않는다.' }],
    ctx: '해의 천간 십신+지지 십신("겁재+비견"처럼 천간이 앞). 천간은 겉으로 드러나는 일, 지지는 속에서 일어나는 일. 연도·간지를 쓰지 않는다(매년 재사용). 합격, 금액, 건강, 연애 상대를 단정하지 않는다.',
    lead: '' }),
  fam({ id: 'patternLevel', label: '이름 있는 구조(강약별)', area: 'total', chars: 170,
    keys: ['식신생재:신약', '상관생재:신약', '재생관:신약', '관인상생:신강', '살인상생:신강'].map(s => k('patternLevel', ...s.split(':'))),
    ctx: '같은 구조 이름이라도 일간 강약에 따라 읽는 법이 갈리는 조합. 식·재가 센 구조는 일간이 약하면 힘이 모자라 감당 범위를 정해야 하는 짜임으로, 관·인이 센 구조는 일간이 센 편이면 받쳐 줄 힘이 넉넉해 배움이 행동을 늦출 수 있는 짜임으로 쓴다. "반기는 흐름"이라고 쓰지 않는다. pattern 문구와 같은 형식(굵은 십신 이름, 4문장 안쪽)이고 howTo는 pattern의 것을 그대로 쓴다.', lead: '**식신생재(食神生財)** 구조입니다.' }),
  fam({ id: 'sinsalFar', label: '먼 자리 신살', area: 'total', chars: 50, keys: ['천을귀인', '월덕귀인', '천덕귀인', '금여', '양인', '백호', '괴강', '도화', '홍염'].map(s => k('sinsalFar', s)),
    ctx: '연주·시주 같은 먼 자리에만 있는 신살을 약하게 말하는 한 문장. 단정하지 않고 "먼 자리라 작게 본다"로 끝낸다. 앞 문장이 신살 이름과 자리를 말한다.', lead: '' }),
  fam({ id: 'starDim', label: '어두운 자리의 주성', area: 'total', chars: 80, keys: MAIN_STARS_KO.map(s => k('starDim', s)),
    ctx: '주성이 불(不)·함(陷), 곧 어두운 자리에 앉았을 때 그 별의 읽는 법. 별의 좋은 면은 약하게, 조심할 면을 먼저 쓴다. 어느 궁인지는 앞 문장이 말하니 궁에 묶이지 않게 쓴다. "환하다, 밝다, 빛난다, 눈에 띈다" 같은 말을 쓰지 않는다. 두 문장.', lead: '' }),
  fam({ id: 'yearUnseong', label: '그해 12운성', area: 'year', chars: 70, keys: UNSEONG_NAMES.map(u => k('yearUnseong', u)),
    ctx: '일간이 그 해의 지지에서 맞는 12운성(장생~양). 문구에 이름을 굵게 한자와 함께 쓰고(예: 자기 힘으로 서는 단계인 **건록(建祿)**), 한 문장이 "~해라서, …" 꼴로 이어 붙을 수 있게. 장생·관대·건록·제왕·태·양은 잘 풀리는 쪽, 목욕·쇠·병·사·묘·절은 조심할 쪽에 놓인다. 그 방향에 맞게 쓴다.', lead: '' }),
  fam({ id: 'yearLean', label: '그해 방향(일간 강약)', area: 'year', chars: 80,
    keys: GROUPS.flatMap(g => ['신강', '신약'].map(s => k('yearLean', g, s))),
    fields: [{ name: 'howTo', chars: 60, ctx: '이렇게 써 보세요 뒤에 붙는 한 문장.' }],
    ctx: '그해 천간 십신이 속한 무리(비겁·식상·재성·관성·인성)와 일간 강약(신강·신약)의 조합. 같은 무리라도 센 편이면 넘치는 쪽, 약한 편이면 도움이거나 감당할 몫이 무거운 쪽으로 방향이 갈린다(억부론의 일반 원칙). 해 요약 뒤에 붙는 한두 문장(중화는 붙이지 않는다). "센 편이라/약한 편이라"로 시작하고 단정하지 않는다. 연도를 쓰지 않는다.', lead: '' }),
  fam({ id: 'yearLeanInner', label: '그해 방향(속)', area: 'year', chars: 40,
    keys: GROUPS.flatMap(g => ['신강', '신약'].map(s => k('yearLeanInner', g, s))),
    ctx: '그해 지지 십신이 속한 무리가 천간과 다를 때 붙는 한 문장. "속에서는"으로 시작한다. 연도를 쓰지 않는다.', lead: '' }),
  fam({ id: 'yearUnseongFull', label: '그해 12운성(일간이 센 편일 때)', area: 'year', chars: 70, keys: ['장생', '관대', '건록', '제왕'].map(u => k('yearUnseongFull', u)),
    ctx: '일간 기운이 센 편인 사람이 장생·관대·건록·제왕 해를 맞을 때, 기운이 더 오르는 만큼 넘침을 조심하라는 한 문장. 조심할 쪽에 놓인다. 단계 이름을 굵게 한자와 함께 쓰고, "~해인데 일간 기운이 센 편이라, …" 꼴.', lead: '' }),
  fam({ id: 'yearDayStem', label: '그해 천간과 일간의 합·충', area: 'year', chars: 110, keys: ['합:정관', '합:정재', '충:편관', '충:편재'].map(s => k('yearDayStem', ...s.split(':'))),
    ctx: '그해 천간이 일간과 합(끌려 묶임)이거나 충(정면으로 부딪힘)일 때. 합은 잘 풀리는 쪽 맨 앞, 충은 조심할 쪽 맨 앞에 놓인다. 합은 정관 또는 정재와, 충은 편관 또는 편재와만 일어난다. 연도와 "올해/내년"을 쓰지 않는다("이 해의 천간"). 흉하다고 단정하지 않는다.', lead: '' }),
  fam({ id: 'yearRelation', label: '그해와 원국의 관계', area: 'year', chars: 70, keys: YEAR_REL_TYPES.flatMap(t => YEAR_REL_PLACES.map(p => k('yearRelation', `${t}@${p}`))),
    ctx: '그 해의 지지가 원국의 이 기둥 지지와 이루는 합·충·파 등. 합·반합은 잘 풀리는 쪽, 나머지는 조심할 쪽에 놓인다. 기둥 자리의 생활 영역(월지=일터·사회, 일지=가까운 사람, 시지=혼자 있는 때, 연지=집안)으로.',
    lead: '월지와 **묘오파(卯午破)**를 이뤄' }),
  fam({ id: 'liunianMing', label: '그해 유년 명궁', area: 'year', chars: 110, keys: PALACE_SHORT.map(p => k('liunianMing', p)),
    ctx: '그해의 명궁인 유년 명궁이 본래 명반의 이 궁에 올 때, 그해 마음이 쏠리는 곳. 연도를 쓰지 않고 "올해/내년"도 쓰지 않는다("이 해는"). 조립기가 "올해 가까운 사람" 같은 소제목을 붙인다.',
    lead: '그해의 명궁인 유년 명궁이 **부처궁(夫妻宮)**으로 옵니다.' }),
  fam({ id: 'yearHua', label: '그해 사화', area: 'year', chars: 70, keys: HUA.flatMap(h => PALACE_SHORT.map(p => k('yearHua', h, p))),
    ctx: '그해 사화가 본래 명반의 이 궁 별에 붙을 때. 화록은 "반가운 소식" 문단, 화권·화과는 잘 풀리는 쪽, 화기는 조심할 쪽에 놓인다. 별 이름은 쓰지 않는다. 화기는 손해가 아니라 신경 쓰임으로.',
    lead: '**복덕궁(福德宮)**의 **천동(天同)**에 반가운 표시인 **화록(化祿)**이 붙었습니다.' }),
  fam({ id: 'yearPeerBoth', label: '또래 화기(천간·지지도 또래)', area: 'year', chars: 20, keys: [k('yearPeerBoth', '화기:형제')],
    ctx: '그해 천간과 지지가 모두 비겁이고 형제궁에 화기가 붙을 때. 앞 문장에 또래 이야기가 이미 있을 때만 쓴다.', lead: '' }),
  fam({ id: 'yearMoney', label: '그해 돈 궁', area: 'year', chars: 70, keys: PALACE_SHORT.map(p => k('yearMoney', p)),
    ctx: '그해 유년 재백궁이 본래 명반의 이 궁에 앉을 때 돈 쓰는 마음이 쏠리는 곳. 금액·손익은 쓰지 않는다.', lead: '' }),
  fam({ id: 'yearMoneyGod', label: '그해 재물 십신', area: 'year', chars: 70, keys: ['편재', '정재', '겁재'].map(g => k('yearMoneyGod', g)),
    ctx: '그해 천간이나 지지에 편재·정재·겁재가 들어올 때 돈 이야기. 손익을 단정하지 않는다.', lead: '' }),
  fam({ id: 'yearMoneyPlain', label: '내년 돈(기본)', area: 'year', chars: 70, keys: [k('yearMoneyPlain', '기본')],
    ctx: '내년운에 돈 이야기가 늘 있어야 해서, 사화도 재물 십신도 궁도 없을 때 쓰는 한 줄. 손익을 단정하지 않는다.', lead: '' }),
  fam({ id: 'yearTone', label: '그해 한마디', area: 'year', chars: 25, keys: [...GODS.map(g => k('yearTone', g)), ...['겁재+비견', '비견+겁재'].map(g => k('yearTone', g))],
    ctx: '해의 천간 십신으로 정해지는 해의 성격 명사구("시동을 거는 해", "보여 주는 해"). 천간+지지 키가 있으면 그것이 먼저다(겁재+비견은 늘 건록 자리라 "시동"이 맞고, 다른 겁재 해에는 맞지 않는다). 올해와 다른 점 문장에 "올해가 ~이라면 내년은 ~입니다"로 들어간다. 10~16자, 마침표 없음, "~는 해" 꼴.', lead: '' }),
  fam({ id: 'yearCompareHua', label: '같은 궁의 화록과 화권', area: 'year', chars: 90, keys: PALACE_SHORT.map(p => k('yearCompareHua', p)),
    ctx: '올해 화록이 붙은 궁에 내년 화권이 붙을 때 올해와 다른 점에 들어간다. 그 궁이 뜻하는 쪽으로 두 해의 차이를 푼다. "X궁에 올해는 화록이 붙어 ~ 해이고, 내년은 화권이 붙어 ~ 해입니다." 꼴.', lead: '' }),
  fam({ id: 'starPalaceSecond', label: '두 별이 나란히 있을 때 뒤 별', area: 'total', chars: 60, keys: [k('starPalaceSecond', '탐랑', '부모')],
    ctx: '앞 별 문장에 기대어 읽히는 뒤 별 문구. 혼자 있을 때의 starPalace 문구에는 주어가 있어야 한다.', lead: '' }),
  fam({ id: 'studySummary', label: '학업 요약', area: 'study', chars: 70, keys: GODS.map(g => k('studySummary', g)),
    ctx: '월지 십신 기준 학업운 요약 두 문장. 어떤 과목에서 힘이 나고 어떤 과목에서 힘이 빠지는지.', lead: '' }),
  fam({ id: 'studyMonth', label: '학업과 월지', area: 'study', chars: 150, keys: GODS.map(g => k('studyMonth', g)),
    fields: [{ name: 'howTo', chars: 80, ctx: '이렇게 써 보세요에 들어갈 한두 문장. 공부 방법.' }],
    ctx: '사주에서 힘이 가장 크다는 월지에 이 십신이 앉았을 때의 공부 방식. 문단이 "월지에 …이 앉아 있습니다"로 시작한다(십신 이름 굵게). 합격·성적을 말하지 않는다.', lead: '' }),
  fam({ id: 'studyGroup', label: '학업과 십신 무리', area: 'study', chars: 110, keys: GROUPS.flatMap(g => ['없음', '있음', '많음'].map(s => k('studyGroup', g, s))),
    fields: [{ name: 'howTo', chars: 60, ctx: '이렇게 써 보세요에 들어갈 한 문장.' }],
    ctx: '십신 무리가 공부에 주는 결. 관성=출석·형식·정해진 답, 인성=받아들이고 정리하기, 식상=꺼내서 만들기, 재성=실용·점수 계산, 비겁=친구와 함께하기. 머리 문제가 아니라 틀의 문제라는 방향으로.', lead: '' }),
  fam({ id: 'studyYear', label: '해마다의 공부', area: 'study', chars: 70, keys: PALACE_SHORT.map(p => k('studyYear', p)),
    ctx: '그해 유년 관록궁이 본래 명반의 이 궁에 앉을 때 공부가 어떻게 흐르는지 한 문장. 연도는 조립기가 앞에 붙인다. 합격·성적을 말하지 않는다.', lead: '**2026년**' }),
  fam({ id: 'studyYearGod', label: '해마다의 공부(사주만)', area: 'study', chars: 70, keys: GODS.map(g => k('studyYearGod', g)),
    ctx: '자미두수가 없을 때 쓰이는 대체 문구. 그해 천간 십신 기준으로 공부가 어떻게 흐르는지 한 문장. 연도는 조립기가 앞에 붙인다.', lead: '**2026년**' }),
]

export const FAMILY_BY_ID: Record<string, Family> = Object.fromEntries(FAMILIES.map(f => [f.id, f]))

// yearSipsin의 summary/good/bad/howTo는 필드, 같은 방식으로 다른 가족의 필드도 전체 키로 펼친다.
function expand(f: Family): string[] {
  const out = [...f.keys]
  for (const fd of f.fields ?? []) for (const key of f.keys) out.push(`${key}#${fd.name}`)
  return out
}
/** 요청 가능한 전체 키(필드 포함). */
export const ALL_KEYS: Set<string> = new Set(FAMILIES.flatMap(expand))
/** 글이 있어야 하는 칸: 필드가 있는 가족은 본문 키 자체가 아니라 필드만 쓴다(yearSipsin). */
export const WRITE_KEYS: { family: Family; key: string; chars: number; field?: string }[] = FAMILIES.flatMap(f => {
  const out: { family: Family; key: string; chars: number; field?: string }[] = []
  if (f.id === 'yearSipsin') {
    for (const key of f.keys) for (const fd of f.fields ?? []) out.push({ family: f, key: `${key}#${fd.name}`, chars: fd.chars, field: fd.name })
    return out
  }
  for (const key of f.keys) out.push({ family: f, key, chars: f.chars })
  for (const fd of f.fields ?? []) for (const key of f.keys) out.push({ family: f, key: `${key}#${fd.name}`, chars: fd.chars, field: fd.name })
  return out
})
export const familyOfKey = (key: string): string => key.slice(0, key.indexOf('['))
export { k as blockKey }
