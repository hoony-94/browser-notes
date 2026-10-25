# 페이지 중간으로 바로 들어올 때의 이미지 우선순위 실험

노트: `src/content/notes/scroll-image-priority.mdx`

- **실험 1**: 상단 이미지 힌트(히어로 `fetchpriority`·preload)가 중간으로 진입했을 때 도착 화면을 늦추는가
- **실험 2**: `<head>` 스크립트가 해시를 보고 도착 화면을 먼저 받게 하거나 첫 렌더를 미루면 나아지는가. 맨 위로 진입할 때는 손해가 없는가

## 테스트 페이지

쇼핑몰 목록처럼 이미지가 많은 긴 페이지다. 히어로 1개와 섹션 10개 × 상품 6개로 되어 있다. `#section-5`로 바로 열었을 때, 도착한 화면의 이미지가 모두 보이기까지 걸린 시간을 비교한다.

- **이미지**: 히어로 200 KB, 상품 40 KB짜리 SVG다. 크기만 맞췄고, 앞쪽을 주석으로 채워서 끝까지 받아야 그려진다.
- **레이아웃**: 모든 이미지에 `width`·`height`를 지정해 자리를 미리 잡는다. 높이 변화는 실험에서 제외한다.
- **페이지 끝 데이터(`tail`)**: 실험 2는 본문 뒤에 100 KB짜리 `<script type="application/json">`을 붙인다. Next.js의 RSC payload처럼 본문 뒤에 HTML이 더 오는 페이지를 흉내 낸다. 실험 1은 0 KB(HTML 15 KB)다.
- **파싱 시각 기록**: 각 섹션과 문서 끝(`#page-end`) 바로 뒤에 작은 스크립트가 있어, 그 부분이 파싱된 시각을 남긴다.

### 조건

| 조건 | 히어로 | 도착 화면 이미지 | 실험 |
|---|---|---|---|
| A | 힌트 없음 | `loading="lazy"` | 1·2 |
| B | `<img fetchpriority="high">` | lazy | 1·2 |
| P | `<link rel="preload" as="image" fetchpriority="high">` | lazy | 1 |
| C | 힌트 없음 | 섹션 5만 `loading="eager" fetchpriority="high"`(서버가 위치를 안다고 가정) | 1·2 |
| D | `fetchpriority="high"` | 섹션 5만 eager + high | 1 |
| E1 | 해시가 없으면 스크립트로 preload | 해시가 있으면 스크립트로 preload + high | 2 |
| E2t | 〃 | 해시가 있으면 `<link rel="expect" href="#section-5" blocking="render">` | 2 |
| E2 | 〃 | 해시가 있으면 `<link rel="expect" href="#page-end" blocking="render">` | 2 |
| E3 | 〃 | E1 + E2 | 2 |

**E 조건 공통**
- `<head>`의 인라인 스크립트가 `location.hash`를 읽어 결정한다(`server.mjs`의 `hashScript`).
- HTML에 `fetchpriority`를 직접 쓰면 스크립트보다 preload scanner가 먼저 보고 요청하므로, 히어로 `<img>`에는 쓰지 않는다.
- E1·E3의 "도착 화면 이미지"는 그 섹션 6개와 다음 섹션 첫 줄 2개로 어림한 목록이다.
- `rel="expect"`는 지정한 요소가 파싱될 때까지 첫 렌더를 미루는 HTML 기능이다.
  - E2t는 도착 요소(`#section-5`)까지 미룬다.
  - E2는 문서 끝(`#page-end`)까지 미룬다.

### 네트워크와 서버 (`config.mjs`)

서버가 연결 하나의 내려받기 대역폭을 흉내 낸다. 모든 응답(HTML 포함)이 이 대역폭을 나눠 쓴다.

| net | 대역폭 | 응답 시작 전 지연 |
|---|---|---|
| none | 제한 없음 | 0 ms |
| fast | 9 Mbps | 40 ms |
| slow | 1.6 Mbps | 150 ms |

| sched | 서버가 대역폭을 나누는 방식 |
|---|---|
| fair | 진행 중인 응답이 똑같이 나눈다. 우선순위를 무시하는 서버 |
| priority | 브라우저가 보낸 우선순위가 높은 응답부터 보낸다. 같은 우선순위끼리는 나눈다 |

- `priority`는 Chrome이 요청할 때 보낸 `priority` 헤더(RFC 9218 `u=`)와, 그 뒤의 HTTP/2 PRIORITY 프레임(우선순위 변경)을 따른다.
- 실제 서버·CDN은 두 모드 사이 어딘가에 있다고 본다.

## 실행 순서

Node 22 이상과 Chrome만 있으면 된다. 설치할 의존성은 없다.

### 1. 서버 켜기

```sh
cd experiments/scroll-image-priority
node server.mjs          # 요청마다 로그를 보려면 --log
```

첫 실행 때 `.certs/`에 localhost용 자체 서명 인증서를 만든다. 이 폴더는 git에서 제외되어 있다.

### 2. 자동 측정 (다른 터미널)

```sh
# 실험 1 (약 40분)
node run.mjs --name exp1

# 실험 2 (약 60분)
node run.mjs --name exp2 --tail 100 --conds A,B,C,E1,E2t,E2,E3 --top A,B,E3

# 빠르게 확인
node run.mjs --name quick --tail 100 --repeat 3 --nets slow --scheds priority --conds B,E3 --top ""
```

- 헤드리스 Chrome을 띄우고, 측정마다 새 브라우저 컨텍스트를 연다. 매번 빈 캐시와 새 연결로 시작한다.
- 브라우저를 띄운 직후의 첫 탐색은 느려서 기록하지 않는다.
- 결과는 `results/<name>-<시각>.md`(표)와 `.json`(측정별 원자료)으로 저장된다.

### 3. 필름스트립 캡처

같은 시각의 실제 화면을 조건별로 나란히 놓은 이미지를 만든다. 조건마다 한 번씩 화면을 녹화한다.

```sh
node run.mjs --film --name exp2 --tail 100 --nets slow --scheds priority \
  --conds A,B,E2t,E2,E3 --top "" --times 0.25,0.5,0.75,1,1.5,2,2.5,3,5,9.5
```

- 결과는 `results/<name>-<시각>-film/<net>-<sched>-<진입>.png`다. 같은 이름의 `.html`과 프레임 JPEG도 함께 남는다.
- 녹화 실행은 통계에 넣지 않는다. 행 제목에 적힌 숫자는 그 녹화 실행 한 번의 값이다.
- 저장한 결과로 표만 다시 만들려면 `node run.mjs --report results/<파일>.json`을 실행한다.

### 4. DevTools 화면 캡처 (macOS)

```sh
node tools/capture-devtools.mjs --tail 100 --out results/devtools \
  --shot "exp2-e3-slow-priority-mid=cond=E3&net=slow&sched=priority#section-5"
```

**동작**
- 촬영마다 새 브라우저 컨텍스트(빈 캐시, 새 연결)의 새 창을 연다. 오른쪽에 DevTools Network 패널을 띄우고, 로딩이 끝나면 그 창만 찍는다.
- DevTools 안에서 큰 요청 행을 켜고 필터(`--filter`, 기본은 문서·히어로·섹션 1·도착 화면 이미지)를 건다.
- 같은 이름의 `.json`에 그 탐색의 측정값(`summary`)과 서버 기록(`server`)을 함께 남긴다.

**주의**
- Chrome을 실행하는 앱(이 프로젝트에서는 IntelliJ IDEA)에 macOS **화면 및 시스템 오디오 녹음** 권한이 있어야 한다. 권한이 없으면 창 내용 없이 회색 화면만 찍힌다.
- 화면에 Chrome 창이 떴다 닫힌다.
- Network 패널의 **Time 열은 완료 시각이 아니라 요청이 걸린 시간**이다. 완료 시각은 요청 시작 시각 + Time이고, JSON의 `server[].done`에서 볼 수 있다.
- Size 열에서 전송량(위)이 리소스 크기(아래)보다 큰 것은, 서버가 대역폭을 흉내 내느라 응답을 잘게 나눠 보내서 생긴 HTTP/2·TLS 프레임 오버헤드다. 대역폭 모델은 본문 바이트만 센다.

### 5. 직접 보기

```sh
./open-chrome.sh             # 실험 1 목록
./open-chrome.sh "/?tail=100"  # 실험 2 목록
```

평소 프로필과 분리된 Chrome 창에서 조건 목록이 열린다. 인증서 경고를 건너뛰는 옵션으로 띄우므로, 이 창으로 다른 사이트에는 접속하지 않는다.

## 직접 볼 때 확인할 것

### 준비

1. DevTools를 열고 기기 툴바에서 **390 × 844**(iPhone 12 Pro)를 고른다. 자동 측정과 같은 화면 크기다.
2. **Network 패널 설정**
   - 스로틀링은 **No throttling**으로 둔다. 대역폭은 서버가 흉내 내므로, 함께 켜면 두 번 제한된다.
   - 톱니바퀴 → **Big request rows**를 켜고, 열 머리를 우클릭해 **Priority** 열을 추가한다.
   - 큰 행에서 Priority 열은 위가 최종 우선순위, 아래가 처음 우선순위다.
3. **다시 잴 때는 새로고침하지 말고 목록에서 링크를 다시 누른다.** 새로고침은 해시 위치가 아니라 이전 스크롤 위치를 복원한다.
4. 화면 아래 검은 패널과 Console의 `[실험 1]`에는 load 3초 뒤의 요약이 나온다. 첫 화면(FCP), 해시 이동 시각, 섹션별 파싱 시각(`__exp.parsed`)도 볼 수 있다.

### 실험 1

| 순서 | 열 것 | 확인할 것 |
|---|---|---|
| 1 | A · slow/priority · 중간 | `p-1-*`, `p-2-*`(맨 위 섹션) 이미지도 요청되는가? 해시로 들어와도 lazy 판단이 맨 위 기준으로 한 번 일어나는지 본다 |
| 2 | 같은 화면 | 히어로와 `p-1-*`의 Priority가 High로 올라가는가? 화면에 보이지 않게 된 뒤에도 내려가지 않는가? |
| 3 | 같은 화면 | 도착 화면 이미지(`p-5-*`)는 언제 High가 되는가? 다른 이미지 하나가 다 받아진 직후인가? |
| 4 | B · slow/priority · 중간 | 히어로가 처음부터 High다. 도착 화면이 A보다 빨라지는가, 늦어지는가? |
| 5 | C · slow/priority · 중간 | 섹션 5 이미지가 처음부터 High다. 화면 아래 섹션 6 이미지는 어떻게 되는가? |
| 6 | A·B·C · slow/fair | 서버가 우선순위를 무시하면 힌트의 차이가 사라지는가? |
| 7 | A·B · slow/priority · 맨 위 | 맨 위로 들어오면 B의 히어로가 A보다 빨리 보이는가? |

### 실험 2 (`/?tail=100` 목록)

| 순서 | 열 것 | 확인할 것 |
|---|---|---|
| 1 | A · slow/priority · 중간 | 맨 위가 먼저 보였다가 점프하는가? Console에서 `__exp.parsed["section-5"]`와 해시 이동 시각을 비교한다. 해시 이동이 섹션 5 파싱 직후가 아니라 `page-end` 파싱 뒤인지 본다 |
| 2 | E2t · slow/priority · 중간 | 도착 요소까지 렌더를 미뤄도 맨 위가 먼저 보이는가? |
| 3 | E2 · slow/priority · 중간 | 맨 위가 보이지 않고 바로 섹션 5가 보이는가? 첫 화면은 얼마나 늦어지는가? 도착 화면 이미지(`p-5-*`)의 Priority는 언제 High가 되는가? |
| 4 | E3 · slow/priority · 중간 | `p-5-*`가 인라인 스크립트가 넣은 preload로 처음부터 High인가? 도착 화면은 언제 모두 보이는가? |
| 5 | E3 · slow/priority · 맨 위 | 해시가 없으면 히어로 preload만 들어가는가? 히어로가 B와 비슷하게 보이는가? |
| 6 | E2·E3 · slow/fair · 중간 | 섹션 1~2 이미지 요청이 사라지는가? 받는 양이 줄어든 만큼 빨라지는가? |

**선택: 우선순위가 바뀌는 순간 보기**
- Performance 패널에서 녹화를 시작한 뒤 목록의 링크를 누른다.
- Network 트랙의 이미지 요청과 Main 트랙의 Layout을 함께 본다.
- 서버를 `--log`로 켜면, 서버가 PRIORITY 프레임을 받은 시각도 터미널에 찍힌다.

## 결과 표 읽기

### 결과 표

| 열 | 뜻 |
|---|---|
| 도착 화면 모두 표시 (범위) | 마지막에 화면 안에 있던 이미지가 모두 그려진 시각의 중앙값(최소–최대). Element Timing의 `renderTime` |
| 첫 이미지 표시 | 그중 가장 먼저 그려진 이미지 |
| 첫 화면(FCP) | 처음으로 내용이 그려진 시각 |
| 맨 위가 먼저 그려짐 | 해시 위치로 이동하기 전에 첫 화면이 그려진 측정 수 |
| LCP (요소) | 마지막 LCP 후보와 그 요소 |
| 요청 이미지 (그중 섹션 1~2) | 요청한 이미지 수와 바이트. 괄호는 도착 위치에서 먼 맨 위 섹션 이미지 수 |

### 과정 표

| 열 | 뜻 |
|---|---|
| 도착 섹션 파싱 / 문서 파싱 끝 | `section-5`와 `page-end`가 파싱된 시각 |
| 해시 이동 | `scrollY`가 처음 0보다 커진 시각 |
| 히어로 표시 | 히어로가 그려진 시각. 중간 진입에서는 화면 밖이므로 받은 뒤 처리된 시각이다 |
| 히어로 / 도착 이미지 우선순위 | Chrome이 요청을 만들 때 정한 처음 우선순위 |
| 도착 이미지 요청 → 브라우저 High 승격 | Chrome DevTools Protocol 기준, 요청이 생긴 시각과 High로 바뀐 시각 |
| 서버가 High로 받은 시각 (비율) | 서버가 High(u≤1)를 받은 시각과 그런 이미지의 비율. 브라우저가 올려도 서버에 전달되지 않으면 우선순위 순서 서버에서는 효과가 없다 |

시각은 모두 문서 요청 기준 ms다.

## 한계

- **대역폭 모델**: 서버 안에서 흉내 낸 대역폭이다. TCP 혼잡 제어, 패킷 손실, 실제 CDN의 우선순위 처리는 없다.
- **DevTools 스로틀링을 쓰지 않은 이유**: DevTools 스로틀링은 브라우저 안에서 요청마다 늦추는 방식이다. 그래서 서버가 우선순위를 따르는지에 따른 차이를 재현하기 어렵다고 판단했다.
- **이미지 형식**: 크기만 맞춘 SVG라 끝까지 받아야 그려진다. 실제 JPEG·WebP는 받는 도중 일부가 먼저 보일 수 있다.
- **브라우저**: 자동 측정은 헤드리스 Chrome만 한다.
  - Safari·Firefox는 직접 확인해야 한다.
  - 두 브라우저는 Element Timing을 지원하지 않아 load 이벤트 다음 프레임으로 근사한다.
  - Safari는 자체 서명 인증서를 신뢰하도록 따로 설정해야 한다.
  - `rel="expect"`를 지원하지 않는 브라우저에서 E2·E3는 E1과 같아진다.
- **화면 크기**: 390 × 844 한 가지다. 화면이 크면 도착 화면 이미지 수와 lazy 범위가 달라진다.
- **필름스트립**: 화면 녹화 자체가 렌더링 시점에 약간 영향을 줄 수 있어 통계 측정과 따로 돌린다.

## 파일

| 파일 | 역할 |
|---|---|
| `config.mjs` | 조건, 네트워크, 이미지 크기, 화면 크기 |
| `server.mjs` | HTTP/2 서버, 테스트 페이지, `<head>` 스크립트, 대역폭 흉내, 측정 스크립트, `/__log` |
| `run.mjs` | Chrome DevTools Protocol로 자동 측정하고 표와 필름스트립을 만든다 |
| `open-chrome.sh` | 직접 확인용 Chrome 창 |
| `tools/capture-devtools.mjs` | DevTools Network 패널이 열린 실험 화면 캡처 |
| `tools/windows.swift` | 캡처할 Chrome 창을 찾는 도우미. 처음 실행할 때 `tools/.bin/`에 빌드된다 |
| `results/` | 측정 결과, 필름스트립, DevTools 캡처 |
