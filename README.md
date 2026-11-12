# 나를 설명하는 다섯 단어 (five-words)

나를 설명하는 다섯 단어와 사주·자미두수 풀이가 나오는 휴대폰용 웹 페이지입니다. 단어는 세 단계로 정합니다. 1) 34개 단어에서 나와 닮은 단어 8~15개와 나와 가장 먼 단어 3개를 고르고, 2) 두 문장을 보고 어느 쪽이 더 나 같은지 30번 고르고("훨씬 더 나 같아요" / "조금 더 나 같아요" / "둘 다 맞아요" / "둘 다 아니에요"), 3) 답으로 정한 상위 다섯을 마지막 확인 화면에서 직접 고칩니다. 보고서는 전체 요약, 5가지 강점 단어, 사주·자미두수 세 탭으로 나뉩니다. 시간 제한은 없고, 중간에 나가도 같은 브라우저에서 이어서 할 수 있습니다. 계산은 모두 브라우저 안에서 하고, 입력과 결과를 서버로 보내지 않습니다. 결과는 이 브라우저(localStorage)에만 저장되며 화면의 "결과 지우기"로 지울 수 있습니다.

사주와 자미두수 풀이는 전통 해석을 쉬운 말로 옮긴 것입니다. 과학적으로 검증된 도구가 아니며, 진로·연애·성공·건강을 예언하지 않고 의학적 진단도 아닙니다. 자신을 돌아보는 질문으로 써 주세요.

## 실행

```
npm install
npm test          # 단위 시험
npm run dev       # 개발 서버
npm run build     # dist/index.html 한 파일로 빌드
npx playwright test   # 화면 시험 (빌드 후)
```

빌드 결과는 `dist/index.html` 하나입니다. 외부 주소를 부르지 않으므로 정적 파일로 어디에 올려도 됩니다.

## 단어와 문구 고치기

단어 목록과 한 줄 설명은 `src/content/words.ts`, 둘 중 고르기에 쓰는 문장은 `src/content/statements.ts`, 나와 가장 먼 단어 줄은 `src/content/far-copy.ts`, 단어별 풀이는 `src/content/word-copy.ts`와 `src/content/deep-data/`, 사주·자미두수 문구는 `src/content/chart-copy.ts`에서 고칩니다. 점수 계산은 `src/quiz/funnel/engine.ts`에 있습니다.

## 알아 둘 점

이 검사가 실제 학생에게 얼마나 정확한지는 아직 확인되지 않았습니다. 가상 학생 시험(`tests/quiz-simulation.test.ts`)은 우리가 정한 응답 가정에 기댄 참고 수치이고 실제 학생 증거가 아닙니다. 점수 계산(두 단어 비교 결과를 단어 점수로 맞추는 Bradley–Terry 모형, 1단계에서 고른 단어 +0.6·먼 단어 -0.6 출발점, "훨씬 더"는 두 번 이긴 것으로 셈)의 값도 통계로 추정한 것이 아니라 우리가 정한 단순 기준입니다.

"둘 다 맞아요"와 "둘 다 아니에요"가 답의 60%를 넘으면 결과 위에 "가벼운 참고로 봐 달라"는 안내가 붙습니다.

사주·자미두수 계산은 라이브러리(orrery)의 시각 처리 방식을 그대로 따릅니다. 다른 만세력 서비스와 절기 경계 시각이 가까운 날에는 결과가 다를 수 있습니다.

## 라이선스

AGPL-3.0-only. 전문은 `LICENSE`에 있습니다. 계산에 쓰는 `@orrery/core`가 AGPL-3.0이라 함께 따릅니다.

## 사용한 구성요소

| 구성요소 | 라이선스 | 용도 |
|---|---|---|
| [@orrery/core](https://github.com/rath/orrery) 0.5.0 | AGPL-3.0-only | 사주·자미두수 계산. 천문 계산 일부는 Swiss Ephemeris(Astrodienst AG)를 옮긴 코드입니다. |
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | MIT | 음력·절기 계산 (orrery가 사용) |
| [Black Han Sans](https://github.com/zesstype/Black-Han-Sans) | SIL OFL 1.1 | 제목 글꼴 (필요한 글자만 추려 포함) |

저작권 표시와 변경 사항은 `NOTICE.md`에 있습니다.

© 2026 five-words contributors
