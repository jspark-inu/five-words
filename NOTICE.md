# NOTICE

이 서비스(five-words)는 AGPL-3.0 라이선스로 공개됩니다. 소스 코드: https://github.com/jspark-inu/five-words

## 사용한 외부 구성요소

| 구성요소 | 라이선스 | 저작권 | 링크 |
|---|---|---|---|
| @orrery/core 0.5.0 (사주·자미두수 계산) | AGPL-3.0-only | © orrery 저작자들 (orrery authors, GitHub: rath) | https://github.com/rath/orrery |
| Swiss Ephemeris에서 옮긴 천문 계산 코드 (orrery에 포함) | AGPL-3.0 (orrery에 포함되어 함께 배포) | Copyright (C) 1997-2021 Astrodienst AG, Switzerland | https://www.astro.com/swisseph/ |
| lunar-javascript (음력·절기 계산, orrery가 사용) | MIT | Copyright (c) 2018 6tail | https://github.com/6tail/lunar-javascript |
| Black Han Sans (제목 글꼴, 필요한 글자만 추려 포함) | SIL OFL 1.1 | Copyright 2015 The Black Han Sans Project Authors | https://github.com/zesstype/Black-Han-Sans |

## 변경 사항

- @orrery/core는 수정하지 않고 npm 패키지 그대로 사용합니다.
- lunar-javascript도 수정하지 않습니다.
- Black Han Sans는 화면에 쓰는 글자만 남긴 부분 집합(subset) 파일로 포함했습니다(`src/fonts/BlackHanSans-subset.woff2`, 만드는 법은 `scripts/subset-font.py`). 글꼴 이름은 그대로이며, OFL 전문은 `src/fonts/OFL.txt`에 있습니다.
