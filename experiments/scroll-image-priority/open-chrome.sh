#!/bin/sh
# 직접 확인용 Chrome을 평소 프로필과 분리해서 연다.
# 로컬 인증서 경고를 건너뛰기 위해 --ignore-certificate-errors를 쓰므로, 이 창으로 다른 사이트에 접속하지 않는다.
#
#   ./open-chrome.sh                                  # 조건 목록
#   ./open-chrome.sh "/shop?cond=B&net=slow&sched=priority&panel#section-5"

CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="${TMPDIR:-/tmp}/exp1-manual-chrome"

exec "$CHROME" \
  --user-data-dir="$PROFILE" \
  --ignore-certificate-errors \
  --no-first-run \
  --no-default-browser-check \
  "https://localhost:4433${1:-/}"
