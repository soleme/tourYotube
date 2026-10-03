# 80일간의 떡상 여행

여행 유튜버가 되어 80일 동안 세계 14개 도시를 돌며 영상을 찍고, 구독자 100만(골드 버튼)을 노리는 도트 게임입니다.

## 플레이

`index.html` 을 브라우저로 열면 바로 실행됩니다. 서버나 설치가 필요 없습니다.

| 키 | 동작 |
| --- | --- |
| ← → | 이동 (화면 클릭/터치로도 이동) |
| Space / Z / Enter | 말 걸기 · 촬영 · 결정 |
| Esc / X | 메뉴 · 취소 |
| M | 소리 켜기/끄기 |

휴대폰에서는 화면 아래(세로) 또는 양옆(가로)에 터치 패드가 나옵니다.

## 게임 구성

- **도시 14곳**: 서울, 도쿄, 방콕, 아그라, 카이로, 나이로비, 로마, 파리, 레이캬비크, 뉴욕, 멕시코시티, 리우, 시드니, 그리고 구독자 10만 달성 시 열리는 남극 세종기지
- **촬영 미니게임 3종**: 랜드마크 구도 맞추기(드론샷·야경), 먹방 연타 + 리액션 타이밍, 도시별 리듬 체험(K-POP, 무에타이, 홀리, 삼바, 서핑, 오로라 등)
- **업로드**: 클립을 모아 숙소에서 편집 → 정직/어그로/감성 제목 선택 → 조회수·구독자·댓글·떡상 연출
- **랜덤 이벤트 70여 개**: 소매치기, 합방, 팬 미팅, 비상 착륙, 코인 광고 논란, 캥거루 복싱, 피자 쥐...
- **시간·날씨**: 아침/노을/밤 조명, 비·눈·오로라, 도시마다 다른 절차적 칩튠 음악
- **성장**: 장비(카메라·드론·짐벌 등), 수익 창출(구독자 1,000명), 협찬, 라이브 방송, 시청자 미션, 실버/골드/다이아 버튼

## 개발

```
src/index.html      화면 뼈대
src/style.css       UI 스타일
src/js/*.js         게임 코드 (engine → sprites → world → worldmap → data → balance → ui → game → minigames → actions → events → main)
fonts/              Galmuri 폰트 (원본 + 서브셋)
build.mjs           하나의 HTML 로 합치기
```

```sh
node build.mjs                        # index.html, dist/artifact.html 생성
node tools/subset-fonts.mjs           # 글자를 새로 추가했다면 폰트 서브셋 다시 만들기 (pyftsubset 필요)
```

밸런스 공식은 `src/js/balance.js` 에 있고 DOM 없이 node 에서 불러와 시뮬레이션할 수 있습니다.

## 라이선스

폰트: [Galmuri](https://github.com/quiple/galmuri) © Lee Minseo, SIL Open Font License 1.1 (`fonts/LICENSE.txt`)
