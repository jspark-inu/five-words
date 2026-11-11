// 엔진이 한자로 돌려주는 이름의 한글 읽기. 엔진에 없는 표만 여기 둔다.
export const PALACE_KO: Record<string, string> = {
  命宮: '명궁', 兄弟: '형제', 夫妻: '부처', 子女: '자녀', 財帛: '재백', 疾厄: '질액',
  遷移: '천이', 交友: '교우', 官祿: '관록', 田宅: '전택', 福德: '복덕', 父母: '부모',
}
export const SIHUA_KO: Record<string, string> = { 化祿: '화록', 化權: '화권', 化科: '화과', 化忌: '화기' }
export const BRIGHTNESS_KO: Record<string, string> = { 廟: '묘', 旺: '왕', 得: '득', 利: '리', 平: '평', 不: '불', 陷: '함' }
export const STAR_KO: Record<string, string> = {
  紫微: '자미', 天機: '천기', 太陽: '태양', 武曲: '무곡', 天同: '천동', 廉貞: '염정', 天府: '천부',
  太陰: '태음', 貪狼: '탐랑', 巨門: '거문', 天相: '천상', 天梁: '천량', 七殺: '칠살', 破軍: '파군',
  左輔: '좌보', 右弼: '우필', 文昌: '문창', 文曲: '문곡', 天魁: '천괴', 天鉞: '천월', 祿存: '녹존', 天馬: '천마',
  擎羊: '경양', 陀羅: '타라', 火星: '화성', 鈴星: '영성', 地空: '지공', 地劫: '지겁',
}
export const REL_KO: Record<string, string> = {
  合: '합', 半合: '반합', 三合: '삼합', 方合: '방합', 沖: '충', 刑: '형', 破: '파', 害: '해', 怨嗔: '원진', 鬼門: '귀문',
}
export const REL_DETAIL_KO: Record<string, string> = { 自刑: '자형', 相刑: '상형', 無禮: '무례', 無恩: '무은', tree: '목', fire: '화', earth: '토', metal: '금', water: '수' }
export const SAL_KO: Record<string, string> = {
  cheonul: '천을귀인', cheonduk: '천덕귀인', wolduk: '월덕귀인', munchang: '문창귀인', yangin: '양인',
  baekho: '백호', goegang: '괴강', dohwa: '도화', hongyeom: '홍염', geumyeo: '금여',
}
export const SAL_HANJA: Record<string, string> = {
  cheonul: '天乙貴人', cheonduk: '天德貴人', wolduk: '月德貴人', munchang: '文昌貴人', yangin: '羊刃',
  baekho: '白虎', goegang: '魁罡', dohwa: '桃花', hongyeom: '紅艷', geumyeo: '金輿',
}
export const starKo = (s: string) => STAR_KO[s] ?? s
export const palaceKo = (p: string) => PALACE_KO[p] ?? p
